package com.norsumi.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.norsumi.app.data.model.CategoryRef
import com.norsumi.app.ui.theme.categoryChipColors

/** Emoji + name pill tinted with the category palette. Shows the leaf of a breadcrumb. */
@Composable
fun CategoryPill(
    ref: CategoryRef,
    modifier: Modifier = Modifier,
    parent: CategoryRef? = null,
    onClick: (() -> Unit)? = null,
) {
    val (bg, ink) = categoryChipColors(ref.color)
    Row(
        modifier
            .clip(CircleShape)
            .background(bg)
            .then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier)
            .padding(horizontal = 9.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(5.dp),
    ) {
        Text(ref.emoji, style = MaterialTheme.typography.labelSmall)
        val label = if (parent != null) "${parent.name} › ${ref.name}" else ref.name
        Text(label, style = MaterialTheme.typography.labelSmall, color = ink, maxLines = 1, overflow = TextOverflow.Ellipsis)
    }
}
