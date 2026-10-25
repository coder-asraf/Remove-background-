package com.darklord.bgrm.engine

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.PorterDuff
import android.graphics.RectF
import kotlin.math.abs
import kotlin.math.roundToInt

/**
 * ImageTransformEngine solves CRITICAL BUG FIX 1:
 * Preserves alpha transparency across 90°, 180°, 270°, and arbitrary angle rotations.
 * Uses ARGB_8888, computes expanded bounding boxes without clipping,
 * and never replaces transparent pixels with solid black or white.
 */
object ImageTransformEngine {

    /**
     * Rotates [source] by [degrees] while preserving full alpha channel and anti-aliased edges.
     * Guaranteed to return a non-null ARGB_8888 Bitmap with correct swapped dimensions for 90/270 degrees.
     */
    fun rotateBitmap(source: Bitmap, degrees: Float): Bitmap {
        val normalizedDegrees = ((degrees % 360f) + 360f) % 360f
        if (abs(normalizedDegrees) < 0.001f) {
            // Return an ARGB_8888 copy if needed or copy directly
            return if (source.config == Bitmap.Config.ARGB_8888) {
                source.copy(Bitmap.Config.ARGB_8888, true)
            } else {
                convertConfig(source, Bitmap.Config.ARGB_8888)
            }
        }

        // Fast path for 90, 180, 270 degrees with exact dimension swaps
        val isRightAngle = abs(normalizedDegrees - 90f) < 0.1f ||
                abs(normalizedDegrees - 180f) < 0.1f ||
                abs(normalizedDegrees - 270f) < 0.1f

        val srcWidth = source.width
        val srcHeight = source.height

        val matrix = Matrix()
        matrix.postRotate(normalizedDegrees, srcWidth / 2f, srcHeight / 2f)

        // Calculate transformed bounding rectangle to prevent clipping
        val srcRect = RectF(0f, 0f, srcWidth.toFloat(), srcHeight.toFloat())
        val dstRect = RectF()
        matrix.mapRect(dstRect, srcRect)

        val newWidth = dstRect.width().roundToInt().coerceAtLeast(1)
        val newHeight = dstRect.height().roundToInt().coerceAtLeast(1)

        // Build transformation matrix translated so dstRect begins at (0,0)
        val transformMatrix = Matrix()
        transformMatrix.postTranslate(-srcWidth / 2f, -srcHeight / 2f)
        transformMatrix.postRotate(normalizedDegrees)
        transformMatrix.postTranslate(newWidth / 2f, newHeight / 2f)

        // Ensure ARGB_8888 output initialized with transparent color
        val output = Bitmap.createBitmap(newWidth, newHeight, Bitmap.Config.ARGB_8888)
        output.eraseColor(Color.TRANSPARENT)

        val canvas = Canvas(output)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG or Paint.DITHER_FLAG)

        canvas.drawBitmap(source, transformMatrix, paint)
        return output
    }

    /**
     * Flips bitmap horizontally or vertically while preserving ARGB_8888 transparency.
     */
    fun flipBitmap(source: Bitmap, horizontal: Boolean, vertical: Boolean): Bitmap {
        if (!horizontal && !vertical) return source

        val matrix = Matrix()
        val sx = if (horizontal) -1f else 1f
        val sy = if (vertical) -1f else 1f
        matrix.preScale(sx, sy)

        val flipped = Bitmap.createBitmap(
            source,
            0,
            0,
            source.width,
            source.height,
            matrix,
            true
        )
        return convertConfig(flipped, Bitmap.Config.ARGB_8888)
    }

    /**
     * Crops bitmap within relative coordinates [0..1] preserving ARGB_8888 transparency.
     */
    fun cropBitmap(
        source: Bitmap,
        leftRatio: Float,
        topRatio: Float,
        rightRatio: Float,
        bottomRatio: Float
    ): Bitmap {
        val clampedLeft = leftRatio.coerceIn(0f, 0.99f)
        val clampedTop = topRatio.coerceIn(0f, 0.99f)
        val clampedRight = rightRatio.coerceIn(clampedLeft + 0.01f, 1f)
        val clampedBottom = bottomRatio.coerceIn(clampedTop + 0.01f, 1f)

        val x = (clampedLeft * source.width).roundToInt().coerceIn(0, source.width - 1)
        val y = (clampedTop * source.height).roundToInt().coerceIn(0, source.height - 1)
        val width = ((clampedRight - clampedLeft) * source.width).roundToInt().coerceIn(1, source.width - x)
        val height = ((clampedBottom - clampedTop) * source.height).roundToInt().coerceIn(1, source.height - y)

        val cropped = Bitmap.createBitmap(source, x, y, width, height)
        return convertConfig(cropped, Bitmap.Config.ARGB_8888)
    }

    /**
     * Ensures any bitmap is strictly converted into an ARGB_8888 mutable alpha bitmap.
     */
    fun convertConfig(source: Bitmap, targetConfig: Bitmap.Config = Bitmap.Config.ARGB_8888): Bitmap {
        if (source.config == targetConfig && source.isMutable) {
            return source
        }
        val converted = Bitmap.createBitmap(source.width, source.height, targetConfig)
        converted.eraseColor(Color.TRANSPARENT)
        val canvas = Canvas(converted)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)
        canvas.drawBitmap(source, 0f, 0f, paint)
        return converted
    }
}
