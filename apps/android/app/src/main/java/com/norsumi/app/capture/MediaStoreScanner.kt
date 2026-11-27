package com.norsumi.app.capture

import android.content.ContentResolver
import android.content.ContentUris
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.MediaStore

class MediaStoreScanner(private val resolver: ContentResolver) {
    private val collection: Uri = MediaStore.Images.Media.EXTERNAL_CONTENT_URI

    private val projection = arrayOf(
        MediaStore.Images.Media._ID,
        MediaStore.Images.Media.DATE_ADDED,
        MediaStore.Images.Media.DISPLAY_NAME,
        MediaStore.Images.Media.RELATIVE_PATH,
        MediaStore.Images.Media.MIME_TYPE,
        MediaStore.Images.Media.SIZE,
        MediaStore.Images.Media.DATE_TAKEN,
        MediaStore.Images.Media.IS_PENDING,
    )

    fun uriOf(id: Long): Uri = ContentUris.withAppendedId(collection, id)

    /** Highest image id right now; used to start auto-capture "from now". */
    fun maxId(): Long = query(null, null, "${MediaStore.Images.Media._ID} DESC", 1, includePending = true).firstOrNull()?.id ?: 0

    /** All images newer than [afterId], pending ones included so the watermark can wait for them. */
    fun newerThan(afterId: Long): List<MediaRow> =
        query("${MediaStore.Images.Media._ID} > ?", arrayOf(afterId.toString()), "${MediaStore.Images.Media._ID} ASC", 500, includePending = true)

    /** Most recent screenshots, newest first (for "Import last N"). */
    fun latestScreenshots(count: Int): List<MediaRow> =
        query(null, null, "${MediaStore.Images.Media._ID} DESC", 400, includePending = false)
            .let { Screenshots.uploadable(it) }
            .take(count)

    private fun query(selection: String?, args: Array<String>?, order: String, limit: Int, includePending: Boolean): List<MediaRow> {
        val bundle = Bundle().apply {
            selection?.let { putString(ContentResolver.QUERY_ARG_SQL_SELECTION, it) }
            args?.let { putStringArray(ContentResolver.QUERY_ARG_SQL_SELECTION_ARGS, it) }
            putString(ContentResolver.QUERY_ARG_SQL_SORT_ORDER, order)
            putInt(ContentResolver.QUERY_ARG_LIMIT, limit)
            if (includePending && Build.VERSION.SDK_INT >= 30) putInt(MediaStore.QUERY_ARG_MATCH_PENDING, MediaStore.MATCH_INCLUDE)
        }
        // Android 10 ignores QUERY_ARG_MATCH_PENDING; it only honours the (since deprecated) URI flag.
        @Suppress("DEPRECATION")
        val uri = if (includePending && Build.VERSION.SDK_INT == 29) MediaStore.setIncludePending(collection) else collection
        val rows = mutableListOf<MediaRow>()
        resolver.query(uri, projection, bundle, null)?.use { c ->
            val id = c.getColumnIndexOrThrow(MediaStore.Images.Media._ID)
            val added = c.getColumnIndexOrThrow(MediaStore.Images.Media.DATE_ADDED)
            val name = c.getColumnIndexOrThrow(MediaStore.Images.Media.DISPLAY_NAME)
            val path = c.getColumnIndexOrThrow(MediaStore.Images.Media.RELATIVE_PATH)
            val mime = c.getColumnIndexOrThrow(MediaStore.Images.Media.MIME_TYPE)
            val size = c.getColumnIndexOrThrow(MediaStore.Images.Media.SIZE)
            val taken = c.getColumnIndexOrThrow(MediaStore.Images.Media.DATE_TAKEN)
            val pending = c.getColumnIndexOrThrow(MediaStore.Images.Media.IS_PENDING)
            while (c.moveToNext()) {
                rows += MediaRow(
                    id = c.getLong(id),
                    dateAddedSeconds = c.getLong(added),
                    displayName = c.getString(name),
                    relativePath = c.getString(path),
                    mimeType = c.getString(mime),
                    size = c.getLong(size),
                    dateTakenMillis = if (c.isNull(taken)) null else c.getLong(taken),
                    isPending = c.getInt(pending) != 0,
                )
            }
        }
        return rows
    }
}
