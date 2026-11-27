package com.norsumi.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.statusBars
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.unit.dp
import com.norsumi.app.ui.theme.NorsumiTheme

/**
 * Opaque behind the status bar, then a short fade, so edge-to-edge content scrolling underneath
 * never collides with the clock and icons (in both themes).
 */
@Composable
fun StatusBarScrim(modifier: Modifier = Modifier) {
    val bg = NorsumiTheme.colors.background
    val inset = WindowInsets.statusBars.asPaddingValues().calculateTopPadding()
    val fade = 24.dp
    val total = inset + fade
    val solidStop = if (total.value > 0f) inset.value / total.value else 0f
    Box(
        modifier
            .fillMaxWidth()
            .height(total)
            .background(Brush.verticalGradient(0f to bg, solidStop to bg, 1f to bg.copy(alpha = 0f))),
    )
}
