package com.norsumi.app.ui.home

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.ContentPaste
import androidx.compose.material.icons.outlined.EditNote
import androidx.compose.material.icons.outlined.Link
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.norsumi.app.share.ShareText
import com.norsumi.app.ui.LocalContainer
import com.norsumi.app.ui.theme.NorsumiTheme
import kotlinx.coroutines.launch

private enum class NewKind { Note, Link }

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NewItemSheet(onDismiss: () -> Unit, onSaved: (String) -> Unit) {
    val container = LocalContainer.current
    val colors = NorsumiTheme.colors
    val scope = rememberCoroutineScope()
    @Suppress("DEPRECATION")
    val clipboard = LocalClipboardManager.current
    val clipUrl = remember { clipboard.getText()?.text?.let(ShareText::firstUrl) }

    var kind by remember { mutableStateOf<NewKind?>(null) }
    var text by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val focus = remember { FocusRequester() }

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true), containerColor = colors.surface) {
        Column(Modifier.fillMaxWidth().imePadding().padding(horizontal = 24.dp).padding(bottom = 24.dp)) {
            Text("Add to norsumi", style = MaterialTheme.typography.headlineSmall)
            Spacer(Modifier.height(4.dp))
            Text("It'll be titled and filed automatically.", style = MaterialTheme.typography.bodySmall, color = colors.muted)
            Spacer(Modifier.height(20.dp))
            when (kind) {
                null -> {
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        Option(Icons.Outlined.EditNote, "Write a note", "Thoughts, lists, anything", Modifier.weight(1f)) { kind = NewKind.Note }
                        Option(
                            if (clipUrl != null) Icons.Outlined.ContentPaste else Icons.Outlined.Link,
                            "Paste link", clipUrl?.removePrefix("https://")?.take(28) ?: "Save any page", Modifier.weight(1f),
                        ) {
                            kind = NewKind.Link
                            text = clipUrl.orEmpty()
                        }
                    }
                }
                else -> {
                    LaunchedEffect(kind) { focus.requestFocus() }
                    OutlinedTextField(
                        value = text,
                        onValueChange = { text = it; error = null },
                        modifier = Modifier.fillMaxWidth().heightIn(min = if (kind == NewKind.Note) 160.dp else 0.dp).focusRequester(focus),
                        placeholder = { Text(if (kind == NewKind.Note) "Write something…" else "https://") },
                        singleLine = kind == NewKind.Link,
                        shape = RoundedCornerShape(16.dp),
                        keyboardOptions = if (kind == NewKind.Link) KeyboardOptions(keyboardType = KeyboardType.Uri) else KeyboardOptions.Default,
                        colors = OutlinedTextFieldDefaults.colors(unfocusedBorderColor = colors.border),
                    )
                    error?.let { Text(it, color = colors.destructive, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 8.dp)) }
                    Spacer(Modifier.height(16.dp))
                    Button(
                        enabled = text.isNotBlank() && !busy,
                        onClick = {
                            scope.launch {
                                busy = true
                                val result = runCatching {
                                    if (kind == NewKind.Note) {
                                        container.library.createNote(text.trim())
                                    } else {
                                        val url = ShareText.firstUrl(text) ?: error("That doesn't look like a link")
                                        container.library.createLink(url, null)
                                    }
                                }
                                busy = false
                                result.onSuccess { onSaved("Saved — norsumi will organize it") }
                                    .onFailure { error = it.message ?: "Couldn't save" }
                            }
                        },
                        modifier = Modifier.fillMaxWidth().height(52.dp),
                        shape = CircleShape,
                    ) { Text(if (busy) "Saving…" else "Save", style = MaterialTheme.typography.titleSmall) }
                }
            }
        }
    }
}

@Composable
private fun Option(icon: ImageVector, title: String, subtitle: String, modifier: Modifier, onClick: () -> Unit) {
    val colors = NorsumiTheme.colors
    Column(
        modifier.clip(RoundedCornerShape(20.dp)).background(colors.surface2).clickable(onClick = onClick).padding(16.dp),
    ) {
        Box(
            Modifier.size(40.dp).clip(RoundedCornerShape(12.dp)).background(MaterialTheme.colorScheme.primaryContainer),
            contentAlignment = Alignment.Center,
        ) { Icon(icon, null, tint = MaterialTheme.colorScheme.primary) }
        Spacer(Modifier.height(14.dp))
        Text(title, style = MaterialTheme.typography.titleSmall)
        Text(subtitle, style = MaterialTheme.typography.bodySmall, color = colors.muted, maxLines = 1)
    }
}
