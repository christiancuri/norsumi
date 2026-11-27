package com.norsumi.app.share

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.OpenableColumns
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.lifecycleScope
import com.norsumi.app.MainActivity
import com.norsumi.app.R
import com.norsumi.app.NorsumiApplication
import com.norsumi.app.capture.UploadJob
import com.norsumi.app.data.repo.LibraryChange
import com.norsumi.app.ui.components.ElephantLogo
import com.norsumi.app.ui.theme.NorsumiTheme
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.time.Instant
import java.util.UUID

private sealed interface ShareUi {
    data object Working : ShareUi
    data class Saved(val what: String) : ShareUi
    data object SignedOut : ShareUi
    data class Failed(val message: String) : ShareUi
}

/**
 * Share-sheet target. Hands work to WorkManager (survives process death and offline) and shows a
 * compact confirmation that dismisses itself.
 */
class ShareActivity : ComponentActivity() {
    private var ui by mutableStateOf<ShareUi>(ShareUi.Working)

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        val container = (application as NorsumiApplication).container
        setContent {
            val settings by container.settings.settings.collectAsStateWithLifecycle()
            NorsumiTheme(settings.theme) { ShareSheet(ui, onDismiss = ::finish, onOpenApp = ::openApp) }
        }
        if (savedInstanceState == null) lifecycleScope.launch { handle(intent) }
    }

    private suspend fun handle(intent: Intent) {
        val container = (application as NorsumiApplication).container
        container.session.awaitReady()
        val demo = container.settings.current.demoMode
        if (!container.session.isSignedIn && !demo) {
            ui = ShareUi.SignedOut
            return
        }
        val now = Instant.now().toString()
        val type = intent.type.orEmpty()
        val result = runCatching {
            when {
                type.startsWith("image/") -> {
                    val uris = imageUris(intent)
                    require(uris.isNotEmpty()) { "Nothing to save" }
                    if (demo) {
                        resources.getQuantityString(R.plurals.images_count, uris.size, uris.size)
                    } else {
                        // Copy while we hold the URI grant; the upload may run long after this activity is gone.
                        val files = withContext(Dispatchers.IO) { uris.map { copyToPrivate(it) } }
                        files.forEach { (file, mime) ->
                            container.scheduler.enqueueUpload(
                                UploadJob(
                                    uri = Uri.fromFile(file), kind = "image", clientId = "share:${file.nameWithoutExtension}",
                                    capturedAt = now, mime = mime, size = file.length(), fileName = file.name, deleteAfter = true,
                                ),
                                wifiOnly = false,
                            )
                        }
                        resources.getQuantityString(R.plurals.images_count, files.size, files.size)
                    }
                }
                else -> {
                    val text = intent.getCharSequenceExtra(Intent.EXTRA_TEXT)?.toString()
                    val parsed = ShareText.parse(text, intent.getStringExtra(Intent.EXTRA_SUBJECT)) ?: error("Nothing to save")
                    if (demo) {
                        when (parsed) {
                            is SharedText.Link -> container.demo.createLink(parsed.url, parsed.text)
                            is SharedText.Note -> container.demo.createNote(parsed.text)
                        }
                        container.demo.emit(LibraryChange.Created)
                    } else {
                        ShareWorker.enqueue(this, parsed, now)
                    }
                    if (parsed is SharedText.Link) "Link" else "Note"
                }
            }
        }
        ui = result.fold({ ShareUi.Saved(it) }, { ShareUi.Failed(it.message ?: "Couldn't save") })
        if (ui is ShareUi.Saved) {
            delay(1700)
            finish()
        }
    }

    @Suppress("DEPRECATION")
    private fun imageUris(intent: Intent): List<Uri> = when (intent.action) {
        Intent.ACTION_SEND_MULTIPLE -> if (Build.VERSION.SDK_INT >= 33) {
            intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM, Uri::class.java).orEmpty()
        } else {
            intent.getParcelableArrayListExtra<Uri>(Intent.EXTRA_STREAM).orEmpty()
        }
        else -> listOfNotNull(
            if (Build.VERSION.SDK_INT >= 33) intent.getParcelableExtra(Intent.EXTRA_STREAM, Uri::class.java) else intent.getParcelableExtra(Intent.EXTRA_STREAM),
        )
    }.take(20)

    private fun copyToPrivate(uri: Uri): Pair<File, String> {
        val mime = contentResolver.getType(uri) ?: "image/jpeg"
        val ext = when (mime) { "image/png" -> "png"; "image/webp" -> "webp"; "image/heic" -> "heic"; "image/heif" -> "heif"; else -> "jpg" }
        val size = contentResolver.query(uri, arrayOf(OpenableColumns.SIZE), null, null, null)?.use { c ->
            if (c.moveToFirst() && !c.isNull(0)) c.getLong(0) else -1L
        } ?: -1L
        require(size <= 25L * 1024 * 1024) { "Image is larger than 25 MB" }
        val dir = File(filesDir, "share-queue").apply { mkdirs() }
        val out = File(dir, "${UUID.randomUUID()}.$ext")
        contentResolver.openInputStream(uri)!!.use { input -> out.outputStream().use { input.copyTo(it) } }
        return out to mime
    }

    private fun openApp() {
        startActivity(Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        finish()
    }
}

