package com.norsumi.app.data.auth

import com.norsumi.app.data.model.AuthSession
import com.norsumi.app.data.model.User
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class SessionManagerTest {
    private class FakeStorage(var token: String?) : SessionStorage {
        override suspend fun load() = token?.let { StoredSession(it, User("u", "a@b.c")) }
        override suspend fun save(refreshToken: String, user: User?) { token = refreshToken }
        override suspend fun clear() { token = null }
    }

    private fun session(access: String, refresh: String) = AuthSession(User("u", "a@b.c"), access, refresh, 900)

    @Test fun `409 re-reads the stored token and retries once`() = runTest(UnconfinedTestDispatcher()) {
        val storage = FakeStorage("old")
        val manager = SessionManager(storage, this)
        // Another refresher rotated the token after we loaded it.
        storage.token = "rotated"
        val sent = mutableListOf<String>()
        val access = manager.refreshBlocking(null) { t ->
            sent += t
            if (t == "old") RefreshResult.Conflict else RefreshResult.Success(session("A2", "R2"))
        }
        assertEquals(listOf("old", "rotated"), sent)
        assertEquals("A2", access)
        assertEquals("R2", storage.token)
        assertTrue(manager.state.value is AuthState.SignedIn)
    }

    @Test fun `a second 409 keeps the session`() = runTest(UnconfinedTestDispatcher()) {
        val storage = FakeStorage("old")
        val manager = SessionManager(storage, this)
        assertNull(manager.refreshBlocking(null) { RefreshResult.Conflict })
        assertTrue(manager.isSignedIn)
        assertEquals("old", storage.token)
    }

    @Test fun `only 401 signs out`() = runTest(UnconfinedTestDispatcher()) {
        val storage = FakeStorage("old")
        val manager = SessionManager(storage, this)
        assertNull(manager.refreshBlocking(null) { RefreshResult.Unavailable })
        assertTrue(manager.isSignedIn)
        assertNull(manager.refreshBlocking(null) { RefreshResult.Rejected })
        assertEquals(AuthState.SignedOut, manager.state.value)
        assertNull(storage.token)
    }

    @Test fun `concurrent 401 reuses a token refreshed in the meantime`() = runTest(UnconfinedTestDispatcher()) {
        val manager = SessionManager(FakeStorage("r"), this)
        manager.refreshBlocking(null) { RefreshResult.Success(session("A1", "R1")) }
        var calls = 0
        val token = manager.refreshBlocking("stale-access") { calls++; RefreshResult.Rejected }
        assertEquals("A1", token)
        assertEquals(0, calls)
    }
}
