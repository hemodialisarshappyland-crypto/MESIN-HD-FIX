package com.example.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey

enum class NurseRole(val title: String) {
    KARU("Kepala Ruangan"),
    KATIM("PJ Sif / Katim"),
    PELAKSANA("Perawat Pelaksana")
}

@Entity(tableName = "nurses")
data class Nurse(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val name: String,
    val nip: String = "",
    val phone: String, // format e.g. "081234567890" or "6281234567890"
    val role: NurseRole = NurseRole.PELAKSANA,
    val isActive: Boolean = true,
    val defaultOffDay: Int? = null, // 1 for Mon, 7 for Sun if fixed, null for dynamic rotation
    val skillLevel: String = "Senior" // Junior, Medium, Senior
)
