package com.norsumi.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.outlined.ErrorOutline
import androidx.compose.material.icons.outlined.Link
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil3.compose.AsyncImage
import coil3.request.ImageRequest
import coil3.request.crossfade
import com.norsumi.app.data.model.Item
import com.norsumi.app.data.model.ItemKind
import com.norsumi.app.data.model.ItemStatus
import com.norsumi.app.ui.theme.Brand
import com.norsumi.app.ui.theme.InstrumentSerif
import com.norsumi.app.ui.theme.NorsumiTheme
import com.norsumi.app.ui.theme.parseHexColor

val CardShape = RoundedCornerShape(16.dp)

@Composable
fun ItemCard(item: Item, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val colors = NorsumiTheme.colors
    Column(
        modifier
            .fillMaxWidth()
            .clip(CardShape)
            .background(colors.surface)
            .border(1.dp, colors.border, CardShape)
            .clickable(onClick = onClick),
    ) {
        when (item.kind) {
            ItemKind.Screenshot, ItemKind.Image -> ImageCardBody(item)
            ItemKind.Link -> LinkCardBody(item)
            ItemKind.Note -> NoteCardBody(item)
        }
    }
}

@Composable
private fun ImageCardBody(item: Item) {
    val image = item.image
    val placeholder = parseHexColor(image?.dominantColor)
    Box(
        Modifier
            .fillMaxWidth()
            .aspectRatio(image?.aspectRatio ?: 0.75f)
            .sharedItemImage(item.id)
            .clip(RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp))
            .background(placeholder),
    ) {
        if (image != null) {
            AsyncImage(
                model = ImageRequest.Builder(LocalContext.current).data(image.thumbUrl).crossfade(220).build(),
                contentDescription = item.title.ifEmpty { null },
                contentScale = ContentScale.Crop,
                alignment = Alignment.TopCenter,
                modifier = Modifier.matchParentSize(),
            )
        }
        if (item.status.isWorking) {
            Box(Modifier.matchParentSize().background(Color.Black.copy(alpha = 0.18f)).shimmer())
            ThinkingPill(Modifier.align(Alignment.BottomStart).padding(10.dp))
        }
        if (item.favorite) FavoriteBadge(Modifier.align(Alignment.TopEnd).padding(8.dp))
    }
    CardFooter(item)
}

@Composable
private fun LinkCardBody(item: Item) {
    val link = item.link
    val colors = NorsumiTheme.colors
    if (link?.imageUrl != null) {
        AsyncImage(
            model = ImageRequest.Builder(LocalContext.current).data(link.imageUrl).crossfade(220).build(),
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = Modifier.fillMaxWidth().aspectRatio(1.91f).background(colors.surface2).sharedItemImage(item.id),
        )
    }
    Column(Modifier.padding(start = 12.dp, end = 12.dp, top = 12.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(18.dp).clip(RoundedCornerShape(5.dp)).background(colors.surface2), contentAlignment = Alignment.Center) {
                if (link?.faviconUrl != null) {
                    AsyncImage(link.faviconUrl, null, Modifier.size(14.dp))
                } else {
                    Icon(Icons.Outlined.Link, null, Modifier.size(12.dp), tint = colors.muted)
                }
            }
            Spacer(Modifier.width(6.dp))
            Text(
                link?.domain ?: item.source.orEmpty(), style = MaterialTheme.typography.labelSmall, color = colors.muted,
                maxLines = 1, overflow = TextOverflow.Ellipsis,
            )
        }
    }
    CardFooter(item, showSummary = true, fallbackTitle = link?.title ?: link?.url)
}

@Composable
private fun NoteCardBody(item: Item) {
    val colors = NorsumiTheme.colors
    // A note's body is `text`; older servers kept it in `note`.
    val lines = (item.text ?: item.note).orEmpty().lines().filter { it.isNotBlank() }
    Column(
        Modifier
            .fillMaxWidth()
            .background(Brush.verticalGradient(listOf(colors.surface2.copy(alpha = 0.6f), colors.surface)))
            .then(if (item.status.isWorking) Modifier.shimmer(colors.primary.copy(alpha = 0.12f)) else Modifier)
            .padding(14.dp),
    ) {
        Text(
            "“", fontFamily = InstrumentSerif, fontSize = 40.sp, lineHeight = 40.sp, color = colors.primary.copy(alpha = 0.55f),
            modifier = Modifier.height(26.dp),
        )
        Text(
            lines.firstOrNull() ?: item.title, fontFamily = InstrumentSerif, fontSize = 22.sp, lineHeight = 25.sp,
            color = colors.foreground, maxLines = 3, overflow = TextOverflow.Ellipsis,
        )
        if (lines.size > 1) {
            Spacer(Modifier.height(6.dp))
            Text(
                lines.drop(1).joinToString("\n"), style = MaterialTheme.typography.bodySmall, color = colors.muted,
                maxLines = 5, overflow = TextOverflow.Ellipsis,
            )
        }
    }
    CardFooter(item, showTitle = false)
}

@Composable
private fun CardFooter(item: Item, showSummary: Boolean = false, showTitle: Boolean = true, fallbackTitle: String? = null) {
    val colors = NorsumiTheme.colors
    Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        when {
            item.status == ItemStatus.Failed -> Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Outlined.ErrorOutline, null, Modifier.size(14.dp), tint = colors.destructive)
                Spacer(Modifier.width(4.dp))
                Text("Couldn't process", style = MaterialTheme.typography.labelSmall, color = colors.destructive)
            }
            item.status.isWorking && item.title.isEmpty() -> {
                if (item.kind != ItemKind.Screenshot && item.kind != ItemKind.Image) ThinkingPill()
                Box(Modifier.fillMaxWidth(0.85f).height(10.dp).clip(CircleShape).background(colors.surface2).shimmer())
                Box(Modifier.fillMaxWidth(0.55f).height(10.dp).clip(CircleShape).background(colors.surface2).shimmer())
            }
            else -> {
                val title = item.title.ifEmpty { fallbackTitle.orEmpty() }
                if (showTitle && title.isNotEmpty()) {
                    Text(
                        title, style = MaterialTheme.typography.titleSmall, color = colors.foreground,
                        maxLines = 2, overflow = TextOverflow.Ellipsis,
                    )
                }
                if (showSummary && item.summary.isNotEmpty()) {
                    Text(
                        item.summary, style = MaterialTheme.typography.bodySmall, color = colors.muted,
                        maxLines = 3, overflow = TextOverflow.Ellipsis,
                    )
                }
            }
        }
        val leaf = item.categoryPath.lastOrNull()
        if (leaf != null) CategoryPill(leaf)
    }
}

@Composable
fun ThinkingPill(modifier: Modifier = Modifier) {
    Row(
        modifier
            .clip(CircleShape)
            .background(Brand.Ink.copy(alpha = 0.72f))
            .padding(horizontal = 10.dp, vertical = 5.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(Modifier.size(6.dp).clip(CircleShape).background(Color(0xFF8FB4FF)))
        Spacer(Modifier.width(6.dp))
        Text("Thinking…", style = MaterialTheme.typography.labelSmall, color = Color.White, fontStyle = FontStyle.Normal)
    }
}

@Composable
private fun FavoriteBadge(modifier: Modifier) {
    Box(
        modifier.size(26.dp).clip(CircleShape).background(Brand.Ink.copy(alpha = 0.55f)),
        contentAlignment = Alignment.Center,
    ) {
        Icon(Icons.Filled.Favorite, "Favorite", Modifier.size(14.dp), tint = Color(0xFFFF6B8A))
    }
}
