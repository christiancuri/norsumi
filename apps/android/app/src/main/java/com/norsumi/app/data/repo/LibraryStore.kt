package com.norsumi.app.data.repo

import com.norsumi.app.data.model.Category
import com.norsumi.app.data.model.CategoryPatch
import com.norsumi.app.data.model.Item
import com.norsumi.app.data.model.ItemPatch
import com.norsumi.app.data.model.LibraryStats
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/** Library-wide data every screen shares: the category tree and the stats. */
data class LibraryMeta(
    val categories: List<Category> = emptyList(),
    val stats: LibraryStats? = null,
    /** True once categories were fetched at least once (so "missing" really means deleted). */
    val loaded: Boolean = false,
    val error: String? = null,
)

/**
 * App-scoped source of truth and invalidation bus.
 *
 * - [meta] holds categories + stats; every screen collects it instead of keeping its own copy.
 * - [version] bumps on [invalidateAll]; item lists and detail screens refetch when it changes.
 * - Any [LibraryChange] (edits, deletes, uploads, shares, category CRUD) refetches [meta].
 * - [onItemsSeen] spots items leaving pending/processing and refetches [meta], since the AI may
 *   have just created or filled a category.
 * - [delete] is optimistic: lists drop the item and counts drop at once; failures roll back by
 *   refetching everything and report on [errors].
 */
class LibraryStore(
    private val repo: () -> LibraryRepository,
    /** Change events from every repository (remote + demo), for screens that patch lists locally. */
    val changes: Flow<LibraryChange>,
    private val scope: CoroutineScope,
) {
    private val _meta = MutableStateFlow(LibraryMeta())
    val meta: StateFlow<LibraryMeta> = _meta.asStateFlow()

    private val _version = MutableStateFlow(0L)
    val version: StateFlow<Long> = _version.asStateFlow()

    private val _errors = MutableSharedFlow<String>(extraBufferCapacity = 4)
    val errors: SharedFlow<String> = _errors.asSharedFlow()

    private val working = mutableSetOf<String>()
    private val metaMutex = Mutex()

    init {
        scope.launch { changes.collect { refreshMeta() } }
    }

    /** Refetches categories + stats in the background. */
    fun refreshMeta() {
        scope.launch { refreshMetaNow() }
    }

    /** Refetches categories + stats; concurrent calls are serialized so the latest result wins. */
    suspend fun refreshMetaNow() = metaMutex.withLock {
        try {
            val categories = repo().categories()
            val stats = runCatching { repo().stats() }.getOrNull()
            _meta.update { it.copy(categories = categories, stats = stats ?: it.stats, loaded = true, error = null) }
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            _meta.update { it.copy(error = e.message ?: "Couldn't load") }
        }
    }

    /** Everything is stale (app resumed, tab re-entered, rollback): lists refetch, meta refetches. */
    fun invalidateAll() {
        _version.update { it + 1 }
        refreshMeta()
    }

    /** Forget everything (sign-out, demo toggle). */
    fun reset() {
        synchronized(working) { working.clear() }
        _meta.value = LibraryMeta()
        _version.update { it + 1 }
    }

    /** Lists and detail screens report what they fetched; a finished item refreshes [meta]. */
    fun onItemsSeen(items: Collection<Item>) {
        var finished = false
        synchronized(working) {
            for (item in items) {
                if (item.status.isWorking) {
                    working += item.id
                } else if (working.remove(item.id)) {
                    finished = true
                }
            }
        }
        if (finished) refreshMeta()
    }

    suspend fun update(id: String, patch: ItemPatch): Item = repo().update(id, patch)

    suspend fun delete(item: Item): Boolean {
        val repo = repo()
        // Optimistic: lists drop it now, counts follow.
        repo.emit(LibraryChange.Deleted(item.id))
        _meta.update { m ->
            m.copy(
                categories = m.categories.map { c -> if (c.id == item.categoryId) c.copy(itemCount = (c.itemCount - 1).coerceAtLeast(0)) else c },
                stats = m.stats?.let { s -> s.copy(total = (s.total - 1).coerceAtLeast(0)) },
            )
        }
        return try {
            repo.delete(item.id)
            true
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            _errors.tryEmit("Couldn't delete: ${e.message ?: "error"}")
            invalidateAll() // rollback: the item comes back with the refetch
            false
        }
    }

    suspend fun updateCategory(id: String, patch: CategoryPatch): Category = repo().updateCategory(id, patch)

    suspend fun deleteCategory(id: String) {
        // Optimistic: the category (and its children) vanish now; refetch confirms.
        val before = _meta.value
        _meta.update { m -> m.copy(categories = m.categories.filterNot { it.id == id || it.parentId == id }) }
        try {
            repo().deleteCategory(id)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            _meta.value = before
            _errors.tryEmit("Couldn't delete category: ${e.message ?: "error"}")
        }
        // Items in it became uncategorized.
        invalidateAll()
    }
}
