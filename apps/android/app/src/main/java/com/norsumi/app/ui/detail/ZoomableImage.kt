package com.norsumi.app.ui.detail

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.VectorConverter
import androidx.compose.animation.core.tween
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.gestures.calculatePan
import androidx.compose.foundation.gestures.calculateZoom
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.input.pointer.positionChanged
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.unit.IntSize
import com.norsumi.app.ui.theme.Motion
import kotlinx.coroutines.launch

/**
 * Pinch to zoom (1x–5x), pan while zoomed, double-tap to toggle 2.5x. Single-finger drags at 1x are
 * not consumed so the bottom sheet and back gesture keep working.
 */
@Composable
fun Zoomable(modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    val scale = remember { Animatable(1f) }
    val offset = remember { Animatable(Offset.Zero, Offset.VectorConverter) }
    val scope = rememberCoroutineScope()
    val size = remember { arrayOf(IntSize.Zero) }

    fun clamp(o: Offset, s: Float): Offset {
        val maxX = (size[0].width * (s - 1f)) / 2f
        val maxY = (size[0].height * (s - 1f)) / 2f
        return Offset(o.x.coerceIn(-maxX, maxX), o.y.coerceIn(-maxY, maxY))
    }

    Box(
        modifier
            .onSizeChanged { size[0] = it }
            .pointerInput(Unit) {
                detectTapGestures(onDoubleTap = { tap ->
                    scope.launch {
                        if (scale.value > 1.01f) {
                            launch { scale.animateTo(1f, tween(Motion.Medium, easing = Motion.Easing)) }
                            offset.animateTo(Offset.Zero, tween(Motion.Medium, easing = Motion.Easing))
                        } else {
                            val target = 2.5f
                            val center = Offset(size[0].width / 2f, size[0].height / 2f)
                            launch { scale.animateTo(target, tween(Motion.Medium, easing = Motion.Easing)) }
                            offset.animateTo(clamp((center - tap) * (target - 1f), target), tween(Motion.Medium, easing = Motion.Easing))
                        }
                    }
                })
            }
            .pointerInput(Unit) {
                awaitEachGesture {
                    awaitFirstDown(requireUnconsumed = false)
                    do {
                        val event = awaitPointerEvent()
                        val zoom = event.calculateZoom()
                        val pan = event.calculatePan()
                        val multiTouch = event.changes.size > 1
                        if (multiTouch || scale.value > 1.01f) {
                            val s = (scale.value * zoom).coerceIn(1f, 5f)
                            scope.launch {
                                scale.snapTo(s)
                                offset.snapTo(clamp(offset.value + pan, s))
                            }
                            event.changes.forEach { if (it.positionChanged()) it.consume() }
                        }
                    } while (event.changes.any { it.pressed })
                    if (scale.value < 1.01f) scope.launch { offset.animateTo(Offset.Zero) }
                }
            }
            .graphicsLayer {
                scaleX = scale.value
                scaleY = scale.value
                translationX = offset.value.x
                translationY = offset.value.y
            },
    ) { content() }
}
