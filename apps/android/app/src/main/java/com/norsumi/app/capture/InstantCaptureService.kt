package com.norsumi.app.capture

import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.database.ContentObserver
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.provider.MediaStore
import android.util.Log
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat
import com.norsumi.app.NorsumiApplication
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.Dispatchers

/**
 * Optional "Instant capture": a foreground service holding a [ContentObserver] so screenshots are
 * queued within a second instead of waiting for the JobScheduler trigger. Shows a silent,
 * minimum-importance notification.
 */
class InstantCaptureService : Service() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private var pending: Job? = null

    private val observer = object : ContentObserver(Handler(Looper.getMainLooper())) {
        override fun onChange(selfChange: Boolean, uri: Uri?) {
            // Debounce bursts (insert, then IS_PENDING → 0 update).
            pending?.cancel()
            pending = scope.launch {
                delay(700)
                runCatching { (application as NorsumiApplication).container.capture.scan() }
            }
        }
    }

    override fun onCreate() {
        super.onCreate()
        val type = if (Build.VERSION.SDK_INT >= 34) ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE else 0
        try {
            ServiceCompat.startForeground(this, Notifications.ID_WATCHER, Notifications.watcher(this), type)
        } catch (e: Exception) {
            Log.w(TAG, "Can't start in foreground: ${e.message}")
            stopSelf()
            return
        }
        contentResolver.registerContentObserver(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, true, observer)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val settings = (application as NorsumiApplication).container.settings.current
        if (!settings.autoCapture || !settings.instantCapture) stopSelf()
        return START_STICKY
    }

    override fun onDestroy() {
        contentResolver.unregisterContentObserver(observer)
        scope.cancel()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    companion object {
        private const val TAG = "norsumi.instant"

        fun start(context: Context) {
            runCatching { ContextCompat.startForegroundService(context, Intent(context, InstantCaptureService::class.java)) }
                .onFailure { Log.w(TAG, "Not started: ${it.message}") }
        }

        fun stop(context: Context) {
            context.stopService(Intent(context, InstantCaptureService::class.java))
        }
    }
}
