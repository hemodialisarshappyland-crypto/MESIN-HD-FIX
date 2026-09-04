package com.example.data.repository

import com.example.data.local.AppDatabase
import com.example.data.model.AppSettings
import com.example.data.model.Machine
import com.example.data.model.MachineStatus
import com.example.data.model.Nurse
import com.example.data.model.ShiftAssignment
import com.example.data.model.ShiftType
import com.example.domain.scheduler.FairSchedulerEngine
import com.example.domain.scheduler.FairnessReport
import com.example.domain.sheets.GoogleSheetsService
import com.example.domain.sheets.SyncResult
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.withContext

class HemoRepository(private val database: AppDatabase) {

    private val nurseDao = database.nurseDao()
    private val machineDao = database.machineDao()
    private val shiftDao = database.shiftAssignmentDao()
    private val settingsDao = database.settingsDao()

    val allNursesFlow: Flow<List<Nurse>> = nurseDao.getAllNursesFlow()
    val allMachinesFlow: Flow<List<Machine>> = machineDao.getAllMachinesFlow()
    val settingsFlow: Flow<AppSettings?> = settingsDao.getSettingsFlow()

    fun getAssignmentsForDateFlow(date: String): Flow<List<ShiftAssignment>> {
        return shiftDao.getAssignmentsForDateFlow(date)
    }

    fun getAssignmentsForMonthFlow(monthPrefix: String): Flow<List<ShiftAssignment>> {
        return shiftDao.getAssignmentsForMonthFlow(monthPrefix)
    }

    suspend fun getAllNurses(): List<Nurse> = withContext(Dispatchers.IO) {
        nurseDao.getAllNurses()
    }

    suspend fun getAllMachines(): List<Machine> = withContext(Dispatchers.IO) {
        machineDao.getAllMachines()
    }

    suspend fun getSettings(): AppSettings = withContext(Dispatchers.IO) {
        settingsDao.getSettings() ?: AppSettings()
    }

    suspend fun updateSettings(settings: AppSettings) = withContext(Dispatchers.IO) {
        settingsDao.insertSettings(settings)
    }

    suspend fun updateNurse(nurse: Nurse) = withContext(Dispatchers.IO) {
        nurseDao.updateNurse(nurse)
    }

    suspend fun insertNurse(nurse: Nurse): Long = withContext(Dispatchers.IO) {
        nurseDao.insertNurse(nurse)
    }

    suspend fun deleteNurse(nurse: Nurse) = withContext(Dispatchers.IO) {
        shiftDao.deleteAssignmentsForNurse(nurse.id)
        nurseDao.deleteNurse(nurse)
    }

    suspend fun clearAllNurses() = withContext(Dispatchers.IO) {
        shiftDao.deleteAllAssignments()
        nurseDao.deleteAllNurses()
    }

    suspend fun loadSampleNurses() = withContext(Dispatchers.IO) {
        AppDatabase.populateSampleNurses(database)
    }

    suspend fun resetDefaultNurses() = withContext(Dispatchers.IO) {
        clearAllNurses()
    }

    suspend fun insertMachine(machine: Machine): Long = withContext(Dispatchers.IO) {
        machineDao.insertMachine(machine)
    }

    suspend fun updateMachine(machine: Machine) = withContext(Dispatchers.IO) {
        machineDao.updateMachine(machine)
    }

    suspend fun deleteMachine(machine: Machine) = withContext(Dispatchers.IO) {
        machineDao.deleteMachine(machine)
    }

    suspend fun updateAssignment(assignment: ShiftAssignment) = withContext(Dispatchers.IO) {
        shiftDao.updateAssignment(assignment)
    }

    suspend fun markWhatsAppSent(id: Long, sent: Boolean = true) = withContext(Dispatchers.IO) {
        shiftDao.markWhatsAppSent(id, sent)
    }

