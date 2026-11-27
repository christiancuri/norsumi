package com.norsumi.app.ui.categories

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.windowInsetsTopHeight
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.norsumi.app.data.model.Category
import com.norsumi.app.data.model.CategoryNode
import com.norsumi.app.ui.LocalContainer
import com.norsumi.app.ui.components.EmptyState
import com.norsumi.app.ui.components.StatusBarScrim
import com.norsumi.app.ui.theme.InstrumentSerif
import com.norsumi.app.ui.theme.NorsumiTheme
import com.norsumi.app.ui.theme.categoryChipColors
import com.norsumi.app.ui.theme.categoryShades

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CategoriesTab(bottom: PaddingValues, onOpenCategory: (String) -> Unit) {
    val container = LocalContainer.current
    val vm: CategoriesViewModel = viewModel { CategoriesViewModel(container) }
    val state by vm.state.collectAsStateWithLifecycle()
    val refreshing by vm.refreshing.collectAsStateWithLifecycle()
    var editing by remember { mutableStateOf<Category?>(null) }
    val colors = NorsumiTheme.colors
    val top = WindowInsets.statusBars.asPaddingValues().calculateTopPadding()

    Box(Modifier.fillMaxSize()) {
        PullToRefreshBox(isRefreshing = refreshing, onRefresh = vm::refresh, modifier = Modifier.fillMaxSize()) {
        LazyVerticalGrid(
            columns = GridCells.Fixed(2),
            contentPadding = PaddingValues(start = 12.dp, end = 12.dp, top = top + 8.dp, bottom = bottom.calculateBottomPadding() + 96.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
            modifier = Modifier.fillMaxSize(),
        ) {
            item(key = "header", span = { GridItemSpan(maxLineSpan) }, contentType = "header") {
                Column(Modifier.padding(start = 4.dp, top = 20.dp, bottom = 10.dp)) {
                    Text(
                        buildAnnotatedString {
                            append("Neatly ")
                            withStyle(SpanStyle(fontStyle = FontStyle.Italic)) { append("filed") }
                        },
                        style = MaterialTheme.typography.displaySmall,
                    )
                    Spacer(Modifier.height(6.dp))
                    Text(
                        "${state.tree.size} sources · ${state.all.size - state.tree.size} topics · long-press to edit",
                        style = MaterialTheme.typography.bodySmall, color = colors.muted,
                    )
                }
            }
            if (!state.loading && state.tree.isEmpty()) {
                item(key = "empty", span = { GridItemSpan(maxLineSpan) }) {
                    EmptyState(
                        if (state.error != null) "Can't reach norsumi" else "No categories yet",
                        state.error ?: "norsumi creates them as it files your screenshots and links.",
                    )
                }
            }
            items(state.tree, key = { it.category.id }, contentType = { "root" }) { node ->
                RootCard(node, onClick = { onOpenCategory(node.category.id) }, onLongClick = { editing = node.category })
            }
        }
        }
        StatusBarScrim()
    }

    editing?.let { cat ->
        CategoryEditSheet(
            category = cat,
            onDismiss = { editing = null },
            onSave = { patch -> vm.update(cat.id, patch); editing = null },
            onDelete = { vm.delete(cat.id); editing = null },
        )
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun RootCard(node: CategoryNode, onClick: () -> Unit, onLongClick: () -> Unit) {
    val colors = NorsumiTheme.colors
    val (bg, ink) = categoryChipColors(node.category.color)
    val accent = categoryShades(node.category.color).base
    val haptics = LocalHapticFeedback.current
    val shape = RoundedCornerShape(24.dp)
    Box(
        Modifier
            .fillMaxWidth()
            .heightIn(min = 188.dp)
            .clip(shape)
            .background(Brush.linearGradient(listOf(bg, colors.surface)))
            .border(1.dp, colors.border, shape)
            .combinedClickable(onClick = onClick, onLongClick = {
                haptics.performHapticFeedback(HapticFeedbackType.LongPress)
                onLongClick()
            }),
    ) {
        // Oversized emoji watermark.
        Text(
            node.category.emoji, fontSize = 96.sp,
            modifier = Modifier.align(Alignment.TopEnd).offset(x = 22.dp, y = (-16).dp),
            color = colors.foreground.copy(alpha = 0.08f),
        )
        Column(Modifier.padding(16.dp)) {
            Box(
                Modifier.size(46.dp).clip(RoundedCornerShape(14.dp)).background(colors.surface.copy(alpha = 0.9f)),
                contentAlignment = Alignment.Center,
            ) { Text(node.category.emoji, fontSize = 24.sp) }
            Spacer(Modifier.height(22.dp))
            Text(
                node.category.name, fontFamily = InstrumentSerif, fontSize = 28.sp, lineHeight = 30.sp,
                color = colors.foreground, maxLines = 1, overflow = TextOverflow.Ellipsis,
            )
            Spacer(Modifier.height(2.dp))
            Text(
                "${node.totalCount} item${if (node.totalCount == 1) "" else "s"}",
                style = MaterialTheme.typography.labelMedium, color = ink,
            )
            if (node.children.isNotEmpty()) {
                Spacer(Modifier.height(10.dp))
                Text(
                    node.children.joinToString("  ·  ") { "${it.emoji} ${it.name}" },
                    style = MaterialTheme.typography.bodySmall, color = colors.muted, maxLines = 2, overflow = TextOverflow.Ellipsis,
                )
            }
        }
        Box(
            Modifier.align(Alignment.TopEnd).padding(14.dp).size(8.dp).clip(CircleShape).background(accent),
        )
    }
}
