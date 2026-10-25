package com.darklord.bgrm.model

import java.util.UUID

enum class BackgroundMode {
    TRANSPARENT,
    SOLID_COLOR
}

enum class PageOrientation {
    PORTRAIT,
    LANDSCAPE
}

data class CropRect(
    val left: Float = 0f,
    val top: Float = 0f,
    val right: Float = 1f,
    val bottom: Float = 1f
) {
    fun width(): Float = (right - left).coerceAtLeast(0.001f)
    fun height(): Float = (bottom - top).coerceAtLeast(0.001f)
}

/**
 * Immutable Single Source of Truth for all editing operations,
 * previews, PNG/JPEG exports, print layout calculations, and PDF generation.
 */
data class ImageProject(
    val projectId: String = UUID.randomUUID().toString(),
    val originalImagePath: String = "",
    val backgroundRemovedImagePath: String? = null,
    val rotationDegrees: Float = 0f,
    val cropRectangle: CropRect? = null,
    val horizontalFlip: Boolean = false,
    val verticalFlip: Boolean = false,
    val backgroundMode: BackgroundMode = BackgroundMode.TRANSPARENT,
    val backgroundColor: Int = 0x00000000, // 0xAARRGGBB transparent by default
    val brightness: Float = 0f,    // -100f .. +100f
    val contrast: Float = 0f,      // -100f .. +100f
    val saturation: Float = 0f,    // -100f .. +100f
    val sharpness: Float = 0f,     // 0f .. 100f
    val selectedPhotoPreset: String = "passport_35x45",
    val customPhotoWidthMm: Float = 35f,
    val customPhotoHeightMm: Float = 45f,
    val selectedPaperPreset: String = "paper_a4",
    val customPaperWidthMm: Float = 210f,
    val customPaperHeightMm: Float = 297f,
    val pageOrientation: PageOrientation = PageOrientation.PORTRAIT,
    val copies: Int = 8,
    val marginMm: Float = 10f,
    val horizontalGapMm: Float = 5f,
    val verticalGapMm: Float = 5f,
    val cutGuidesEnabled: Boolean = true,
    val cropMarksEnabled: Boolean = true,
    val photoNumbersEnabled: Boolean = false,
    val imageRevision: Long = 1L,
    val projectName: String = "Untitled Project",
    val savedAt: Long = System.currentTimeMillis()
) {
    val activeSourcePath: String
        get() = backgroundRemovedImagePath ?: originalImagePath

    fun bumpRevision(): ImageProject {
        return this.copy(imageRevision = this.imageRevision + 1L)
    }
}
