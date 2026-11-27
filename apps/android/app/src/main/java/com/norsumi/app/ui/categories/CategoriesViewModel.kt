package com.norsumi.app.ui.categories

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.norsumi.app.AppContainer
import com.norsumi.app.data.model.Category
import com.norsumi.app.data.model.CategoryNode
import com.norsumi.app.data.model.CategoryPatch
import com.norsumi.app.data.model.toTree
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class CategoriesState(
    val all: List<Category> = emptyList(),
    val tree: List<CategoryNode> = emptyList(),
    val loading: Boolean = true,
    val error: String? = null,
)

/** A view over [com.norsumi.app.data.repo.LibraryStore.meta]; holds no data of its own. */
class CategoriesViewModel(private val container: AppContainer) : ViewModel() {
    private val store = container.store

    val state: StateFlow<CategoriesState> = store.meta
        .map { m -> CategoriesState(m.categories, m.categories.toTree(), loading = !m.loaded && m.error == null, error = m.error.takeIf { !m.loaded }) }
        .stateIn(viewModelScope, SharingStarted.Eagerly, CategoriesState())

    private val _refreshing = MutableStateFlow(false)
    val refreshing: StateFlow<Boolean> = _refreshing.asStateFlow()

    init {
        store.refreshMeta()
    }

    /** Pull-to-refresh. */
    fun refresh() {
        viewModelScope.launch {
            _refreshing.value = true
            store.refreshMetaNow()
            _refreshing.value = false
        }
    }

    fun update(id: String, patch: CategoryPatch) {
        viewModelScope.launch { runCatching { store.updateCategory(id, patch) } }
    }

    fun delete(id: String) {
        viewModelScope.launch { store.deleteCategory(id) }
    }
}
