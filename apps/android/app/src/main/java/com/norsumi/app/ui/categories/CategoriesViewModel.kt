package com.norsumi.app.ui.categories

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.norsumi.app.AppContainer
import com.norsumi.app.data.model.Category
import com.norsumi.app.data.model.CategoryNode
import com.norsumi.app.data.model.CategoryPatch
import com.norsumi.app.data.model.toTree
import com.norsumi.app.data.repo.LibraryChange
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class CategoriesState(
    val all: List<Category> = emptyList(),
    val tree: List<CategoryNode> = emptyList(),
    val loading: Boolean = true,
    val error: String? = null,
)

class CategoriesViewModel(private val container: AppContainer) : ViewModel() {
    private val _state = MutableStateFlow(CategoriesState())
    val state: StateFlow<CategoriesState> = _state.asStateFlow()

    init {
        refresh()
        viewModelScope.launch {
            container.library.changes.collect { if (it !is LibraryChange.Deleted) refresh() }
        }
    }

    fun refresh() {
        viewModelScope.launch {
            runCatching { container.library.categories() }
                .onSuccess { list -> _state.update { CategoriesState(list, list.toTree(), loading = false) } }
                .onFailure { e -> _state.update { it.copy(loading = false, error = e.message) } }
        }
    }

    fun update(id: String, patch: CategoryPatch, onError: (String) -> Unit = {}) {
        viewModelScope.launch {
            runCatching { container.library.updateCategory(id, patch) }.onFailure { onError(it.message ?: "Couldn't save") }
        }
    }

    fun delete(id: String) {
        viewModelScope.launch { runCatching { container.library.deleteCategory(id) } }
    }
}
