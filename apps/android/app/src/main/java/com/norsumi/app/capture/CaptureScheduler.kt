package com.norsumi.app.capture

import android.content.Context
import android.net.Uri
import android.provider.MediaStore
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.OutOfQuotaPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkInfo
import androidx.work.WorkManager
import androidx.work.workDataOf
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import java.time.Duration
import java.util.concurrent.TimeUnit

/** Upload request handed to [UploadWorker]. */
data class UploadJob(
    val uri: Uri,
    val kind: String,
    val clientId: String?,
    val capturedAt: String?,
    val mime: String?,
    val size: Long,
    val fileName: String,
    /** Delete the source after upload (used for files copied from the share sheet). */
    val deleteAfter: Boolean = false,
)

data class QueueStatus(val uploading: Int, val waiting: Int, val failed: Int) {
    val active: Int get() = uploading + waiting
}

class CaptureScheduler(private val context: Context) {
    private val wm get() = WorkManager.getInstance(context)

    /**
     * Arms the content-URI trigger: the system wakes [ScreenshotTriggerWorker] when MediaStore images
     * change, even when the app is not running. Content-URI work fires once, so the worker re-arms it
     * by appending the next request ([rearm]).
     */
    fun arm() {
        wm.enqueueUniqueWork(TRIGGER, ExistingWorkPolicy.KEEP, triggerRequest())
        wm.enqueueUniquePeriodicWork(
            PERIODIC, ExistingPeriodicWorkPolicy.KEEP,
            PeriodicWorkRequestBuilder<ScreenshotTriggerWorker>(1, TimeUnit.HOURS)
                .setInputData(workDataOf(ScreenshotTriggerWorker.KEY_PERIODIC to true))
                .build(),
        )
    }

    /** Called from inside the running trigger: queue the next trigger behind the current one. */
    fun rearm() {
        wm.enqueueUniqueWork(TRIGGER, ExistingWorkPolicy.APPEND_OR_REPLACE, triggerRequest())
    }

    fun disarm() {
        wm.cancelUniqueWork(TRIGGER)
        wm.cancelUniqueWork(PERIODIC)
    }

    private fun triggerRequest() = OneTimeWorkRequestBuilder<ScreenshotTriggerWorker>()
        .setConstraints(
            Constraints.Builder()
                .addContentUriTrigger(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, true)
                .setTriggerContentUpdateDelay(Duration.ofMillis(600))
                .setTriggerContentMaxDelay(Duration.ofSeconds(4))
                .build(),
        )
        .addTag(TAG_TRIGGER)
        .build()

    fun enqueueUpload(job: UploadJob, wifiOnly: Boolean, expedited: Boolean = true) {
        val request = OneTimeWorkRequestBuilder<UploadWorker>()
            .setInputData(
                workDataOf(
                    UploadWorker.KEY_URI to job.uri.toString(),
                    UploadWorker.KEY_KIND to job.kind,
                    UploadWorker.KEY_CLIENT_ID to job.clientId,
                    UploadWorker.KEY_CAPTURED_AT to job.capturedAt,
                    UploadWorker.KEY_MIME to job.mime,
                    UploadWorker.KEY_SIZE to job.size,
                    UploadWorker.KEY_NAME to job.fileName,
                    UploadWorker.KEY_DELETE_AFTER to job.deleteAfter,
                ),
            )
            .setConstraints(
                Constraints.Builder()
                    .setRequiredNetworkType(if (wifiOnly) NetworkType.UNMETERED else NetworkType.CONNECTED)
                    .build(),
            )
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 15, TimeUnit.SECONDS)
            .addTag(TAG_UPLOAD)
            .apply { if (expedited && !wifiOnly) setExpedited(OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST) }
            .build()
        // One unique chain per file: re-detecting the same screenshot never uploads it twice.
        wm.enqueueUniqueWork("upload:${job.clientId ?: job.uri}", ExistingWorkPolicy.KEEP, request)
    }

    val queue: Flow<QueueStatus> = wm.getWorkInfosByTagFlow(TAG_UPLOAD).map { infos ->
        QueueStatus(
            uploading = infos.count { it.state == WorkInfo.State.RUNNING },
            waiting = infos.count { it.state == WorkInfo.State.ENQUEUED || it.state == WorkInfo.State.BLOCKED },
            failed = infos.count { it.state == WorkInfo.State.FAILED },
        )
    }

    fun pruneFinished() {
        wm.pruneWork()
    }

    companion object {
        const val TRIGGER = "screenshot-trigger"
        const val PERIODIC = "screenshot-periodic"
        const val TAG_TRIGGER = "trigger"
        const val TAG_UPLOAD = "upload"
    }
}
