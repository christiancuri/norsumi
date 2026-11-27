package com.norsumi.app.data.repo

import com.norsumi.app.data.model.Category
import com.norsumi.app.data.model.CategoryPatch
import com.norsumi.app.data.model.Item
import com.norsumi.app.data.model.ItemPatch
import com.norsumi.app.data.model.LibraryStats
import com.norsumi.app.data.model.prunableWhenEmpty
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.merge
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
    /** Change events from every repository (remote + demo); each one refetches [meta]. */
    repoChanges: Flow<LibraryChange>,
    private val scope: CoroutineScope,
) {
    /** Optimistic events for lists only: they must not trigger a refetch that races the request. */
    private val local = MutableSharedFlow<LibraryChange>(extraBufferCapacity = 16)

    /** Everything lists should apply: repository changes plus optimistic ones. */
    val changes: Flow<LibraryChange> = merge(repoChanges, local)

    private val _meta = MutableStateFlow(LibraryMeta())
    val meta: StateFlow<LibraryMeta> = _meta.asStateFlow()

    private val _version = MutableStateFlow(0L)
    val version: StateFlow<Long> = _version.asStateFlow()

    private val _errors = MutableSharedFlow<String>(extraBufferCapacity = 4)
    val errors: SharedFlow<String> = _errors.asSharedFlow()

    private val working = mutableSetOf<String>()

    /** Deletes in flight (item id → its category). Refetches that race them re-apply them. */
    private val pendingDeletes = mutableMapOf<String, String?>()
    private val metaMutex = Mutex()

    init {
        // Deletes go through [delete], which refreshes itself once the in-flight bookkeeping is done.
        scope.launch { repoChanges.collect { if (it !is LibraryChange.Deleted) refreshMeta() } }
    }

    /** Refetches categories + stats in the background. */
    fun refreshMeta() {
        scope.launch { refreshMetaNow() }
    }

    /** Refetches categories + stats; concurrent calls are serialized so the latest result wins. */
    suspend fun refreshMetaNow() = metaMutex.withLock {
        try {
            val inFlight = synchronized(pendingDeletes) { pendingDeletes.values.toList() }
            var categories = repo().categories()
            var stats = runCatching { repo().stats() }.getOrNull()
            // The server may not have committed these yet: keep the optimistic view.
            for (categoryId in inFlight) {
                categories = applyDelete(categories, categoryId)
                stats = stats?.let { it.copy(total = (it.total - 1).coerceAtLeast(0)) }
            }
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
        // Optimistic: lists drop it now, counts follow. The repository's own event after a
        // successful delete triggers the authoritative refetch.
        local.tryEmit(LibraryChange.Deleted(item.id))
        synchronized(pendingDeletes) { pendingDeletes[item.id] = item.categoryId }
        _meta.update { m ->
            m.copy(
                categories = applyDelete(m.categories, item.categoryId),
                stats = m.stats?.let { s -> s.copy(total = (s.total - 1).coerceAtLeast(0)) },
            )
        }
        val ok = try {
            repo.delete(item.id)
            true
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            _errors.tryEmit("Couldn't delete: ${e.message ?: "error"}")
            false
        } finally {
            synchronized(pendingDeletes) { pendingDeletes.remove(item.id) }
        }
        // Authoritative refetch now that the server has answered; on failure it also rolls back.
        if (ok) refreshMeta() else invalidateAll()
        return ok
    }

    /** One item fewer in [categoryId], pruning it (and its parent) when the server would. */
    private fun applyDelete(categories: List<Category>, categoryId: String?): List<Category> {
        val counted = categories.map { c -> if (c.id == categoryId) c.copy(itemCount = (c.itemCount - 1).coerceAtLeast(0)) else c }
        return pruneEmptyAi(counted, categoryId)
    }

    /**
     * Mirrors the server's pruning so screens react at once: an AI category left with no items and no
     * children disappears, and so does its AI parent if that leaves it empty too.
     */
    private fun pruneEmptyAi(categories: List<Category>, leafId: String?): List<Category> {
        val leaf = categories.firstOrNull { it.id == leafId } ?: return categories
        if (!leaf.prunableWhenEmpty(categories)) return categories
        var result = categories.filterNot { it.id == leaf.id }
        val parent = result.firstOrNull { it.id == leaf.parentId }
        if (parent != null && parent.prunableWhenEmpty(result)) result = result.filterNot { it.id == parent.id }
        return result
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
