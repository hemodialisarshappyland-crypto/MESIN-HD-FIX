package com.example.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey

enum class MachineStatus(val label: String) {
    AKTIF("Aktif Normal"),
    TIDAK_DIGUNAKAN("Tidak Digunakan"),
    MAINTENANCE("Dalam Perawatan"),
    RUSAK("Rusak / Off")
}

enum class MachineCategory(val label: String, val isSpecial: Boolean) {
    REGULER("Reguler", false),
    HEPATITIS_B("Hepatitis B", true),
    HEPATITIS_C("Hepatitis C", true),
    ISOLASI("Isolasi Khusus", true)
}

@Entity(tableName = "machines")
data class Machine(
    @PrimaryKey
    val id: Int, // 1 to 25
    val code: String, // e.g. "M-01", "M-02" ... "M-25"
    val name: String, // e.g. "Mesin HD 01"
    val bay: String, // "Bay A (Mesin 1-8)", "Bay B (Mesin 9-16)", "Bay C (Mesin 17-22)", "Ruang Isolasi (Mesin 23-25)"
    val category: MachineCategory = MachineCategory.REGULER,
    val status: MachineStatus = MachineStatus.AKTIF,
    val brandModel: String = "Fresenius 4008S / Gambro AK98",
    val notes: String = ""
)
