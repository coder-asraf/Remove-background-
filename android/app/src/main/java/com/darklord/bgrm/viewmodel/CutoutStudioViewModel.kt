package com.darklord.bgrm.viewmodel

import android.app.Application
import android.graphics.Bitmap
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.darklord.bgrm.engine.FinalImageRenderer
import com.darklord.bgrm.engine.PrintLayoutEngine
import com.darklord.bgrm.model.BackgroundMode
import com.darklord.bgrm.model.CropRect
import com.darklord.bgrm.model.ImageProject
import com.darklord.bgrm.model.PageOrientation
import com.darklord.bgrm.model.PrintLayoutPlan
import com.darklord.bgrm.pdf.PdfExportManager
import com.darklord.bgrm.provider.BackgroundRemovalProvider
import com.darklord.bgrm.provider.BackgroundRemovalResult
import com.darklord.bgrm.provider.BgNinjaProvider
import com.darklord.bgrm.provider.OfflineForegroundProvider
import com.darklord.bgrm.storage.ProjectStorageManager
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.io.File
import java.io.FileOutputStream

data class EditorUiState(
    val project: ImageProject = ImageProject(),
    val previewBitmap: Bitmap? = null,
    val originalBitmap: Bitmap? = null,
    val isRenderingPreview: Boolean = false,
    val isRemovingBackground: Boolean = false,
    val errorMessage: String? = null,
    val infoMessage: String? = null,
    val currentRevision: Long = 1L,
    val printLayout: PrintLayoutPlan = PrintLayoutPlan(
        pageWidthMm = 210f,
        pageHeightMm = 297f,
        photoWidthMm = 35f,
        photoHeightMm = 45f,
        totalCopiesRequested = 8,
        copiesPerPage = 8,
        totalPages = 1,
        columns = 4,
        rows = 2,
        marginMm = 10f,
        horizontalGapMm = 5f,
        verticalGapMm = 5f,
        cutGuidesEnabled = true,
        cropMarksEnabled = true,
        photoNumbersEnabled = false,
        placements = emptyList(),
        fitsOnPage = true
    ),
    val activeProviderIndex: Int = 0,
    val zoomScale: Float = 1f,
    val showBeforeComparison: Boolean = false
)

class CutoutStudioViewModel(application: Application) : AndroidViewModel(application) {

    private val storageManager = ProjectStorageManager(application)

    private val _uiState = MutableStateFlow(EditorUiState())
    val uiState: StateFlow<EditorUiState> = _uiState.asStateFlow()

    private var previewRenderJob: Job? = null
    private val undoStack = mutableListOf<ImageProject>()
    private val redoStack = mutableListOf<ImageProject>()

    private val bgNinjaProvider = BgNinjaProvider()
    private val offlineProvider = OfflineForegroundProvider()
    val availableProviders: List<BackgroundRemovalProvider>
        get() = listOf(bgNinjaProvider, offlineProvider)

    fun setSourceBitmap(bitmap: Bitmap, path: String? = null) {
        val newProject = ImageProject(
            originalImagePath = path ?: "",
            imageRevision = 1L
        )
        undoStack.clear()
        redoStack.clear()

        _uiState.value = _uiState.value.copy(
            project = newProject,
            originalBitmap = bitmap,
            errorMessage = null
        )
        renderLivePreview(newProject, bitmap)
    }

    /**
     * Preserves transparency when rotating by 90 degrees (CW or CCW) or 180 degrees.
     * Does NOT call background removal API again.
     */
    fun rotateBy(degrees: Float) {
        pushUndo()
        val current = _uiState.value.project
        val newDeg = ((current.rotationDegrees + degrees) % 360f + 360f) % 360f
        updateProject(current.copy(rotationDegrees = newDeg).bumpRevision())
    }

    fun setExactRotation(degrees: Float) {
        val current = _uiState.value.project
        val newDeg = ((degrees % 360f) + 360f) % 360f
        updateProject(current.copy(rotationDegrees = newDeg).bumpRevision())
    }

    fun setCrop(cropRect: CropRect?) {
        pushUndo()
        val current = _uiState.value.project
        updateProject(current.copy(cropRectangle = cropRect).bumpRevision())
    }

    fun setBackgroundColor(colorInt: Int) {
        pushUndo()
        val current = _uiState.value.project
        val mode = if (colorInt == 0) BackgroundMode.TRANSPARENT else BackgroundMode.SOLID_COLOR
        updateProject(current.copy(backgroundMode = mode, backgroundColor = colorInt).bumpRevision())
    }

    fun setAdjustments(brightness: Float, contrast: Float, saturation: Float) {
        val current = _uiState.value.project
        updateProject(
            current.copy(
                brightness = brightness,
                contrast = contrast,
                saturation = saturation
            ).bumpRevision()
        )
    }

    fun setPhotoPreset(presetId: String, customW: Float = 35f, customH: Float = 45f) {
        pushUndo()
        val current = _uiState.value.project
        updateProject(
            current.copy(
                selectedPhotoPreset = presetId,
                customPhotoWidthMm = customW,
                customPhotoHeightMm = customH
            ).bumpRevision()
        )
    }

