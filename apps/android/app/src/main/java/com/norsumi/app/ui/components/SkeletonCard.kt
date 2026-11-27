package com.norsumi.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.norsumi.app.ui.theme.NorsumiTheme

/** Placeholder card with a shimmer sweep, shown while the first page loads. */
@Composable
fun SkeletonCard(imageHeight: Dp, modifier: Modifier = Modifier) {
    val colors = NorsumiTheme.colors
    Column(
        modifier
            .fillMaxWidth()
            .clip(CardShape)
            .background(colors.surface)
            .border(1.dp, colors.border, CardShape)
            .shimmer(colors.foreground.copy(alpha = 0.06f)),
    ) {
        Box(Modifier.fillMaxWidth().height(imageHeight).background(colors.surface2))
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Box(Modifier.fillMaxWidth(0.85f).height(10.dp).clip(CircleShape).background(colors.surface2))
            Box(Modifier.fillMaxWidth(0.55f).height(10.dp).clip(CircleShape).background(colors.surface2))
            Box(Modifier.fillMaxWidth(0.35f).height(18.dp).clip(CircleShape).background(colors.surface2))
        }
    }
}

/** Varied heights so the skeleton reads as a masonry grid. */
val SkeletonHeights = listOf(220.dp, 150.dp, 180.dp, 240.dp, 130.dp, 200.dp)
