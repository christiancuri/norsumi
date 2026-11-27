package com.norsumi.app.ui.onboarding

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.norsumi.app.BuildConfig
import com.norsumi.app.R
import com.norsumi.app.data.settings.SettingsStore
import com.norsumi.app.ui.LocalContainer
import com.norsumi.app.ui.components.ElephantLogo
import com.norsumi.app.ui.theme.Brand
import com.norsumi.app.ui.theme.InstrumentSerif
import kotlinx.coroutines.launch

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun WelcomeScreen(onCreateAccount: () -> Unit, onSignIn: () -> Unit, onDemo: () -> Unit) {
    val container = LocalContainer.current
    val scope = rememberCoroutineScope()
    var showServer by remember { mutableStateOf(false) }
    val settings by container.settings.settings.collectAsStateWithLifecycle()

    // Brand "night" field (#10235F → #070C2A) with a #4F8CFF glow behind the icon, as in the OG card.
    Box(Modifier.fillMaxSize().background(Brush.linearGradient(listOf(Color(0xFF10235F), Color(0xFF070C2A))))) {
        Box(
            Modifier.size(520.dp).offset(x = (-150).dp, y = (-110).dp)
                .background(Brush.radialGradient(listOf(Brand.BlueTop.copy(alpha = 0.45f), Color.Transparent))),
        )
        Box(
            Modifier.size(380.dp).align(Alignment.BottomEnd).offset(x = 140.dp, y = 80.dp)
                .background(Brush.radialGradient(listOf(Brand.BlueBottom.copy(alpha = 0.25f), Color.Transparent))),
        )
        Column(
            Modifier.fillMaxSize().statusBarsPadding().navigationBarsPadding().padding(horizontal = 28.dp),
        ) {
            Spacer(Modifier.height(56.dp))
            ElephantLogo(
                size = 96.dp,
                modifier = Modifier
                    .clip(RoundedCornerShape(29.dp))
                    .combinedClickable(
                        onClick = {},
                        onLongClick = {
                            // Debug-only demo mode: seeded content, no API needed.
                            if (BuildConfig.DEBUG) scope.launch {
                                container.settings.setDemoMode(true)
                                onDemo()
                            }
                        },
                    ),
            )
            Spacer(Modifier.weight(1f))
            Text("norsumi", fontFamily = InstrumentSerif, fontSize = 26.sp, color = Brand.TaglineOnDark)
            Spacer(Modifier.height(10.dp))
            Text(
                buildAnnotatedString {
                    append("Every screenshot,\n")
                    withStyle(SpanStyle(fontStyle = FontStyle.Italic)) { append("remembered.") }
                },
                fontFamily = InstrumentSerif, fontSize = 58.sp, lineHeight = 58.sp, letterSpacing = (-1).sp, color = Color.White,
            )
            Spacer(Modifier.height(16.dp))
            Text(
                "norsumi catches your screenshots and the links you share, then quietly names, summarizes and files them for you.",
                style = MaterialTheme.typography.bodyLarge, color = Brand.TaglineOnDark,
            )
            Spacer(Modifier.height(36.dp))
            Button(
                onClick = onCreateAccount,
                modifier = Modifier.fillMaxWidth().height(56.dp),
                shape = CircleShape,
                colors = ButtonDefaults.buttonColors(containerColor = Color.White, contentColor = Brand.BlueDeep),
            ) { Text("Get started", style = MaterialTheme.typography.titleMedium) }
            Spacer(Modifier.height(10.dp))
            TextButton(onClick = onSignIn, modifier = Modifier.fillMaxWidth().height(52.dp), shape = CircleShape) {
                Text("I already have an account", style = MaterialTheme.typography.titleSmall, color = Color.White)
            }
            Spacer(Modifier.height(4.dp))
            Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
                TextButton(onClick = { showServer = true }) {
                    Text(
                        "Advanced · ${settings.serverUrl.removePrefix("https://").removePrefix("http://")}",
                        style = MaterialTheme.typography.labelSmall, color = Color.White.copy(alpha = 0.6f),
                    )
                }
            }
            Spacer(Modifier.height(8.dp))
        }
    }

    if (showServer) ServerDialog(current = settings.serverUrl, onDismiss = { showServer = false })
}

/** Self-hosters point the app at their own norsumi server. Verifies `/api/info` before saving. */
@Composable
fun ServerDialog(current: String, onDismiss: () -> Unit) {
    val container = LocalContainer.current
    val scope = rememberCoroutineScope()
    var url by remember { mutableStateOf(current) }
    var status by remember { mutableStateOf<String?>(null) }
    var checking by remember { mutableStateOf(false) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Server", style = MaterialTheme.typography.headlineSmall) },
        text = {
            Column {
                Text(
                    "Use the official server or your own self-hosted norsumi.",
                    style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.height(16.dp))
                OutlinedTextField(url, { url = it; status = null }, singleLine = true, label = { Text("Server URL") }, shape = RoundedCornerShape(12.dp))
                status?.let {
                    Spacer(Modifier.height(8.dp))
                    Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        },
        confirmButton = {
            TextButton(enabled = !checking, onClick = {
                scope.launch {
                    checking = true
                    val normalized = SettingsStore.normalizeServerUrl(url)
                    val info = runCatching { container.api.info(normalized) }
                    checking = false
                    if (info.isSuccess) {
                        container.settings.setServerUrl(normalized)
                        onDismiss()
                    } else {
                        status = "Couldn't reach a norsumi server there (${info.exceptionOrNull()?.message ?: "error"})."
                    }
                }
            }) { Text(if (checking) "Checking…" else "Save") }
        },
        dismissButton = {
            TextButton(onClick = {
                scope.launch { container.settings.setServerUrl(BuildConfig.DEFAULT_SERVER_URL); onDismiss() }
            }) { Text("Reset") }
        },
    )
}
