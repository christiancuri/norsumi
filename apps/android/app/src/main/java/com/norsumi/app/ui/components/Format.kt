package com.norsumi.app.ui.components

import java.time.Duration
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

private val DAY = DateTimeFormatter.ofPattern("MMM d", Locale.getDefault())
private val FULL = DateTimeFormatter.ofPattern("MMM d, yyyy · HH:mm", Locale.getDefault())

fun relativeTime(iso: String, now: Instant = Instant.now()): String {
    val t = runCatching { Instant.parse(iso) }.getOrNull() ?: return ""
    val d = Duration.between(t, now)
    return when {
        d.toMinutes() < 1 -> "Just now"
        d.toMinutes() < 60 -> "${d.toMinutes()}m ago"
        d.toHours() < 24 -> "${d.toHours()}h ago"
        d.toDays() < 2 -> "Yesterday"
        d.toDays() < 7 -> "${d.toDays()}d ago"
        else -> DAY.format(t.atZone(ZoneId.systemDefault()))
    }
}

fun fullDate(iso: String): String =
    runCatching { FULL.format(Instant.parse(iso).atZone(ZoneId.systemDefault())) }.getOrDefault("")
