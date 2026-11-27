package com.norsumi.app.ui.search

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.staggeredgrid.StaggeredGridItemSpan
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.norsumi.app.ui.LocalContainer
import com.norsumi.app.ui.components.ItemGrid
import com.norsumi.app.ui.library.ItemsViewModel
import com.norsumi.app.ui.theme.NorsumiTheme

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SearchTab(bottom: PaddingValues, onOpenItem: (String) -> Unit) {
    val container = LocalContainer.current
    val vm: ItemsViewModel = viewModel(key = "search") { ItemsViewModel(container, requireQuery = true) }
    val state by vm.state.collectAsStateWithLifecycle()
    val colors = NorsumiTheme.colors
    val focus = remember { FocusRequester() }
    LaunchedEffect(Unit) { if (state.query.isEmpty()) focus.requestFocus() }

    Column(Modifier.fillMaxSize().statusBarsPadding()) {
        Row(
            Modifier
                .padding(horizontal = 16.dp, vertical = 12.dp)
                .fillMaxWidth()
                .height(52.dp)
                .clip(CircleShape)
                .background(colors.surface)
                .border(1.dp, colors.border, CircleShape)
                .padding(start = 18.dp, end = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(Icons.Outlined.Search, null, tint = colors.muted)
            Spacer(Modifier.width(10.dp))
            Box(Modifier.weight(1f)) {
                if (state.query.isEmpty()) Text("Search your library", style = MaterialTheme.typography.bodyLarge, color = colors.muted)
                BasicTextField(
                    value = state.query,
                    onValueChange = vm::setQuery,
                    singleLine = true,
                    textStyle = MaterialTheme.typography.bodyLarge.copy(color = colors.foreground),
                    cursorBrush = SolidColor(MaterialTheme.colorScheme.primary),
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                    modifier = Modifier.fillMaxWidth().focusRequester(focus),
                )
            }
            if (state.loading && state.query.isNotBlank()) {
                CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp)
                Spacer(Modifier.width(10.dp))
            }
            if (state.query.isNotEmpty()) IconButton(onClick = { vm.setQuery("") }) { Icon(Icons.Outlined.Close, "Clear") }
        }
        PullToRefreshBox(isRefreshing = state.refreshing, onRefresh = vm::refresh, modifier = Modifier.weight(1f)) {
        ItemGrid(
            items = state.items,
            onOpen = { onOpenItem(it.id) },
            onLoadMore = vm::loadMore,
            loading = state.loading && state.query.isNotBlank(),
            contentPadding = PaddingValues(start = 12.dp, end = 12.dp, bottom = bottom.calculateBottomPadding() + 24.dp),
        ) {
            if (state.query.isBlank()) {
                item(key = "hint", span = StaggeredGridItemSpan.FullLine) {
                    Column(Modifier.padding(horizontal = 8.dp, vertical = 32.dp)) {
                        Text(
                            buildAnnotatedString {
                                append("Find it by ")
                                withStyle(SpanStyle(fontStyle = FontStyle.Italic)) { append("meaning") }
                                append(",\nnot by filename.")
                            },
                            style = MaterialTheme.typography.headlineLarge,
                        )
                        Spacer(Modifier.height(12.dp))
                        Text(
                            "Try “pizza place in Pinheiros”, “that thread about small models” or “trip to the dunes”.",
                            style = MaterialTheme.typography.bodyMedium, color = colors.muted,
                        )
                    }
                }
            } else if (!state.loading && state.items.isEmpty()) {
                item(key = "none", span = StaggeredGridItemSpan.FullLine) {
                    Column(Modifier.padding(horizontal = 8.dp, vertical = 32.dp)) {
                        Text("Nothing matches “${state.query.trim()}”", style = MaterialTheme.typography.headlineSmall)
                        Spacer(Modifier.height(6.dp))
                        Text(state.error ?: "Try fewer or different words.", style = MaterialTheme.typography.bodyMedium, color = colors.muted)
                    }
                }
            }
        }
        }
    }
}
