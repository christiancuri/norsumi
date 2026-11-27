package com.norsumi.app.ui.detail

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.norsumi.app.AppContainer
import com.norsumi.app.data.model.Category
import com.norsumi.app.data.model.Field
import com.norsumi.app.data.model.Item
import com.norsumi.app.data.model.ItemPatch
import com.norsumi.app.data.repo.LibraryChange
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

data class DetailState(
    val item: Item? = null,
    val error: String? = null,
    /** Local drafts win over server values while the user is editing. */
    val title: String? = null,
    val summary: String? = null,
    val note: String? = null,
    val categories: List<Category> = emptyList(),
    val deleted: Boolean = false,
)

class ItemDetailViewModel(private val container: AppContainer, private val id: String) : ViewModel() {
    private val _state = MutableStateFlow(DetailState())
    val state: StateFlow<DetailState> = _state.asStateFlow()
    private val saveJobs = mutableMapOf<String, Job>()
    private val repo get() = container.library

    init {
        viewModelScope.launch { load() }
        viewModelScope.launch { runCatching { repo.categories() }.onSuccess { c -> _state.update { it.copy(categories = c) } } }
        viewModelScope.launch {
            repo.changes.collect { change ->
                if (change is LibraryChange.Updated && change.item.id == id) _state.update { it.copy(item = change.item) }
            }
        }
        viewModelScope.launch {
            while (isActive) {
                delay(3000)
                if (_state.value.item?.status?.isWorking == true) load()
            }
        }
    }

    private suspend fun load() {
        runCatching { repo.item(id) }
            .onSuccess { item -> _state.update { it.copy(item = item, error = null) } }
            .onFailure { e -> _state.update { it.copy(error = e.message) } }
    }

    fun editTitle(v: String) = edit("title", { it.copy(title = v) }) { ItemPatch(title = v.trim()) }
    fun editSummary(v: String) = edit("summary", { it.copy(summary = v) }) { ItemPatch(summary = v.trim()) }
    fun editNote(v: String) = edit("note", { it.copy(note = v) }) {
        ItemPatch(note = v.trim().takeIf { it.isNotEmpty() }?.let { Field.Set(it) } ?: Field.Clear)
    }

    /** Applies a draft immediately and saves it after a short pause in typing. */
    private fun edit(key: String, draft: (DetailState) -> DetailState, patch: () -> ItemPatch) {
        _state.update(draft)
        saveJobs[key]?.cancel()
        saveJobs[key] = viewModelScope.launch {
            delay(700)
            patch(patch())
        }
    }

    fun patch(p: ItemPatch) {
        viewModelScope.launch {
            runCatching { repo.update(id, p) }
                .onSuccess { item -> _state.update { it.copy(item = item) } }
                .onFailure { e -> _state.update { it.copy(error = e.message) } }
        }
    }

    fun toggleFavorite() = _state.value.item?.let { item ->
        _state.update { it.copy(item = item.copy(favorite = !item.favorite)) }
        patch(ItemPatch(favorite = !item.favorite))
    }

    fun toggleArchive() = _state.value.item?.let { patch(ItemPatch(archived = !it.archived)) }

    fun setCategory(categoryId: String?) =
        patch(ItemPatch(categoryId = categoryId?.let { Field.Set(it) } ?: Field.Clear))

    fun addTag(tag: String) {
        val item = _state.value.item ?: return
        val t = tag.trim().lowercase()
        if (t.isEmpty() || t in item.tags) return
        patch(ItemPatch(tags = item.tags + t))
    }

    fun removeTag(tag: String) {
        val item = _state.value.item ?: return
        patch(ItemPatch(tags = item.tags - tag))
    }

    fun reprocess() {
        viewModelScope.launch {
            runCatching { repo.reprocess(id) }.onSuccess { item ->
                _state.update { it.copy(item = item, title = null, summary = null) }
            }
        }
    }

    fun delete() {
        viewModelScope.launch {
            runCatching { repo.delete(id) }
                .onSuccess { _state.update { it.copy(deleted = true) } }
                .onFailure { e -> _state.update { it.copy(error = e.message) } }
        }
    }
}
