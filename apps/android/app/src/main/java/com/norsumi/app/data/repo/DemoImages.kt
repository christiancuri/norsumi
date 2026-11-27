package com.norsumi.app.data.repo

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Shader
import android.graphics.Typeface
import java.io.File

/**
 * Debug-only: paints synthetic "screenshots" (fake app chrome, blocks and a headline) so demo mode
 * looks realistic without touching any real image on the device.
 */
internal class DemoImages(context: Context) {
    private val dir = File(context.cacheDir, "demo").apply { mkdirs() }

    fun screenshot(name: String, accent: String, headline: String, dark: Boolean = false, w: Int = 540, h: Int = 1170): String =
        render("$name-${headline.hashCode().toUInt()}-${w}x$h.png") { canvas ->
            val accentColor = Color.parseColor(accent)
            val bg = if (dark) Color.parseColor("#0E1016") else Color.parseColor("#FAFAFC")
            val fg = if (dark) Color.parseColor("#F2F3F7") else Color.parseColor("#14161F")
            val muted = if (dark) Color.parseColor("#2A2E3B") else Color.parseColor("#E6E8EF")
            canvas.drawColor(bg)
            val p = Paint(Paint.ANTI_ALIAS_FLAG)
            // Status bar + app bar.
            p.color = fg; p.textSize = 22f; p.typeface = Typeface.DEFAULT_BOLD
            canvas.drawText("9:41", 28f, 38f, p)
            p.color = muted
            canvas.drawRoundRect(RectF(w - 110f, 20f, w - 28f, 40f), 10f, 10f, p)
            p.color = accentColor
            canvas.drawCircle(52f, 100f, 26f, p)
            p.color = fg; p.textSize = 26f
            canvas.drawText(name.replaceFirstChar { it.uppercase() }, 94f, 110f, p)
            // Hero image block.
            val hero = RectF(20f, 150f, w - 20f, h * 0.52f)
            p.shader = LinearGradient(hero.left, hero.top, hero.right, hero.bottom, accentColor, shade(accentColor, 0.45f), Shader.TileMode.CLAMP)
            canvas.drawRoundRect(hero, 28f, 28f, p)
            p.shader = null
            p.color = Color.argb(70, 255, 255, 255)
            canvas.drawCircle(hero.right - 120f, hero.top + 140f, 90f, p)
            canvas.drawCircle(hero.left + 110f, hero.bottom - 60f, 140f, p)
            // Headline.
            p.color = fg; p.textSize = 40f; p.typeface = Typeface.create(Typeface.SERIF, Typeface.BOLD)
            var y = hero.bottom + 70f
            wrap(headline, p, w - 60f).take(3).forEach { line -> canvas.drawText(line, 30f, y, p); y += 50f }
            // Body lines.
            p.color = muted
            repeat(7) { i ->
                val right = if (i % 3 == 2) w * 0.55f else w - 30f
                canvas.drawRoundRect(RectF(30f, y, right, y + 18f), 9f, 9f, p)
                y += 36f
            }
            // Action row.
            p.color = accentColor
            canvas.drawRoundRect(RectF(30f, h - 140f, w * 0.6f, h - 76f), 32f, 32f, p)
            p.color = muted
            canvas.drawRoundRect(RectF(w * 0.64f, h - 140f, w - 30f, h - 76f), 32f, 32f, p)
        }

    fun cover(name: String, accent: String, w: Int = 1200, h: Int = 630): String = render("$name-cover.png") { canvas ->
        val c = Color.parseColor(accent)
        val p = Paint(Paint.ANTI_ALIAS_FLAG)
        p.shader = LinearGradient(0f, 0f, w.toFloat(), h.toFloat(), c, shade(c, 0.35f), Shader.TileMode.CLAMP)
        canvas.drawRect(0f, 0f, w.toFloat(), h.toFloat(), p)
        p.shader = null
        p.color = Color.argb(60, 255, 255, 255)
        canvas.drawCircle(w * 0.8f, h * 0.3f, 220f, p)
        p.color = Color.argb(40, 255, 255, 255)
        canvas.drawRoundRect(RectF(80f, h * 0.55f, w * 0.6f, h * 0.62f), 20f, 20f, p)
        canvas.drawRoundRect(RectF(80f, h * 0.68f, w * 0.45f, h * 0.75f), 20f, 20f, p)
    }

    private fun render(file: String, draw: (Canvas) -> Unit): String {
        val out = File(dir, file)
        if (!out.exists()) {
            val (w, h) = Regex("(\\d+)x(\\d+)").find(file)?.destructured?.let { (a, b) -> a.toInt() to b.toInt() } ?: (1200 to 630)
            val bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
            draw(Canvas(bmp))
            out.outputStream().use { bmp.compress(Bitmap.CompressFormat.PNG, 100, it) }
            bmp.recycle()
        }
        return "file://${out.absolutePath}"
    }

    private fun wrap(text: String, paint: Paint, max: Float): List<String> {
        val lines = mutableListOf<String>()
        var line = ""
        text.split(" ").forEach { word ->
            val next = if (line.isEmpty()) word else "$line $word"
            if (paint.measureText(next) > max && line.isNotEmpty()) { lines += line; line = word } else line = next
        }
        if (line.isNotEmpty()) lines += line
        return lines
    }

    private fun shade(color: Int, f: Float) = Color.rgb(
        (Color.red(color) * f).toInt(), (Color.green(color) * f).toInt(), (Color.blue(color) * f).toInt(),
    )
}
