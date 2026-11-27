package com.norsumi.app.ui.library

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.norsumi.app.AppContainer
import com.norsumi.app.data.model.Item
import com.norsumi.app.data.model.ItemKind
import com.norsumi.app.data.model.ItemQuery
import com.norsumi.app.data.repo.LibraryChange
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.drop
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.isActive

enum class LibraryFilter(val label: String) {
    All("All"), Screenshots("Screenshots"), Links("Links"), Notes("Notes"), Favorites("Favorites");

    fun apply(q: ItemQuery) = when (this) {
        All -> q
        Screenshots -> q.copy(kinds = listOf(ItemKind.Screenshot, ItemKind.Image))
        Links -> q.copy(kinds = listOf(ItemKind.Link))
        Notes -> q.copy(kinds = listOf(ItemKind.Note))
        Favorites -> q.copy(favorite = true)
    }
}

data class ItemsState(
    val items: List<Item> = emptyList(),
    val loading: Boolean = true,
    val refreshing: Boolean = false,
    val loadingMore: Boolean = false,
    val nextCursor: String? = null,
    val error: String? = null,
    val filter: LibraryFilter = LibraryFilter.All,
    val query: String = "",
)

/**
 * Cursor-paged item list used by Library, Category and Search. Polls every 3s while anything is
 * still pending/processing and applies local edits from [LibraryChange] without refetching.
 */
class ItemsViewModel(
    private val container: AppContainer,
    private val base: ItemQuery = ItemQuery(),
    private val requireQuery: Boolean = false,
) : ViewModel() {
    private val _state = MutableStateFlow(ItemsState(loading = !requireQuery))
    val state: StateFlow<ItemsState> = _state.asStateFlow()
    private var loadJob: Job? = null

    init {
        if (!requireQuery) load(reset = true)
        viewModelScope.launch {
            container.store.changes.collect { change ->
                when (change) {
                    is LibraryChange.Updated -> _state.update { s ->
                        s.copy(items = s.items.map { if (it.id == change.item.id) change.item else it }.filterNot { it.archived && base.archived != true })
                    }
                    is LibraryChange.Deleted -> _state.update { s -> s.copy(items = s.items.filterNot { it.id == change.id }) }
                    LibraryChange.Created, LibraryChange.CategoriesChanged -> silentRefresh()
                }
            }
        }
        // App resumed / tab re-entered / rollback: refetch quietly.
        viewModelScope.launch { container.store.version.drop(1).collect { silentRefresh() } }
        viewModelScope.launch {
            while (isActive) {
                delay(3000)
                if (_state.value.items.any { it.status.isWorking }) silentRefresh()
            }
        }
    }

    private fun currentQuery(): ItemQuery {
        val s = _state.value
        return s.filter.apply(base).copy(q = s.query.trim().ifEmpty { null })
    }

    fun setFilter(filter: LibraryFilter) {
        if (filter == _state.value.filter) return
        _state.update { it.copy(filter = filter, items = emptyList(), loading = true, nextCursor = null) }
        load(reset = true)
    }

    fun setQuery(q: String) {
        _state.update { it.copy(query = q) }
        loadJob?.cancel()
        if (requireQuery && q.isBlank()) {
            _state.update { it.copy(items = emptyList(), loading = false, error = null) }
            return
        }
        loadJob = viewModelScope.launch {
            delay(350) // debounce typing
            _state.update { it.copy(loading = true) }
            fetch(reset = true)
        }
    }

    /** Pull-to-refresh: this list plus categories and stats. */
    fun refresh() {
        container.store.refreshMeta()
        if (requireQuery && _state.value.query.isBlank()) return
        _state.update { it.copy(refreshing = true) }
        load(reset = true)
    }

    fun loadMore() {
        val s = _state.value
        if (s.loading || s.loadingMore || s.nextCursor == null) return
        _state.update { it.copy(loadingMore = true) }
        loadJob = viewModelScope.launch { fetch(reset = false) }
    }

    private fun load(reset: Boolean) {
        loadJob?.cancel()
        loadJob = viewModelScope.launch { fetch(reset) }
    }

    /** Refetches the first page quietly (no spinner); keeps already-loaded later pages. */
    fun refreshQuietly() = silentRefresh()

    private fun silentRefresh() {
        if (requireQuery && _state.value.query.isBlank()) return
        viewModelScope.launch {
            val page = runCatching { container.library.items(currentQuery(), null) }
                .onFailure { if (it !is kotlinx.coroutines.CancellationException) android.util.Log.w(TAG, "Refresh failed", it) }
                .getOrNull() ?: return@launch
            container.store.onItemsSeen(page.items)
            _state.update { s ->
                val fresh = page.items.associateBy { it.id }
                // Keep pages loaded beyond the first one.
                val tail = s.items.drop(base.limit).filter { it.id !in fresh }
                s.copy(items = page.items + tail, nextCursor = if (tail.isEmpty()) page.nextCursor else s.nextCursor)
            }
        }
    }

    private companion object {
        const val TAG = "norsumi.items"
    }

    private suspend fun fetch(reset: Boolean) {
        val cursor = if (reset) null else _state.value.nextCursor
        try {
            val page = container.library.items(currentQuery(), cursor)
            container.store.onItemsSeen(page.items)
            _state.update { s ->
                s.copy(
                    items = if (reset) page.items else (s.items + page.items).distinctBy { it.id },
                    nextCursor = page.nextCursor, loading = false, refreshing = false, loadingMore = false, error = null,
                )
            }
        } catch (e: kotlinx.coroutines.CancellationException) {
            throw e
        } catch (e: Exception) {
            android.util.Log.w(TAG, "Load failed", e)
            _state.update { it.copy(loading = false, refreshing = false, loadingMore = false, error = e.message ?: "Couldn't load") }
        }
    }
}
