package com.norsumi.app.ui.home

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Category
import androidx.compose.material.icons.filled.PhotoLibrary
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.outlined.Category
import androidx.compose.material.icons.outlined.PhotoLibrary
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.saveable.rememberSaveableStateHolder
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import com.norsumi.app.ui.categories.CategoriesTab
import com.norsumi.app.ui.library.LibraryTab
import com.norsumi.app.ui.search.SearchTab
import com.norsumi.app.ui.settings.SettingsTab
import com.norsumi.app.ui.theme.NorsumiTheme

enum class Tab(val label: String, val icon: ImageVector, val selectedIcon: ImageVector) {
    Library("Library", Icons.Outlined.PhotoLibrary, Icons.Filled.PhotoLibrary),
    Categories("Categories", Icons.Outlined.Category, Icons.Filled.Category),
    Search("Search", Icons.Outlined.Search, Icons.Filled.Search),
    Settings("Settings", Icons.Outlined.Settings, Icons.Filled.Settings),
}

@Composable
fun HomeScreen(onOpenItem: (String) -> Unit, onOpenCategory: (String) -> Unit, onOpenPermissions: () -> Unit) {
    var tab by rememberSaveable { mutableStateOf(Tab.Library) }
    var showNew by remember { mutableStateOf(false) }
    val snackbar = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    val holder = rememberSaveableStateHolder()
    val colors = NorsumiTheme.colors

    Scaffold(
        contentWindowInsets = WindowInsets(0),
        snackbarHost = { SnackbarHost(snackbar) },
        bottomBar = {
            Box {
                NavigationBar(containerColor = colors.surface, tonalElevation = 0.dp) {
                    Tab.entries.forEach { t ->
                        val selected = t == tab
                        NavigationBarItem(
                            selected = selected,
                            onClick = { tab = t },
                            icon = { Icon(if (selected) t.selectedIcon else t.icon, contentDescription = t.label) },
                            label = { Text(t.label, style = MaterialTheme.typography.labelSmall) },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = MaterialTheme.colorScheme.primary,
                                selectedTextColor = colors.foreground,
                                indicatorColor = MaterialTheme.colorScheme.primaryContainer,
                                unselectedIconColor = colors.muted,
                                unselectedTextColor = colors.muted,
                            ),
                        )
                    }
                }
                HorizontalDivider(color = colors.border)
            }
        },
        floatingActionButton = {
            AnimatedVisibility(tab == Tab.Library || tab == Tab.Categories, enter = scaleIn(), exit = scaleOut()) {
                ExtendedFloatingActionButton(
                    onClick = { showNew = true },
                    icon = { Icon(Icons.Filled.Add, null) },
                    text = { Text("New", style = MaterialTheme.typography.titleSmall) },
                    shape = RoundedCornerShape(20.dp),
                    containerColor = MaterialTheme.colorScheme.primary,
                    contentColor = MaterialTheme.colorScheme.onPrimary,
                )
            }
        },
    ) { padding ->
        val bottom = PaddingValues(bottom = padding.calculateBottomPadding())
        Box(Modifier.fillMaxSize()) {
            holder.SaveableStateProvider(tab.name) {
                when (tab) {
                    Tab.Library -> LibraryTab(bottom, onOpenItem, onOpenPermissions)
                    Tab.Categories -> CategoriesTab(bottom, onOpenCategory)
                    Tab.Search -> SearchTab(bottom, onOpenItem)
                    Tab.Settings -> SettingsTab(bottom, onOpenPermissions)
                }
            }
        }
    }

    if (showNew) {
        NewItemSheet(
            onDismiss = { showNew = false },
            onSaved = { msg ->
                showNew = false
                scope.launch { snackbar.showSnackbar(msg) }
            },
        )
    }
}
