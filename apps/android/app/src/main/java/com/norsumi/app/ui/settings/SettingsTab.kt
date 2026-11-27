package com.norsumi.app.ui.settings

import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.Logout
import androidx.compose.material.icons.automirrored.outlined.OpenInNew
import androidx.compose.material.icons.outlined.AutoAwesome
import androidx.compose.material.icons.outlined.Bolt
import androidx.compose.material.icons.outlined.BugReport
import androidx.compose.material.icons.outlined.CloudUpload
import androidx.compose.material.icons.outlined.Dns
import androidx.compose.material.icons.outlined.History
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.outlined.Wifi
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.OutlinedTextField
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import com.norsumi.app.data.api.ApiException
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.LifecycleResumeEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil3.compose.AsyncImage
import com.norsumi.app.BuildConfig
import com.norsumi.app.capture.MediaAccess
import com.norsumi.app.capture.MediaPermissions
import com.norsumi.app.capture.QueueStatus
import com.norsumi.app.data.auth.AuthState
import com.norsumi.app.data.settings.ThemeMode
import com.norsumi.app.ui.LocalContainer
import com.norsumi.app.ui.components.BrandGradient
import com.norsumi.app.ui.theme.NorsumiTheme
import kotlinx.coroutines.launch

@Composable
fun SettingsTab(bottom: PaddingValues, onOpenPermissions: () -> Unit) {
    val container = LocalContainer.current
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val colors = NorsumiTheme.colors
    val settings by container.settings.settings.collectAsStateWithLifecycle()
    val auth by container.authState.collectAsStateWithLifecycle()
    val queue by container.scheduler.queue.collectAsStateWithLifecycle(QueueStatus(0, 0, 0))
    var media by remember { mutableStateOf(MediaPermissions.access(context)) }
    LifecycleResumeEffect(Unit) { media = MediaPermissions.access(context); onPauseOrDispose { } }
    var confirmSignOut by remember { mutableStateOf(false) }
    var confirmDelete by remember { mutableStateOf(false) }
    val user = (auth as? AuthState.SignedIn)?.user

    Column(
        Modifier
            .fillMaxSize()
            .statusBarsPadding()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 16.dp)
            .padding(bottom = bottom.calculateBottomPadding() + 32.dp),
    ) {
        Text("Settings", style = MaterialTheme.typography.displaySmall, modifier = Modifier.padding(start = 4.dp, top = 28.dp, bottom = 20.dp))

        // Account
        Row(
            Modifier.fillMaxWidth().clip(RoundedCornerShape(24.dp)).background(colors.surface).border(1.dp, colors.border, RoundedCornerShape(24.dp)).padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(Modifier.size(52.dp).clip(CircleShape).background(BrandGradient), contentAlignment = Alignment.Center) {
                Text(
                    (user?.name?.takeIf { it.isNotBlank() } ?: user?.email ?: "?").take(1).uppercase(),
                    style = MaterialTheme.typography.titleLarge, color = androidx.compose.ui.graphics.Color.White,
                )
                user?.avatarUrl?.let { AsyncImage(it, null, Modifier.matchParentSize().clip(CircleShape), contentScale = ContentScale.Crop) }
            }
            Spacer(Modifier.width(14.dp))
            Column(Modifier.weight(1f)) {
                Text(user?.name?.ifBlank { null } ?: "Your account", style = MaterialTheme.typography.titleMedium)
                Text(user?.email.orEmpty(), style = MaterialTheme.typography.bodySmall, color = colors.muted)
                Text(
                    settings.serverUrl.removePrefix("https://").removePrefix("http://"),
                    style = MaterialTheme.typography.labelSmall, color = colors.muted,
                )
            }
        }

        Section("Capture") {
            ToggleRow(
                Icons.Outlined.AutoAwesome, "Auto-capture screenshots",
                when {
                    settings.demoMode -> "Off in demo mode"
                    media == MediaAccess.Partial -> "Needs “Allow all” photo access"
                    media == MediaAccess.None -> "Needs photo access"
                    else -> "New screenshots are uploaded and organized"
                },
                checked = settings.autoCapture && media == MediaAccess.Full,
                enabled = !settings.demoMode,
            ) { on ->
                scope.launch {
                    if (on && media != MediaAccess.Full) onOpenPermissions()
                    else if (on) container.capture.enable()
                    else container.capture.disable()
                }
            }
            ToggleRow(
                Icons.Outlined.Bolt, "Instant capture",
                "Uploads within a second using a quiet persistent notification. Off: within a minute or so.",
                checked = settings.instantCapture, enabled = settings.autoCapture && !settings.demoMode,
            ) { on -> scope.launch { container.capture.setInstant(on) } }
            ToggleRow(Icons.Outlined.Wifi, "Upload on Wi-Fi only", "Waits for an unmetered network", settings.wifiOnly) { on ->
                scope.launch { container.settings.setWifiOnly(on) }
            }
            ActionRow(Icons.Outlined.History, "Import last 20 screenshots", "Already-saved ones are skipped") {
                scope.launch {
                    val n = container.capture.importLatest(20)
                    Toast.makeText(
                        context, if (n == 0) "No screenshots found (check photo access)" else "Queued $n screenshot${if (n == 1) "" else "s"}",
                        Toast.LENGTH_SHORT,
                    ).show()
                }
            }
            ActionRow(
                Icons.Outlined.CloudUpload, "Upload queue",
                when {
                    queue.active == 0 && queue.failed == 0 -> "All caught up"
                    else -> "${queue.uploading} uploading · ${queue.waiting} waiting" + if (queue.failed > 0) " · ${queue.failed} failed" else ""
                },
                onClick = if (queue.failed > 0) ({ container.scheduler.pruneFinished() }) else null,
            )
            ActionRow(Icons.Outlined.Lock, "Permissions", "Photos, notifications and background", onClick = onOpenPermissions)
        }

        Section("Appearance") {
            Row(Modifier.fillMaxWidth().padding(12.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                ThemeMode.entries.forEach { mode ->
                    val on = settings.theme == mode
                    Text(
                        mode.name,
                        style = MaterialTheme.typography.labelLarge,
                        color = if (on) colors.background else colors.foreground,
                        modifier = Modifier
                            .weight(1f)
                            .clip(CircleShape)
                            .background(if (on) colors.foreground else colors.surface2)
                            .clickable { scope.launch { container.settings.setTheme(mode) } }
                            .padding(vertical = 10.dp),
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                    )
                }
            }
        }

        Section("About") {
            ActionRow(Icons.Outlined.Dns, "Server", settings.serverUrl)
            ActionRow(Icons.AutoMirrored.Outlined.OpenInNew, "norsumi is open source", "Source code, issues and self-hosting guide") {
                context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(BuildConfig.SOURCE_URL)))
            }
            ActionRow(Icons.Outlined.Info, "Version", "${BuildConfig.VERSION_NAME}${if (BuildConfig.DEBUG) " (debug)" else ""}")
        }

        if (BuildConfig.DEBUG) {
            Section("Developer") {
                ToggleRow(Icons.Outlined.BugReport, "Demo mode", "Seeded sample library, no server needed", settings.demoMode) { on ->
                    scope.launch { container.settings.setDemoMode(on) }
                }
            }
        }

        Spacer(Modifier.height(20.dp))
        Row(
            Modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp)).clickable { confirmSignOut = true }.background(colors.destructive.copy(alpha = 0.08f)).padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center,
        ) {
            Icon(Icons.AutoMirrored.Outlined.Logout, null, tint = colors.destructive)
            Spacer(Modifier.width(8.dp))
            Text(if (settings.demoMode) "Leave demo" else "Sign out", style = MaterialTheme.typography.titleSmall, color = colors.destructive)
        }
        if (!settings.demoMode && user != null) {
            TextButton(onClick = { confirmDelete = true }, modifier = Modifier.fillMaxWidth().padding(top = 8.dp)) {
                Text("Delete account", style = MaterialTheme.typography.labelLarge, color = colors.muted)
            }
        }
    }

    if (confirmDelete && user != null) {
        DeleteAccountDialog(
            // Accounts with a password must confirm it; Google-only accounts don't have one.
            needsPassword = user.providers.isEmpty() || "password" in user.providers,
            onDismiss = { confirmDelete = false },
            onDelete = { password -> container.deleteAccount(password) },
        )
    }

    if (confirmSignOut) {
        AlertDialog(
            onDismissRequest = { confirmSignOut = false },
            title = { Text("Sign out?") },
            text = { Text("Auto-capture stops and pending uploads are cancelled on this device. Your library stays safe on the server.") },
            confirmButton = {
                TextButton(onClick = { confirmSignOut = false; scope.launch { container.signOut() } }) {
                    Text("Sign out", color = colors.destructive)
                }
            },
            dismissButton = { TextButton(onClick = { confirmSignOut = false }) { Text("Cancel") } },
        )
    }
}

