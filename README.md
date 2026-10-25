# Cutout Studio (Android & Web Studio)
**Package:** `com.darklord.bgrm`  
*Professional Android Photo Editor, AI Background Remover, Passport Photo Maker & Print Studio*

---

## 1. Overview
Cutout Studio is a production-grade native Android application (built with Kotlin and Jetpack Compose) accompanied by an interactive browser studio. It is architected for:
1. **Zero-Loss Alpha Rotation:** Rotates transparent PNGs (90°, 180°, 270°, and fine angles) without losing alpha channels or creating black/white borders.
2. **Single Source of Truth Rendering:** Editor previews, PNG/JPEG exports, print-sheet layouts, and PDF generation share one unified pipeline (`FinalImageRenderer.renderFinalBitmap`), guaranteeing that rotated images accurately appear in the generated PDF.
3. **100% Offline Core Editing:** Rotation, cropping, color adjustment, background compositing, passport sizing, print layouts, and PDF rendering function in airplane mode without any external backend requirement.
4. **AI Background Removal:** Supports BGNinja API with result caching, retry logic, timeout safeguards, and on-device offline segmentation fallbacks.
5. **Biometric Photo Analyzer:** Integrated with `gemini-4-argon` for biometric passport compliance grading, lighting balance, and face-framing analysis.
6. **AI Image Enhancer:** Text-guided prompt editing and studio lighting powered by `gemini-nano-banana-2.1`.

---

## 2. Critical Bug Fixes Implemented

### Bug Fix 1: Transparency Preservation during Rotation
- **Root Cause Fixed:** Converted all transformation bitmaps strictly to `Bitmap.Config.ARGB_8888`.
- **Bounding Box Calculation:** Computes expanded bounds using `Matrix.mapRect` so arbitrary rotations and 90°/270° swaps never crop subject pixels.
- **Transparent Fill:** Uses `Canvas.eraseColor(Color.TRANSPARENT)` and `Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG` to preserve semi-transparent hair and edge boundaries without halos.

### Bug Fix 2: Rotated Image in Generated PDF
- **Root Cause Fixed:** The PDF generation engine (`PdfExportManager`) calls `renderFinalBitmap(projectState)` directly instead of loading raw unedited source files.
- **Accurate Placement:** Converts physical millimeters to 72 DPI PDF points (`mm * 72 / 25.4`) and renders with crop marks and dashed cut guides.

### Bug Fix 3: Live Preview Responsiveness
- **Root Cause Fixed:** `CutoutStudioViewModel` uses `StateFlow` and cancels obsolete asynchronous rendering jobs using atomic `imageRevision` checks, preventing stale async previews from overwriting newer edits.

---

## 3. Project Structure

```
├── android/
│   ├── app/
│   │   ├── build.gradle.kts
│   │   ├── src/main/
│   │   │   ├── AndroidManifest.xml
│   │   │   ├── java/com/darklord/bgrm/
│   │   │   │   ├── CutoutStudioApp.kt
│   │   │   │   ├── MainActivity.kt
│   │   │   │   ├── model/ (ImageProject, Presets, PrintLayout)
│   │   │   │   ├── engine/ (ImageTransformEngine, FinalImageRenderer, PrintLayoutEngine, ImageAdjustmentEngine)
│   │   │   │   ├── provider/ (BackgroundRemovalProvider, BgNinjaProvider, OfflineForegroundProvider)
│   │   │   │   ├── pdf/ (PdfExportManager)
│   │   │   │   ├── storage/ (ProjectStorageManager)
│   │   │   │   └── viewmodel/ (CutoutStudioViewModel)
│   │   │   └── res/ (values, xml file_paths)
│   │   └── src/test/ (CutoutStudioTests)
│   ├── gradle/libs.versions.toml
│   ├── build.gradle.kts
│   ├── settings.gradle.kts
│   └── gradlew
├── .github/workflows/android.yml
├── server.ts
├── src/ (Interactive React Web Studio, Canvas Engine & Android Project Hub)
└── README.md
```

---

## 4. Building the Android APK

### Option A: Automatic via GitHub Actions
1. Push this repository to GitHub (`main` or `master` branch).
2. GitHub Actions runs `.github/workflows/android.yml`:
   - Checks out the code
   - Sets up Temurin JDK 17
   - Executes `./gradlew testDebugUnitTest`
   - Executes `./gradlew assembleDebug`
   - Uploads `CutoutStudio-debug-apk` as a workflow artifact.
3. In your GitHub repository, click **Actions**, select the latest run, and download the ready-to-install debug APK.

### Option B: Local Command Line
```bash
cd android
chmod +x gradlew
./gradlew testDebugUnitTest
./gradlew assembleDebug
```
The compiled APK will be located at:
`android/app/build/outputs/apk/debug/app-debug.apk`

---

## 5. Background Removal Provider Setup
- **Offline Keyer (Built-in):** Operates 100% on-device in airplane mode with zero network requests or keys required.
- **BGNinja API (Verified Official Integration):**
  - Official documentation: `https://bgninja.com/api.html`
  - Endpoint: `https://bgninja.com/api/remove`
  - Method: `POST` (`multipart/form-data`)
  - Image field name: `file` (supports PNG, JPG, WEBP, HEIC up to 99MB / 30MP)
  - Authentication: **None required** — this is a documented free public endpoint and requires **no API key**.
  - Limits: 10 images/day per IP address on the free tier. Handled gracefully with user-friendly rate limit notices (HTTP 429).
  - Background removal is completely decoupled from any other services; Gemini API keys are never requested or required for background removal.

