package com.darklord.bgrm.model

data class PhotoPlacement(
    val pageIndex: Int,
    val xMm: Float,
    val yMm: Float,
    val widthMm: Float,
    val heightMm: Float,
    val copyNumber: Int
) {
    fun xPoints(): Float = xMm * 72f / 25.4f
    fun yPoints(): Float = yMm * 72f / 25.4f
    fun widthPoints(): Float = widthMm * 72f / 25.4f
    fun heightPoints(): Float = heightMm * 72f / 25.4f

    fun xPixels(dpi: Int): Float = xMm * dpi / 25.4f
    fun yPixels(dpi: Int): Float = yMm * dpi / 25.4f
    fun widthPixels(dpi: Int): Float = widthMm * dpi / 25.4f
    fun heightPixels(dpi: Int): Float = heightMm * dpi / 25.4f
}

data class PrintLayoutPlan(
    val pageWidthMm: Float,
    val pageHeightMm: Float,
    val photoWidthMm: Float,
    val photoHeightMm: Float,
    val totalCopiesRequested: Int,
    val copiesPerPage: Int,
    val totalPages: Int,
    val columns: Int,
    val rows: Int,
    val marginMm: Float,
    val horizontalGapMm: Float,
    val verticalGapMm: Float,
    val cutGuidesEnabled: Boolean,
    val cropMarksEnabled: Boolean,
    val photoNumbersEnabled: Boolean,
    val placements: List<PhotoPlacement>,
    val fitsOnPage: Boolean,
    val warningMessage: String? = null
) {
    fun pageWidthPoints(): Float = pageWidthMm * 72f / 25.4f
    fun pageHeightPoints(): Float = pageHeightMm * 72f / 25.4f

    fun pageWidthPixels(dpi: Int = 300): Int = (pageWidthMm * dpi / 25.4f).toInt()
    fun pageHeightPixels(dpi: Int = 300): Int = (pageHeightMm * dpi / 25.4f).toInt()
}
