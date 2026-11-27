package com.norsumi.app.ui.detail

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.Archive
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.DeleteOutline
import androidx.compose.material.icons.outlined.ExpandLess
import androidx.compose.material.icons.outlined.ExpandMore
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material.icons.outlined.Language
import androidx.compose.material.icons.outlined.LocalOffer
import androidx.compose.material.icons.outlined.Movie
import androidx.compose.material.icons.outlined.MenuBook
import androidx.compose.material.icons.outlined.MusicNote
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.Place
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material.icons.outlined.Sell
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material.icons.outlined.ShoppingBag
import androidx.compose.material.icons.outlined.Unarchive
import androidx.compose.material.icons.outlined.Business
import androidx.compose.material.icons.outlined.AlternateEmail
import androidx.compose.material.icons.outlined.Event
import androidx.compose.material.icons.outlined.Label
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.BottomSheetScaffold
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.material3.SheetValue
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberBottomSheetScaffoldState
import androidx.compose.material3.rememberStandardBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import coil3.compose.AsyncImage
import coil3.request.ImageRequest
import coil3.request.crossfade
import com.norsumi.app.data.model.Category
import com.norsumi.app.data.model.Item
import com.norsumi.app.data.model.ItemEntity
import com.norsumi.app.data.model.ItemKind
import com.norsumi.app.data.model.ItemStatus
import com.norsumi.app.data.model.toTree
import com.norsumi.app.ui.LocalContainer
import com.norsumi.app.ui.components.CategoryPill
import com.norsumi.app.ui.components.ThinkingPill
import com.norsumi.app.ui.components.fullDate
import com.norsumi.app.ui.components.sharedItemImage
import com.norsumi.app.ui.components.shimmer
import com.norsumi.app.ui.theme.InstrumentSerif
import com.norsumi.app.ui.theme.MonoText
import com.norsumi.app.ui.theme.NorsumiTheme
import com.norsumi.app.ui.theme.categoryChipColors
import com.norsumi.app.ui.theme.parseHexColor
import kotlinx.coroutines.launch

private val ImageStage = Color(0xFF07080C)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ItemDetailScreen(id: String, onBack: () -> Unit, onOpenCategory: (String) -> Unit) {
    val container = LocalContainer.current
    val vm: ItemDetailViewModel = viewModel(key = "item-$id") { ItemDetailViewModel(container, id) }
    val state by vm.state.collectAsStateWithLifecycle()
    LaunchedEffect(state.deleted) { if (state.deleted) onBack() }
    val item = state.item
    val hasImage = item?.image != null && (item.kind == ItemKind.Screenshot || item.kind == ItemKind.Image)

    if (item == null) {
        Box(Modifier.fillMaxSize().background(NorsumiTheme.colors.background)) {
            TopButtons(onBack = onBack, item = null, onFavorite = {})
            state.error?.let { Text(it, Modifier.align(Alignment.Center).padding(32.dp), color = NorsumiTheme.colors.muted) }
        }
        return
    }

    if (hasImage) {
        val screenHeight = LocalConfiguration.current.screenHeightDp.dp
        val peek = (screenHeight * 0.34f)
        val sheet = rememberBottomSheetScaffoldState(rememberStandardBottomSheetState(initialValue = SheetValue.PartiallyExpanded))
        BottomSheetScaffold(
            scaffoldState = sheet,
            sheetPeekHeight = peek,
            sheetContainerColor = NorsumiTheme.colors.surface,
            sheetShape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp),
            sheetShadowElevation = 0.dp,
            containerColor = ImageStage,
            sheetContent = {
                Column(Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).navigationBarsPadding()) {
                    DetailPanel(item, state, vm, onOpenCategory)
                }
            },
        ) {
            PullToRefreshBox(isRefreshing = state.refreshing, onRefresh = vm::refresh, modifier = Modifier.fillMaxSize().background(ImageStage)) {
            // A one-screen scroll container so pull-to-refresh receives the drag; it never scrolls itself.
            BoxWithConstraints(Modifier.fillMaxSize()) {
                val stageHeight = maxHeight
                Box(Modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
                val image = item.image!!
                Box(
                    Modifier.fillMaxWidth().height(stageHeight).statusBarsPadding().padding(top = 56.dp, bottom = peek - 8.dp, start = 16.dp, end = 16.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Zoomable(Modifier.fillMaxSize()) {
                        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            Box(
                                Modifier
                                    .aspectRatio(image.width.toFloat().coerceAtLeast(1f) / image.height.toFloat().coerceAtLeast(1f), matchHeightConstraintsFirst = image.height >= image.width)
                                    .sharedItemImage(item.id)
                                    .clip(RoundedCornerShape(14.dp))
                                    .background(parseHexColor(image.dominantColor)),
                            ) {
                                AsyncImage(
                                    model = ImageRequest.Builder(LocalContext.current).data(image.thumbUrl).build(),
                                    contentDescription = null, contentScale = ContentScale.Fit, modifier = Modifier.matchParentSize(),
                                )
                                AsyncImage(
                                    model = ImageRequest.Builder(LocalContext.current).data(image.url).crossfade(200).build(),
                                    contentDescription = item.title, contentScale = ContentScale.Fit, modifier = Modifier.matchParentSize(),
                                )
                                if (item.status.isWorking) Box(Modifier.matchParentSize().shimmer())
                            }
                        }
                    }
                }
                }
            }
            }
            TopButtons(onBack = onBack, item = item, onFavorite = vm::toggleFavorite, onDark = true)
        }
    } else {
        Box(Modifier.fillMaxSize().background(NorsumiTheme.colors.background)) {
            PullToRefreshBox(isRefreshing = state.refreshing, onRefresh = vm::refresh, modifier = Modifier.fillMaxSize()) {
                Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).navigationBarsPadding()) {
                    when (item.kind) {
                        ItemKind.Link -> LinkHeader(item)
                        else -> NoteHeader(item)
                    }
                    DetailPanel(item, state, vm, onOpenCategory)
                }
            }
            TopButtons(onBack = onBack, item = item, onFavorite = vm::toggleFavorite, onDark = item.kind == ItemKind.Link && item.link?.imageUrl != null)
        }
    }
}

