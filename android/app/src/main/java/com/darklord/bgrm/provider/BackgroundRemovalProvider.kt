package com.darklord.bgrm.provider

import android.graphics.Bitmap
import java.io.File

sealed class BackgroundRemovalResult {
    data class Success(val transparentBitmap: Bitmap, val sourceName: String) : BackgroundRemovalResult()
    data class Error(val message: String, val canRetry: Boolean = true, val requiresConnection: Boolean = false) : BackgroundRemovalResult()
}

interface BackgroundRemovalProvider {
    val name: String
    val isOnlineRequired: Boolean
    val isConfigured: Boolean

    suspend fun removeBackground(
        sourceBitmap: Bitmap,
        cacheDir: File? = null
    ): BackgroundRemovalResult
}
