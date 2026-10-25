package com.darklord.bgrm.engine

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import androidx.exifinterface.media.ExifInterface
import com.darklord.bgrm.model.BackgroundMode
import com.darklord.bgrm.model.ImageProject
import java.io.File

/**
 * Single Source of Truth Renderer for Cutout Studio.
 * Every preview, PDF page, PNG, JPEG, and print job queries this exact pipeline.
 * Guarantees that any rotation, crop, background color, or adjustment is
 * identically reflected across all subsystems.
 */
object FinalImageRenderer {

    /**
     * Renders the complete final bitmap adhering strictly to the transformation order:
     * 1. EXIF orientation correction (on raw import)
     * 2. Rotation (preserving ARGB_8888 alpha transparency)
     * 3. Cropping
     * 4. Flip operations
     * 5. Color adjustments (brightness, contrast, saturation)
     * 6. Background compositing (solid color or transparent)
     */
    fun renderFinalBitmap(
        project: ImageProject,
        sourceBitmap: Bitmap? = null,
        targetWidthPx: Int? = null,
        targetHeightPx: Int? = null
    ): Bitmap {
        // Step 0: Obtain source bitmap (either provided or decoded from path)
        val rawBitmap = sourceBitmap ?: loadBitmapFromPath(project.activeSourcePath)
            ?: createPlaceholderBitmap()

        // Step 1: Ensure ARGB_8888 alpha format
        var currentBitmap = ImageTransformEngine.convertConfig(rawBitmap, Bitmap.Config.ARGB_8888)

        // Step 2: Apply user rotation (degrees) with 100% transparency preservation
        if (project.rotationDegrees != 0f) {
            val rotated = ImageTransformEngine.rotateBitmap(currentBitmap, project.rotationDegrees)
            if (rotated != currentBitmap && currentBitmap != sourceBitmap && currentBitmap != rawBitmap) {
                currentBitmap.recycle()
            }
            currentBitmap = rotated
        }

        // Step 3: Apply Cropping
        project.cropRectangle?.let { crop ->
            val cropped = ImageTransformEngine.cropBitmap(
                currentBitmap,
                crop.left,
                crop.top,
                crop.right,
                crop.bottom
            )
            if (cropped != currentBitmap && currentBitmap != sourceBitmap && currentBitmap != rawBitmap) {
                currentBitmap.recycle()
            }
            currentBitmap = cropped
        }

        // Step 4: Apply Flip operations
        if (project.horizontalFlip || project.verticalFlip) {
            val flipped = ImageTransformEngine.flipBitmap(
                currentBitmap,
                project.horizontalFlip,
                project.verticalFlip
            )
            if (flipped != currentBitmap && currentBitmap != sourceBitmap && currentBitmap != rawBitmap) {
                currentBitmap.recycle()
            }
            currentBitmap = flipped
        }

        // Step 5: Apply Image Adjustments
        val adjusted = ImageAdjustmentEngine.applyAdjustments(
            currentBitmap,
            project.brightness,
            project.contrast,
            project.saturation
        )
        if (adjusted != currentBitmap && currentBitmap != sourceBitmap && currentBitmap != rawBitmap) {
            currentBitmap.recycle()
        }
        currentBitmap = adjusted

        // Step 6: Background Compositing (Transparent vs Solid Color)
        val composited = if (project.backgroundMode == BackgroundMode.SOLID_COLOR) {
            val bgBitmap = Bitmap.createBitmap(
                currentBitmap.width,
                currentBitmap.height,
                Bitmap.Config.ARGB_8888
            )
            val canvas = Canvas(bgBitmap)
            canvas.drawColor(project.backgroundColor)
            val paint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)
            canvas.drawBitmap(currentBitmap, 0f, 0f, paint)
            if (currentBitmap != sourceBitmap && currentBitmap != rawBitmap) {
                currentBitmap.recycle()
            }
            bgBitmap
        } else {
            currentBitmap
        }
        currentBitmap = composited

        // Step 7: Final output sizing if target dimensions are requested
        if (targetWidthPx != null && targetHeightPx != null &&
            (targetWidthPx != currentBitmap.width || targetHeightPx != currentBitmap.height)
        ) {
            val scaled = Bitmap.createScaledBitmap(
                currentBitmap,
                targetWidthPx.coerceAtLeast(1),
                targetHeightPx.coerceAtLeast(1),
                true
            )
            if (scaled != currentBitmap && currentBitmap != sourceBitmap && currentBitmap != rawBitmap) {
                currentBitmap.recycle()
            }
            currentBitmap = scaled
        }

        return currentBitmap
    }

    /**
     * Loads bitmap with EXIF orientation correction so it is never double-rotated.
     */
    fun loadBitmapFromPath(path: String): Bitmap? {
        if (path.isBlank() || !File(path).exists()) return null
        val options = BitmapFactory.Options().apply {
            inPreferredConfig = Bitmap.Config.ARGB_8888
        }
        val bitmap = BitmapFactory.decodeFile(path, options) ?: return null

        return try {
            val exif = ExifInterface(path)
            val orientation = exif.getAttributeInt(
                ExifInterface.TAG_ORIENTATION,
                ExifInterface.ORIENTATION_NORMAL
            )
            when (orientation) {
                ExifInterface.ORIENTATION_ROTATE_90 -> ImageTransformEngine.rotateBitmap(bitmap, 90f)
                ExifInterface.ORIENTATION_ROTATE_180 -> ImageTransformEngine.rotateBitmap(bitmap, 180f)
                ExifInterface.ORIENTATION_ROTATE_270 -> ImageTransformEngine.rotateBitmap(bitmap, 270f)
                else -> bitmap
            }
        } catch (e: Exception) {
            bitmap
        }
    }

    private fun createPlaceholderBitmap(): Bitmap {
        val bmp = Bitmap.createBitmap(400, 500, Bitmap.Config.ARGB_8888)
        bmp.eraseColor(Color.TRANSPARENT)
        return bmp
    }
}
