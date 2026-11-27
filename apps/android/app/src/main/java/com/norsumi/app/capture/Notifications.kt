package com.norsumi.app.capture

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import com.norsumi.app.MainActivity
import com.norsumi.app.R

object Notifications {
    const val CHANNEL_UPLOADS = "uploads"
    const val CHANNEL_WATCHER = "watcher"
    const val ID_WATCHER = 1001
    const val ID_UPLOAD = 1002

    fun createChannels(context: Context) {
        val nm = context.getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(
            NotificationChannel(CHANNEL_UPLOADS, context.getString(R.string.channel_uploads), NotificationManager.IMPORTANCE_LOW).apply {
                description = context.getString(R.string.channel_uploads_desc)
                setShowBadge(false)
            },
        )
        nm.createNotificationChannel(
            NotificationChannel(CHANNEL_WATCHER, context.getString(R.string.channel_watcher), NotificationManager.IMPORTANCE_MIN).apply {
                description = context.getString(R.string.channel_watcher_desc)
                setShowBadge(false)
            },
        )
    }

    private fun openApp(context: Context): PendingIntent = PendingIntent.getActivity(
        context, 0, Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )

    fun upload(context: Context, progress: Int?) = NotificationCompat.Builder(context, CHANNEL_UPLOADS)
        .setSmallIcon(R.drawable.ic_stat_norsumi)
        .setContentTitle(context.getString(R.string.notif_uploading))
        .setOngoing(true)
        .setSilent(true)
        .setContentIntent(openApp(context))
        .apply { if (progress == null) setProgress(0, 0, true) else setProgress(100, progress, false) }
        .build()

    fun watcher(context: Context) = NotificationCompat.Builder(context, CHANNEL_WATCHER)
        .setSmallIcon(R.drawable.ic_stat_norsumi)
        .setContentTitle(context.getString(R.string.notif_watching))
        .setContentText(context.getString(R.string.notif_watching_text))
        .setOngoing(true)
        .setSilent(true)
        .setPriority(NotificationCompat.PRIORITY_MIN)
        .setContentIntent(openApp(context))
        .build()
}
