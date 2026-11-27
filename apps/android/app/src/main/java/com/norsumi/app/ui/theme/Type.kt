package com.norsumi.app.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import com.norsumi.app.R

val Geist = FontFamily(
    Font(R.font.geist_regular, FontWeight.Normal),
    Font(R.font.geist_medium, FontWeight.Medium),
    Font(R.font.geist_semibold, FontWeight.SemiBold),
    Font(R.font.geist_bold, FontWeight.Bold),
)

val InstrumentSerif = FontFamily(
    Font(R.font.instrument_serif_regular, FontWeight.Normal),
    Font(R.font.instrument_serif_italic, FontWeight.Normal, FontStyle.Italic),
)

val GeistMono = FontFamily(Font(R.font.geist_mono_regular, FontWeight.Normal))

private val tight = (-0.02).em

private fun serif(size: Int, line: Int) =
    TextStyle(fontFamily = InstrumentSerif, fontWeight = FontWeight.Normal, fontSize = size.sp, lineHeight = line.sp, letterSpacing = tight)

private fun geist(size: Int, line: Int, weight: FontWeight = FontWeight.Normal, spacing: Double = 0.0) =
    TextStyle(fontFamily = Geist, fontWeight = weight, fontSize = size.sp, lineHeight = line.sp, letterSpacing = spacing.em)

/** Scale 12 / 13 / 14 / 16 / 20 / 28 / 40 / 56 / 72; serif only for display and headline sizes. */
val NorsumiTypography = Typography(
    displayLarge = serif(72, 72),
    displayMedium = serif(56, 58),
    displaySmall = serif(40, 44),
    headlineLarge = serif(40, 44),
    headlineMedium = serif(32, 36),
    headlineSmall = serif(28, 32),
    titleLarge = geist(20, 26, FontWeight.SemiBold, -0.01),
    titleMedium = geist(16, 22, FontWeight.SemiBold, -0.005),
    titleSmall = geist(14, 20, FontWeight.Medium),
    bodyLarge = geist(16, 24),
    bodyMedium = geist(14, 21),
    bodySmall = geist(13, 18),
    labelLarge = geist(14, 20, FontWeight.Medium),
    labelMedium = geist(13, 16, FontWeight.Medium),
    labelSmall = geist(12, 16, FontWeight.Medium),
)

val MonoText = TextStyle(fontFamily = GeistMono, fontSize = 12.sp, lineHeight = 18.sp)