    fun setPrintSettings(
        paperPresetId: String,
        copies: Int,
        orientation: PageOrientation,
        marginMm: Float,
        hGapMm: Float,
        vGapMm: Float,
        cutGuides: Boolean,
        cropMarks: Boolean,
        numbers: Boolean
    ) {
        val current = _uiState.value.project
        updateProject(
            current.copy(
                selectedPaperPreset = paperPresetId,
                copies = copies,
                pageOrientation = orientation,
                marginMm = marginMm,
                horizontalGapMm = hGapMm,
                verticalGapMm = vGapMm,
                cutGuidesEnabled = cutGuides,
                cropMarksEnabled = cropMarks,
                photoNumbersEnabled = numbers
            ).bumpRevision()
        )
    }

    /**
     * Executes AI Background Removal using selected provider (BGNinja or Offline Keyer).
     * Prevents duplicate requests if already in progress.
     */
    fun removeBackground() {
        if (_uiState.value.isRemovingBackground) return
        val currentSource = _uiState.value.originalBitmap ?: return
        val provider = availableProviders.getOrNull(_uiState.value.activeProviderIndex) ?: bgNinjaProvider

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isRemovingBackground = true, errorMessage = null)
            val cacheDir = File(getApplication<Application>().cacheDir, "bg_cache").apply { mkdirs() }

            val result = provider.removeBackground(currentSource, cacheDir)
            when (result) {
                is BackgroundRemovalResult.Success -> {
                    pushUndo()
                    val savedFile = File(cacheDir, "transparent_${System.currentTimeMillis()}.png")
                    FileOutputStream(savedFile).use { out ->
                        result.transparentBitmap.compress(Bitmap.CompressFormat.PNG, 100, out)
                    }

                    val updatedProject = _uiState.value.project.copy(
                        backgroundRemovedImagePath = savedFile.absolutePath,
                        backgroundMode = BackgroundMode.TRANSPARENT
                    ).bumpRevision()

                    _uiState.value = _uiState.value.copy(
                        project = updatedProject,
                        isRemovingBackground = false,
                        infoMessage = "Background removed successfully via ${result.sourceName}"
                    )
                    renderLivePreview(updatedProject, result.transparentBitmap)
                }
                is BackgroundRemovalResult.Error -> {
                    _uiState.value = _uiState.value.copy(
                        isRemovingBackground = false,
                        errorMessage = result.message
                    )
                }
            }
        }
    }

    fun selectProvider(index: Int) {
        _uiState.value = _uiState.value.copy(activeProviderIndex = index)
    }

    fun toggleBeforeComparison() {
        _uiState.value = _uiState.value.copy(showBeforeComparison = !_uiState.value.showBeforeComparison)
    }

    fun undo() {
        if (undoStack.isNotEmpty()) {
            val previous = undoStack.removeAt(undoStack.lastIndex)
            redoStack.add(_uiState.value.project)
            applyProjectState(previous)
        }
    }

    fun redo() {
        if (redoStack.isNotEmpty()) {
            val next = redoStack.removeAt(redoStack.lastIndex)
            undoStack.add(_uiState.value.project)
            applyProjectState(next)
        }
    }

    fun resetEdits() {
        pushUndo()
        val current = _uiState.value.project
        val reset = current.copy(
            rotationDegrees = 0f,
            cropRectangle = null,
            horizontalFlip = false,
            verticalFlip = false,
            brightness = 0f,
            contrast = 0f,
            saturation = 0f,
            sharpness = 0f
        ).bumpRevision()
        updateProject(reset)
    }

    fun exportPdf(outputFile: File): Result<File> {
        val project = _uiState.value.project
        val source = _uiState.value.previewBitmap ?: _uiState.value.originalBitmap
        return PdfExportManager.generatePdf(
            context = getApplication(),
            project = project,
            outputFile = outputFile,
            dpi = 300,
            sourceBitmap = source
        )
    }

    private fun pushUndo() {
        undoStack.add(_uiState.value.project)
        if (undoStack.size > 20) undoStack.removeAt(0)
        redoStack.clear()
    }

    private fun updateProject(newProject: ImageProject) {
        _uiState.value = _uiState.value.copy(
            project = newProject,
            currentRevision = newProject.imageRevision
        )
        val source = _uiState.value.originalBitmap
        renderLivePreview(newProject, source)
    }

    private fun applyProjectState(project: ImageProject) {
        _uiState.value = _uiState.value.copy(
            project = project,
            currentRevision = project.imageRevision
        )
        renderLivePreview(project, _uiState.value.originalBitmap)
    }

    /**
     * Central Live Preview update:
     * Dispatches rendering off main thread and cancels stale jobs.
     */
    private fun renderLivePreview(project: ImageProject, source: Bitmap?) {
        previewRenderJob?.cancel()
        val revision = project.imageRevision

        previewRenderJob = viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isRenderingPreview = true)

            val rendered = FinalImageRenderer.renderFinalBitmap(
                project = project,
                sourceBitmap = source
            )

            val layout = PrintLayoutEngine.calculateLayout(project)

            // Prevent stale asynchronous rendering from overwriting newer user edits
            if (_uiState.value.project.imageRevision == revision) {
                _uiState.value = _uiState.value.copy(
                    previewBitmap = rendered,
                    printLayout = layout,
                    isRenderingPreview = false
                )
            }
        }
    }
}
