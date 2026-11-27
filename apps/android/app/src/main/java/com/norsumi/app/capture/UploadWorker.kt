package com.norsumi.app.capture

import android.content.Context
import android.content.pm.ServiceInfo
import android.net.Uri
import android.util.Log
import androidx.core.net.toUri
import androidx.work.CoroutineWorker
import androidx.work.ForegroundInfo
import androidx.work.WorkerParameters
import com.norsumi.app.NorsumiApplication
import com.norsumi.app.data.api.ApiException
import com.norsumi.app.data.repo.LibraryChange
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import java.io.File
import java.io.FileNotFoundException
import java.io.IOException

/** Streams one file to `POST /api/items/upload`. Unique per file (see [CaptureScheduler.enqueueUpload]). */
class UploadWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {

    override suspend fun getForegroundInfo(): ForegroundInfo =
        ForegroundInfo(Notifications.ID_UPLOAD, Notifications.upload(applicationContext, null), ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val container = (applicationContext as NorsumiApplication).container
        val uri = inputData.getString(KEY_URI)?.toUri() ?: return@withContext Result.failure()
        val deleteAfter = inputData.getBoolean(KEY_DELETE_AFTER, false)
        container.session.awaitReady()
        if (!container.session.isSignedIn) return@withContext Result.failure()

        val body = ContentUriRequestBody(
            applicationContext.contentResolver, uri,
            (inputData.getString(KEY_MIME) ?: applicationContext.contentResolver.getType(uri) ?: "image/png").toMediaTypeOrNull(),
            inputData.getLong(KEY_SIZE, -1),
        )
        try {
            container.api.uploadBlocking(
                file = body,
                fileName = inputData.getString(KEY_NAME) ?: "upload.png",
                kind = inputData.getString(KEY_KIND) ?: "screenshot",
                capturedAt = inputData.getString(KEY_CAPTURED_AT),
                clientId = inputData.getString(KEY_CLIENT_ID),
            )
            container.remote.emit(LibraryChange.Created)
            cleanup(uri, deleteAfter)
            Result.success()
        } catch (e: ApiException) {
            Log.w(TAG, "Upload rejected: ${e.status} ${e.message}")
            when {
                e.isTransient && runAttemptCount < MAX_ATTEMPTS -> Result.retry()
                e.isUnauthorized && container.session.isSignedIn && runAttemptCount < MAX_ATTEMPTS -> Result.retry()
                else -> Result.failure().also { cleanup(uri, deleteAfter) }
            }
        } catch (e: FileNotFoundException) {
            Log.w(TAG, "Source vanished: $uri")
            Result.failure()
        } catch (e: SecurityException) {
            Log.w(TAG, "No access to $uri")
            Result.failure()
        } catch (e: IOException) {
            if (runAttemptCount < MAX_ATTEMPTS) Result.retry() else Result.failure()
        }
    }

    private fun cleanup(uri: Uri, deleteAfter: Boolean) {
        if (deleteAfter && uri.scheme == "file") uri.path?.let { File(it).delete() }
    }

    companion object {
        private const val TAG = "norsumi.upload"
        private const val MAX_ATTEMPTS = 8
        const val KEY_URI = "uri"
        const val KEY_KIND = "kind"
        const val KEY_CLIENT_ID = "clientId"
        const val KEY_CAPTURED_AT = "capturedAt"
        const val KEY_MIME = "mime"
        const val KEY_SIZE = "size"
        const val KEY_NAME = "name"
        const val KEY_DELETE_AFTER = "deleteAfter"
    }
}
