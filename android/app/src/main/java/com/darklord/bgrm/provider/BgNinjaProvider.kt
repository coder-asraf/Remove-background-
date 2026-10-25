package com.darklord.bgrm.provider

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileOutputStream
import java.security.MessageDigest
import java.util.concurrent.TimeUnit

/**
 * BGNinja API background removal provider.
 * Endpoint: https://bgninja.com/api/remove
 * Official Documentation: https://bgninja.com/api.html
 *
 * Specifications:
 * - Method: POST
 * - Content-Type: multipart/form-data (boundary generated automatically by OkHttp)
 * - Image parameter name: "file" (supports PNG, JPG, WEBP, HEIC up to 99MB / 30MP)
 * - Authentication: None required (Free documented endpoint)
 * - Returns: Raw transparent PNG binary bytes (synchronous)
 */
class BgNinjaProvider : BackgroundRemovalProvider {

    override val name: String = "BGNinja AI (Cloud)"
    override val isOnlineRequired: Boolean = true
    override val isConfigured: Boolean = true // Documented API is free and requires no key

    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .writeTimeout(60, TimeUnit.SECONDS)
        .build()

    override suspend fun removeBackground(
        sourceBitmap: Bitmap,
        cacheDir: File?
    ): BackgroundRemovalResult = withContext(Dispatchers.IO) {
        // Compress source to JPEG bytes for upload
        val byteStream = ByteArrayOutputStream()
        sourceBitmap.compress(Bitmap.CompressFormat.JPEG, 92, byteStream)
        val imageBytes = byteStream.toByteArray()

        // Check local disk cache first to prevent redundant network calls
        val imageHash = computeSha256(imageBytes)
        val cachedFile = cacheDir?.let { File(it, "bgninja_$imageHash.png") }
        if (cachedFile != null && cachedFile.exists() && cachedFile.length() > 0) {
            val cachedBitmap = BitmapFactory.decodeFile(cachedFile.absolutePath)
            if (cachedBitmap != null) {
                return@withContext BackgroundRemovalResult.Success(cachedBitmap, name)
            }
        }

        try {
            // Build multipart request according to documented API: field name "file"
            val requestBody = MultipartBody.Builder()
                .setType(MultipartBody.FORM)
                .addFormDataPart(
                    "file",
                    "photo.jpg",
                    imageBytes.toRequestBody("image/jpeg".toMediaTypeOrNull())
                )
                .addFormDataPart("src", "CutoutStudio")
                .build()

            // Official endpoint does NOT require an API key or Authorization header
            val request = Request.Builder()
                .url("https://bgninja.com/api/remove")
                .post(requestBody)
                .build()

            val response = httpClient.newCall(request).execute()

            if (!response.isSuccessful) {
                val code = response.code
                val errBody = response.body?.string() ?: response.message
                val message = when (code) {
                    429 -> "BGNinja daily free limit reached (10 images/day per IP). Please try again tomorrow or use the Offline Edge Keyer."
                    413 -> "Image file size exceeds BGNinja upload limit (max 99MB / 30MP)."
                    400 -> "BGNinja could not process this image format: $errBody"
                    else -> "BGNinja error ($code): $errBody"
                }
                return@withContext BackgroundRemovalResult.Error(message, canRetry = code >= 500)
            }

            val responseBytes = response.body?.bytes()
                ?: return@withContext BackgroundRemovalResult.Error("Empty response received from BGNinja")

            val transparentBitmap = BitmapFactory.decodeByteArray(responseBytes, 0, responseBytes.size)
                ?: return@withContext BackgroundRemovalResult.Error("Failed to decode transparent PNG returned from BGNinja")

            // Cache successful result locally
            if (cachedFile != null) {
                try {
                    FileOutputStream(cachedFile).use { out ->
                        transparentBitmap.compress(Bitmap.CompressFormat.PNG, 100, out)
                    }
                } catch (_: Exception) {}
            }

            BackgroundRemovalResult.Success(transparentBitmap, name)
        } catch (e: java.net.SocketTimeoutException) {
            BackgroundRemovalResult.Error(
                "Request timed out. Please check your internet connection.",
                canRetry = true,
                requiresConnection = true
            )
        } catch (e: java.net.UnknownHostException) {
            BackgroundRemovalResult.Error(
                "No internet connection available. Offline editing remains functional.",
                canRetry = true,
                requiresConnection = true
            )
        } catch (e: Exception) {
            BackgroundRemovalResult.Error("Background removal failed: ${e.message}", canRetry = true)
        }
    }

    private fun computeSha256(data: ByteArray): String {
        val digest = MessageDigest.getInstance("SHA-256")
        val hash = digest.digest(data)
        return hash.joinToString("") { "%02x".format(it) }
    }
}
