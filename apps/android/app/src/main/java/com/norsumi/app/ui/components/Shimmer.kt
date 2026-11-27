package com.norsumi.app.ui.components

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color

/** Diagonal light sweep for items the AI is still working on. Reads the animation in the draw phase only. */
fun Modifier.shimmer(color: Color = Color.White.copy(alpha = 0.28f)): Modifier = composed {
    val t = rememberInfiniteTransition(label = "shimmer")
    val progress = t.animateFloat(
        0f, 1f, infiniteRepeatable(tween(1400, easing = LinearEasing), RepeatMode.Restart), label = "shimmer-x",
    )
    drawWithContent {
        drawContent()
        val w = size.width
        val x = -w + progress.value * w * 3f
        drawRect(
            Brush.linearGradient(
                listOf(Color.Transparent, color, Color.Transparent),
                start = Offset(x, 0f),
                end = Offset(x + w, size.height * 0.6f),
            ),
        )
    }
}
