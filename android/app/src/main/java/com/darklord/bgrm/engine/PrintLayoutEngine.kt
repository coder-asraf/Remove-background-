package com.darklord.bgrm.engine

import com.darklord.bgrm.model.ImageProject
import com.darklord.bgrm.model.PageOrientation
import com.darklord.bgrm.model.PhotoPlacement
import com.darklord.bgrm.model.Presets
import com.darklord.bgrm.model.PrintLayoutPlan
import kotlin.math.floor

/**
 * PrintLayoutEngine calculates exact physical sheet arrangements in millimeters
 * and converts to PDF 72pt points and 300 DPI pixels.
 * Used identically for live print preview, PDF generation, and system printing.
 */
object PrintLayoutEngine {

    fun calculateLayout(project: ImageProject): PrintLayoutPlan {
        // 1. Resolve photo dimensions in millimeters
        val (photoW, photoH) = resolvePhotoDimensions(project)

        // 2. Resolve paper dimensions in millimeters
        val (basePaperW, basePaperH) = resolvePaperDimensions(project)

        // 3. Handle page orientation
        val (pageW, pageH) = if (project.pageOrientation == PageOrientation.LANDSCAPE) {
            maxOf(basePaperW, basePaperH) to minOf(basePaperW, basePaperH)
        } else {
            minOf(basePaperW, basePaperH) to maxOf(basePaperW, basePaperH)
        }

        val margin = project.marginMm.coerceAtLeast(0f)
        val hGap = project.horizontalGapMm.coerceAtLeast(0f)
        val vGap = project.verticalGapMm.coerceAtLeast(0f)

        // Calculate printable area
        val printableW = pageW - (2f * margin)
        val printableH = pageH - (2f * margin)

        if (printableW < photoW || printableH < photoH) {
            return PrintLayoutPlan(
                pageWidthMm = pageW,
                pageHeightMm = pageH,
                photoWidthMm = photoW,
                photoHeightMm = photoH,
                totalCopiesRequested = project.copies,
                copiesPerPage = 0,
                totalPages = 0,
                columns = 0,
                rows = 0,
                marginMm = margin,
                horizontalGapMm = hGap,
                verticalGapMm = vGap,
                cutGuidesEnabled = project.cutGuidesEnabled,
                cropMarksEnabled = project.cropMarksEnabled,
                photoNumbersEnabled = project.photoNumbersEnabled,
                placements = emptyList(),
                fitsOnPage = false,
                warningMessage = "Photo size exceeds printable page area. Adjust margins or paper size."
            )
        }

        // Columns and rows calculation:
        // total width needed for C columns = C * photoW + (C - 1) * hGap <= printableW
        // C * (photoW + hGap) - hGap <= printableW
        // C <= (printableW + hGap) / (photoW + hGap)
        val cols = floor((printableW + hGap) / (photoW + hGap)).toInt().coerceAtLeast(1)
        val rows = floor((printableH + vGap) / (photoH + vGap)).toInt().coerceAtLeast(1)

        val copiesPerPage = cols * rows
        val totalRequested = project.copies.coerceAtLeast(1)
        val totalPages = (totalRequested + copiesPerPage - 1) / copiesPerPage

        // Center grid on page
        val gridTotalW = cols * photoW + (cols - 1) * hGap
        val gridTotalH = rows * photoH + (rows - 1) * vGap
        val startX = margin + (printableW - gridTotalW) / 2f
        val startY = margin + (printableH - gridTotalH) / 2f

        val placements = mutableListOf<PhotoPlacement>()
        var placedCount = 0

        for (page in 0 until totalPages) {
            for (r in 0 until rows) {
                for (c in 0 until cols) {
                    if (placedCount >= totalRequested) break
                    val x = startX + c * (photoW + hGap)
                    val y = startY + r * (photoH + vGap)
                    placements.add(
                        PhotoPlacement(
                            pageIndex = page,
                            xMm = x,
                            yMm = y,
                            widthMm = photoW,
                            heightMm = photoH,
                            copyNumber = placedCount + 1
                        )
                    )
                    placedCount++
                }
                if (placedCount >= totalRequested) break
            }
        }

        return PrintLayoutPlan(
            pageWidthMm = pageW,
            pageHeightMm = pageH,
            photoWidthMm = photoW,
            photoHeightMm = photoH,
            totalCopiesRequested = totalRequested,
            copiesPerPage = copiesPerPage,
            totalPages = totalPages,
            columns = cols,
            rows = rows,
            marginMm = margin,
            horizontalGapMm = hGap,
            verticalGapMm = vGap,
            cutGuidesEnabled = project.cutGuidesEnabled,
            cropMarksEnabled = project.cropMarksEnabled,
            photoNumbersEnabled = project.photoNumbersEnabled,
            placements = placements,
            fitsOnPage = true,
            warningMessage = null
        )
    }

    private fun resolvePhotoDimensions(project: ImageProject): Pair<Float, Float> {
        val preset = Presets.PHOTO_PRESETS.find { it.id == project.selectedPhotoPreset }
        return if (preset != null && preset.id != "passport_custom") {
            preset.widthMm to preset.heightMm
        } else {
            project.customPhotoWidthMm.coerceAtLeast(10f) to project.customPhotoHeightMm.coerceAtLeast(10f)
        }
    }

    private fun resolvePaperDimensions(project: ImageProject): Pair<Float, Float> {
        val preset = Presets.PAPER_PRESETS.find { it.id == project.selectedPaperPreset }
        return if (preset != null && preset.id != "paper_custom") {
            preset.widthMm to preset.heightMm
        } else {
            project.customPaperWidthMm.coerceAtLeast(50f) to project.customPaperHeightMm.coerceAtLeast(50f)
        }
    }
}
