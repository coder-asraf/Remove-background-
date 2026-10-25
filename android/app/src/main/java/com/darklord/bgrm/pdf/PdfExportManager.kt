package com.darklord.bgrm.pdf

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.DashPathEffect
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.pdf.PdfDocument
import com.darklord.bgrm.engine.FinalImageRenderer
import com.darklord.bgrm.engine.PrintLayoutEngine
import com.darklord.bgrm.model.ImageProject
import java.io.File
import java.io.FileOutputStream

/**
 * Solves CRITICAL BUG FIX 2:
 * Generates accurate PDF using the exact edited bitmap from [FinalImageRenderer.renderFinalBitmap].
 * Never reloads raw original files, never double-rotates, and draws crop marks and cut guides accurately.
 */
object PdfExportManager {

    fun generatePdf(
        context: Context,
        project: ImageProject,
        outputFile: File,
        dpi: Int = 300,
        sourceBitmap: Bitmap? = null
    ): Result<File> {
        return try {
            val layout = PrintLayoutEngine.calculateLayout(project)
            if (!layout.fitsOnPage || layout.placements.isEmpty()) {
                return Result.failure(IllegalStateException(layout.warningMessage ?: "Layout does not fit on page"))
            }

            // CRITICAL FIX: The PDF generator strictly receives final edited bitmap from renderFinalBitmap
            // target pixel dimensions for high-quality printing = mm * DPI / 25.4
            val targetPhotoWPx = (layout.photoWidthMm * dpi / 25.4f).toInt().coerceAtLeast(100)
            val targetPhotoHPx = (layout.photoHeightMm * dpi / 25.4f).toInt().coerceAtLeast(100)

            val finalEditedBitmap = FinalImageRenderer.renderFinalBitmap(
                project = project,
                sourceBitmap = sourceBitmap,
                targetWidthPx = targetPhotoWPx,
                targetHeightPx = targetPhotoHPx
            )

            val document = PdfDocument()

            // Paint styles
            val photoPaint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)
            val guidePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.LTGRAY
                strokeWidth = 0.5f
                style = Paint.Style.STROKE
                pathEffect = DashPathEffect(floatArrayOf(4f, 4f), 0f)
            }
            val cropMarkPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.DKGRAY
                strokeWidth = 0.75f
                style = Paint.Style.STROKE
            }
            val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.GRAY
                textSize = 8f
            }

            // PDF dimensions in 72 DPI points: points = mm * 72 / 25.4
            val pageWidthPoints = (layout.pageWidthMm * 72f / 25.4f).toInt()
            val pageHeightPoints = (layout.pageHeightMm * 72f / 25.4f).toInt()

            for (pageIndex in 0 until layout.totalPages) {
                val pageInfo = PdfDocument.PageInfo.Builder(pageWidthPoints, pageHeightPoints, pageIndex + 1).create()
                val page = document.startPage(pageInfo)
                val canvas: Canvas = page.canvas

                // Fill clean white sheet background
                canvas.drawColor(Color.WHITE)

                val pagePlacements = layout.placements.filter { it.pageIndex == pageIndex }

                for (placement in pagePlacements) {
                    val leftPt = placement.xPoints()
                    val topPt = placement.yPoints()
                    val widthPt = placement.widthPoints()
                    val heightPt = placement.heightPoints()
                    val dstRect = RectF(leftPt, topPt, leftPt + widthPt, topPt + heightPt)

                    // Draw the final edited bitmap
                    canvas.drawBitmap(finalEditedBitmap, null, dstRect, photoPaint)

                    // Optional Cut Guides (dashed border)
                    if (layout.cutGuidesEnabled) {
                        canvas.drawRect(dstRect, guidePaint)
                    }

                    // Optional Corner Crop Marks
                    if (layout.cropMarksEnabled) {
                        val markLength = 6f
                        // Top-left
                        canvas.drawLine(leftPt - markLength, topPt, leftPt, topPt, cropMarkPaint)
                        canvas.drawLine(leftPt, topPt - markLength, leftPt, topPt, cropMarkPaint)
                        // Top-right
                        canvas.drawLine(leftPt + widthPt, topPt, leftPt + widthPt + markLength, topPt, cropMarkPaint)
                        canvas.drawLine(leftPt + widthPt, topPt - markLength, leftPt + widthPt, topPt, cropMarkPaint)
                        // Bottom-left
                        canvas.drawLine(leftPt - markLength, topPt + heightPt, leftPt, topPt + heightPt, cropMarkPaint)
                        canvas.drawLine(leftPt, topPt + heightPt, leftPt, topPt + heightPt + markLength, cropMarkPaint)
                        // Bottom-right
                        canvas.drawLine(leftPt + widthPt, topPt + heightPt, leftPt + widthPt + markLength, topPt + heightPt, cropMarkPaint)
                        canvas.drawLine(leftPt + widthPt, topPt + heightPt, leftPt + widthPt, topPt + heightPt + markLength, cropMarkPaint)
                    }

                    // Optional photo number
                    if (layout.photoNumbersEnabled) {
                        canvas.drawText("#${placement.copyNumber}", leftPt + 2f, topPt + heightPt - 4f, textPaint)
                    }
                }

                document.finishPage(page)
            }

            outputFile.parentFile?.mkdirs()
            FileOutputStream(outputFile).use { out ->
                document.writeTo(out)
            }
            document.close()

            Result.success(outputFile)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
