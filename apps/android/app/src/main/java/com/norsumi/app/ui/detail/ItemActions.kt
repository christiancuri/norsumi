package com.norsumi.app.ui.detail

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.core.content.FileProvider
import com.norsumi.app.AppContainer
import com.norsumi.app.data.api.await
import com.norsumi.app.data.model.Item
import com.norsumi.app.data.model.ItemEntity
import com.norsumi.app.data.model.ItemKind
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.Request
import java.io.File
import java.net.URLEncoder

/** Opens an entity: maps for places, the deep link when known, a web search otherwise. */
fun openEntity(context: Context, e: ItemEntity) {
    val uri = when {
        e.url != null -> Uri.parse(e.url)
        e.type == "place" -> Uri.parse("geo:0,0?q=" + Uri.encode(listOfNotNull(e.name, e.value).joinToString(", ")))
        e.type == "url" -> Uri.parse(if (e.name.startsWith("http")) e.name else "https://${e.name}")
        else -> Uri.parse("https://www.google.com/search?q=" + URLEncoder.encode(listOfNotNull(e.name, e.value).joinToString(" "), "UTF-8"))
    }
    openUri(context, uri)
}

fun openUri(context: Context, uri: Uri) {
    try {
        context.startActivity(Intent(Intent.ACTION_VIEW, uri).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    } catch (_: ActivityNotFoundException) {
    }
}

/** Shares the original: the image file (downloaded to cache), the link, or the note text. */
suspend fun shareOriginal(context: Context, container: AppContainer, item: Item) {
    val intent = Intent(Intent.ACTION_SEND)
    val image = item.image
    if ((item.kind == ItemKind.Screenshot || item.kind == ItemKind.Image) && image != null) {
        val file = withContext(Dispatchers.IO) {
            val dir = File(context.cacheDir, "shared-out").apply { mkdirs() }
            val ext = when (image.mime) { "image/jpeg" -> "jpg"; "image/webp" -> "webp"; "image/heic" -> "heic"; else -> "png" }
            val out = File(dir, "norsumi-${item.id}.$ext")
            if (!out.exists()) {
                if (image.url.startsWith("file://")) {
                    File(Uri.parse(image.url).path!!).copyTo(out, overwrite = true)
                } else {
                    container.http.newCall(Request.Builder().url(image.url).build()).await().use { r ->
                        if (!r.isSuccessful) error("Download failed (${r.code})")
                        out.outputStream().use { r.body.byteStream().copyTo(it) }
                    }
                }
            }
            out
        }
        intent.type = image.mime.ifEmpty { "image/png" }
        intent.putExtra(Intent.EXTRA_STREAM, FileProvider.getUriForFile(context, "${context.packageName}.files", file))
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    } else {
        intent.type = "text/plain"
        intent.putExtra(Intent.EXTRA_TEXT, item.link?.url ?: item.text ?: item.title)
    }
    if (item.title.isNotEmpty()) intent.putExtra(Intent.EXTRA_SUBJECT, item.title)
    context.startActivity(Intent.createChooser(intent, null).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
}
