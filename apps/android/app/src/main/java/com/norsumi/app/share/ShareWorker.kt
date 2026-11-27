package com.norsumi.app.share

import android.content.Context
import android.content.pm.ServiceInfo
import androidx.work.ForegroundInfo
import com.norsumi.app.capture.Notifications
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.OutOfQuotaPolicy
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import androidx.work.workDataOf
import com.norsumi.app.NorsumiApplication
import com.norsumi.app.capture.CaptureScheduler
import com.norsumi.app.data.api.ApiException
import java.io.IOException
import java.util.concurrent.TimeUnit

/** Creates a link or note item from shared text; survives process death and offline shares. */
class ShareWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun getForegroundInfo(): ForegroundInfo = ForegroundInfo(
        Notifications.ID_UPLOAD, Notifications.upload(applicationContext, null), ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC,
    )

    override suspend fun doWork(): Result {
        val container = (applicationContext as NorsumiApplication).container
        container.session.awaitReady()
        if (!container.session.isSignedIn) return Result.failure()
        val capturedAt = inputData.getString(KEY_CAPTURED_AT)
        return try {
            val url = inputData.getString(KEY_URL)
            val text = inputData.getString(KEY_TEXT)
            if (url != null) container.api.createLink(url, text, capturedAt) else container.api.createNote(text.orEmpty(), capturedAt)
            container.remote.emit(com.norsumi.app.data.repo.LibraryChange.Created)
            Result.success()
        } catch (e: ApiException) {
            if ((e.isTransient || e.isUnauthorized) && runAttemptCount < 8) Result.retry() else Result.failure()
        } catch (_: IOException) {
            if (runAttemptCount < 8) Result.retry() else Result.failure()
        }
    }

    companion object {
        private const val KEY_URL = "url"
        private const val KEY_TEXT = "text"
        private const val KEY_CAPTURED_AT = "capturedAt"

        fun enqueue(context: Context, shared: SharedText, capturedAt: String) {
            val data = when (shared) {
                is SharedText.Link -> workDataOf(KEY_URL to shared.url, KEY_TEXT to shared.text, KEY_CAPTURED_AT to capturedAt)
                is SharedText.Note -> workDataOf(KEY_TEXT to shared.text, KEY_CAPTURED_AT to capturedAt)
            }
            val request = OneTimeWorkRequestBuilder<ShareWorker>()
                .setInputData(data)
                .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 10, TimeUnit.SECONDS)
                .setExpedited(OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST)
                .addTag(CaptureScheduler.TAG_UPLOAD)
                .build()
            WorkManager.getInstance(context).enqueue(request)
        }
    }
}
