package com.example.data.local

import androidx.room.TypeConverter
import com.example.data.model.MachineCategory
import com.example.data.model.MachineStatus
import com.example.data.model.NurseRole
import com.example.data.model.ShiftType

class Converters {
    @TypeConverter
    fun fromIntList(list: List<Int>?): String {
        return list?.joinToString(separator = ",") ?: ""
    }

    @TypeConverter
    fun toIntList(data: String?): List<Int> {
        if (data.isNullOrBlank()) return emptyList()
        return data.split(",")
            .mapNotNull { it.trim().toIntOrNull() }
    }

    @TypeConverter
    fun fromNurseRole(role: NurseRole?): String {
        return role?.name ?: NurseRole.PELAKSANA.name
    }

    @TypeConverter
    fun toNurseRole(value: String?): NurseRole {
        return try {
            if (value != null) NurseRole.valueOf(value) else NurseRole.PELAKSANA
        } catch (e: Exception) {
            NurseRole.PELAKSANA
        }
    }

    @TypeConverter
    fun fromMachineCategory(category: MachineCategory?): String {
        return category?.name ?: MachineCategory.REGULER.name
    }

    @TypeConverter
    fun toMachineCategory(value: String?): MachineCategory {
        return try {
            if (value != null) MachineCategory.valueOf(value) else MachineCategory.REGULER
        } catch (e: Exception) {
            MachineCategory.REGULER
        }
    }

    @TypeConverter
    fun fromMachineStatus(status: MachineStatus?): String {
        return status?.name ?: MachineStatus.AKTIF.name
    }

    @TypeConverter
    fun toMachineStatus(value: String?): MachineStatus {
        return try {
            if (value != null) MachineStatus.valueOf(value) else MachineStatus.AKTIF
        } catch (e: Exception) {
            MachineStatus.AKTIF
        }
    }

    @TypeConverter
    fun fromShiftType(type: ShiftType?): String {
        return type?.name ?: ShiftType.PAGI.name
    }

    @TypeConverter
    fun toShiftType(value: String?): ShiftType {
        return try {
            if (value != null) ShiftType.valueOf(value) else ShiftType.PAGI
        } catch (e: Exception) {
            ShiftType.PAGI
        }
    }
}
