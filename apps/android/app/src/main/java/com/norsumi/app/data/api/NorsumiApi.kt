package com.norsumi.app.data.api

import com.norsumi.app.data.auth.RefreshCall
import com.norsumi.app.data.auth.RefreshResult
import com.norsumi.app.data.auth.SessionManager
import com.norsumi.app.data.model.ApiErrorBody
import com.norsumi.app.data.model.AuthSession
import com.norsumi.app.data.model.Category
import com.norsumi.app.data.model.CategoryPatch
import com.norsumi.app.data.model.CreateLinkBody
import com.norsumi.app.data.model.CreateNoteBody
import com.norsumi.app.data.model.DeleteMeBody
import com.norsumi.app.data.model.GoogleLoginBody
import com.norsumi.app.data.model.Item
import com.norsumi.app.data.model.ItemListResponse
import com.norsumi.app.data.model.ItemPatch
import com.norsumi.app.data.model.ItemQuery
import com.norsumi.app.data.model.LibraryStats
import com.norsumi.app.data.model.LoginBody
import com.norsumi.app.data.model.RefreshBody
import com.norsumi.app.data.model.RegisterBody
import com.norsumi.app.data.model.ServerInfo
import com.norsumi.app.data.model.User
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import kotlinx.serialization.DeserializationStrategy
import kotlinx.serialization.SerializationStrategy
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.json.JsonObject
import okhttp3.Authenticator
import okhttp3.Call
import okhttp3.Callback
import okhttp3.HttpUrl
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.Interceptor
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import okhttp3.Route
import java.io.IOException
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

class ApiException(val status: Int, message: String) : IOException(message) {
    val isUnauthorized: Boolean get() = status == 401
    /** Worth retrying later (server trouble, rate limit, timeout). */
    val isTransient: Boolean get() = status >= 500 || status == 408 || status == 429
}

private val JSON = "application/json; charset=utf-8".toMediaType()