@Composable
private fun DeleteAccountDialog(needsPassword: Boolean, onDismiss: () -> Unit, onDelete: suspend (String?) -> Unit) {
    val colors = NorsumiTheme.colors
    val scope = rememberCoroutineScope()
    var password by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    AlertDialog(
        onDismissRequest = { if (!busy) onDismiss() },
        title = { Text("Delete your account?") },
        text = {
            Column {
                Text(
                    "This permanently deletes your library — every screenshot, link, note and category — from the server. It can't be undone.",
                    style = MaterialTheme.typography.bodyMedium,
                )
                if (needsPassword) {
                    Spacer(Modifier.height(16.dp))
                    OutlinedTextField(
                        password, { password = it; error = null }, singleLine = true, label = { Text("Password") },
                        visualTransformation = PasswordVisualTransformation(),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                        shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth(),
                    )
                }
                error?.let {
                    Spacer(Modifier.height(8.dp))
                    Text(it, style = MaterialTheme.typography.bodySmall, color = colors.destructive)
                }
            }
        },
        confirmButton = {
            TextButton(
                enabled = !busy && (!needsPassword || password.isNotEmpty()),
                onClick = {
                    scope.launch {
                        busy = true
                        try {
                            onDelete(if (needsPassword) password else null)
                            // Signed out: the root navigates to the welcome screen.
                        } catch (e: ApiException) {
                            error = when (e.status) {
                                403 -> "Password is incorrect"
                                401 -> "Your session expired. Sign in again."
                                else -> e.message
                            }
                        } catch (e: java.io.IOException) {
                            error = "Can't reach the server."
                        } finally {
                            busy = false
                        }
                    }
                },
            ) {
                val enabled = !busy && (!needsPassword || password.isNotEmpty())
                Text(if (busy) "Deleting…" else "Delete forever", color = if (enabled) colors.destructive else colors.muted)
            }
        },
        dismissButton = { TextButton(enabled = !busy, onClick = onDismiss) { Text("Cancel") } },
    )
}

