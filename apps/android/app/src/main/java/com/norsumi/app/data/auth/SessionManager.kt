package com.norsumi.app.data.auth

import com.norsumi.app.data.model.AuthSession
import com.norsumi.app.data.model.User
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking

sealed interface AuthState {
    data object Loading : AuthState
    data object SignedOut : AuthState
    data class SignedIn(val user: User) : AuthState
}

/** Outcome of a refresh attempt made by the [RefreshCall]. */
sealed interface RefreshResult {
    data class Success(val session: AuthSession) : RefreshResult
    /** The server rejected the refresh token (401): the session is over. */
    data object Rejected : RefreshResult
    /** 409: this token was rotated less than 30 s ago by a concurrent refresh. */
    data object Conflict : RefreshResult
    /** Network trouble: keep the session, fail this request. */
    data object Unavailable : RefreshResult
}

fun interface RefreshCall {
    fun refresh(refreshToken: String): RefreshResult
}

/**
 * Owns the tokens. The access token lives only in memory; the rotating refresh token is persisted
 * encrypted by [TokenStore]. [refreshBlocking] is single-flight: concurrent 401s wait for the first
 * refresh and reuse its result, which matters because refresh tokens rotate (reusing one revokes the
 * whole family).
 */
class SessionManager(private val tokenStore: SessionStorage, scope: CoroutineScope) {
    private val _state = MutableStateFlow<AuthState>(AuthState.Loading)
    val state: StateFlow<AuthState> = _state.asStateFlow()

    @Volatile var accessToken: String? = null
        private set

    @Volatile private var refreshToken: String? = null
    private val lock = Any()

    init {
        scope.launch {
            val stored = tokenStore.load()
            if (stored == null) {
                _state.value = AuthState.SignedOut
            } else {
                refreshToken = stored.refreshToken
                _state.value = AuthState.SignedIn(stored.user ?: User(id = "", email = ""))
            }
        }
    }

    val isSignedIn: Boolean get() = refreshToken != null

    /** Waits for the stored session to be read (workers can start before the UI ever does). */
    suspend fun awaitReady() {
        state.first { it != AuthState.Loading }
    }

    suspend fun onSession(session: AuthSession) {
        synchronized(lock) {
            accessToken = session.accessToken
            refreshToken = session.refreshToken
        }
        tokenStore.save(session.refreshToken, session.user)
        _state.value = AuthState.SignedIn(session.user)
    }

    suspend fun updateUser(user: User) {
        val token = refreshToken ?: return
        tokenStore.save(token, user)
        _state.value = AuthState.SignedIn(user)
    }

    /** Returns the refresh token and forgets the session locally. */
    suspend fun clear(): String? {
        val token = synchronized(lock) {
            val t = refreshToken
            accessToken = null
            refreshToken = null
            t
        }
        tokenStore.clear()
        _state.value = AuthState.SignedOut
        return token
    }

    /**
     * Called from OkHttp's authenticator thread after a 401 that was sent with [failedAccessToken].
     * Returns the access token to retry with, or null to give up.
     */
    fun refreshBlocking(failedAccessToken: String?, call: RefreshCall): String? = synchronized(lock) {
        val current = accessToken
        // Someone else already refreshed while this request was in flight.
        if (current != null && current != failedAccessToken) return current
        val token = refreshToken ?: return null
        var result = call.refresh(token)
        if (result == RefreshResult.Conflict) {
            // Someone already rotated it: re-read the latest stored token and retry once with it.
            val latest = runBlocking { tokenStore.load()?.refreshToken } ?: token
            result = call.refresh(latest)
        }
        when (result) {
            is RefreshResult.Success -> {
                accessToken = result.session.accessToken
                refreshToken = result.session.refreshToken
                runBlocking { tokenStore.save(result.session.refreshToken, result.session.user) }
                _state.value = AuthState.SignedIn(result.session.user)
                result.session.accessToken
            }
            RefreshResult.Rejected -> {
                accessToken = null
                refreshToken = null
                runBlocking { tokenStore.clear() }
                _state.value = AuthState.SignedOut
                null
            }
            RefreshResult.Unavailable, RefreshResult.Conflict -> null
        }
    }
}
