package com.darklord.bgrm

import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import com.darklord.bgrm.model.PageOrientation
import com.darklord.bgrm.model.Presets
import com.darklord.bgrm.viewmodel.CutoutStudioViewModel

class MainActivity : ComponentActivity() {

    private val viewModel: CutoutStudioViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setContent {
            CutoutStudioTheme {
                MainAppScaffold(
                    viewModel = viewModel,
                    onPickImage = { uri ->
                        contentResolver.openInputStream(uri)?.use { stream ->
                            val bitmap = BitmapFactory.decodeStream(stream)
                            if (bitmap != null) {
                                viewModel.setSourceBitmap(bitmap, uri.toString())
                            }
                        }
                    }
                )
            }
        }
    }
}

enum class StudioTab(val label: String) {
    HOME("Home"),
    EDITOR("Editor"),
    PASSPORT("Passport"),
    PRINT("Print Sheet"),
    SETTINGS("Settings")
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainAppScaffold(
    viewModel: CutoutStudioViewModel,
    onPickImage: (Uri) -> Unit
) {
    var selectedTab by remember { mutableStateOf(StudioTab.HOME) }
    val uiState by viewModel.uiState.collectAsState()

    val photoPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        uri?.let {
            onPickImage(it)
            selectedTab = StudioTab.EDITOR
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.PhotoLibrary,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.padding(end = 8.dp)
                        )
                        Text(
                            text = "Cutout Studio",
                            style = MaterialTheme.typography.titleLarge
                        )
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.undo() }) {
                        Icon(Icons.Default.Undo, contentDescription = "Undo")
                    }
                    IconButton(onClick = { viewModel.redo() }) {
                        Icon(Icons.Default.Redo, contentDescription = "Redo")
                    }
                    IconButton(onClick = { viewModel.resetEdits() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Reset")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        },
        bottomBar = {
            NavigationBar {
                StudioTab.values().forEach { tab ->
                    val icon = when (tab) {
                        StudioTab.HOME -> Icons.Default.Home
                        StudioTab.EDITOR -> Icons.Default.Edit
                        StudioTab.PASSPORT -> Icons.Default.Badge
                        StudioTab.PRINT -> Icons.Default.Print
                        StudioTab.SETTINGS -> Icons.Default.Settings
                    }
                    NavigationBarItem(
                        selected = selectedTab == tab,
                        onClick = { selectedTab = tab },
                        icon = { Icon(icon, contentDescription = tab.label) },
                        label = { Text(tab.label) }
                    )
                }
            }
        }
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            when (selectedTab) {
                StudioTab.HOME -> HomeScreen(
                    onImportClick = { photoPickerLauncher.launch("image/*") },
                    onOpenEditor = { selectedTab = StudioTab.EDITOR },
                    onOpenPassport = { selectedTab = StudioTab.PASSPORT },
                    onOpenPrint = { selectedTab = StudioTab.PRINT },
                    hasImage = uiState.originalBitmap != null
                )
                StudioTab.EDITOR -> EditorScreen(
                    viewModel = viewModel,
                    onImportNew = { photoPickerLauncher.launch("image/*") }
                )
                StudioTab.PASSPORT -> PassportScreen(viewModel = viewModel)
                StudioTab.PRINT -> PrintSheetScreen(viewModel = viewModel)
                StudioTab.SETTINGS -> SettingsScreen(viewModel = viewModel)
            }
        }
    }
}