@Composable
private fun Section(title: String, content: @Composable ColumnScope.() -> Unit) {
    val colors = NorsumiTheme.colors
    Spacer(Modifier.height(24.dp))
    Text(
        title.uppercase(), style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.SemiBold, color = colors.muted,
        modifier = Modifier.padding(start = 8.dp, bottom = 8.dp),
    )
    Column(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(24.dp)).background(colors.surface).border(1.dp, colors.border, RoundedCornerShape(24.dp)),
        content = content,
    )
}

@Composable
private fun RowIcon(icon: ImageVector?) {
    Box(Modifier.size(36.dp).clip(RoundedCornerShape(11.dp)).background(NorsumiTheme.colors.surface2), contentAlignment = Alignment.Center) {
        if (icon != null) Icon(icon, null, Modifier.size(18.dp), tint = NorsumiTheme.colors.foreground)
    }
}

@Composable
private fun ToggleRow(icon: ImageVector, title: String, subtitle: String, checked: Boolean, enabled: Boolean = true, onChange: (Boolean) -> Unit) {
    Row(
        Modifier.fillMaxWidth().clickable(enabled = enabled) { onChange(!checked) }.padding(horizontal = 14.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        RowIcon(icon)
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.titleSmall, color = if (enabled) NorsumiTheme.colors.foreground else NorsumiTheme.colors.muted)
            Text(subtitle, style = MaterialTheme.typography.bodySmall, color = NorsumiTheme.colors.muted)
        }
        Spacer(Modifier.width(8.dp))
        Switch(
            checked = checked, onCheckedChange = onChange, enabled = enabled,
            colors = SwitchDefaults.colors(uncheckedTrackColor = NorsumiTheme.colors.surface2, uncheckedBorderColor = NorsumiTheme.colors.border),
        )
    }
}

@Composable
private fun ActionRow(icon: ImageVector?, title: String, subtitle: String, onClick: (() -> Unit)? = null) {
    Row(
        Modifier.fillMaxWidth().then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier).padding(horizontal = 14.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        RowIcon(icon)
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.titleSmall)
            Text(subtitle, style = MaterialTheme.typography.bodySmall, color = NorsumiTheme.colors.muted)
        }
    }
}
