package com.norsumi.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import com.norsumi.app.data.settings.ThemeMode
import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.norsumi.app.capture.InstantCaptureService
import com.norsumi.app.ui.LocalContainer
import com.norsumi.app.ui.NorsumiRoot
import com.norsumi.app.ui.theme.NorsumiTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        val container = (application as NorsumiApplication).container
        setContent {
            val settings by container.settings.settings.collectAsStateWithLifecycle()
            // System bar icons follow the in-app theme choice, not just the system setting.
            val dark = when (settings.theme) {
                ThemeMode.System -> isSystemInDarkTheme()
                ThemeMode.Light -> false
                ThemeMode.Dark -> true
            }
            LaunchedEffect(dark) {
                val t = android.graphics.Color.TRANSPARENT
                val style = if (dark) SystemBarStyle.dark(t) else SystemBarStyle.light(t, t)
                enableEdgeToEdge(statusBarStyle = style, navigationBarStyle = style)
            }
            CompositionLocalProvider(LocalContainer provides container) {
                NorsumiTheme(settings.theme) { NorsumiRoot() }
            }
        }
    }

    override fun onResume() {
        super.onResume()
        // Foreground services may only be started from the foreground; (re)start here if enabled.
        val container = (application as NorsumiApplication).container
        val s = container.settings.current
        if (s.autoCapture && s.instantCapture && container.session.isSignedIn) InstantCaptureService.start(this)
    }
}