/** Thin, typed wrapper over the norsumi REST API (see docs/api.md). */
class NorsumiApi(
    baseClient: OkHttpClient,
    private val session: SessionManager,
    private val serverUrl: () -> String,
) {
    /** Client without auth, used for public routes and refresh. */
    private val publicClient: OkHttpClient = baseClient

    val client: OkHttpClient = baseClient.newBuilder()
        .addInterceptor(AuthInterceptor())
        .authenticator(TokenAuthenticator())
        .build()

    private fun url(path: String, base: String = serverUrl()): HttpUrl.Builder =
        "$base/".toHttpUrl().newBuilder().addPathSegments(path.trimStart('/'))

    // --- Public -------------------------------------------------------------------------------

    suspend fun info(base: String = serverUrl()): ServerInfo =
        publicClient.send(Request.Builder().url(url("api/info", base).build()).build(), ServerInfo.serializer())

    suspend fun login(email: String, password: String): AuthSession =
        postPublic("api/auth/login", LoginBody.serializer(), LoginBody(email.trim(), password))

    suspend fun register(email: String, password: String, name: String): AuthSession =
        postPublic("api/auth/register", RegisterBody.serializer(), RegisterBody(email.trim(), password, name.trim()))

    suspend fun google(idToken: String): AuthSession =
        postPublic("api/auth/google", GoogleLoginBody.serializer(), GoogleLoginBody(idToken))

    suspend fun logout(refreshToken: String) {
        val body = NorsumiJson.encodeToString(RefreshBody.serializer(), RefreshBody(refreshToken)).toRequestBody(JSON)
        publicClient.send(Request.Builder().url(url("api/auth/logout").build()).post(body).build())
    }

    private suspend fun <B> postPublic(path: String, ser: SerializationStrategy<B>, body: B): AuthSession {
        val request = Request.Builder().url(url(path).build())
            .post(NorsumiJson.encodeToString(ser, body).toRequestBody(JSON)).build()
        return publicClient.send(request, AuthSession.serializer())
    }

    // --- User ---------------------------------------------------------------------------------

    suspend fun me(): User = get(url("api/me").build(), User.serializer())

    /**
     * Permanently deletes the account and all its data (204). A wrong or missing password returns 403
     * ("Password is incorrect"); 401 still means the session expired.
     */
    suspend fun deleteMe(password: String?) {
        val builder = Request.Builder().url(url("api/me").build())
        if (password != null) {
            builder.delete(NorsumiJson.encodeToString(DeleteMeBody.serializer(), DeleteMeBody(password)).toRequestBody(JSON))
        } else {
            builder.delete()
        }
        client.send(builder.build())
    }

    // --- Items --------------------------------------------------------------------------------

    suspend fun items(query: ItemQuery, cursor: String?): ItemListResponse {
        val u = url("api/items").apply {
            if (query.kinds.isNotEmpty()) addQueryParameter("kind", query.kinds.joinToString(",") { it.wire })
            query.favorite?.let { addQueryParameter("favorite", it.toString()) }
            query.archived?.let { addQueryParameter("archived", it.toString()) }
            query.categoryId?.let { addQueryParameter("categoryId", it) }
            query.q?.takeIf { it.isNotBlank() }?.let { addQueryParameter("q", it) }
            cursor?.let { addQueryParameter("cursor", it) }
            addQueryParameter("limit", query.limit.toString())
        }.build()
        return get(u, ItemListResponse.serializer())
    }

    suspend fun item(id: String): Item = get(url("api/items/$id").build(), Item.serializer())

    suspend fun stats(): LibraryStats = get(url("api/items/stats").build(), LibraryStats.serializer())

    suspend fun updateItem(id: String, patch: ItemPatch): Item =
        sendJson("PATCH", url("api/items/$id").build(), patch.toJson(), Item.serializer())

    suspend fun deleteItem(id: String) {
        client.send(Request.Builder().url(url("api/items/$id").build()).delete().build())
    }

    suspend fun reprocess(id: String): Item =
        sendJson("POST", url("api/items/$id/reprocess").build(), JsonObject(emptyMap()), Item.serializer())

    suspend fun createLink(link: String, text: String?, capturedAt: String?): Item {
        val body = NorsumiJson.encodeToString(CreateLinkBody.serializer(), CreateLinkBody(link, text, capturedAt))
        return client.send(
            Request.Builder().url(url("api/items/link").build()).post(body.toRequestBody(JSON)).build(),
            Item.serializer(),
        )
    }

    suspend fun createNote(text: String, capturedAt: String?): Item {
        val body = NorsumiJson.encodeToString(CreateNoteBody.serializer(), CreateNoteBody(text, capturedAt))
        return client.send(
            Request.Builder().url(url("api/items/note").build()).post(body.toRequestBody(JSON)).build(),
            Item.serializer(),
        )
    }

    /** Multipart upload; [file] should stream (see [com.norsumi.app.capture.ContentUriRequestBody]). */
    fun uploadBlocking(file: RequestBody, fileName: String, kind: String, capturedAt: String?, clientId: String?): Item {
        val multipart = MultipartBody.Builder().setType(MultipartBody.FORM).apply {
            addFormDataPart("kind", kind)
            capturedAt?.let { addFormDataPart("capturedAt", it) }
            clientId?.let { addFormDataPart("clientId", it) }
            // Fields first: the server can validate them before the bytes arrive.
            addFormDataPart("file", fileName, file)
        }.build()
        val request = Request.Builder().url(url("api/items/upload").build()).post(multipart).build()
        client.newCall(request).execute().use { response -> return response.decode(Item.serializer()) }
    }

    // --- Categories ---------------------------------------------------------------------------

    suspend fun categories(): List<Category> = get(url("api/categories").build(), ListSerializer(Category.serializer()))

    suspend fun createCategory(name: String, parentId: String?, emoji: String?, color: String?): Category {
        val body = kotlinx.serialization.json.buildJsonObject {
            put("name", kotlinx.serialization.json.JsonPrimitive(name))
            parentId?.let { put("parentId", kotlinx.serialization.json.JsonPrimitive(it)) }
            emoji?.let { put("emoji", kotlinx.serialization.json.JsonPrimitive(it)) }
            color?.let { put("color", kotlinx.serialization.json.JsonPrimitive(it)) }
        }
        return sendJson("POST", url("api/categories").build(), body, Category.serializer())
    }

    suspend fun updateCategory(id: String, patch: CategoryPatch): Category =
        sendJson("PATCH", url("api/categories/$id").build(), patch.toJson(), Category.serializer())

    suspend fun deleteCategory(id: String) {
        client.send(Request.Builder().url(url("api/categories/$id").build()).delete().build())
    }

    // --- Plumbing -----------------------------------------------------------------------------

    private suspend fun <T> get(u: HttpUrl, de: DeserializationStrategy<T>): T =
        client.send(Request.Builder().url(u).get().build(), de)

    private suspend fun <T> sendJson(method: String, u: HttpUrl, body: JsonObject, de: DeserializationStrategy<T>): T =
        client.send(Request.Builder().url(u).method(method, body.toString().toRequestBody(JSON)).build(), de)

    private inner class AuthInterceptor : Interceptor {
        override fun intercept(chain: Interceptor.Chain): Response {
            val token = session.accessToken
            val request = if (token != null) {
                chain.request().newBuilder().header("Authorization", "Bearer $token").build()
            } else {
                chain.request()
            }
            return chain.proceed(request)
        }
    }

    private inner class TokenAuthenticator : Authenticator {
        override fun authenticate(route: Route?, response: Response): Request? {
            // Give up after one retry: the refreshed token was rejected too.
            if (response.priorResponse != null) return null
            val sent = response.request.header("Authorization")?.removePrefix("Bearer ")
            val fresh = session.refreshBlocking(sent, RefreshCall(::refreshNow)) ?: return null
            return response.request.newBuilder().header("Authorization", "Bearer $fresh").build()
        }
    }

    private fun refreshNow(refreshToken: String): RefreshResult = try {
        val body = NorsumiJson.encodeToString(RefreshBody.serializer(), RefreshBody(refreshToken)).toRequestBody(JSON)
        publicClient.newCall(Request.Builder().url(url("api/auth/refresh").build()).post(body).build()).execute().use {
            when {
                it.isSuccessful -> RefreshResult.Success(NorsumiJson.decodeFromString(AuthSession.serializer(), it.body.string()))
                // Only a 401 ends the session; 409 = rotated moments ago by a concurrent refresh.
                it.code == 401 -> RefreshResult.Rejected
                it.code == 409 -> RefreshResult.Conflict
                else -> RefreshResult.Unavailable
            }
        }
    } catch (_: IOException) {
        RefreshResult.Unavailable
    }
}

