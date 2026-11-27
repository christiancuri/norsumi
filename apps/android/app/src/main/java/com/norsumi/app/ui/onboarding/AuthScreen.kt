package com.norsumi.app.ui.onboarding

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.outlined.Visibility
import androidx.compose.material.icons.outlined.VisibilityOff
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.NoCredentialException
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.norsumi.app.R
import com.norsumi.app.data.api.ApiException
import com.norsumi.app.data.model.ServerInfo
import com.norsumi.app.ui.LocalContainer
import com.norsumi.app.ui.components.ElephantLogo
import com.norsumi.app.ui.theme.NorsumiTheme
import kotlinx.coroutines.launch
import java.io.IOException

@Composable
fun AuthScreen(register: Boolean, onBack: () -> Unit, onSignedIn: () -> Unit) {
    val container = LocalContainer.current
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val colors = NorsumiTheme.colors
    val settings by container.settings.settings.collectAsStateWithLifecycle()

    var isRegister by rememberSaveable { mutableStateOf(register) }
    var name by rememberSaveable { mutableStateOf("") }
    var email by rememberSaveable { mutableStateOf("") }
    var password by rememberSaveable { mutableStateOf("") }
    var showPassword by remember { mutableStateOf(false) }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var info by remember { mutableStateOf<ServerInfo?>(null) }
    var showServer by remember { mutableStateOf(false) }

    // Google sign-in is offered only when this server advertises a client id.
    LaunchedEffect(settings.serverUrl) {
        info = runCatching { container.api.info() }.getOrNull()
    }

    fun run(block: suspend () -> Unit) {
        if (busy) return
        scope.launch {
            busy = true
            error = null
            try {
                block()
                onSignedIn()
            } catch (e: GetCredentialCancellationException) {
                // User closed the sheet.
            } catch (e: ApiException) {
                error = when (e.status) {
                    401 -> "Wrong email or password."
                    403 -> if (isRegister) "Sign-ups are closed on this server." else e.message
                    409 -> "An account with this email already exists."
                    429 -> "Too many attempts. Try again in a minute."
                    else -> e.message
                }
            } catch (e: NoCredentialException) {
                error = "No Google account available on this device."
            } catch (e: IOException) {
                error = "Can't reach ${settings.serverUrl.removePrefix("https://")}. Check your connection."
            } catch (e: Exception) {
                error = e.message ?: "Something went wrong."
            } finally {
                busy = false
            }
        }
    }

    val valid = email.contains("@") && password.length >= (if (isRegister) 8 else 1) && (!isRegister || name.isNotBlank())
    val submit = {
        if (valid) run {
            val session = if (isRegister) container.api.register(email, password, name) else container.api.login(email, password)
            container.signIn(session)
        }
    }

    Box(Modifier.fillMaxSize()) {
        Column(
            Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .navigationBarsPadding()
                .imePadding()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 24.dp),
        ) {
            IconButton(onClick = onBack, modifier = Modifier.padding(top = 4.dp)) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back")
            }
            Spacer(Modifier.height(12.dp))
            ElephantLogo(size = 52.dp)
            Spacer(Modifier.height(24.dp))
            Text(
                buildAnnotatedString {
                    if (isRegister) {
                        append("Create your\n"); withStyle(SpanStyle(fontStyle = FontStyle.Italic)) { append("library.") }
                    } else {
                        append("Welcome\n"); withStyle(SpanStyle(fontStyle = FontStyle.Italic)) { append("back.") }
                    }
                },
                style = MaterialTheme.typography.displaySmall.copy(fontSize = MaterialTheme.typography.displayMedium.fontSize),
                lineHeight = MaterialTheme.typography.displayMedium.lineHeight,
            )
            Spacer(Modifier.height(8.dp))
            Text(
                if (isRegister) "Free and private. Your images are encrypted before they're stored." else "Sign in to pick up where you left off.",
                style = MaterialTheme.typography.bodyMedium, color = colors.muted,
            )
            Spacer(Modifier.height(28.dp))

            val google = info?.auth?.google
            if (google != null) {
                OutlinedButton(
                    onClick = {
                        run {
                            val idToken = googleIdToken(context, google.webClientId)
                            container.signIn(container.api.google(idToken))
                        }
                    },
                    modifier = Modifier.fillMaxWidth().height(54.dp),
                    shape = CircleShape,
                    border = BorderStroke(1.dp, colors.border),
                ) {
                    Icon(painterResource(R.drawable.ic_google), null, Modifier.size(18.dp), tint = androidx.compose.ui.graphics.Color.Unspecified)
                    Spacer(Modifier.width(10.dp))
                    Text("Continue with Google", style = MaterialTheme.typography.titleSmall, color = colors.foreground)
                }
                Row(Modifier.fillMaxWidth().padding(vertical = 20.dp), verticalAlignment = Alignment.CenterVertically) {
                    HorizontalDivider(Modifier.weight(1f), color = colors.border)
                    Text("  or with email  ", style = MaterialTheme.typography.labelSmall, color = colors.muted)
                    HorizontalDivider(Modifier.weight(1f), color = colors.border)
                }
            }

            val fieldColors = OutlinedTextFieldDefaults.colors(
                unfocusedContainerColor = colors.surface, focusedContainerColor = colors.surface,
                unfocusedBorderColor = colors.border,
            )
            val shape = RoundedCornerShape(14.dp)
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                if (isRegister) {
                    OutlinedTextField(
                        name, { name = it }, Modifier.fillMaxWidth(), label = { Text("Name") }, singleLine = true, shape = shape, colors = fieldColors,
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
                    )
                }
                OutlinedTextField(
                    email, { email = it.trim() }, Modifier.fillMaxWidth(), label = { Text("Email") }, singleLine = true, shape = shape, colors = fieldColors,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Next),
                )
                OutlinedTextField(
                    password, { password = it }, Modifier.fillMaxWidth(), label = { Text("Password") }, singleLine = true, shape = shape, colors = fieldColors,
                    supportingText = if (isRegister) ({ Text("At least 8 characters") }) else null,
                    visualTransformation = if (showPassword) VisualTransformation.None else PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Done),
                    keyboardActions = KeyboardActions(onDone = { submit() }),
                    trailingIcon = {
                        IconButton(onClick = { showPassword = !showPassword }) {
                            Icon(if (showPassword) Icons.Outlined.VisibilityOff else Icons.Outlined.Visibility, "Show password")
                        }
                    },
                )
            }
            error?.let {
                Spacer(Modifier.height(12.dp))
                Text(it, style = MaterialTheme.typography.bodySmall, color = colors.destructive)
            }
            Spacer(Modifier.height(20.dp))
            Button(
                onClick = submit, enabled = valid && !busy, modifier = Modifier.fillMaxWidth().height(54.dp), shape = CircleShape,
            ) {
                if (busy) CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp, color = MaterialTheme.colorScheme.onPrimary)
                else Text(if (isRegister) "Create account" else "Sign in", style = MaterialTheme.typography.titleSmall)
            }
            Spacer(Modifier.height(8.dp))
            TextButton(onClick = { isRegister = !isRegister; error = null }, modifier = Modifier.align(Alignment.CenterHorizontally)) {
                Text(if (isRegister) "I already have an account" else "New here? Create an account", style = MaterialTheme.typography.labelLarge)
            }
            Spacer(Modifier.weight(1f))
            TextButton(onClick = { showServer = true }, modifier = Modifier.align(Alignment.CenterHorizontally)) {
                Text(
                    "Server: ${settings.serverUrl.removePrefix("https://").removePrefix("http://")} · Change",
                    style = MaterialTheme.typography.labelSmall, color = colors.muted,
                )
            }
            Spacer(Modifier.height(8.dp))
        }
    }
    if (showServer) ServerDialog(settings.serverUrl, onDismiss = { showServer = false })
}

/**
 * Credential Manager flow: first the bottom-sheet account picker, then the full "Sign in with
 * Google" dialog when the device has no eligible account.
 */
private suspend fun googleIdToken(context: Context, webClientId: String): String {
    val activity = context.findActivity()
    val manager = CredentialManager.create(activity)
    val picker = GetGoogleIdOption.Builder()
        .setServerClientId(webClientId)
        .setFilterByAuthorizedAccounts(false)
        .setAutoSelectEnabled(false)
        .build()
    val response = try {
        manager.getCredential(activity, GetCredentialRequest.Builder().addCredentialOption(picker).build())
    } catch (_: NoCredentialException) {
        val button = GetSignInWithGoogleOption.Builder(webClientId).build()
        manager.getCredential(activity, GetCredentialRequest.Builder().addCredentialOption(button).build())
    }
    val credential = response.credential
    if (credential is CustomCredential && credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) {
        return GoogleIdTokenCredential.createFrom(credential.data).idToken
    }
    error("Unexpected credential type")
}

private fun Context.findActivity(): Activity {
    var c = this
    while (c is ContextWrapper) {
        if (c is Activity) return c
        c = c.baseContext
    }
    error("No activity")
}
