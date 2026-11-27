package com.norsumi.app.capture

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.norsumi.app.NorsumiApplication

/**
 * Runs when MediaStore images change (content-URI trigger) and hourly as a safety net. Scans for
 * new screenshots, then re-arms the one-shot trigger.
 */
class ScreenshotTriggerWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        val container = (applicationContext as NorsumiApplication).container
        if (!container.settings.current.autoCapture) return Result.success()
        runCatching { container.capture.scan() }
        if (!inputData.getBoolean(KEY_PERIODIC, false)) container.scheduler.rearm()
        return Result.success()
    }

    companion object {
        const val KEY_PERIODIC = "periodic"
    }
}
