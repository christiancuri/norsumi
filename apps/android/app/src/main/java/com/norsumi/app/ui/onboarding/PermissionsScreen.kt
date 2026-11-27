package com.norsumi.app.ui.onboarding

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.outlined.BatteryChargingFull
import androidx.compose.material.icons.outlined.NotificationsActive
import androidx.compose.material.icons.outlined.PhotoLibrary
import androidx.compose.material3.Button
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.LifecycleResumeEffect
import com.norsumi.app.capture.MediaAccess
import com.norsumi.app.capture.MediaPermissions
import com.norsumi.app.ui.LocalContainer
import com.norsumi.app.ui.components.ElephantLogo
import com.norsumi.app.ui.theme.NorsumiTheme
import kotlinx.coroutines.launch

@SuppressLint("BatteryLife")
@Composable
fun PermissionsScreen(onDone: () -> Unit) {
    val container = LocalContainer.current
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val colors = NorsumiTheme.colors

    // Bumped on resume and after each request so statuses are re-read.
    var tick by remember { mutableIntStateOf(0) }
    LifecycleResumeEffect(Unit) { tick++; onPauseOrDispose { } }
    val media = remember(tick) { MediaPermissions.access(context) }
    val notifications = remember(tick) { MediaPermissions.notificationsGranted(context) }
    val battery = remember(tick) { MediaPermissions.ignoringBatteryOptimizations(context) }

    val mediaLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { tick++ }
    val notifLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { tick++ }

    fun openAppSettings() = context.startActivity(
        Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${context.packageName}")),
    )

    Column(
        Modifier.fillMaxSize().statusBarsPadding().navigationBarsPadding().verticalScroll(rememberScrollState()).padding(24.dp),
    ) {
        Spacer(Modifier.height(16.dp))
        ElephantLogo(size = 52.dp)
        Spacer(Modifier.height(24.dp))
        Text(
            buildAnnotatedString {
                append("Let norsumi catch\nyour ")
                withStyle(SpanStyle(fontStyle = FontStyle.Italic)) { append("screenshots.") }
            },
            style = MaterialTheme.typography.displaySmall,
        )
        Spacer(Modifier.height(10.dp))
        Text(
            "Take a screenshot anywhere and it lands in your library, named and filed. Only screenshots are sent — never the rest of your photos.",
            style = MaterialTheme.typography.bodyMedium, color = colors.muted,
        )
        Spacer(Modifier.height(28.dp))

        PermissionCard(
            icon = Icons.Outlined.PhotoLibrary,
            title = "Photos access",
            body = when (media) {
                MediaAccess.Full -> "norsumi can see new screenshots as they're taken."
                MediaAccess.Partial -> "You picked “Select photos”. New screenshots won't be visible, so auto-capture needs “Allow all”."
                MediaAccess.None -> "Needed to notice new screenshots. norsumi reads only images in your Screenshots folder."
            },
            granted = media == MediaAccess.Full,
            action = if (media == MediaAccess.Partial) "Allow all" else "Allow",
            onAction = { if (media == MediaAccess.Partial) openAppSettings() else mediaLauncher.launch(MediaPermissions.request) },
        )
        Spacer(Modifier.height(12.dp))
        PermissionCard(
            icon = Icons.Outlined.NotificationsActive,
            title = "Notifications",
            body = "Shows upload progress and the optional instant-capture indicator. Optional.",
            granted = notifications,
            action = "Allow",
            onAction = {
                if (Build.VERSION.SDK_INT >= 33) notifLauncher.launch(Manifest.permission.POST_NOTIFICATIONS) else openAppSettings()
            },
        )
        Spacer(Modifier.height(12.dp))
        PermissionCard(
            icon = Icons.Outlined.BatteryChargingFull,
            title = "Run in background",
            body = "Some phones (Samsung especially) delay or stop background work. Exempting norsumi keeps uploads timely. Optional.",
            granted = battery,
            action = "Exempt",
            onAction = {
                runCatching {
                    context.startActivity(
                        Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:${context.packageName}")),
                    )
                }
            },
        )
        Spacer(Modifier.height(32.dp))
        Button(
            onClick = {
                scope.launch {
                    if (media == MediaAccess.Full) container.capture.enable()
                    container.settings.setPermissionsOnboarded(true)
                    onDone()
                }
            },
            modifier = Modifier.fillMaxWidth().height(54.dp),
            shape = CircleShape,
        ) {
            Text(if (media == MediaAccess.Full) "Turn on auto-capture" else "Continue", style = MaterialTheme.typography.titleSmall)
        }
        TextButton(
            onClick = { scope.launch { container.settings.setPermissionsOnboarded(true); onDone() } },
            modifier = Modifier.fillMaxWidth(),
        ) { Text("Not now", color = colors.muted) }
    }
}

@Composable
private fun PermissionCard(icon: ImageVector, title: String, body: String, granted: Boolean, action: String, onAction: () -> Unit) {
    val colors = NorsumiTheme.colors
    val shape = RoundedCornerShape(20.dp)
    Row(
        Modifier.fillMaxWidth().clip(shape).background(colors.surface).border(1.dp, colors.border, shape).padding(16.dp),
        verticalAlignment = Alignment.Top,
    ) {
        Box(
            Modifier.size(40.dp).clip(RoundedCornerShape(12.dp)).background(MaterialTheme.colorScheme.primaryContainer),
            contentAlignment = Alignment.Center,
        ) { Icon(icon, null, Modifier.size(20.dp), tint = MaterialTheme.colorScheme.primary) }
        Spacer(Modifier.width(14.dp))
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(title, style = MaterialTheme.typography.titleSmall)
            Text(body, style = MaterialTheme.typography.bodySmall, color = colors.muted)
            Spacer(Modifier.height(6.dp))
            if (granted) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Filled.CheckCircle, null, Modifier.size(16.dp), tint = colors.success)
                    Spacer(Modifier.width(6.dp))
                    Text("Allowed", style = MaterialTheme.typography.labelMedium, color = colors.success)
                }
            } else {
                FilledTonalButton(onClick = onAction, shape = CircleShape) { Text(action) }
            }
        }
    }
}
