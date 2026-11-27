package com.norsumi.app.data.auth

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import com.norsumi.app.data.api.NorsumiJson
import com.norsumi.app.data.model.User
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.withContext
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/**
 * AES-256-GCM with a non-exportable Android Keystore key. Stored form: Base64(IV ‖ ciphertext+tag).
 */
class TokenCipher(private val alias: String = "norsumi.refresh-token") {
    fun encrypt(plaintext: String): String {
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.ENCRYPT_MODE, key())
        val ciphertext = cipher.doFinal(plaintext.toByteArray(Charsets.UTF_8))
        return Base64.encodeToString(cipher.iv + ciphertext, Base64.NO_WRAP)
    }

    /** Null when the value can't be decrypted (key wiped after a backup restore, for example). */
    fun decrypt(stored: String): String? = runCatching {
        val bytes = Base64.decode(stored, Base64.NO_WRAP)
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(TAG_BITS, bytes, 0, IV_BYTES))
        String(cipher.doFinal(bytes, IV_BYTES, bytes.size - IV_BYTES), Charsets.UTF_8)
    }.getOrNull()

    private fun keyStore(): KeyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }

    private fun key(): SecretKey {
        (keyStore().getEntry(alias, null) as? KeyStore.SecretKeyEntry)?.let { return it.secretKey }
        val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEYSTORE)
        generator.init(
            KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .build(),
        )
        return generator.generateKey()
    }

    private companion object {
        const val ANDROID_KEYSTORE = "AndroidKeyStore"
        const val TRANSFORMATION = "AES/GCM/NoPadding"
        const val IV_BYTES = 12
        const val TAG_BITS = 128
    }
}

data class StoredSession(val refreshToken: String, val user: User?)

/** Where the session survives process death. */
interface SessionStorage {
    suspend fun load(): StoredSession?
    suspend fun save(refreshToken: String, user: User?)
    suspend fun clear()
}

/** Persists the rotating refresh token (encrypted) and the cached user profile. */
class TokenStore(private val dataStore: DataStore<Preferences>) : SessionStorage {
    private val cipher = TokenCipher()

    override suspend fun load(): StoredSession? = withContext(Dispatchers.IO) {
        val prefs = dataStore.data.first()
        val encrypted = prefs[REFRESH] ?: return@withContext null
        val token = cipher.decrypt(encrypted) ?: return@withContext null
        val user = prefs[USER]?.let { runCatching { NorsumiJson.decodeFromString(User.serializer(), it) }.getOrNull() }
        StoredSession(token, user)
    }

    override suspend fun save(refreshToken: String, user: User?): Unit = withContext(Dispatchers.IO) {
        val encrypted = cipher.encrypt(refreshToken)
        dataStore.edit {
            it[REFRESH] = encrypted
            if (user != null) it[USER] = NorsumiJson.encodeToString(User.serializer(), user)
        }
    }

    override suspend fun clear() {
        dataStore.edit {
            it.remove(REFRESH)
            it.remove(USER)
        }
    }

    private companion object {
        val REFRESH = stringPreferencesKey("refresh_token")
        val USER = stringPreferencesKey("user")
    }
}