@Composable
fun HomeScreen(
    onImportClick: () -> Unit,
    onOpenEditor: () -> Unit,
    onOpenPassport: () -> Unit,
    onOpenPrint: () -> Unit,
    hasImage: Boolean
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(20.dp)
            .verticalScroll(rememberScrollState()),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.primaryContainer
            )
        ) {
            Column(modifier = Modifier.padding(20.dp)) {
                Text(
                    text = "Professional AI Photo Studio",
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.onPrimaryContainer
                )
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = "High-precision background removal, biometric passport formatting, and print-ready multi-copy PDF generation. 100% offline capable.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.8f)
                )
            }
        }

        Button(
            onClick = onImportClick,
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp)
        ) {
            Icon(Icons.Default.AddPhotoAlternate, contentDescription = null)
            Spacer(modifier = Modifier.width(8.dp))
            Text("Select Photo to Edit")
        }

        if (hasImage) {
            OutlinedButton(
                onClick = onOpenEditor,
                modifier = Modifier.fillMaxWidth().height(52.dp)
            ) {
                Icon(Icons.Default.Edit, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Continue Editing Active Photo")
            }
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Card(
                modifier = Modifier
                    .weight(1f)
                    .clickable { onOpenPassport() },
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Icon(Icons.Default.Badge, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                    Spacer(modifier = Modifier.height(8.dp))
                    Text("Passport Maker", style = MaterialTheme.typography.titleSmall)
                    Text("35×45mm, 2×2\", biometric guides", style = MaterialTheme.typography.bodySmall)
                }
            }
            Card(
                modifier = Modifier
                    .weight(1f)
                    .clickable { onOpenPrint() },
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Icon(Icons.Default.Print, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                    Spacer(modifier = Modifier.height(8.dp))
                    Text("Print Sheet", style = MaterialTheme.typography.titleSmall)
                    Text("A4, Letter, 4×6\", cut guides & PDF", style = MaterialTheme.typography.bodySmall)
                }
            }
        }
    }
}

@Composable
fun EditorScreen(
    viewModel: CutoutStudioViewModel,
    onImportNew: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()

    if (uiState.originalBitmap == null) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(Icons.Default.Image, contentDescription = null, modifier = Modifier.size(64.dp), tint = Color.Gray)
                Spacer(modifier = Modifier.height(12.dp))
                Text("No photo loaded yet", style = MaterialTheme.typography.bodyLarge)
                Spacer(modifier = Modifier.height(12.dp))
                Button(onClick = onImportNew) {
                    Text("Import Photo")
                }
            }
        }
        return
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Live Preview Canvas Container
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .height(340.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerHighest)
        ) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                val bitmapToShow = if (uiState.showBeforeComparison) {
                    uiState.originalBitmap
                } else {
                    uiState.previewBitmap ?: uiState.originalBitmap
                }

                bitmapToShow?.let { bmp ->
                    Image(
                        bitmap = bmp.asImageBitmap(),
                        contentDescription = "Live Preview",
                        contentScale = ContentScale.Fit,
                        modifier = Modifier.fillMaxSize().padding(8.dp)
                    )
                }

                if (uiState.isRenderingPreview || uiState.isRemovingBackground) {
                    CircularProgressIndicator()
                }
            }
        }

        // Before / After comparison toggle
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("Preview State: ${if (uiState.showBeforeComparison) "Original (Before)" else "Edited (After)"}")
            Button(onClick = { viewModel.toggleBeforeComparison() }) {
                Text(if (uiState.showBeforeComparison) "Show After" else "Show Before")
            }
        }

        // AI Background Removal Button
        Button(
            onClick = { viewModel.removeBackground() },
            modifier = Modifier.fillMaxWidth().height(48.dp),
            enabled = !uiState.isRemovingBackground
        ) {
            Icon(Icons.Default.AutoFixHigh, contentDescription = null)
            Spacer(modifier = Modifier.width(8.dp))
            Text(if (uiState.isRemovingBackground) "Removing Background..." else "Remove Background (AI)")
        }

        // Rotation Controls (Crucial: 90° CW, 90° CCW, 180°)
        Text("Rotation (Preserves 100% Alpha Transparency)", style = MaterialTheme.typography.titleSmall)
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            OutlinedButton(onClick = { viewModel.rotateBy(-90f) }) {
                Icon(Icons.Default.RotateLeft, contentDescription = null)
                Spacer(modifier = Modifier.width(4.dp))
                Text("-90°")
            }
            OutlinedButton(onClick = { viewModel.rotateBy(90f) }) {
                Icon(Icons.Default.RotateRight, contentDescription = null)
                Spacer(modifier = Modifier.width(4.dp))
                Text("+90°")
            }
            OutlinedButton(onClick = { viewModel.rotateBy(180f) }) {
                Text("180°")
            }
        }

        // Fine Rotation Slider
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("Fine: ${uiState.project.rotationDegrees.toInt()}°", modifier = Modifier.width(80.dp))
            Slider(
                value = uiState.project.rotationDegrees,
                onValueChange = { viewModel.setExactRotation(it) },
                valueRange = 0f..360f,
                modifier = Modifier.weight(1f)
            )
        }

        // Background Color Swatches
        Text("Background Color", style = MaterialTheme.typography.titleSmall)
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            items(Presets.COLOR_SWATCHES) { swatch ->
                val isSelected = uiState.project.backgroundColor == swatch.colorInt
                Box(
                    modifier = Modifier
                        .size(44.dp)
                        .clip(CircleShape)
                        .background(
                            if (swatch.colorInt == 0) Color.LightGray.copy(alpha = 0.5f)
                            else Color(swatch.colorInt)
                        )
                        .clickable { viewModel.setBackgroundColor(swatch.colorInt) }
                        .padding(4.dp),
                    contentAlignment = Alignment.Center
                ) {
                    if (isSelected) {
                        Icon(
                            Icons.Default.Check,
                            contentDescription = null,
                            tint = if (swatch.name == "White" || swatch.name == "Light Blue") Color.Black else Color.White
                        )
                    }
                }
            }
        }

        // Brightness & Contrast Adjustments
        Text("Image Adjustments", style = MaterialTheme.typography.titleSmall)
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("Brightness (${uiState.project.brightness.toInt()})", style = MaterialTheme.typography.bodySmall)
            Slider(
                value = uiState.project.brightness,
                onValueChange = {
                    viewModel.setAdjustments(it, uiState.project.contrast, uiState.project.saturation)
                },
                valueRange = -100f..100f
            )

            Text("Contrast (${uiState.project.contrast.toInt()})", style = MaterialTheme.typography.bodySmall)
            Slider(
                value = uiState.project.contrast,
                onValueChange = {
                    viewModel.setAdjustments(uiState.project.brightness, it, uiState.project.saturation)
                },
                valueRange = -100f..100f
            )

            Text("Saturation (${uiState.project.saturation.toInt()})", style = MaterialTheme.typography.bodySmall)
            Slider(
                value = uiState.project.saturation,
                onValueChange = {
                    viewModel.setAdjustments(uiState.project.brightness, uiState.project.contrast, it)
                },
                valueRange = -100f..100f
            )
        }
    }
}

