package com.norsumi.app.capture

import android.content.Context
import android.util.Log
import com.norsumi.app.data.auth.SessionManager
import com.norsumi.app.data.settings.SettingsStore
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import java.time.Instant

/**
 * Finds new screenshots and queues their uploads. Shared by the WorkManager trigger and the
 * instant-capture service; the mutex keeps them from racing on the watermark.
 */
class CaptureEngine(
    private val context: Context,
    private val settings: SettingsStore,
    private val session: SessionManager,
    private val scheduler: CaptureScheduler,
) {
    private val scanner = MediaStoreScanner(context.contentResolver)
    private val mutex = Mutex()

    private fun canRun(): Boolean {
        val s = settings.current
        return s.autoCapture && !s.demoMode && session.isSignedIn && MediaPermissions.access(context) == MediaAccess.Full
    }

    /** Returns how many uploads were queued. */
    suspend fun scan(): Int = mutex.withLock {
        session.awaitReady()
        if (!canRun()) return 0
        withContext(Dispatchers.IO) {
            val watermark = settings.current.watermarkId
            if (watermark <= 0L) {
                // Never upload the existing camera roll implicitly.
                settings.setWatermark(scanner.maxId())
                return@withContext 0
            }
            val rows = scanner.newerThan(watermark)
            val uploads = Screenshots.uploadable(rows)
            uploads.forEach { enqueue(it) }
            settings.setWatermark(Screenshots.nextWatermark(watermark, rows))
            if (uploads.isNotEmpty()) Log.i(TAG, "Queued ${uploads.size} screenshot(s)")
            uploads.size
        }
    }

    /** Turns auto-capture on starting from "now". */
    suspend fun enable() {
        withContext(Dispatchers.IO) { settings.setWatermark(scanner.maxId()) }
        settings.setAutoCapture(true)
        scheduler.arm()
        if (settings.current.instantCapture) InstantCaptureService.start(context)
    }

    suspend fun disable() {
        settings.setAutoCapture(false)
        scheduler.disarm()
        InstantCaptureService.stop(context)
    }

    suspend fun setInstant(enabled: Boolean) {
        settings.setInstantCapture(enabled)
        if (enabled && settings.current.autoCapture) InstantCaptureService.start(context) else InstantCaptureService.stop(context)
    }

    /** Uploads the latest [count] screenshots regardless of the watermark (server dedups). */
    suspend fun importLatest(count: Int): Int = withContext(Dispatchers.IO) {
        session.awaitReady()
        if (!session.isSignedIn || MediaPermissions.access(context) != MediaAccess.Full) return@withContext 0
        val rows = scanner.latestScreenshots(count)
        rows.forEach { enqueue(it) }
        rows.size
    }

    private fun enqueue(row: MediaRow) {
        val capturedMillis = row.dateTakenMillis?.takeIf { it > 0 } ?: (row.dateAddedSeconds * 1000)
        scheduler.enqueueUpload(
            UploadJob(
                uri = scanner.uriOf(row.id),
                kind = "screenshot",
                clientId = Screenshots.clientId(row.id, row.dateAddedSeconds),
                capturedAt = Instant.ofEpochMilli(capturedMillis).toString(),
                mime = row.mimeType,
                size = row.size,
                fileName = row.displayName ?: "screenshot-${row.id}.png",
            ),
            wifiOnly = settings.current.wifiOnly,
        )
    }

    private companion object {
        const val TAG = "norsumi.capture"
    }
}
