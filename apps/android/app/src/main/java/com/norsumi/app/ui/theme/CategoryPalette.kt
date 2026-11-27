package com.norsumi.app.ui.theme

import androidx.compose.runtime.Composable
import androidx.compose.runtime.Immutable
import androidx.compose.ui.graphics.Color

/** Tailwind shades per category color name: 500 dot, 100/950 chip background, 700/300 chip text. */
@Immutable
data class CategoryShades(val base: Color, val light: Color, val dark: Color, val inkLight: Color, val inkDark: Color)

private fun c(hex: Long) = Color(hex or 0xFF000000)

private val PALETTE = mapOf(
    "slate" to CategoryShades(c(0x64748B), c(0xF1F5F9), c(0x020617), c(0x334155), c(0xCBD5E1)),
    "red" to CategoryShades(c(0xEF4444), c(0xFEE2E2), c(0x450A0A), c(0xB91C1C), c(0xFCA5A5)),
    "orange" to CategoryShades(c(0xF97316), c(0xFFEDD5), c(0x431407), c(0xC2410C), c(0xFDBA74)),
    "amber" to CategoryShades(c(0xF59E0B), c(0xFEF3C7), c(0x451A03), c(0xB45309), c(0xFCD34D)),
    "lime" to CategoryShades(c(0x84CC16), c(0xECFCCB), c(0x1A2E05), c(0x4D7C0F), c(0xBEF264)),
    "emerald" to CategoryShades(c(0x10B981), c(0xD1FAE5), c(0x022C22), c(0x047857), c(0x6EE7B7)),
    "teal" to CategoryShades(c(0x14B8A6), c(0xCCFBF1), c(0x042F2E), c(0x0F766E), c(0x5EEAD4)),
    "sky" to CategoryShades(c(0x0EA5E9), c(0xE0F2FE), c(0x082F49), c(0x0369A1), c(0x7DD3FC)),
    "blue" to CategoryShades(c(0x3B82F6), c(0xDBEAFE), c(0x172554), c(0x1D4ED8), c(0x93C5FD)),
    "violet" to CategoryShades(c(0x8B5CF6), c(0xEDE9FE), c(0x2E1065), c(0x6D28D9), c(0xC4B5FD)),
    "fuchsia" to CategoryShades(c(0xD946EF), c(0xFAE8FF), c(0x4A044E), c(0xA21CAF), c(0xF0ABFC)),
    "rose" to CategoryShades(c(0xF43F5E), c(0xFFE4E6), c(0x4C0519), c(0xBE123C), c(0xFDA4AF)),
)

fun categoryShades(name: String): CategoryShades = PALETTE[name] ?: PALETTE.getValue("slate")

/** Chip background + text color for the current theme. */
@Composable
fun categoryChipColors(name: String): Pair<Color, Color> {
    val s = categoryShades(name)
    return if (NorsumiTheme.colors.isDark) s.dark to s.inkDark else s.light to s.inkLight
}

fun parseHexColor(hex: String?, fallback: Color = Color(0xFF888888)): Color = runCatching {
    val h = hex!!.removePrefix("#")
    Color(h.toLong(16) or 0xFF000000)
}.getOrDefault(fallback)