@Composable
private fun TopButtons(onBack: () -> Unit, item: Item?, onFavorite: () -> Unit, onDark: Boolean = false) {
    val fg = if (onDark) Color.White else NorsumiTheme.colors.foreground
    val bg = if (onDark) Color.White.copy(alpha = 0.14f) else NorsumiTheme.colors.surface.copy(alpha = 0.9f)
    Row(Modifier.fillMaxWidth().statusBarsPadding().padding(horizontal = 12.dp, vertical = 6.dp)) {
        Box(Modifier.size(44.dp).clip(CircleShape).background(bg).clickable(onClick = onBack), contentAlignment = Alignment.Center) {
            Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back", tint = fg)
        }
        Spacer(Modifier.weight(1f))
        if (item != null) {
            Box(Modifier.size(44.dp).clip(CircleShape).background(bg).clickable(onClick = onFavorite), contentAlignment = Alignment.Center) {
                Icon(
                    if (item.favorite) Icons.Filled.Favorite else Icons.Outlined.FavoriteBorder,
                    if (item.favorite) "Remove from favorites" else "Add to favorites",
                    tint = if (item.favorite) Color(0xFFFF5C80) else fg,
                )
            }
        }
    }
}

@Composable
private fun LinkHeader(item: Item) {
    val colors = NorsumiTheme.colors
    val link = item.link
    val context = LocalContext.current
    if (link?.imageUrl != null) {
        Box(Modifier.fillMaxWidth().aspectRatio(1.4f)) {
            AsyncImage(
                link.imageUrl, null, Modifier.matchParentSize().sharedItemImage(item.id), contentScale = ContentScale.Crop,
            )
            Box(Modifier.matchParentSize().background(Brush.verticalGradient(listOf(Color.Black.copy(alpha = 0.45f), Color.Transparent, Color.Transparent))))
        }
    } else {
        Spacer(Modifier.statusBarsPadding().height(64.dp))
    }
    Row(
        Modifier
            .padding(start = 20.dp, end = 20.dp, top = 20.dp)
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(colors.surface2)
            .clickable { link?.url?.let { openUri(context, android.net.Uri.parse(it)) } }
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(Icons.Outlined.Language, null, tint = MaterialTheme.colorScheme.primary)
        Spacer(Modifier.width(10.dp))
        Column(Modifier.weight(1f)) {
            Text(link?.siteName ?: link?.domain.orEmpty(), style = MaterialTheme.typography.titleSmall, maxLines = 1)
            Text(link?.url.orEmpty(), style = MaterialTheme.typography.bodySmall, color = colors.muted, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
        Text("Open", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary)
    }
}

@Composable
private fun NoteHeader(item: Item) {
    val colors = NorsumiTheme.colors
    Column(
        Modifier.fillMaxWidth().background(Brush.verticalGradient(listOf(MaterialTheme.colorScheme.primaryContainer, colors.background)))
            .statusBarsPadding().padding(start = 24.dp, end = 24.dp, top = 72.dp, bottom = 8.dp),
    ) {
        Text("“", fontFamily = InstrumentSerif, fontSize = 64.sp, lineHeight = 40.sp, color = MaterialTheme.colorScheme.primary)
        Text((item.text ?: item.note).orEmpty(), fontFamily = InstrumentSerif, fontSize = 26.sp, lineHeight = 32.sp, color = colors.foreground)
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun DetailPanel(item: Item, state: DetailState, vm: ItemDetailViewModel, onOpenCategory: (String) -> Unit) {
    val colors = NorsumiTheme.colors
    val context = LocalContext.current
    val container = LocalContainer.current
    val scope = rememberCoroutineScope()
    var pickCategory by remember { mutableStateOf(false) }
    var confirmDelete by remember { mutableStateOf(false) }

    Column(Modifier.fillMaxWidth().padding(horizontal = 22.dp).padding(top = 8.dp, bottom = 32.dp)) {
        // Status
        when {
            item.status.isWorking -> {
                ThinkingPill()
                Spacer(Modifier.height(14.dp))
            }
            item.status == ItemStatus.Failed -> {
                Row(
                    Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(colors.destructive.copy(alpha = 0.1f)).padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(item.error ?: "norsumi couldn't process this item.", style = MaterialTheme.typography.bodySmall, modifier = Modifier.weight(1f))
                    TextButton(onClick = vm::reprocess) { Text("Retry") }
                }
                Spacer(Modifier.height(14.dp))
            }
        }

        // Category breadcrumb
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            val leaf = item.categoryPath.lastOrNull()
            if (leaf != null) {
                CategoryPill(leaf, parent = item.categoryPath.getOrNull(item.categoryPath.size - 2), onClick = { onOpenCategory(leaf.id) })
            }
            Text(
                if (leaf == null) "Choose category" else "Change",
                style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.primary,
                modifier = Modifier.clip(CircleShape).clickable { pickCategory = true }.padding(horizontal = 8.dp, vertical = 4.dp),
            )
        }
        Spacer(Modifier.height(12.dp))

        // Title
        val title = state.title ?: item.title
        Box {
            if (title.isEmpty()) {
                Text(
                    if (item.status.isWorking) "Thinking of a title…" else "Add a title",
                    fontFamily = InstrumentSerif, fontSize = 32.sp, lineHeight = 36.sp, color = colors.muted,
                )
            }
            BasicTextField(
                title, vm::editTitle,
                textStyle = MaterialTheme.typography.headlineMedium.copy(color = colors.foreground, fontSize = 32.sp, lineHeight = 36.sp),
                cursorBrush = SolidColor(MaterialTheme.colorScheme.primary),
                modifier = Modifier.fillMaxWidth(),
            )
        }
        Spacer(Modifier.height(6.dp))
        Text(
            listOfNotNull(item.source, fullDate(item.capturedAt).ifEmpty { null }).joinToString("  ·  "),
            style = MaterialTheme.typography.labelSmall, color = colors.muted,
        )
        Spacer(Modifier.height(14.dp))

        // Summary
        val summary = state.summary ?: item.summary
        Box {
            if (summary.isEmpty()) Text("No summary yet", style = MaterialTheme.typography.bodyLarge, color = colors.muted)
            BasicTextField(
                summary, vm::editSummary,
                textStyle = MaterialTheme.typography.bodyLarge.copy(color = colors.foreground),
                cursorBrush = SolidColor(MaterialTheme.colorScheme.primary),
                modifier = Modifier.fillMaxWidth(),
            )
        }

        // Entities
        if (item.entities.isNotEmpty()) {
            SectionLabel("Mentioned")
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                item.entities.forEach { e -> EntityChip(e) { openEntity(context, e) } }
            }
        }

        // Tags
        SectionLabel("Tags")
        TagEditor(item.tags, onAdd = vm::addTag, onRemove = vm::removeTag)

        // Note (the user's own annotation; a note item's body lives in `text`)
        SectionLabel("Your note")
        val note = state.note ?: item.note.orEmpty()
        Box(
            Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(colors.surface2).padding(14.dp),
        ) {
            if (note.isEmpty()) Text("Add a note…", style = MaterialTheme.typography.bodyMedium, color = colors.muted)
            BasicTextField(
                note, vm::editNote,
                textStyle = MaterialTheme.typography.bodyMedium.copy(color = colors.foreground),
                cursorBrush = SolidColor(MaterialTheme.colorScheme.primary),
                modifier = Modifier.fillMaxWidth(),
            )
        }

        // Extracted text
        val text = item.text?.takeIf { it.isNotBlank() && item.kind != ItemKind.Note }
        if (text != null) {
            var open by remember { mutableStateOf(false) }
            Spacer(Modifier.height(20.dp))
            Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).border(1.dp, colors.border, RoundedCornerShape(16.dp))) {
                Row(
                    Modifier.fillMaxWidth().clickable { open = !open }.padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text("Extracted text", style = MaterialTheme.typography.titleSmall, modifier = Modifier.weight(1f))
                    Icon(if (open) Icons.Outlined.ExpandLess else Icons.Outlined.ExpandMore, null, tint = colors.muted)
                }
                if (open) Text(text, style = MonoText, color = colors.muted, modifier = Modifier.padding(start = 14.dp, end = 14.dp, bottom = 14.dp))
            }
        }

        // Actions
        Spacer(Modifier.height(24.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Action(
                if (item.favorite) Icons.Filled.Favorite else Icons.Outlined.FavoriteBorder,
                if (item.favorite) "Favorited" else "Favorite", tint = if (item.favorite) Color(0xFFFF5C80) else null, onClick = vm::toggleFavorite,
            )
            Action(if (item.archived) Icons.Outlined.Unarchive else Icons.Outlined.Archive, if (item.archived) "Unarchive" else "Archive", vm::toggleArchive)
            Action(Icons.Outlined.Share, "Share") { scope.launch { runCatching { shareOriginal(context, container, item) } } }
            Action(Icons.Outlined.Refresh, "Redo AI", vm::reprocess)
            Action(Icons.Outlined.DeleteOutline, "Delete", tint = colors.destructive) { confirmDelete = true }
        }
    }

    if (pickCategory) {
        CategoryPicker(state.categories, item.categoryId, onPick = { vm.setCategory(it); pickCategory = false }, onDismiss = { pickCategory = false })
    }
    if (confirmDelete) {
        AlertDialog(
            onDismissRequest = { confirmDelete = false },
            title = { Text("Delete this item?") },
            text = { Text("It's removed from your library and its encrypted files are deleted. This can't be undone.") },
            confirmButton = { TextButton(onClick = { confirmDelete = false; vm.delete() }) { Text("Delete", color = colors.destructive) } },
            dismissButton = { TextButton(onClick = { confirmDelete = false }) { Text("Cancel") } },
        )
    }
}

@Composable
private fun SectionLabel(text: String) {
    Spacer(Modifier.height(22.dp))
    Text(text, style = MaterialTheme.typography.labelMedium, color = NorsumiTheme.colors.muted)
    Spacer(Modifier.height(10.dp))
}

private fun entityIcon(type: String): ImageVector = when (type) {
    "place" -> Icons.Outlined.Place
    "person" -> Icons.Outlined.Person
    "account" -> Icons.Outlined.AlternateEmail
    "organization" -> Icons.Outlined.Business
    "product" -> Icons.Outlined.ShoppingBag
    "event" -> Icons.Outlined.Event
    "book" -> Icons.Outlined.MenuBook
    "movie" -> Icons.Outlined.Movie
    "music" -> Icons.Outlined.MusicNote
    "url" -> Icons.Outlined.Language
    "date" -> Icons.Outlined.CalendarMonth
    "price" -> Icons.Outlined.Sell
    else -> Icons.Outlined.Label
}

@Composable
private fun EntityChip(e: ItemEntity, onClick: () -> Unit) {
    val colors = NorsumiTheme.colors
    Row(
        Modifier.clip(RoundedCornerShape(14.dp)).background(colors.surface2).clickable(onClick = onClick).padding(horizontal = 12.dp, vertical = 9.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(entityIcon(e.type), null, Modifier.size(16.dp), tint = MaterialTheme.colorScheme.primary)
        Spacer(Modifier.width(8.dp))
        Column {
            Text(e.name, style = MaterialTheme.typography.labelLarge, maxLines = 1, overflow = TextOverflow.Ellipsis)
            e.value?.let { Text(it, style = MaterialTheme.typography.labelSmall, color = colors.muted, maxLines = 1, overflow = TextOverflow.Ellipsis) }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun TagEditor(tags: List<String>, onAdd: (String) -> Unit, onRemove: (String) -> Unit) {
    val colors = NorsumiTheme.colors
    var adding by remember { mutableStateOf(false) }
    var draft by remember { mutableStateOf("") }
    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        tags.forEach { tag ->
            Row(
                Modifier.clip(CircleShape).border(1.dp, colors.border, CircleShape).padding(start = 12.dp, end = 4.dp, top = 4.dp, bottom = 4.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("#$tag", style = MaterialTheme.typography.labelMedium)
                Box(Modifier.size(24.dp).clip(CircleShape).clickable { onRemove(tag) }, contentAlignment = Alignment.Center) {
                    Icon(Icons.Outlined.Close, "Remove $tag", Modifier.size(14.dp), tint = colors.muted)
                }
            }
        }
        if (adding) {
            Box(Modifier.clip(CircleShape).background(colors.surface2).padding(horizontal = 12.dp, vertical = 8.dp).width(120.dp)) {
                BasicTextField(
                    draft, { draft = it.replace(" ", "-") }, singleLine = true,
                    textStyle = MaterialTheme.typography.labelMedium.copy(color = colors.foreground),
                    cursorBrush = SolidColor(MaterialTheme.colorScheme.primary),
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                    keyboardActions = KeyboardActions(onDone = { onAdd(draft); draft = ""; adding = false }),
                )
            }
        } else {
            Row(
                Modifier.clip(CircleShape).background(colors.surface2).clickable { adding = true }.padding(horizontal = 12.dp, vertical = 7.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(Icons.Outlined.Add, null, Modifier.size(14.dp))
                Spacer(Modifier.width(4.dp))
                Text("Tag", style = MaterialTheme.typography.labelMedium)
            }
        }
    }
}

@Composable
private fun Action(icon: ImageVector, label: String, onClick: () -> Unit) = Action(icon, label, tint = null, onClick = onClick)

@Composable
private fun Action(icon: ImageVector, label: String, tint: Color?, onClick: () -> Unit) {
    val colors = NorsumiTheme.colors
    Column(
        Modifier.clip(RoundedCornerShape(16.dp)).clickable(onClick = onClick).padding(horizontal = 6.dp, vertical = 8.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Box(Modifier.size(48.dp).clip(CircleShape).background(colors.surface2), contentAlignment = Alignment.Center) {
            Icon(icon, label, tint = tint ?: colors.foreground)
        }
        Spacer(Modifier.height(6.dp))
        Text(label, style = MaterialTheme.typography.labelSmall, color = tint ?: colors.muted)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CategoryPicker(categories: List<Category>, selected: String?, onPick: (String?) -> Unit, onDismiss: () -> Unit) {
    val colors = NorsumiTheme.colors
    ModalBottomSheet(onDismissRequest = onDismiss, containerColor = colors.surface) {
        Column(Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(horizontal = 16.dp).padding(bottom = 24.dp)) {
            Text("Move to…", style = MaterialTheme.typography.headlineSmall, modifier = Modifier.padding(horizontal = 8.dp, vertical = 8.dp))
            PickRow("🗂️", "Uncategorized", selected == null, indent = false, color = "slate") { onPick(null) }
            categories.toTree().forEach { node ->
                PickRow(node.category.emoji, node.category.name, node.category.id == selected, indent = false, color = node.category.color) { onPick(node.category.id) }
                node.children.forEach { child ->
                    PickRow(child.emoji, child.name, child.id == selected, indent = true, color = child.color) { onPick(child.id) }
                }
            }
        }
    }
}

@Composable
private fun PickRow(emoji: String, name: String, selected: Boolean, indent: Boolean, color: String, onClick: () -> Unit) {
    val (bg, ink) = categoryChipColors(color)
    Row(
        Modifier
            .fillMaxWidth()
            .padding(start = if (indent) 28.dp else 0.dp, top = 2.dp, bottom = 2.dp)
            .clip(RoundedCornerShape(14.dp))
            .background(if (selected) bg else Color.Transparent)
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(emoji, fontSize = 18.sp)
        Spacer(Modifier.width(12.dp))
        Text(
            name, style = if (indent) MaterialTheme.typography.bodyLarge else MaterialTheme.typography.titleSmall,
            color = if (selected) ink else NorsumiTheme.colors.foreground,
        )
    }
}
