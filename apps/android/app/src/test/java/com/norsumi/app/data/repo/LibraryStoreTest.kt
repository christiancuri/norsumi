package com.norsumi.app.data.repo

import com.norsumi.app.data.model.Category
import com.norsumi.app.data.model.CategoryPatch
import com.norsumi.app.data.model.Item
import com.norsumi.app.data.model.ItemListResponse
import com.norsumi.app.data.model.ItemPatch
import com.norsumi.app.data.model.ItemQuery
import com.norsumi.app.data.model.ItemStatus
import com.norsumi.app.data.model.LibraryStats
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.toList
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/** In-memory server: categories are derived from items, and empty ones disappear (like the API). */
private class FakeRepo : BaseLibraryRepository() {
    val items = mutableListOf<Item>()
    var failDelete = false
    var categoryCalls = 0
    var deleteCalls = 0

    override suspend fun categories(): List<Category> {
        categoryCalls++
        return items.mapNotNull { it.categoryId }.groupingBy { it }.eachCount()
            .map { (id, n) -> Category(id = id, name = id, itemCount = n) }
    }

    override suspend fun stats() = LibraryStats(total = items.size)
    override suspend fun items(query: ItemQuery, cursor: String?) = ItemListResponse(items.toList(), null)
    override suspend fun item(id: String) = items.first { it.id == id }
    override suspend fun update(id: String, patch: ItemPatch) = item(id).also { emit(LibraryChange.Updated(it)) }
    override suspend fun delete(id: String) {
        deleteCalls++
        if (failDelete) error("boom")
        items.removeAll { it.id == id }
        emit(LibraryChange.Deleted(id))
    }
    override suspend fun reprocess(id: String) = item(id)
    override suspend fun createNote(text: String) = Item(id = "n").also { items += it; emit(LibraryChange.Created) }
    override suspend fun createLink(url: String, text: String?) = Item(id = "l").also { items += it; emit(LibraryChange.Created) }
    override suspend fun updateCategory(id: String, patch: CategoryPatch) = Category(id = id, name = id)
    override suspend fun deleteCategory(id: String) {
        items.replaceAll { if (it.categoryId == id) it.copy(categoryId = null) else it }
        emit(LibraryChange.CategoriesChanged)
    }
}

@OptIn(ExperimentalCoroutinesApi::class)
class LibraryStoreTest {
    private fun TestScope.newStore(repo: FakeRepo) = LibraryStore({ repo }, repo.changes, backgroundScope)

    @Test fun `item finishing processing refetches categories`() = runTest(UnconfinedTestDispatcher()) {
        val repo = FakeRepo()
        val store = newStore(repo)
        val pending = Item(id = "a", status = ItemStatus.Pending)
        repo.items += pending
        store.onItemsSeen(listOf(pending))
        advanceUntilIdle()
        val before = repo.categoryCalls

        // The worker finished and filed it under a brand-new category.
        val ready = pending.copy(status = ItemStatus.Ready, categoryId = "food")
        repo.items[0] = ready
        store.onItemsSeen(listOf(ready))
        advanceUntilIdle()

        assertEquals(before + 1, repo.categoryCalls)
        assertEquals(listOf("food"), store.meta.value.categories.map { it.id })
        assertTrue(store.meta.value.loaded)
    }

    @Test fun `seeing an already-ready item does not refetch`() = runTest(UnconfinedTestDispatcher()) {
        val repo = FakeRepo()
        val store = newStore(repo)
        store.onItemsSeen(listOf(Item(id = "a")))
        advanceUntilIdle()
        assertEquals(0, repo.categoryCalls)
    }

    @Test fun `delete is optimistic and the empty category disappears after refetch`() = runTest(UnconfinedTestDispatcher()) {
        val repo = FakeRepo()
        val item = Item(id = "a", categoryId = "food")
        repo.items += item
        val store = newStore(repo)
        store.refreshMetaNow()
        assertEquals(1, store.meta.value.categories.single().itemCount)

        val events = mutableListOf<LibraryChange>()
        val job = backgroundScope.launch { store.changes.toList(events) }
        assertTrue(store.delete(item))
        advanceUntilIdle()

        assertEquals(LibraryChange.Deleted("a"), events.first()) // lists drop it immediately
        assertTrue(store.meta.value.categories.isEmpty())        // no stale "1 item"
        assertEquals(0, store.meta.value.stats!!.total)
        job.cancel()
    }

    @Test fun `failed delete rolls back by invalidating everything`() = runTest(UnconfinedTestDispatcher()) {
        val repo = FakeRepo().apply { failDelete = true }
        val item = Item(id = "a", categoryId = "food")
        repo.items += item
        val store = newStore(repo)
        store.refreshMetaNow()
        val version = store.version.value
        val errors = mutableListOf<String>()
        backgroundScope.launch { store.errors.toList(errors) }

        assertFalse(store.delete(item))
        advanceUntilIdle()

        assertEquals(version + 1, store.version.value)                       // lists refetch: item returns
        assertEquals(1, store.meta.value.categories.single().itemCount)     // counts restored
        assertTrue(errors.single().startsWith("Couldn't delete"))
    }

    @Test fun `any change refetches categories and stats`() = runTest(UnconfinedTestDispatcher()) {
        val repo = FakeRepo()
        val store = newStore(repo)
        repo.items += Item(id = "x", categoryId = "web")
        repo.emit(LibraryChange.Created) // e.g. upload or share finished in a worker
        advanceUntilIdle()
        assertEquals(listOf("web"), store.meta.value.categories.map { it.id })
        assertEquals(1, store.meta.value.stats!!.total)
    }

    @Test fun `deleting a category removes it and invalidates lists`() = runTest(UnconfinedTestDispatcher()) {
        val repo = FakeRepo()
        repo.items += Item(id = "x", categoryId = "web")
        val store = newStore(repo)
        store.refreshMetaNow()
        val version = store.version.value
        store.deleteCategory("web")
        advanceUntilIdle()
        assertTrue(store.meta.value.categories.isEmpty())
        assertTrue(store.version.value > version)
    }

    @Test fun `reset forgets everything`() = runTest(UnconfinedTestDispatcher()) {
        val repo = FakeRepo()
        repo.items += Item(id = "x", categoryId = "web")
        val store = newStore(repo)
        store.refreshMetaNow()
        store.reset()
        assertFalse(store.meta.value.loaded)
        assertTrue(store.meta.value.categories.isEmpty())
    }
}
