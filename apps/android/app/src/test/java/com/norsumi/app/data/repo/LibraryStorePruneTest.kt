package com.norsumi.app.data.repo

import com.norsumi.app.data.model.Category
import com.norsumi.app.data.model.CategoryPatch
import com.norsumi.app.data.model.Item
import com.norsumi.app.data.model.ItemListResponse
import com.norsumi.app.data.model.ItemPatch
import com.norsumi.app.data.model.ItemQuery
import com.norsumi.app.data.model.LibraryStats
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/** Server stand-in whose delete waits on [gate], so the optimistic state can be observed. */
private class GatedRepo(var categories: List<Category>) : BaseLibraryRepository() {
    val gate = CompletableDeferred<Unit>()
    override suspend fun categories() = categories
    override suspend fun stats() = LibraryStats()
    override suspend fun items(query: ItemQuery, cursor: String?) = ItemListResponse()
    override suspend fun item(id: String) = Item(id = id)
    override suspend fun update(id: String, patch: ItemPatch) = Item(id = id)
    override suspend fun delete(id: String) = gate.await()
    override suspend fun reprocess(id: String) = Item(id = id)
    override suspend fun createNote(text: String) = Item(id = "n")
    override suspend fun createLink(url: String, text: String?) = Item(id = "l")
    override suspend fun updateCategory(id: String, patch: CategoryPatch) = Category(id = id, name = id)
    override suspend fun deleteCategory(id: String) = Unit
}

@OptIn(ExperimentalCoroutinesApi::class)
class LibraryStorePruneTest {
    private val root = Category(id = "yt", name = "YouTube", itemCount = 0, origin = "ai")
    private val leaf = Category(id = "rc", name = "Recipes", parentId = "yt", itemCount = 1, origin = "ai")

    @Test fun `deleting the last item drops its empty AI category and AI parent before the server answers`() =
        runTest(UnconfinedTestDispatcher()) {
            val repo = GatedRepo(listOf(root, leaf))
            val store = LibraryStore({ repo }, repo.changes, backgroundScope)
            store.refreshMetaNow()

            val job = launch { store.delete(Item(id = "a", categoryId = "rc")) }
            // Server hasn't answered yet: both categories are already gone, so open pages pop at once.
            assertTrue(store.meta.value.categories.isEmpty())

            repo.categories = emptyList() // what the server prunes
            repo.gate.complete(Unit)
            job.join()
            advanceUntilIdle()
            assertTrue(store.meta.value.categories.isEmpty())
        }

    @Test fun `a refetch racing the delete keeps the optimistic state`() = runTest(UnconfinedTestDispatcher()) {
        val repo = GatedRepo(listOf(root, leaf))
        val store = LibraryStore({ repo }, repo.changes, backgroundScope)
        store.refreshMetaNow()

        val job = launch { store.delete(Item(id = "a", categoryId = "rc")) }
        // A screen re-entering composition refetches while the server still has the item.
        store.refreshMetaNow()
        assertTrue(store.meta.value.categories.isEmpty())

        repo.categories = emptyList()
        repo.gate.complete(Unit)
        job.join()
        advanceUntilIdle()
        assertTrue(store.meta.value.categories.isEmpty())
    }

    @Test fun `user categories stay, with the count at zero`() = runTest(UnconfinedTestDispatcher()) {
        val mine = leaf.copy(origin = "user")
        val repo = GatedRepo(listOf(root, mine))
        val store = LibraryStore({ repo }, repo.changes, backgroundScope)
        store.refreshMetaNow()

        val job = launch { store.delete(Item(id = "a", categoryId = "rc")) }
        assertEquals(listOf("yt", "rc"), store.meta.value.categories.map { it.id })
        assertEquals(0, store.meta.value.categories.first { it.id == "rc" }.itemCount)
        repo.gate.complete(Unit)
        job.join()
    }
}
