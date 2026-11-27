package com.norsumi.app

import android.app.Application
import androidx.work.WorkManager
import com.norsumi.app.capture.CaptureEngine
import com.norsumi.app.capture.CaptureScheduler
import com.norsumi.app.capture.InstantCaptureService
import com.norsumi.app.data.api.NorsumiApi
import com.norsumi.app.data.auth.AuthState
import com.norsumi.app.data.auth.SessionManager
import com.norsumi.app.data.auth.TokenStore
import com.norsumi.app.data.model.AuthSession
import com.norsumi.app.data.model.User
import com.norsumi.app.data.repo.DemoLibraryRepository
import com.norsumi.app.data.repo.LibraryRepository
import com.norsumi.app.data.repo.RemoteLibraryRepository
import com.norsumi.app.data.settings.SettingsStore
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import java.util.concurrent.TimeUnit

/** Manual DI: one instance per process, owned by [NorsumiApplication]. */
class AppContainer(private val app: Application) {
    val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    val settings = SettingsStore(app, scope)
    val session = SessionManager(TokenStore(settings.store), scope)

    val http: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .writeTimeout(120, TimeUnit.SECONDS)
        .apply { DebugTools.networkInterceptors().forEach { addNetworkInterceptor(it) } }
        .build()

    val api = NorsumiApi(http, session) { settings.current.serverUrl }
    val remote = RemoteLibraryRepository(api)
    val demo: DemoLibraryRepository by lazy { DemoLibraryRepository(app) }

    /** The live repository; demo mode (debug builds only) swaps in seeded content. */
    val library: LibraryRepository get() = if (settings.current.demoMode) demo else remote

    val scheduler = CaptureScheduler(app)
    val capture = CaptureEngine(app, settings, session, scheduler)

    val authState: StateFlow<AuthState> = combine(session.state, settings.settings) { auth, s ->
        if (s.demoMode) AuthState.SignedIn(DEMO_USER) else auth
    }.stateIn(scope, SharingStarted.Eagerly, AuthState.Loading)

    suspend fun signIn(session: AuthSession) {
        this.session.onSession(session)
        runCatching { settings.current.let { if (it.autoCapture) scheduler.arm() } }
    }

    suspend fun signOut() {
        if (settings.current.demoMode) {
            settings.setDemoMode(false)
            return
        }
        val token = clearLocalSession()
        if (token != null) runCatching { api.logout(token) }
    }

    /**
     * Deletes the account on the server (throws [com.norsumi.app.data.api.ApiException] 403 on a wrong
     * password), then wipes everything local: session, upload queue, capture state and caches.
     */
    suspend fun deleteAccount(password: String?) {
        api.deleteMe(password)
        clearLocalSession()
        settings.setAutoCapture(false)
        settings.setInstantCapture(false)
        settings.setPermissionsOnboarded(false)
        settings.setWatermark(0)
        withContext(Dispatchers.IO) {
            app.filesDir.resolve("share-queue").deleteRecursively()
            app.cacheDir.resolve("shared-out").deleteRecursively()
            app.cacheDir.resolve("images").deleteRecursively()
        }
    }

    /** Forgets the session and stops all background work. Returns the refresh token, if any. */
    private suspend fun clearLocalSession(): String? {
        val token = session.clear()
        WorkManager.getInstance(app).cancelAllWorkByTag(CaptureScheduler.TAG_UPLOAD)
        scheduler.disarm()
        InstantCaptureService.stop(app)
        return token
    }

    companion object {
        val DEMO_USER = User(id = "demo", email = "demo@norsumi.com", name = "Demo", providers = listOf("password"))
    }
}