@Composable
fun PassportScreen(viewModel: CutoutStudioViewModel) {
    val uiState by viewModel.uiState.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text("Biometric Passport & ID Presets", style = MaterialTheme.typography.titleMedium)

        Presets.PHOTO_PRESETS.forEach { preset ->
            val isSelected = uiState.project.selectedPhotoPreset == preset.id
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { viewModel.setPhotoPreset(preset.id, preset.widthMm, preset.heightMm) },
                colors = CardDefaults.cardColors(
                    containerColor = if (isSelected) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant
                )
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    RadioButton(
                        selected = isSelected,
                        onClick = { viewModel.setPhotoPreset(preset.id, preset.widthMm, preset.heightMm) }
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Column {
                        Text(preset.name, style = MaterialTheme.typography.titleSmall)
                        Text(preset.description, style = MaterialTheme.typography.bodySmall)
                    }
                }
            }
        }
    }
}

@Composable
fun PrintSheetScreen(viewModel: CutoutStudioViewModel) {
    val uiState by viewModel.uiState.collectAsState()
    val layout = uiState.printLayout

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text("Print Layout & Sheet Builder", style = MaterialTheme.typography.titleMedium)

        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerHighest)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("Page Dimensions: ${layout.pageWidthMm.toInt()} × ${layout.pageHeightMm.toInt()} mm")
                Text("Photo Dimensions: ${layout.photoWidthMm.toInt()} × ${layout.photoHeightMm.toInt()} mm")
                Text("Grid: ${layout.columns} cols × ${layout.rows} rows (${layout.copiesPerPage} per page)")
                Text("Total Copies: ${layout.totalCopiesRequested} (${layout.totalPages} page(s))")
                if (layout.warningMessage != null) {
                    Text(layout.warningMessage, color = MaterialTheme.colorScheme.error)
                }
            }
        }

        // Copies slider
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("Copies: ${uiState.project.copies}", modifier = Modifier.width(100.dp))
            Slider(
                value = uiState.project.copies.toFloat(),
                onValueChange = {
                    viewModel.setPrintSettings(
                        paperPresetId = uiState.project.selectedPaperPreset,
                        copies = it.toInt(),
                        orientation = uiState.project.pageOrientation,
                        marginMm = uiState.project.marginMm,
                        hGapMm = uiState.project.horizontalGapMm,
                        vGapMm = uiState.project.verticalGapMm,
                        cutGuides = uiState.project.cutGuidesEnabled,
                        cropMarks = uiState.project.cropMarksEnabled,
                        numbers = uiState.project.photoNumbersEnabled
                    )
                },
                valueRange = 1f..32f,
                steps = 31,
                modifier = Modifier.weight(1f)
            )
        }

        // Paper Presets selector
        Text("Paper Size", style = MaterialTheme.typography.titleSmall)
        Presets.PAPER_PRESETS.take(4).forEach { paper ->
            val isSelected = uiState.project.selectedPaperPreset == paper.id
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable {
                        viewModel.setPrintSettings(
                            paperPresetId = paper.id,
                            copies = uiState.project.copies,
                            orientation = uiState.project.pageOrientation,
                            marginMm = uiState.project.marginMm,
                            hGapMm = uiState.project.horizontalGapMm,
                            vGapMm = uiState.project.verticalGapMm,
                            cutGuides = uiState.project.cutGuidesEnabled,
                            cropMarks = uiState.project.cropMarksEnabled,
                            numbers = uiState.project.photoNumbersEnabled
                        )
                    },
                verticalAlignment = Alignment.CenterVertically
            ) {
                RadioButton(
                    selected = isSelected,
                    onClick = {
                        viewModel.setPrintSettings(
                            paperPresetId = paper.id,
                            copies = uiState.project.copies,
                            orientation = uiState.project.pageOrientation,
                            marginMm = uiState.project.marginMm,
                            hGapMm = uiState.project.horizontalGapMm,
                            vGapMm = uiState.project.verticalGapMm,
                            cutGuides = uiState.project.cutGuidesEnabled,
                            cropMarks = uiState.project.cropMarksEnabled,
                            numbers = uiState.project.photoNumbersEnabled
                        )
                    }
                )
                Text(paper.name)
            }
        }
    }
}

