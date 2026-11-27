package com.norsumi.app.ui.categories

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.norsumi.app.data.model.CATEGORY_COLORS
import com.norsumi.app.data.model.Category
import com.norsumi.app.data.model.CategoryPatch
import com.norsumi.app.ui.theme.NorsumiTheme
import com.norsumi.app.ui.theme.categoryShades

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun CategoryEditSheet(category: Category, onDismiss: () -> Unit, onSave: (CategoryPatch) -> Unit, onDelete: () -> Unit) {
    val colors = NorsumiTheme.colors
    var name by remember { mutableStateOf(category.name) }
    var emoji by remember { mutableStateOf(category.emoji) }
    var color by remember { mutableStateOf(category.color) }
    var confirmDelete by remember { mutableStateOf(false) }

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true), containerColor = colors.surface) {
        Column(Modifier.fillMaxWidth().imePadding().padding(horizontal = 24.dp).padding(bottom = 24.dp)) {
            Text("Edit category", style = MaterialTheme.typography.headlineSmall)
            Spacer(Modifier.height(20.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                OutlinedTextField(
                    emoji, { v -> emoji = v.takeLast(8) }, Modifier.width(72.dp), singleLine = true,
                    textStyle = TextStyle(fontSize = 24.sp, textAlign = TextAlign.Center), shape = RoundedCornerShape(14.dp),
                )
                Spacer(Modifier.width(12.dp))
                OutlinedTextField(
                    name, { name = it }, Modifier.weight(1f), singleLine = true, label = { Text("Name") }, shape = RoundedCornerShape(14.dp),
                )
            }
            Spacer(Modifier.height(20.dp))
            Text("Color", style = MaterialTheme.typography.labelLarge, color = colors.muted)
            Spacer(Modifier.height(10.dp))
            FlowRow(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                CATEGORY_COLORS.forEach { c ->
                    val selected = c == color
                    Box(
                        Modifier
                            .size(36.dp)
                            .clip(CircleShape)
                            .border(if (selected) 3.dp else 0.dp, colors.foreground, CircleShape)
                            .padding(if (selected) 5.dp else 0.dp)
                            .clip(CircleShape)
                            .background(categoryShades(c).base)
                            .clickable { color = c },
                    )
                }
            }
            Spacer(Modifier.height(28.dp))
            Button(
                onClick = {
                    onSave(
                        CategoryPatch(
                            name = name.trim().takeIf { it.isNotEmpty() && it != category.name },
                            emoji = emoji.trim().takeIf { it.isNotEmpty() && it != category.emoji },
                            color = color.takeIf { it != category.color },
                        ),
                    )
                },
                enabled = name.isNotBlank(),
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = CircleShape,
            ) { Text("Save") }
            TextButton(onClick = { confirmDelete = true }, modifier = Modifier.fillMaxWidth()) {
                Text("Delete category", color = colors.destructive)
            }
        }
    }
    if (confirmDelete) {
        AlertDialog(
            onDismissRequest = { confirmDelete = false },
            title = { Text("Delete “${category.name}”?") },
            text = {
                Text(
                    if (category.parentId == null) "Its topics are deleted too. Items stay in your library, uncategorized."
                    else "Items stay in your library, uncategorized.",
                )
            },
            confirmButton = { TextButton(onClick = { confirmDelete = false; onDelete() }) { Text("Delete", color = colors.destructive) } },
            dismissButton = { TextButton(onClick = { confirmDelete = false }) { Text("Cancel") } },
        )
    }
}
