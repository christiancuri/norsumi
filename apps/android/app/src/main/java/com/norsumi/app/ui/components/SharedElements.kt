package com.norsumi.app.ui.components

import androidx.compose.animation.AnimatedVisibilityScope
import androidx.compose.animation.BoundsTransform
import androidx.compose.animation.ExperimentalSharedTransitionApi
import androidx.compose.animation.SharedTransitionScope
import androidx.compose.animation.core.tween
import androidx.compose.runtime.Composable
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.ui.Modifier
import com.norsumi.app.ui.theme.Motion

val LocalSharedTransitionScope = compositionLocalOf<SharedTransitionScope?> { null }
val LocalNavAnimatedScope = compositionLocalOf<AnimatedVisibilityScope?> { null }

@OptIn(ExperimentalSharedTransitionApi::class)
private val ImageBounds = BoundsTransform { _, _ -> tween(320, easing = Motion.Easing) }

/** Shares an item's image between the grid and the detail screen when both scopes are available. */
@OptIn(ExperimentalSharedTransitionApi::class)
@Composable
fun Modifier.sharedItemImage(itemId: String): Modifier {
    val shared = LocalSharedTransitionScope.current ?: return this
    val animated = LocalNavAnimatedScope.current ?: return this
    return with(shared) {
        this@sharedItemImage.sharedElement(
            sharedContentState = rememberSharedContentState("image-$itemId"),
            animatedVisibilityScope = animated,
            boundsTransform = ImageBounds,
        )
    }
}
