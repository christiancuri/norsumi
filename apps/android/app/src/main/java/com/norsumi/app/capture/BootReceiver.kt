package com.norsumi.app.capture

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.norsumi.app.NorsumiApplication
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/** Re-arms capture after a reboot or an app update. */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED && intent.action != Intent.ACTION_MY_PACKAGE_REPLACED) return
        val container = (context.applicationContext as NorsumiApplication).container
        val result = goAsync()
        CoroutineScope(Dispatchers.Default).launch {
            try {
                container.session.awaitReady()
                val s = container.settings.current
                if (s.autoCapture && container.session.isSignedIn) {
                    container.scheduler.arm()
                    if (s.instantCapture) InstantCaptureService.start(context)
                }
            } finally {
                result.finish()
            }
        }
    }
}
