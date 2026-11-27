package com.norsumi.app.ui.components

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.norsumi.app.R
import com.norsumi.app.ui.theme.Brand

val BrandGradient = Brush.linearGradient(listOf(Brand.BlueTop, Brand.BlueBottom))

/** White elephant on the blue gradient squircle. */
@Composable
fun ElephantLogo(modifier: Modifier = Modifier, size: Dp = 64.dp) {
    Box(
        modifier
            .size(size)
            .clip(RoundedCornerShape(size * 0.3f))
            .background(BrandGradient),
        contentAlignment = Alignment.Center,
    ) {
        Image(
            painterResource(R.drawable.ic_elephant_mark),
            contentDescription = null,
            modifier = Modifier.fillMaxSize().padding(size * 0.03f),
        )
    }
}
