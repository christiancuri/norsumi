package com.norsumi.app.capture

/** A row from MediaStore.Images. */
data class MediaRow(
    val id: Long,
    val dateAddedSeconds: Long,
    val displayName: String?,
    val relativePath: String?,
    val mimeType: String?,
    val size: Long,
    val dateTakenMillis: Long?,
    val isPending: Boolean,
)

/** Pure helpers for screenshot detection; unit tested. */
object Screenshots {
    private val FOLDER_HINTS = listOf("screenshot", "screen_shot", "screen shot", "screencapture", "screen capture")
    private val NAME_PREFIXES = listOf("screenshot", "screen_shot", "screen shot", "scrnshot", "screencapture")

    /**
     * True when the file looks like a system screenshot. Covers Pixel/AOSP (`Pictures/Screenshots/`),
     * Samsung (`DCIM/Screenshots/`), MIUI/OnePlus variants and file names like `Screenshot_2024…`.
     * Screen recordings are videos and never reach the image table.
     */
    fun isScreenshot(relativePath: String?, displayName: String?): Boolean {
        val path = relativePath?.lowercase().orEmpty()
        if (FOLDER_HINTS.any { path.contains(it) }) return true
        val name = displayName?.lowercase()?.trim().orEmpty()
        return NAME_PREFIXES.any { name.startsWith(it) }
    }

    /** Stable per-file id used by the API for idempotent uploads. */
    fun clientId(mediaId: Long, dateAddedSeconds: Long): String = "mediastore:$mediaId:$dateAddedSeconds"

    /**
     * Where the next scan should start. Rows still pending (being written) hold the watermark back
     * so they are picked up once finished.
     */
    fun nextWatermark(current: Long, rows: List<MediaRow>): Long {
        val firstPending = rows.filter { it.isPending }.minOfOrNull { it.id }
        val maxDone = rows.filter { !it.isPending }.maxOfOrNull { it.id } ?: current
        val next = if (firstPending != null) minOf(maxDone, firstPending - 1) else maxDone
        return maxOf(current, next)
    }

    /** Rows that should be uploaded now. */
    fun uploadable(rows: List<MediaRow>, maxBytes: Long = MAX_UPLOAD_BYTES): List<MediaRow> = rows.filter {
        !it.isPending && isScreenshot(it.relativePath, it.displayName) &&
            (it.size in 1..maxBytes || it.size <= 0) && (it.mimeType == null || it.mimeType in ACCEPTED_MIME)
    }

    const val MAX_UPLOAD_BYTES = 25L * 1024 * 1024
    val ACCEPTED_MIME = setOf("image/png", "image/jpeg", "image/webp", "image/heic", "image/heif")
}
