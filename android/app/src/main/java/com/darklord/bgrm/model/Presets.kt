package com.darklord.bgrm.model

data class PhotoPreset(
    val id: String,
    val name: String,
    val widthMm: Float,
    val heightMm: Float,
    val description: String,
    val headRatioMin: Float = 0.70f,
    val headRatioMax: Float = 0.80f
)

data class PaperPreset(
    val id: String,
    val name: String,
    val widthMm: Float,
    val heightMm: Float,
    val standardDpi: Int = 300
)

object Presets {
    val PHOTO_PRESETS = listOf(
        PhotoPreset(
            id = "passport_35x45",
            name = "35 × 45 mm (EU / UK / Schengen)",
            widthMm = 35f,
            heightMm = 45f,
            description = "Standard biometric passport size used across Europe, UK, Australia & Canada."
        ),
        PhotoPreset(
            id = "passport_2x2_in",
            name = "2 × 2 inches (US / India)",
            widthMm = 50.8f,
            heightMm = 50.8f,
            description = "Standard US Passport, US Visa, and India OCI dimensions."
        ),
        PhotoPreset(
            id = "passport_40x50",
            name = "40 × 50 mm (ID / Visa)",
            widthMm = 40f,
            heightMm = 50f,
            description = "Common size for international visas and identity cards."
        ),
        PhotoPreset(
            id = "passport_30x40",
            name = "30 × 40 mm (Driver License / ID)",
            widthMm = 30f,
            heightMm = 40f,
            description = "Common size for driver licenses and badge cards."
        ),
        PhotoPreset(
            id = "passport_33x48",
            name = "33 × 48 mm (China Visa / Passport)",
            widthMm = 33f,
            heightMm = 48f,
            description = "Standard official Chinese passport and entry visa dimensions."
        ),
        PhotoPreset(
            id = "passport_custom",
            name = "Custom Dimensions",
            widthMm = 35f,
            heightMm = 45f,
            description = "User specified width and height in mm or inches."
        )
    )

    val PAPER_PRESETS = listOf(
        PaperPreset(
            id = "paper_a4",
            name = "A4 (210 × 297 mm)",
            widthMm = 210f,
            heightMm = 297f
        ),
        PaperPreset(
            id = "paper_4x6",
            name = "4 × 6 inches (102 × 152 mm)",
            widthMm = 101.6f,
            heightMm = 152.4f
        ),
        PaperPreset(
            id = "paper_letter",
            name = "US Letter (8.5 × 11 in)",
            widthMm = 215.9f,
            heightMm = 279.4f
        ),
        PaperPreset(
            id = "paper_5x7",
            name = "5 × 7 inches (127 × 178 mm)",
            widthMm = 127f,
            heightMm = 177.8f
        ),
        PaperPreset(
            id = "paper_a5",
            name = "A5 (148 × 210 mm)",
            widthMm = 148f,
            heightMm = 210f
        ),
        PaperPreset(
            id = "paper_legal",
            name = "US Legal (8.5 × 14 in)",
            widthMm = 215.9f,
            heightMm = 355.6f
        ),
        PaperPreset(
            id = "paper_custom",
            name = "Custom Paper Size",
            widthMm = 210f,
            heightMm = 297f
        )
    )

    data class ColorSwatch(
        val name: String,
        val colorInt: Int,
        val hex: String
    )

    val COLOR_SWATCHES = listOf(
        ColorSwatch("Transparent", 0x00000000, "transparent"),
        ColorSwatch("White", 0xFFFFFFFF.toInt(), "#FFFFFF"),
        ColorSwatch("Light Blue", 0xFFC8DCF0.toInt(), "#C8DCF0"),
        ColorSwatch("Blue", 0xFF0066CC.toInt(), "#0066CC"),
        ColorSwatch("Red", 0xFFE53E3E.toInt(), "#E53E3E"),
        ColorSwatch("Light Gray", 0xFFE2E8F0.toInt(), "#E2E8F0"),
        ColorSwatch("Gray", 0xFF718096.toInt(), "#718096"),
        ColorSwatch("Black", 0xFF000000.toInt(), "#000000")
    )
}
