package com.darklord.bgrm.engine

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.ColorMatrix
import android.graphics.ColorMatrixColorFilter
import android.graphics.Paint
import kotlin.math.abs

/**
 * ImageAdjustmentEngine applies brightness, contrast, and saturation
 * while strictly leaving the alpha channel untouched.
 */
object ImageAdjustmentEngine {

    fun applyAdjustments(
        source: Bitmap,
        brightness: Float, // -100f .. +100f
        contrast: Float,   // -100f .. +100f
        saturation: Float  // -100f .. +100f
    ): Bitmap {
        val noBrightness = abs(brightness) < 0.1f
        val noContrast = abs(contrast) < 0.1f
        val noSaturation = abs(saturation) < 0.1f

        if (noBrightness && noContrast && noSaturation) {
            return source
        }

        val cm = ColorMatrix()

        // 1. Saturation: 0 = grayscale, 1 = normal, 2 = 200%
        val satScale = ((saturation + 100f) / 100f).coerceIn(0f, 3f)
        val satMatrix = ColorMatrix()
        satMatrix.setSaturation(satScale)
        cm.postConcat(satMatrix)

        // 2. Contrast & Brightness
        // contrast factor c:
        // for input in [-100..100], scale factor = (contrast + 100) / 100
        val c = ((contrast + 100f) / 100f).coerceIn(0.1f, 3f)
        // brightness offset b in [-255..255]
        val b = (brightness * 2.55f).coerceIn(-255f, 255f)

        // Color matrix transform: out = c * in + (b + 128 * (1 - c))
        val t = (b + 128f * (1f - c))

        val contrastBrightnessArray = floatArrayOf(
            c, 0f, 0f, 0f, t,
            0f, c, 0f, 0f, t,
            0f, 0f, c, 0f, t,
            0f, 0f, 0f, 1f, 0f // Alpha channel preserved 100% untouched
        )
        val cbMatrix = ColorMatrix(contrastBrightnessArray)
        cm.postConcat(cbMatrix)

        val output = Bitmap.createBitmap(source.width, source.height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(output)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)
        paint.colorFilter = ColorMatrixColorFilter(cm)

        canvas.drawBitmap(source, 0f, 0f, paint)
        return output
    }
}
