package com.example.data.model

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

enum class ShiftType(
    val code: String,
    val label: String,
    val timeRange: String,
    val isWorkShift: Boolean
) {
    PAGI("P", "Sif Pagi", "07.00 - 14.00 WIB", true),
    SIANG("S", "Sif Siang", "12.00 - 19.00 WIB", true),
    LIBUR("L", "Libur / Off", "-", false),
    CUTI("C", "Cuti Tahunan", "-", false),
    SAKIT("Skt", "Sakit / Izin", "-", false)
}

@Entity(
    tableName = "shift_assignments",
    indices = [
        Index(value = ["date", "nurseId"], unique = true),
        Index(value = ["date", "shiftType"])
    ]
)
data class ShiftAssignment(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val date: String, // Format "YYYY-MM-DD" e.g. "2026-09-01"
    val shiftType: ShiftType,
    val nurseId: Long,
    val nurseName: String,
    val nursePhone: String = "",
    val assignedMachineIds: List<Int> = emptyList(),
    val isLeader: Boolean = false,
    val isWhatsAppSent: Boolean = false,
    val notes: String = ""
)