@Composable
fun SettingsScreen(viewModel: CutoutStudioViewModel) {
    val uiState by viewModel.uiState.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text("AI Background Removal Providers", style = MaterialTheme.typography.titleMedium)

        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.CheckCircle,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.secondary,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("BGNinja AI (Cloud)", style = MaterialTheme.typography.titleSmall)
                }
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    "Uses the documented public endpoint at https://bgninja.com/api/remove. No API key required.",
                    style = MaterialTheme.typography.bodySmall,
                    color = Color.LightGray
                )
            }
        }

        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.CheckCircle,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.secondary,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("On-Device Studio Keyer (Offline)", style = MaterialTheme.typography.titleSmall)
                }
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    "Operates 100% locally on your device in airplane mode with zero network requests.",
                    style = MaterialTheme.typography.bodySmall,
                    color = Color.LightGray
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))
        Text("Offline Capability: 100% Guaranteed", style = MaterialTheme.typography.titleSmall)
        Text(
            "All rotation, cropping, transparency preservation, color background replacement, passport sizing, print sheet layout, PNG/JPEG export, and PDF generation work entirely offline in airplane mode.",
            style = MaterialTheme.typography.bodyMedium
        )
    }
}

@Composable
fun CutoutStudioTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = darkColorScheme(
            primary = Color(0xFF6366F1),
            primaryContainer = Color(0xFF312E81),
            secondary = Color(0xFF10B981),
            background = Color(0xFF0F172A),
            surface = Color(0xFF1E293B),
            onPrimary = Color.White,
            onBackground = Color(0xFFF8FAFC),
            onSurface = Color(0xFFF8FAFC)
        ),
        content = content
    )
}
