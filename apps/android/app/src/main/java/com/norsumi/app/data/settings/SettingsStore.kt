package com.norsumi.app.data.settings

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.norsumi.app.BuildConfig
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.runBlocking

enum class ThemeMode { System, Light, Dark }

data class AppSettings(
    val serverUrl: String = BuildConfig.DEFAULT_SERVER_URL,
    val autoCapture: Boolean = false,
    val instantCapture: Boolean = false,
    val wifiOnly: Boolean = false,
    val theme: ThemeMode = ThemeMode.System,
    val demoMode: Boolean = false,
    val permissionsOnboarded: Boolean = false,
    /** Highest MediaStore `_ID` already considered by auto-capture. */
    val watermarkId: Long = 0,
)

val Context.norsumiDataStore: DataStore<Preferences> by preferencesDataStore(name = "norsumi")

/** Non-secret preferences. Secrets (the refresh token) live in [com.norsumi.app.data.auth.TokenStore]. */
class SettingsStore(context: Context, scope: CoroutineScope) {
    private val dataStore = context.applicationContext.norsumiDataStore

    val settings: StateFlow<AppSettings> = dataStore.data
        .map { it.toSettings() }
        // Blocking first read: everything downstream (base URL, demo mode) needs real values at startup.
        .stateIn(scope, SharingStarted.Eagerly, runBlocking { dataStore.data.first().toSettings() })

    val current: AppSettings get() = settings.value

    suspend fun setServerUrl(url: String) = dataStore.edit { it[SERVER_URL] = normalizeServerUrl(url) }
    suspend fun setAutoCapture(enabled: Boolean) = dataStore.edit { it[AUTO_CAPTURE] = enabled }
    suspend fun setInstantCapture(enabled: Boolean) = dataStore.edit { it[INSTANT_CAPTURE] = enabled }
    suspend fun setWifiOnly(enabled: Boolean) = dataStore.edit { it[WIFI_ONLY] = enabled }
    suspend fun setTheme(mode: ThemeMode) = dataStore.edit { it[THEME] = mode.name }
    suspend fun setDemoMode(enabled: Boolean) = dataStore.edit { it[DEMO_MODE] = enabled }
    suspend fun setPermissionsOnboarded(done: Boolean) = dataStore.edit { it[PERMISSIONS_ONBOARDED] = done }
    suspend fun setWatermark(id: Long) = dataStore.edit { it[WATERMARK_ID] = id }

    /** Raw access for the token store, which shares the same file. */
    internal val store: DataStore<Preferences> get() = dataStore

    private fun Preferences.toSettings() = AppSettings(
        serverUrl = this[SERVER_URL] ?: BuildConfig.DEFAULT_SERVER_URL,
        autoCapture = this[AUTO_CAPTURE] ?: false,
        instantCapture = this[INSTANT_CAPTURE] ?: false,
        wifiOnly = this[WIFI_ONLY] ?: false,
        theme = this[THEME]?.let { runCatching { ThemeMode.valueOf(it) }.getOrNull() } ?: ThemeMode.System,
        demoMode = BuildConfig.DEBUG && (this[DEMO_MODE] ?: false),
        permissionsOnboarded = this[PERMISSIONS_ONBOARDED] ?: false,
        watermarkId = this[WATERMARK_ID] ?: 0,
    )

    companion object {
        private val SERVER_URL = stringPreferencesKey("server_url")
        private val AUTO_CAPTURE = booleanPreferencesKey("auto_capture")
        private val INSTANT_CAPTURE = booleanPreferencesKey("instant_capture")
        private val WIFI_ONLY = booleanPreferencesKey("wifi_only")
        private val THEME = stringPreferencesKey("theme")
        private val DEMO_MODE = booleanPreferencesKey("demo_mode")
        private val PERMISSIONS_ONBOARDED = booleanPreferencesKey("permissions_onboarded")
        private val WATERMARK_ID = longPreferencesKey("watermark_id")

        /** Trims, adds https:// when no scheme is given and drops trailing slashes. */
        fun normalizeServerUrl(raw: String): String {
            val trimmed = raw.trim().trimEnd('/')
            if (trimmed.isEmpty()) return BuildConfig.DEFAULT_SERVER_URL
            return if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) trimmed else "https://$trimmed"
        }
    }
}
