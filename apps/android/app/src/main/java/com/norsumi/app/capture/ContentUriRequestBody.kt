package com.norsumi.app.capture

import android.content.ContentResolver
import android.net.Uri
import okhttp3.MediaType
import okhttp3.RequestBody
import okio.BufferedSink
import okio.source
import java.io.FileNotFoundException

/**
 * Streams the bytes of a content:// or file:// URI straight into the request; nothing is buffered in
 * memory. Re-opens the stream on every write so OkHttp retries work.
 */
class ContentUriRequestBody(
    private val resolver: ContentResolver,
    private val uri: Uri,
    private val type: MediaType?,
    private val length: Long,
    private val onProgress: ((Long, Long) -> Unit)? = null,
) : RequestBody() {
    override fun contentType(): MediaType? = type
    override fun contentLength(): Long = if (length > 0) length else -1

    override fun writeTo(sink: BufferedSink) {
        val input = resolver.openInputStream(uri) ?: throw FileNotFoundException(uri.toString())
        input.source().use { source ->
            var total = 0L
            while (true) {
                val read = source.read(sink.buffer, SEGMENT)
                if (read == -1L) break
                total += read
                sink.emitCompleteSegments()
                onProgress?.invoke(total, length)
            }
        }
    }

    private companion object {
        const val SEGMENT = 64L * 1024
    }
}
