package com.norsumi.app.data.repo

import com.norsumi.app.data.api.NorsumiApi
import com.norsumi.app.data.model.Category
import com.norsumi.app.data.model.CategoryPatch
import com.norsumi.app.data.model.Item
import com.norsumi.app.data.model.ItemListResponse
import com.norsumi.app.data.model.ItemPatch
import com.norsumi.app.data.model.ItemQuery
import java.time.Instant

class RemoteLibraryRepository(private val api: NorsumiApi) : BaseLibraryRepository() {
    override suspend fun items(query: ItemQuery, cursor: String?): ItemListResponse = api.items(query, cursor)

    override suspend fun item(id: String): Item = api.item(id)

    override suspend fun update(id: String, patch: ItemPatch): Item =
        api.updateItem(id, patch).also { emit(LibraryChange.Updated(it)) }

    override suspend fun delete(id: String) {
        api.deleteItem(id)
        emit(LibraryChange.Deleted(id))
    }

    override suspend fun reprocess(id: String): Item = api.reprocess(id).also { emit(LibraryChange.Updated(it)) }

    override suspend fun createNote(text: String): Item =
        api.createNote(text, Instant.now().toString()).also { emit(LibraryChange.Created) }

    override suspend fun createLink(url: String, text: String?): Item =
        api.createLink(url, text, Instant.now().toString()).also { emit(LibraryChange.Created) }

    override suspend fun categories(): List<Category> = api.categories()

    override suspend fun updateCategory(id: String, patch: CategoryPatch): Category =
        api.updateCategory(id, patch).also { emit(LibraryChange.CategoriesChanged) }

    override suspend fun deleteCategory(id: String) {
        api.deleteCategory(id)
        emit(LibraryChange.CategoriesChanged)
    }
}
