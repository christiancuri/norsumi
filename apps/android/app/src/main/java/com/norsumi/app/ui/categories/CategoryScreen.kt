package com.norsumi.app.ui.categories

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.staggeredgrid.StaggeredGridItemSpan
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.norsumi.app.data.model.Category
import com.norsumi.app.data.model.ItemQuery
import com.norsumi.app.ui.LocalContainer
import com.norsumi.app.ui.components.EmptyState
import com.norsumi.app.ui.components.ItemGrid
import com.norsumi.app.ui.library.ItemsViewModel
import com.norsumi.app.ui.theme.NorsumiTheme
import com.norsumi.app.ui.theme.categoryChipColors

@Composable
fun CategoryScreen(id: String, onBack: () -> Unit, onOpenItem: (String) -> Unit, onOpenCategory: (String) -> Unit) {
    val container = LocalContainer.current
    val catsVm: CategoriesViewModel = viewModel { CategoriesViewModel(container) }
    val itemsVm: ItemsViewModel = viewModel(key = "cat-$id") { ItemsViewModel(container, ItemQuery(categoryId = id)) }
    val cats by catsVm.state.collectAsStateWithLifecycle()
    val items by itemsVm.state.collectAsStateWithLifecycle()
    val colors = NorsumiTheme.colors
    var editing by remember { mutableStateOf<Category?>(null) }

    val category = cats.all.firstOrNull { it.id == id }
    val parent = cats.all.firstOrNull { it.id == category?.parentId }
    val children = cats.all.filter { it.parentId == id }.sortedBy { it.name.lowercase() }
    val top = WindowInsets.statusBars.asPaddingValues().calculateTopPadding()
    val bottom = WindowInsets.navigationBars.asPaddingValues().calculateBottomPadding()

    Box(Modifier.fillMaxSize().background(colors.background)) {
        ItemGrid(
            items = items.items,
            onOpen = { onOpenItem(it.id) },
            onLoadMore = itemsVm::loadMore,
            contentPadding = PaddingValues(start = 12.dp, end = 12.dp, top = top + 56.dp, bottom = bottom + 24.dp),
        ) {
            item(key = "header", span = StaggeredGridItemSpan.FullLine, contentType = "header") {
                Column(Modifier.padding(start = 4.dp, end = 4.dp, top = 8.dp, bottom = 8.dp)) {
                    if (category != null) {
                        Text(category.emoji, style = MaterialTheme.typography.headlineLarge)
                        Spacer(Modifier.height(8.dp))
                        Text(
                            buildAnnotatedString {
                                if (parent != null) {
                                    withStyle(SpanStyle(color = colors.muted)) { append("${parent.name} › ") }
                                    withStyle(SpanStyle(fontStyle = FontStyle.Italic)) { append(category.name) }
                                } else {
                                    append(category.name)
                                }
                            },
                            style = MaterialTheme.typography.displaySmall,
                        )
                        category.description?.takeIf { it.isNotBlank() }?.let {
                            Spacer(Modifier.height(6.dp))
                            Text(it, style = MaterialTheme.typography.bodyMedium, color = colors.muted)
                        }
                        Spacer(Modifier.height(4.dp))
                        Text(
                            "${items.items.size}${if (items.nextCursor != null) "+" else ""} items",
                            style = MaterialTheme.typography.labelMedium, color = colors.muted,
                        )
                    }
                }
            }
            if (children.isNotEmpty()) {
                item(key = "children", span = StaggeredGridItemSpan.FullLine, contentType = "chips") {
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp), contentPadding = PaddingValues(vertical = 8.dp)) {
                        items(children, key = { it.id }) { child ->
                            val (bg, ink) = categoryChipColors(child.color)
                            Row(
                                Modifier
                                    .clip(CircleShape)
                                    .background(bg)
                                    .border(1.dp, ink.copy(alpha = 0.12f), CircleShape)
                                    .clickable { onOpenCategory(child.id) }
                                    .padding(horizontal = 14.dp, vertical = 8.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Text(child.emoji)
                                Spacer(Modifier.size(6.dp))
                                Text(child.name, style = MaterialTheme.typography.labelLarge, color = ink)
                                Spacer(Modifier.size(6.dp))
                                Text("${child.itemCount}", style = MaterialTheme.typography.labelSmall, color = ink.copy(alpha = 0.6f))
                            }
                        }
                    }
                }
            }
            if (!items.loading && items.items.isEmpty()) {
                item(key = "empty", span = StaggeredGridItemSpan.FullLine) {
                    EmptyState("Nothing filed here", "Items norsumi files under this category show up here.")
                }
            }
        }
        // Floating glass top bar.
        Row(
            Modifier.fillMaxWidth().background(colors.background.copy(alpha = 0.9f)).statusBarsPadding().padding(horizontal = 4.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") }
            Spacer(Modifier.weight(1f))
            if (category != null) IconButton(onClick = { editing = category }) { Icon(Icons.Outlined.Edit, "Edit category") }
        }
    }
    editing?.let { cat ->
        CategoryEditSheet(
            cat,
            onDismiss = { editing = null },
            onSave = { catsVm.update(cat.id, it); editing = null },
            onDelete = { catsVm.delete(cat.id); editing = null; onBack() },
        )
    }
}
