package com.darklord.bgrm.storage

import android.content.Context
import android.graphics.Bitmap
import com.darklord.bgrm.model.ImageProject
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream
import java.util.UUID

/**
 * Handles offline project persistence in app-private directories.
 * Stores binary images in filesDir/projects/{projectId}/ and metadata in JSON.
 */
class ProjectStorageManager(private val context: Context) {

    private val gson = Gson()
    private val projectsDir: File
        get() = File(context.filesDir, "projects").apply { mkdirs() }
    private val metadataFile: File
        get() = File(projectsDir, "projects_index.json")

    suspend fun saveProject(project: ImageProject, currentBitmap: Bitmap? = null): Boolean = withContext(Dispatchers.IO) {
        try {
            val projectFolder = File(projectsDir, project.projectId).apply { mkdirs() }

            // Save active bitmap as local project cache if available
            if (currentBitmap != null) {
                val previewFile = File(projectFolder, "thumbnail.png")
                FileOutputStream(previewFile).use { out ->
                    currentBitmap.compress(Bitmap.CompressFormat.PNG, 90, out)
                }
            }

            // Save individual project json
            val projectJsonFile = File(projectFolder, "project.json")
            projectJsonFile.writeText(gson.toJson(project))

            // Update master index
            val all = getAllProjectsInternal().toMutableList()
            val existingIndex = all.indexOfFirst { it.projectId == project.projectId }
            if (existingIndex >= 0) {
                all[existingIndex] = project.copy(savedAt = System.currentTimeMillis())
            } else {
                all.add(0, project.copy(savedAt = System.currentTimeMillis()))
            }
            metadataFile.writeText(gson.toJson(all))
            true
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    suspend fun listProjects(): List<ImageProject> = withContext(Dispatchers.IO) {
        getAllProjectsInternal()
    }

    suspend fun getProject(projectId: String): ImageProject? = withContext(Dispatchers.IO) {
        val file = File(File(projectsDir, projectId), "project.json")
        if (file.exists()) {
            try {
                gson.fromJson(file.readText(), ImageProject::class.java)
            } catch (e: Exception) {
                null
            }
        } else {
            null
        }
    }

    suspend fun deleteProject(projectId: String): Boolean = withContext(Dispatchers.IO) {
        try {
            val projectFolder = File(projectsDir, projectId)
            projectFolder.deleteRecursively()

            val all = getAllProjectsInternal().filterNot { it.projectId == projectId }
            metadataFile.writeText(gson.toJson(all))
            true
        } catch (e: Exception) {
            false
        }
    }

    suspend fun duplicateProject(projectId: String): ImageProject? = withContext(Dispatchers.IO) {
        val existing = getProject(projectId) ?: return@withContext null
        val newId = UUID.randomUUID().toString()
        val duplicated = existing.copy(
            projectId = newId,
            projectName = "${existing.projectName} (Copy)",
            savedAt = System.currentTimeMillis()
        )
        saveProject(duplicated)
        duplicated
    }

    private fun getAllProjectsInternal(): List<ImageProject> {
        if (!metadataFile.exists()) return emptyList()
        return try {
            val type = object : TypeToken<List<ImageProject>>() {}.type
            gson.fromJson(metadataFile.readText(), type) ?: emptyList()
        } catch (e: Exception) {
            emptyList()
        }
    }
}
