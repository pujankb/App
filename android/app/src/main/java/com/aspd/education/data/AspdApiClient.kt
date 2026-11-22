package com.aspd.education.data

import com.aspd.education.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException
import java.util.concurrent.TimeUnit

class AspdApiClient(
    private val baseUrl: String = BuildConfig.API_BASE_URL.trimEnd('/'),
) {
    private val json = Json {
        ignoreUnknownKeys = true
        coerceInputValues = true
        isLenient = true
    }

    private val client = OkHttpClient.Builder()
        .connectTimeout(20, TimeUnit.SECONDS)
        .readTimeout(25, TimeUnit.SECONDS)
        .writeTimeout(25, TimeUnit.SECONDS)
        .build()

    private val jsonMediaType = "application/json; charset=utf-8".toMediaType()

    @Volatile
    var authToken: String? = null

    fun notePdfDownloadUrl(noteId: Int): String = "$baseUrl/api/notes/$noteId/file?download=1"

    fun adminPortalUrl(): String = "$baseUrl/admin"

    fun webAppBaseUrl(): String = baseUrl

    suspend fun fetchBootstrap(): BootstrapResponse = withContext(Dispatchers.IO) {
        val reqBuilder = Request.Builder()
            .url("$baseUrl/api/bootstrap")
            .header("Cache-Control", "no-cache")
            .get()
        authToken?.let { reqBuilder.header("Authorization", "Bearer $it") }

        client.newCall(reqBuilder.build()).execute().use { res ->
            val body = res.body?.string().orEmpty()
            if (!res.isSuccessful) {
                throw IOException(parseError(body, "Unable to load ASPD content (${res.code})"))
            }
            json.decodeFromString<BootstrapResponse>(body)
        }
    }

    suspend fun login(loginId: String, password: String): AuthResponse = withContext(Dispatchers.IO) {
        val payload = json.encodeToString(LoginRequest(loginId.trim(), password))
        val request = Request.Builder()
            .url("$baseUrl/api/auth/login")
            .post(payload.toRequestBody(jsonMediaType))
            .build()

        client.newCall(request).execute().use { res ->
            val body = res.body?.string().orEmpty()
            if (!res.isSuccessful) {
                throw IOException(parseError(body, "Invalid ID or password."))
            }
            val parsed = json.decodeFromString<AuthResponse>(body)
            authToken = parsed.token
            parsed
        }
    }

    suspend fun register(fullName: String, loginId: String, password: String): AuthResponse =
        withContext(Dispatchers.IO) {
            val payload = json.encodeToString(
                RegisterRequest(fullName.trim(), loginId.trim(), password)
            )
            val request = Request.Builder()
                .url("$baseUrl/api/auth/register")
                .post(payload.toRequestBody(jsonMediaType))
                .build()

            client.newCall(request).execute().use { res ->
                val body = res.body?.string().orEmpty()
                if (!res.isSuccessful) {
                    throw IOException(parseError(body, "Unable to create account."))
                }
                val parsed = json.decodeFromString<AuthResponse>(body)
                authToken = parsed.token
                parsed
            }
        }

    suspend fun toggleBookmark(noteId: Int): Boolean = withContext(Dispatchers.IO) {
        val token = authToken ?: throw IOException("Please sign in to bookmark notes.")
        val request = Request.Builder()
            .url("$baseUrl/api/notes/$noteId/bookmark")
            .header("Authorization", "Bearer $token")
            .post("{}".toRequestBody(jsonMediaType))
            .build()

        client.newCall(request).execute().use { res ->
            val body = res.body?.string().orEmpty()
            if (!res.isSuccessful) {
                throw IOException(parseError(body, "Unable to update bookmark."))
            }
            json.decodeFromString<BookmarkResponse>(body).bookmarked
        }
    }

    suspend fun submitContact(req: ContactRequest) = withContext(Dispatchers.IO) {
        val payload = json.encodeToString(req)
        val builder = Request.Builder()
            .url("$baseUrl/api/contact")
            .post(payload.toRequestBody(jsonMediaType))
        authToken?.let { builder.header("Authorization", "Bearer $it") }

        client.newCall(builder.build()).execute().use { res ->
            val body = res.body?.string().orEmpty()
            if (!res.isSuccessful) {
                throw IOException(parseError(body, "Unable to send message."))
            }
        }
    }

    fun signOut() {
        authToken = null
    }

    private fun parseError(body: String, fallback: String): String {
        return try {
            json.decodeFromString<ErrorPayload>(body).error.ifBlank { fallback }
        } catch (_: Exception) {
            fallback
        }
    }
}