@Composable
private fun ShareSheet(ui: ShareUi, onDismiss: () -> Unit, onOpenApp: () -> Unit) {
    val colors = NorsumiTheme.colors
    val rise = remember { Animatable(1f) }
    LaunchedEffect(Unit) { rise.animateTo(0f, spring(dampingRatio = 0.8f, stiffness = 400f)) }
    Box(
        Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.32f))
            .clickable(interactionSource = remember { MutableInteractionSource() }, indication = null, onClick = onDismiss),
        contentAlignment = Alignment.BottomCenter,
    ) {
        Column(
            Modifier
                .graphicsLayer { translationY = rise.value * 400f }
                .fillMaxWidth()
                .padding(12.dp)
                .navigationBarsPadding()
                .clip(RoundedCornerShape(28.dp))
                .background(colors.surface)
                .clickable(interactionSource = remember { MutableInteractionSource() }, indication = null) {}
                .padding(20.dp),
        ) {
            AnimatedContent(ui, transitionSpec = { (fadeIn(tween(200)) + slideInVertically { it / 4 }) togetherWith fadeOut(tween(120)) }, label = "share") { s ->
                Row(verticalAlignment = Alignment.CenterVertically) {
                    when (s) {
                        is ShareUi.Saved -> Box(
                            Modifier.size(48.dp).clip(CircleShape).background(colors.success), contentAlignment = Alignment.Center,
                        ) { Icon(Icons.Filled.Check, null, tint = Color.White) }
                        ShareUi.Working -> Box(Modifier.size(48.dp), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator(Modifier.size(28.dp), strokeWidth = 2.5.dp)
                        }
                        else -> ElephantLogo(size = 48.dp)
                    }
                    Spacer(Modifier.width(14.dp))
                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        Text(
                            when (s) {
                                ShareUi.Working -> "Saving…"
                                is ShareUi.Saved -> "Saved to norsumi"
                                ShareUi.SignedOut -> "Sign in to norsumi"
                                is ShareUi.Failed -> "Couldn't save"
                            },
                            style = MaterialTheme.typography.headlineSmall,
                        )
                        Text(
                            when (s) {
                                ShareUi.Working -> "One moment"
                                is ShareUi.Saved -> "${s.what} · norsumi will organize it"
                                ShareUi.SignedOut -> "Open the app and sign in, then share again."
                                is ShareUi.Failed -> s.message
                            },
                            style = MaterialTheme.typography.bodySmall, color = colors.muted,
                        )
                    }
                }
            }
            if (ui is ShareUi.SignedOut || ui is ShareUi.Failed) {
                Spacer(Modifier.height(16.dp))
                Button(onClick = if (ui is ShareUi.SignedOut) onOpenApp else onDismiss, modifier = Modifier.fillMaxWidth(), shape = CircleShape) {
                    Text(if (ui is ShareUi.SignedOut) "Open norsumi" else "Close")
                }
            }
        }
    }
}