internal fun <T> Response.decode(de: DeserializationStrategy<T>): T {
    val text = body.string()
    if (!isSuccessful) throw toApiException(text)
    return NorsumiJson.decodeFromString(de, text)
}

private fun Response.toApiException(text: String): ApiException {
    val parsed = runCatching { NorsumiJson.decodeFromString(ApiErrorBody.serializer(), text) }.getOrNull()
    val message = parsed?.message?.takeIf { it.isNotBlank() } ?: message.ifBlank { "HTTP $code" }
    return ApiException(code, message)
}

// Body reads and JSON decoding happen on IO: `await()` resumes on the caller's dispatcher, and the
// body may still be streaming from the socket.
private suspend fun <T> OkHttpClient.send(request: Request, de: DeserializationStrategy<T>): T =
    withContext(Dispatchers.IO) { newCall(request).await().use { it.decode(de) } }

private suspend fun OkHttpClient.send(request: Request) = withContext(Dispatchers.IO) {
    newCall(request).await().use { if (!it.isSuccessful) throw it.toApiException(it.body.string()) }
}

suspend fun Call.await(): Response = suspendCancellableCoroutine { cont ->
    cont.invokeOnCancellation { cancel() }
    enqueue(object : Callback {
        override fun onFailure(call: Call, e: IOException) {
            if (!cont.isCancelled) cont.resumeWithException(e)
        }

        override fun onResponse(call: Call, response: Response) {
            cont.resume(response) { _, value, _ -> value.close() }
        }
    })
}
