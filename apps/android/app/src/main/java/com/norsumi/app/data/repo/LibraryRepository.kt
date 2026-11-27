package com.norsumi.app.data.repo

import com.norsumi.app.data.model.Category
import com.norsumi.app.data.model.CategoryPatch
import com.norsumi.app.data.model.Item
import com.norsumi.app.data.model.ItemListResponse
import com.norsumi.app.data.model.ItemPatch
import com.norsumi.app.data.model.ItemQuery
import com.norsumi.app.data.model.LibraryStats
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow

/** Local change notifications so every screen stays in sync after an edit made elsewhere. */
sealed interface LibraryChange {
    data class Updated(val item: Item) : LibraryChange
    data class Deleted(val id: String) : LibraryChange
    data object Created : LibraryChange
    data object CategoriesChanged : LibraryChange
}

interface LibraryRepository {
    val changes: SharedFlow<LibraryChange>

    /** Publishes a change (also used for optimistic updates and by background workers). */
    fun emit(change: LibraryChange)

    suspend fun items(query: ItemQuery, cursor: String?): ItemListResponse
    suspend fun item(id: String): Item
    suspend fun update(id: String, patch: ItemPatch): Item
    suspend fun delete(id: String)
    suspend fun reprocess(id: String): Item
    suspend fun createNote(text: String): Item
    suspend fun createLink(url: String, text: String?): Item

    suspend fun stats(): LibraryStats

    suspend fun categories(): List<Category>
    suspend fun updateCategory(id: String, patch: CategoryPatch): Category
    suspend fun deleteCategory(id: String)
}

abstract class BaseLibraryRepository : LibraryRepository {
    private val _changes = MutableSharedFlow<LibraryChange>(extraBufferCapacity = 16)
    override val changes: SharedFlow<LibraryChange> = _changes.asSharedFlow()
    override fun emit(change: LibraryChange) {
        _changes.tryEmit(change)
    }
}
