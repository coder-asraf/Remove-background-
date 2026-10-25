package com.darklord.bgrm

import android.graphics.Bitmap
import android.graphics.Color
import com.darklord.bgrm.engine.FinalImageRenderer
import com.darklord.bgrm.engine.ImageAdjustmentEngine
import com.darklord.bgrm.engine.ImageTransformEngine
import com.darklord.bgrm.engine.PrintLayoutEngine
import com.darklord.bgrm.model.BackgroundMode
import com.darklord.bgrm.model.CropRect
import com.darklord.bgrm.model.ImageProject
import com.darklord.bgrm.model.PageOrientation
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class CutoutStudioTests {

    private fun createTestTransparentBitmap(w: Int = 100, h: Int = 200): Bitmap {
        val bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
        bmp.eraseColor(Color.TRANSPARENT)
        // Draw a solid square in the center
        for (x in 20 until 80) {
            for (y in 50 until 150) {
                bmp.setPixel(x, y, Color.argb(200, 255, 0, 0)) // semi-transparent red
            }
        }
        return bmp
    }

    /**
     * TEST 1: Rotate a transparent image 90° clockwise.
     * Expected: Correct orientation, swapped dimensions (200x100), and preserved transparency.
     */
    @Test
    fun test1_rotateTransparent90DegreesClockwise() {
        val original = createTestTransparentBitmap(100, 200)
        assertEquals(100, original.width)
        assertEquals(200, original.height)
        assertEquals(0, Color.alpha(original.getPixel(5, 5)))

        val rotated = ImageTransformEngine.rotateBitmap(original, 90f)

        // Swapped width & height
        assertEquals(200, rotated.width)
        assertEquals(100, rotated.height)
        assertEquals(Bitmap.Config.ARGB_8888, rotated.config)

        // Verify corner pixel remains 100% transparent (no black or white fill)
        assertEquals(0, Color.alpha(rotated.getPixel(5, 5)))
    }

    /**
     * TEST 2: Rotate a transparent image 270°.
     * Expected: Correct orientation, swapped dimensions, and preserved transparency.
     */
    @Test
    fun test2_rotateTransparent270Degrees() {
        val original = createTestTransparentBitmap(100, 200)
        val rotated = ImageTransformEngine.rotateBitmap(original, 270f)

        assertEquals(200, rotated.width)
        assertEquals(100, rotated.height)
        assertEquals(0, Color.alpha(rotated.getPixel(5, 5)))
    }

    /**
     * TEST 3: Rotate an image 180°.
     * Expected: Correct orientation and dimensions maintained (100x200).
     */
    @Test
    fun test3_rotateTransparent180Degrees() {
        val original = createTestTransparentBitmap(100, 200)
        val rotated = ImageTransformEngine.rotateBitmap(original, 180f)

        assertEquals(100, rotated.width)
        assertEquals(200, rotated.height)
        assertEquals(0, Color.alpha(rotated.getPixel(5, 5)))
    }

    /**
     * TEST 4: Rotate an image by an arbitrary angle (e.g. 45°).
     * Expected: Bounding box expands, no unintended clipping, transparent corners.
     */
    @Test
    fun test4_rotateArbitraryAngleNoClipping() {
        val original = createTestTransparentBitmap(100, 100)
        val rotated = ImageTransformEngine.rotateBitmap(original, 45f)

        // Diagonal of 100x100 is ~141.4px
        assertTrue("Rotated width should expand to contain 45 deg", rotated.width >= 140)
        assertTrue("Rotated height should expand to contain 45 deg", rotated.height >= 140)
        assertEquals(0, Color.alpha(rotated.getPixel(0, 0)))
    }

    /**
     * TEST 7: Rotate an image after background removal.
     * Expected: Transforms existing transparent bitmap without requiring an API re-call.
     */
    @Test
    fun test7_rotateAfterBackgroundRemovalUsesExistingState() {
        val transparentSource = createTestTransparentBitmap(120, 160)
        val project = ImageProject(
            rotationDegrees = 90f,
            backgroundMode = BackgroundMode.TRANSPARENT
        )

        val rendered = FinalImageRenderer.renderFinalBitmap(project, transparentSource)
        assertEquals(160, rendered.width)
        assertEquals(120, rendered.height)
        assertEquals(0, Color.alpha(rendered.getPixel(2, 2)))
    }

    /**
     * TEST 8: Rotate and crop an image.
     * Expected: Pipeline renders rotated and cropped output accurately.
     */
    @Test
    fun test8_rotateAndCropImagePipeline() {
        val original = createTestTransparentBitmap(200, 200)
        val project = ImageProject(
            rotationDegrees = 90f,
            cropRectangle = CropRect(left = 0.25f, top = 0.25f, right = 0.75f, bottom = 0.75f)
        )

        val rendered = FinalImageRenderer.renderFinalBitmap(project, original)
        assertEquals(100, rendered.width)
        assertEquals(100, rendered.height)
    }

    /**
     * TEST 13: Generate multiple copies on an A4 page.
     * Expected: Correct rows and cols calculated, all placements fit inside printable area.
     */
    @Test
    fun test13_multiCopyPrintGridCalculation() {
        val project = ImageProject(
            selectedPaperPreset = "paper_a4",
            selectedPhotoPreset = "passport_35x45",
            copies = 8,
            marginMm = 10f,
            horizontalGapMm = 5f,
            verticalGapMm = 5f
        )

        val layout = PrintLayoutEngine.calculateLayout(project)
        assertTrue("Should fit on page", layout.fitsOnPage)
        assertEquals(8, layout.placements.size)
        assertTrue("Page width should be 210mm", layout.pageWidthMm == 210f)
        assertTrue("Page height should be 297mm", layout.pageHeightMm == 297f)
    }

    /**
     * TEST 14: Generate a multi-page layout.
     * Expected: Correct page index assignment when requested copies exceed copies-per-page.
     */
    @Test
    fun test14_multiPageCalculation() {
        val project = ImageProject(
            selectedPaperPreset = "paper_4x6",
            selectedPhotoPreset = "passport_2x2_in",
            copies = 10,
            marginMm = 5f,
            horizontalGapMm = 4f,
            verticalGapMm = 4f
        )

        val layout = PrintLayoutEngine.calculateLayout(project)
        assertTrue("Multiple pages should be generated", layout.totalPages > 1)
        assertEquals(10, layout.placements.size)
    }

    /**
     * TEST 15: Change paper size from A4 to 4x6 inches.
     * Expected: Layout recalculates with new dimensions.
     */
    @Test
    fun test15_changePaperSize() {
        val projectA4 = ImageProject(selectedPaperPreset = "paper_a4")
        val layoutA4 = PrintLayoutEngine.calculateLayout(projectA4)
        assertEquals(210f, layoutA4.pageWidthMm, 0.1f)

        val project4x6 = ImageProject(selectedPaperPreset = "paper_4x6")
        val layout4x6 = PrintLayoutEngine.calculateLayout(project4x6)
        assertEquals(101.6f, layout4x6.pageWidthMm, 0.1f)
        assertEquals(152.4f, layout4x6.pageHeightMm, 0.1f)
    }

    /**
     * TEST 21: Test solid background compositing.
     * Expected: Transparent pixels become the selected solid background color.
     */
    @Test
    fun test21_solidBackgroundCompositing() {
        val transparent = createTestTransparentBitmap(50, 50)
        val blueColor = Color.BLUE
        val project = ImageProject(
            backgroundMode = BackgroundMode.SOLID_COLOR,
            backgroundColor = blueColor
        )

        val rendered = FinalImageRenderer.renderFinalBitmap(project, transparent)
        val cornerPixel = rendered.getPixel(2, 2)
        assertEquals(255, Color.alpha(cornerPixel))
        assertEquals(Color.BLUE, cornerPixel)
    }

    /**
     * TEST 22: Test page overflow warning.
     * Expected: When photo size is larger than paper size, reports invalid layout without crash.
     */
    @Test
    fun test22_pageOverflowHandledGracefully() {
        val impossibleProject = ImageProject(
            customPhotoWidthMm = 300f,
            customPhotoHeightMm = 400f,
            selectedPaperPreset = "paper_a4" // 210 x 297 mm
        )

        val layout = PrintLayoutEngine.calculateLayout(impossibleProject)
        assertFalse("Should not fit on page", layout.fitsOnPage)
        assertNotNull(layout.warningMessage)
    }

    /**
     * TEST 6: BGNinja provider does not require an API key and is always configured.
     * Endpoint: https://bgninja.com/api/remove
     * Method: POST, multipart field "file"
     */
    @Test
    fun test6_bgNinjaProviderRequiresNoApiKey() {
        val provider = com.darklord.bgrm.provider.BgNinjaProvider()
        assertTrue("BGNinja should be configured by default without any API key", provider.isConfigured)
        assertEquals("BGNinja AI (Cloud)", provider.name)
        assertTrue("BGNinja requires online connection", provider.isOnlineRequired)
    }

    /**
     * TEST 23: Offline local editing operates 100% without network or API keys.
     */
    @Test
    fun test23_offlineEditingRequiresNoApiKey() {
        val sample = createTestTransparentBitmap(100, 100)
        val project = ImageProject(
            rotationDegrees = 90f,
            backgroundColor = Color.WHITE,
            backgroundMode = BackgroundMode.SOLID_COLOR,
            brightness = 10f,
            contrast = 20f
        )

        // All local rendering succeeds offline
        val rendered = FinalImageRenderer.renderFinalBitmap(project, sample)
        assertNotNull("Rendered bitmap must not be null", rendered)
        assertEquals(100, rendered.width)
        assertEquals(100, rendered.height)
    }
}

