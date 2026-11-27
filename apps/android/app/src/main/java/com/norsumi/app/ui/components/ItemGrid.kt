package com.norsumi.app.ui.components

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.lazy.staggeredgrid.LazyStaggeredGridScope
import androidx.compose.foundation.lazy.staggeredgrid.LazyStaggeredGridState
import androidx.compose.foundation.lazy.staggeredgrid.LazyVerticalStaggeredGrid
import androidx.compose.foundation.lazy.staggeredgrid.StaggeredGridCells
import androidx.compose.foundation.lazy.staggeredgrid.items
import androidx.compose.foundation.lazy.staggeredgrid.rememberLazyStaggeredGridState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.unit.dp
import com.norsumi.app.data.model.Item
import com.norsumi.app.ui.theme.Motion
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.filter

/** Two-column masonry of item cards with a full-width header slot and infinite scroll. */
@Composable
fun ItemGrid(
    items: List<Item>,
    onOpen: (Item) -> Unit,
    modifier: Modifier = Modifier,
    state: LazyStaggeredGridState = rememberLazyStaggeredGridState(),
    contentPadding: PaddingValues = PaddingValues(12.dp),
    onLoadMore: (() -> Unit)? = null,
    /** First page still loading: show skeleton cards instead of an empty grid. */
    loading: Boolean = false,
    header: LazyStaggeredGridScope.() -> Unit = {},
) {
    if (onLoadMore != null) {
        val nearEnd by remember(state) {
            derivedStateOf {
                val info = state.layoutInfo
                val last = info.visibleItemsInfo.lastOrNull()?.index ?: 0
                info.totalItemsCount > 0 && last >= info.totalItemsCount - 8
            }
        }
        LaunchedEffect(state, items.size) {
            snapshotFlow { nearEnd }.distinctUntilChanged().filter { it }.collect { onLoadMore() }
        }
    }
    LazyVerticalStaggeredGrid(
        columns = StaggeredGridCells.Fixed(2),
        state = state,
        modifier = modifier.fillMaxSize(),
        contentPadding = contentPadding,
        verticalItemSpacing = 10.dp,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        header()
        if (loading && items.isEmpty()) {
            items(SkeletonHeights.size, key = { "skeleton-$it" }, contentType = { "skeleton" }) { i ->
                SkeletonCard(SkeletonHeights[i])
            }
        }
        items(items, key = { it.id }, contentType = { it.kind }) { item ->
            ItemCard(item, onClick = { onOpen(item) }, modifier = Modifier.appear(item.id).animateItem())
        }
    }
}

/** Short fade + rise the first time a card is composed. */
@Composable
private fun Modifier.appear(key: String): Modifier {
    val progress = remember(key) { Animatable(0f) }
    LaunchedEffect(key) { progress.animateTo(1f, tween(Motion.Medium, easing = Motion.Easing)) }
    return graphicsLayer {
        alpha = progress.value
        translationY = (1f - progress.value) * 14.dp.toPx()
    }
}
