package com.norsumi.app.ui.library

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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsTopHeight
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.staggeredgrid.StaggeredGridItemSpan
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CloudUpload
import androidx.compose.material.icons.outlined.WarningAmber
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.LifecycleResumeEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.norsumi.app.capture.MediaAccess
import com.norsumi.app.capture.MediaPermissions
import com.norsumi.app.capture.QueueStatus
import com.norsumi.app.ui.LocalContainer
import com.norsumi.app.ui.components.EmptyState
import com.norsumi.app.ui.components.StatusBarScrim
import com.norsumi.app.ui.components.ItemGrid
import com.norsumi.app.ui.theme.NorsumiTheme

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LibraryTab(bottom: PaddingValues, onOpenItem: (String) -> Unit, onOpenPermissions: () -> Unit) {
    val container = LocalContainer.current
    val vm: ItemsViewModel = viewModel { ItemsViewModel(container) }
    val state by vm.state.collectAsStateWithLifecycle()
    val queue by container.scheduler.queue.collectAsStateWithLifecycle(QueueStatus(0, 0, 0))
    val settings by container.settings.settings.collectAsStateWithLifecycle()
    val context = LocalContext.current
    var mediaAccess by remember { mutableStateOf(MediaPermissions.access(context)) }
    LifecycleResumeEffect(Unit) { mediaAccess = MediaPermissions.access(context); onPauseOrDispose { } }
    val colors = NorsumiTheme.colors
    val top = WindowInsets.statusBars.asPaddingValues().calculateTopPadding()

    // Finished uploads become items: refresh when the queue drains.
    var lastActive by remember { mutableStateOf(0) }
    LaunchedEffect(queue.active) {
        if (queue.active < lastActive) vm.refresh()
        lastActive = queue.active
    }

    Box(Modifier.fillMaxSize()) {
        PullToRefreshBox(isRefreshing = state.refreshing, onRefresh = vm::refresh, modifier = Modifier.fillMaxSize()) {
            ItemGrid(
                items = state.items,
                onOpen = { onOpenItem(it.id) },
                onLoadMore = vm::loadMore,
                loading = state.loading,
                contentPadding = PaddingValues(start = 12.dp, end = 12.dp, top = top + 8.dp, bottom = bottom.calculateBottomPadding() + 96.dp),
            ) {
                item(key = "header", span = StaggeredGridItemSpan.FullLine, contentType = "header") {
                    Column(Modifier.padding(start = 4.dp, end = 4.dp, top = 20.dp, bottom = 4.dp)) {
                        Text(
                            buildAnnotatedString {
                                append("Your ")
                                withStyle(SpanStyle(fontStyle = FontStyle.Italic)) { append("library") }
                            },
                            style = MaterialTheme.typography.displaySmall,
                        )
                        Spacer(Modifier.height(6.dp))
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text(
                                when {
                                    settings.demoMode -> "Demo mode · sample content"
                                    settings.autoCapture -> "Auto-capture is on"
                                    else -> "Auto-capture is off"
                                },
                                style = MaterialTheme.typography.bodySmall, color = colors.muted,
                            )
                            if (queue.active > 0) UploadPill(queue.active)
                        }
                    }
                }
                if (!settings.demoMode && settings.autoCapture && mediaAccess != MediaAccess.Full) {
                    item(key = "perm", span = StaggeredGridItemSpan.FullLine, contentType = "banner") {
                        Banner(
                            if (mediaAccess == MediaAccess.Partial) "Allow all photos so new screenshots are captured." else "Photo access is off, so screenshots aren't captured.",
                            onOpenPermissions,
                        )
                    }
                }
                item(key = "filters", span = StaggeredGridItemSpan.FullLine, contentType = "filters") {
                    FilterRow(state.filter, vm::setFilter)
                }
                if (!state.loading && state.items.isEmpty()) {
                    item(key = "empty", span = StaggeredGridItemSpan.FullLine, contentType = "empty") {
                        if (state.error != null) {
                            EmptyState("Can't reach norsumi", state.error ?: "")
                        } else if (state.filter == LibraryFilter.All) {
                            EmptyState("Nothing here yet", "Take a screenshot or share a link to norsumi — it'll show up here, titled and filed.")
                        } else {
                            EmptyState("No ${state.filter.label.lowercase()} yet", "Try another filter.")
                        }
                    }
                }
            }
        }
        // Soft scrim behind the status bar so content scrolls under it gracefully.
        StatusBarScrim()
    }
}

@Composable
fun FilterRow(selected: LibraryFilter, onSelect: (LibraryFilter) -> Unit) {
    val colors = NorsumiTheme.colors
    LazyRow(
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        contentPadding = PaddingValues(vertical = 8.dp),
    ) {
        items(LibraryFilter.entries, key = { it.name }) { f ->
            val on = f == selected
            Text(
                f.label,
                style = MaterialTheme.typography.labelLarge,
                color = if (on) colors.background else colors.foreground,
                modifier = Modifier
                    .clip(CircleShape)
                    .background(if (on) colors.foreground else colors.surface)
                    .border(1.dp, if (on) colors.foreground else colors.border, CircleShape)
                    .clickable { onSelect(f) }
                    .padding(horizontal = 16.dp, vertical = 8.dp),
            )
        }
    }
}

@Composable
private fun UploadPill(count: Int) {
    Row(
        Modifier.clip(CircleShape).background(MaterialTheme.colorScheme.primaryContainer).padding(horizontal = 10.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(Icons.Outlined.CloudUpload, null, Modifier.size(14.dp), tint = MaterialTheme.colorScheme.primary)
        Spacer(Modifier.width(6.dp))
        Text("Uploading $count…", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary)
    }
}

@Composable
private fun Banner(text: String, onClick: () -> Unit) {
    val colors = NorsumiTheme.colors
    Row(
        Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
            .clip(MaterialTheme.shapes.medium)
            .background(colors.warning.copy(alpha = 0.12f))
            .clickable(onClick = onClick)
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(Icons.Outlined.WarningAmber, null, tint = colors.warning)
        Spacer(Modifier.width(10.dp))
        Text(text, style = MaterialTheme.typography.bodySmall, modifier = Modifier.weight(1f))
        Text("Fix", style = MaterialTheme.typography.labelLarge, color = colors.warning)
    }
}