    /**
     * Re-allocates 25 Hemodialysis machines fairly among on-duty nurses for a specific date,
     * or generates full schedule if none exists yet.
     */
    suspend fun generateDailyMachineAllocation(date: String): Boolean = withContext(Dispatchers.IO) {
        val nurses = nurseDao.getAllNurses()
        val machines = machineDao.getAllMachines()
        val activeMachines = machines.filter { it.status == com.example.data.model.MachineStatus.AKTIF }
        val dailyAssignments = shiftDao.getAssignmentsForDate(date)

        if (dailyAssignments.isEmpty()) {
            val parsedDate = java.time.LocalDate.parse(date)
            generateMonthlySchedule(parsedDate.year, parsedDate.monthValue, forceRegenerate = true)
            return@withContext true
        }

        val dayIndex = try {
            java.time.LocalDate.parse(date).dayOfMonth
        } catch (e: Exception) {
            1
        }

        // Pagi shift
        val pagiAssignments = dailyAssignments.filter { it.shiftType == ShiftType.PAGI }
        val pagiNurses = pagiAssignments.mapNotNull { assign -> nurses.find { it.id == assign.nurseId } }
        val pagiAllocations = FairSchedulerEngine.allocateMachinesFairly(
            pagiNurses,
            activeMachines,
            dayIndex,
            ShiftType.PAGI
        )

        // Siang shift
        val siangAssignments = dailyAssignments.filter { it.shiftType == ShiftType.SIANG }
        val siangNurses = siangAssignments.mapNotNull { assign -> nurses.find { it.id == assign.nurseId } }
        val siangAllocations = FairSchedulerEngine.allocateMachinesFairly(
            siangNurses,
            activeMachines,
            dayIndex,
            ShiftType.SIANG
        )

        pagiAssignments.forEach { assignment ->
            val machineIds = pagiAllocations[assignment.nurseId] ?: emptyList()
            shiftDao.updateAssignment(assignment.copy(assignedMachineIds = machineIds))
        }

        siangAssignments.forEach { assignment ->
            val machineIds = siangAllocations[assignment.nurseId] ?: emptyList()
            shiftDao.updateAssignment(assignment.copy(assignedMachineIds = machineIds))
        }

        true
    }

    /**
     * Runs fair scheduling engine and persists results to Room database.
     */
    suspend fun generateMonthlySchedule(
        year: Int,
        month: Int,
        forceRegenerate: Boolean = true
    ): List<ShiftAssignment> = withContext(Dispatchers.IO) {
        val nurses = nurseDao.getAllNurses()
        val machines = machineDao.getAllMachines()
        val monthPrefix = String.format("%04d-%02d", year, month)

        if (forceRegenerate) {
            shiftDao.deleteAssignmentsForMonth(monthPrefix)
        }

        val generated = FairSchedulerEngine.generateMonthlySchedule(
            year = year,
            month = month,
            nurses = nurses,
            machines = machines
        )

        if (generated.isNotEmpty()) {
            shiftDao.insertAllAssignments(generated)
        }

        generated
    }

    suspend fun getFairnessReport(year: Int, month: Int): FairnessReport = withContext(Dispatchers.IO) {
        val monthPrefix = String.format("%04d-%02d", year, month)
        val nurses = nurseDao.getAllNurses()
        val assignments = shiftDao.getAssignmentsForMonth(monthPrefix)
        FairSchedulerEngine.calculateFairnessReport(year, month, nurses, assignments)
    }

    suspend fun syncToGoogleSheets(year: Int, month: Int): SyncResult = withContext(Dispatchers.IO) {
        val settings = getSettings()
        val monthPrefix = String.format("%04d-%02d", year, month)
        val nurses = nurseDao.getAllNurses()
        val machines = machineDao.getAllMachines()
        val assignments = shiftDao.getAssignmentsForMonth(monthPrefix)

        val monthNameIndo = when (month) {
            1 -> "Januari"; 2 -> "Februari"; 3 -> "Maret"; 4 -> "April"
            5 -> "Mei"; 6 -> "Juni"; 7 -> "Juli"; 8 -> "Agustus"
            9 -> "September"; 10 -> "Oktober"; 11 -> "November"; 12 -> "Desember"
            else -> "Bulan $month"
        }
        val monthStr = "$monthNameIndo $year"

        val result = GoogleSheetsService.syncToGoogleSheets(
            webhookUrl = settings.googleSheetWebhookUrl,
            monthString = monthStr,
            nurses = nurses,
            machines = machines,
            assignments = assignments
        )

        // Update sync timestamp in settings
        val updatedSettings = settings.copy(
            lastSyncTimestamp = System.currentTimeMillis(),
            lastSyncStatus = if (result.isSuccess) "Berhasil: ${result.rowsSynced} baris disinkronkan" else "Gagal: ${result.message}"
        )
        settingsDao.insertSettings(updatedSettings)

        result
    }
}
