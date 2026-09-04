package com.example.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "app_settings")
data class AppSettings(
    @PrimaryKey
    val id: Int = 1,
    val hospitalName: String = "RS Happy Land Medical Centre",
    val roomName: String = "Ruang Dialisis Gedung Timur Lt.3",
    val headNurseName: String = "Kepala Ruang HD",
    val headNursePhone: String = "",
    val googleSheetWebhookUrl: String = "",
    val googleSpreadsheetIdOrUrl: String = "",
    val autoSyncGoogleSheets: Boolean = false,
    val minNursesPerShift: Int = 8,
    val maxConsecutiveWorkDays: Int = 5,
    val lastSyncTimestamp: Long = 0L,
    val lastSyncStatus: String = "Belum pernah disinkronkan"
)
