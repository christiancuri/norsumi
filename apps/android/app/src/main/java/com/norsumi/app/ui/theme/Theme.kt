package com.norsumi.app.ui.theme

import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.norsumi.app.data.settings.ThemeMode

/** Design tokens from docs/design.md that M3's scheme has no slot for. */
@Immutable
data class NorsumiColors(
    val isDark: Boolean,
    val background: Color,
    val surface: Color,
    val surface2: Color,
    val border: Color,
    val foreground: Color,
    val muted: Color,
    val primary: Color,
    val success: Color,
    val warning: Color,
    val destructive: Color,
)

private val LightTokens = NorsumiColors(
    isDark = false,
    background = Color(0xFFF6F7FB),
    surface = Color(0xFFFFFFFF),
    surface2 = Color(0xFFEEF0F6),
    border = Color(0xFFE3E6EF),
    foreground = Color(0xFF0A0D17),
    muted = Color(0xFF626A80),
    primary = Color(0xFF2E6BFF),
    success = Color(0xFF16A36A),
    warning = Color(0xFFD97706),
    destructive = Color(0xFFE5484D),
)

private val DarkTokens = NorsumiColors(
    isDark = true,
    background = Color(0xFF07080C),
    surface = Color(0xFF10121A),
    surface2 = Color(0xFF161925),
    border = Color(0xFF232738),
    foreground = Color(0xFFEEF0F8),
    muted = Color(0xFF8B92A8),
    primary = Color(0xFF5B8FFF),
    success = Color(0xFF3DD68C),
    warning = Color(0xFFFBBF24),
    destructive = Color(0xFFFF6369),
)

object Brand {
    /** Icon gradient (135°): brand-blue-400 → brand-blue-600. */
    val BlueTop = Color(0xFF4F8CFF)
    val BlueBottom = Color(0xFF2E6BFF)
    val BlueSolid = Color(0xFF3F7CFF)
    /** Deep blue for text on white over the brand field. */
    val BlueDeep = Color(0xFF1F4FE0)
    val TaglineOnDark = Color(0xFFA8C6FF)
    val Ink = Color(0xFF0A0D17)
}

private fun schemeOf(t: NorsumiColors) = if (t.isDark) {
    darkColorScheme(
        primary = t.primary, onPrimary = Color.White,
        primaryContainer = Color(0xFF172A66), onPrimaryContainer = Color(0xFFDCE6FF),
        secondary = t.muted, onSecondary = Color.White,
        secondaryContainer = t.surface2, onSecondaryContainer = t.foreground,
        tertiary = t.success,
        background = t.background, onBackground = t.foreground,
        surface = t.background, onSurface = t.foreground,
        surfaceVariant = t.surface2, onSurfaceVariant = t.muted,
        surfaceContainerLowest = t.background, surfaceContainerLow = t.surface,
        surfaceContainer = t.surface, surfaceContainerHigh = t.surface2, surfaceContainerHighest = t.surface2,
        surfaceBright = t.surface2, surfaceDim = t.background,
        outline = Color(0xFF353A50), outlineVariant = t.border,
        error = t.destructive, onError = Color.White,
        inverseSurface = t.foreground, inverseOnSurface = t.background, inversePrimary = LightTokens.primary,
        scrim = Color.Black,
    )
} else {
    lightColorScheme(
        primary = t.primary, onPrimary = Color.White,
        primaryContainer = Color(0xFFE3ECFF), onPrimaryContainer = Brand.BlueDeep,
        secondary = t.muted, onSecondary = Color.White,
        secondaryContainer = t.surface2, onSecondaryContainer = t.foreground,
        tertiary = t.success,
        background = t.background, onBackground = t.foreground,
        surface = t.background, onSurface = t.foreground,
        surfaceVariant = t.surface2, onSurfaceVariant = t.muted,
        surfaceContainerLowest = t.surface, surfaceContainerLow = t.surface,
        surfaceContainer = t.surface, surfaceContainerHigh = t.surface, surfaceContainerHighest = t.surface2,
        surfaceBright = t.surface, surfaceDim = t.surface2,
        outline = Color(0xFFC9CEDC), outlineVariant = t.border,
        error = t.destructive, onError = Color.White,
        inverseSurface = t.foreground, inverseOnSurface = t.background, inversePrimary = DarkTokens.primary,
        scrim = Color.Black,
    )
}

val LocalNorsumiColors = staticCompositionLocalOf { LightTokens }

object Motion {
    /** cubic-bezier(0.22, 1, 0.36, 1) from the design doc. */
    val Easing = CubicBezierEasing(0.22f, 1f, 0.36f, 1f)
    const val Short = 180
    const val Medium = 240
}

private val NorsumiShapes = Shapes(
    extraSmall = RoundedCornerShape(8.dp),
    small = RoundedCornerShape(10.dp),
    medium = RoundedCornerShape(16.dp),
    large = RoundedCornerShape(24.dp),
    extraLarge = RoundedCornerShape(28.dp),
)

@Composable
fun NorsumiTheme(mode: ThemeMode = ThemeMode.System, content: @Composable () -> Unit) {
    val dark = when (mode) {
        ThemeMode.System -> isSystemInDarkTheme()
        ThemeMode.Light -> false
        ThemeMode.Dark -> true
    }
    val tokens = if (dark) DarkTokens else LightTokens
    CompositionLocalProvider(LocalNorsumiColors provides tokens) {
        MaterialTheme(colorScheme = schemeOf(tokens), typography = NorsumiTypography, shapes = NorsumiShapes) {
            // Screens draw on raw backgrounds (no Surface), so set the default content color here.
            CompositionLocalProvider(LocalContentColor provides tokens.foreground, content = content)
        }
    }
}

object NorsumiTheme {
    val colors: NorsumiColors @Composable get() = LocalNorsumiColors.current
}
