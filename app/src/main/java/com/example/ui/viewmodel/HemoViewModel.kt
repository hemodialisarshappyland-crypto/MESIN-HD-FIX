package com.example.ui.viewmodel

import android.app.Application
import android.content.Context
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.data.local.AppDatabase
import com.example.data.model.AppSettings
import com.example.data.model.Machine
import com.example.data.model.MachineStatus
import com.example.data.model.Nurse
import com.example.data.model.ShiftAssignment
import com.example.data.model.ShiftType
import com.example.data.repository.HemoRepository
import com.example.domain.scheduler.FairnessReport
import com.example.domain.sheets.GoogleSheetsService
import com.example.domain.whatsapp.WhatsAppDispatcher
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.time.LocalDate

@OptIn(ExperimentalCoroutinesApi::class)
class HemoViewModel(application: Application) : AndroidViewModel(application) {

    private val database = AppDatabase.getDatabase(application)
    private val repository = HemoRepository(database)

    // Current selection states
    private val today = LocalDate.now()
    val selectedDate = MutableStateFlow(today.toString())
    val selectedYear = MutableStateFlow(today.year)
    val selectedMonth = MutableStateFlow(today.monthValue)

    val isGenerating = MutableStateFlow(false)
    val isSyncingSheets = MutableStateFlow(false)
    val snackbarMessage = MutableStateFlow<String?>(null)

    // Flows from database
    val allNurses: StateFlow<List<Nurse>> = repository.allNursesFlow
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val allMachines: StateFlow<List<Machine>> = repository.allMachinesFlow
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val settings: StateFlow<AppSettings?> = repository.settingsFlow
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)

    val dailyAssignments: StateFlow<List<ShiftAssignment>> = selectedDate
        .flatMapLatest { date ->
            repository.getAssignmentsForDateFlow(date)
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    private val monthPrefixFlow = MutableStateFlow(String.format("%04d-%02d", today.year, today.monthValue))

    val monthlyAssignments: StateFlow<List<ShiftAssignment>> = monthPrefixFlow
        .flatMapLatest { prefix ->
            repository.getAssignmentsForMonthFlow(prefix)
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    private val _fairnessReport = MutableStateFlow<FairnessReport?>(null)
    val fairnessReport: StateFlow<FairnessReport?> = _fairnessReport.asStateFlow()

    init {
        viewModelScope.launch {
            val prefs = application.getSharedPreferences("hemo_prefs", Context.MODE_PRIVATE)
            val demoCleared = prefs.getBoolean("sample_nurses_cleared_v3", false)
            if (!demoCleared) {
                repository.clearAllNurses()
                prefs.edit().putBoolean("sample_nurses_cleared_v3", true).apply()
            }

            // Auto-update hospital name and room name to RS Happy Land Medical Centre & Ruang Dialisis Gedung Timur Lt.3
            val currentSettings = repository.getSettings()
            if (currentSettings != null) {
                val needHospitalUpdate = currentSettings.hospitalName.contains("Medika", ignoreCase = true) || currentSettings.hospitalName.isBlank()
                val needRoomUpdate = currentSettings.roomName.contains("Medika", ignoreCase = true) ||
                        currentSettings.roomName.contains("Gedung Utama", ignoreCase = true) ||
                        currentSettings.roomName.contains("Gedung B", ignoreCase = true) ||
                        currentSettings.roomName.contains("Lt. 2", ignoreCase = true) ||
                        currentSettings.roomName.contains("Lt.2", ignoreCase = true) ||
                        currentSettings.roomName.isBlank()
                if (needHospitalUpdate || needRoomUpdate) {
                    repository.updateSettings(
                        currentSettings.copy(
                            hospitalName = "RS Happy Land Medical Centre",
                            roomName = "Ruang Dialisis Gedung Timur Lt.3"
                        )
                    )
                }
            }

            refreshFairnessReport()
        }
    }

    fun selectDate(date: String) {
        selectedDate.value = date
        try {
            val parsed = LocalDate.parse(date)
            if (parsed.year != selectedYear.value || parsed.monthValue != selectedMonth.value) {
                selectedYear.value = parsed.year
                selectedMonth.value = parsed.monthValue
                monthPrefixFlow.value = String.format("%04d-%02d", parsed.year, parsed.monthValue)
                refreshFairnessReport()
            }
        } catch (e: Exception) {
            // ignore
        }
    }

    fun selectMonth(year: Int, month: Int) {
        selectedYear.value = year
        selectedMonth.value = month
        monthPrefixFlow.value = String.format("%04d-%02d", year, month)
        // update selected date to 1st of month or today if current month
        val current = LocalDate.now()
        if (current.year == year && current.monthValue == month) {
            selectedDate.value = current.toString()
        } else {
            selectedDate.value = String.format("%04d-%02d-01", year, month)
        }
        refreshFairnessReport()
    }

    fun generateSchedule(force: Boolean = true) {
        viewModelScope.launch {
            if (allNurses.value.none { it.isActive }) {
                snackbarMessage.value = "Belum ada perawat aktif. Silakan tambahkan data perawat di menu Tim Perawat."
                return@launch
            }
            isGenerating.value = true
            try {
                val year = selectedYear.value
                val month = selectedMonth.value
                repository.generateMonthlySchedule(year, month, forceRegenerate = force)
                refreshFairnessReport()
                snackbarMessage.value = "Pembagian jadwal & mesin bulan $month/$year berhasil dibuat otomatis!"
            } catch (e: Exception) {
                snackbarMessage.value = "Gagal membuat pembagian jadwal: ${e.message}"
            } finally {
                isGenerating.value = false
            }
        }
    }

    fun generateMachineAllocation(date: String = selectedDate.value) {
        viewModelScope.launch {
            if (allNurses.value.none { it.isActive }) {
                snackbarMessage.value = "Belum ada perawat aktif. Silakan tambahkan data perawat di menu Tim Perawat."
                return@launch
            }
            isGenerating.value = true
            try {
                repository.generateDailyMachineAllocation(date)
                refreshFairnessReport()
                snackbarMessage.value = "Pembagian 25 mesin hemodialisa untuk $date berhasil digenerate!"
            } catch (e: Exception) {
                snackbarMessage.value = "Gagal generate pembagian mesin: ${e.message}"
            } finally {
                isGenerating.value = false
            }
        }
    }

    fun refreshFairnessReport() {
        viewModelScope.launch {
            try {
                val report = repository.getFairnessReport(selectedYear.value, selectedMonth.value)
                _fairnessReport.value = report
            } catch (e: Exception) {
                // ignore
            }
        }
    }

    fun updateAssignment(
        assignment: ShiftAssignment,
        newShiftType: ShiftType,
        newMachines: List<Int>,
        isLeader: Boolean,
        notes: String
    ) {
        viewModelScope.launch {
            val updated = assignment.copy(
                shiftType = newShiftType,
                assignedMachineIds = newMachines,
                isLeader = isLeader,
                notes = notes
            )
            repository.updateAssignment(updated)
            refreshFairnessReport()
            snackbarMessage.value = "Perubahan jadwal ${assignment.nurseName} berhasil disimpan."
        }
    }

    fun dispatchWhatsAppToNurse(context: Context, assignment: ShiftAssignment) {
        val appSetting = settings.value
        val hospital = appSetting?.hospitalName ?: "RS Happy Land Medical Centre"
        val room = appSetting?.roomName ?: "Ruang Dialisis Gedung Timur Lt.3"
        val msg = WhatsAppDispatcher.generateNurseMessage(
            assignment = assignment,
            machines = allMachines.value,
            hospitalName = hospital,
            roomName = room
        )

        WhatsAppDispatcher.sendWhatsApp(
            context = context,
            phoneNumber = assignment.nursePhone,
            message = msg,
            onSuccess = {
                viewModelScope.launch {
                    repository.markWhatsAppSent(assignment.id, true)
                }
            }
        )
    }

    fun dispatchGroupBroadcast(context: Context, shiftType: ShiftType?) {
        val appSetting = settings.value
        val hospital = appSetting?.hospitalName ?: "RS Happy Land Medical Centre"
        val msg = WhatsAppDispatcher.generateGroupBroadcastMessage(
            dateStr = selectedDate.value,
            shiftType = shiftType,
            assignments = dailyAssignments.value,
            machines = allMachines.value,
            hospitalName = hospital
        )
        WhatsAppDispatcher.shareGeneric(context, msg)
    }

    fun dispatchHeadNurseReport(
        context: Context,
        headNursePhone: String = "",
        headNurseName: String = "",
        directWhatsApp: Boolean = true
    ) {
        val appSetting = settings.value
        val hospital = appSetting?.hospitalName ?: "RS Happy Land Medical Centre"
        val room = appSetting?.roomName ?: "Ruang Dialisis Gedung Timur Lt.3"
        val targetName = if (headNurseName.isNotBlank()) headNurseName else (appSetting?.headNurseName ?: "Kepala Ruang HD")
        val targetPhone = if (headNursePhone.isNotBlank()) headNursePhone else (appSetting?.headNursePhone ?: "")

        val msg = WhatsAppDispatcher.generateHeadNurseDailyAllocationMessage(
            dateStr = selectedDate.value,
            assignments = dailyAssignments.value,
            machines = allMachines.value,
            hospitalName = hospital,
            roomName = room,
            headNurseName = targetName
        )

        if (directWhatsApp && targetPhone.isNotBlank()) {
            WhatsAppDispatcher.sendWhatsApp(
                context = context,
                phoneNumber = targetPhone,
                message = msg,
                onSuccess = {
                    snackbarMessage.value = "Laporan harian berhasil dikirimkan ke $targetName"
                }
            )
        } else {
            WhatsAppDispatcher.shareGeneric(context, msg)
        }
    }

    fun addOrUpdateMachine(machine: Machine) {
        viewModelScope.launch {
            if (machine.id == 0) {
                val currentMachines = allMachines.value
                val nextId = (currentMachines.maxOfOrNull { it.id } ?: 0) + 1
                val newMachine = machine.copy(
                    id = nextId,
                    code = if (machine.code.isBlank()) String.format("M-%02d", nextId) else machine.code,
                    name = if (machine.name.isBlank()) String.format("Mesin HD %02d", nextId) else machine.name
                )
                repository.insertMachine(newMachine)
                snackbarMessage.value = "Mesin ${newMachine.name} (${newMachine.code}) berhasil ditambahkan."
            } else {
                repository.updateMachine(machine)
                snackbarMessage.value = "Data ${machine.name} berhasil diperbarui."
            }
        }
    }

    fun deleteMachine(machine: Machine) {
        viewModelScope.launch {
            repository.deleteMachine(machine)
            snackbarMessage.value = "Mesin ${machine.name} (${machine.code}) berhasil dihapus."
        }
    }

    fun syncToGoogleSheets() {
        viewModelScope.launch {
            isSyncingSheets.value = true
            try {
                val result = repository.syncToGoogleSheets(selectedYear.value, selectedMonth.value)
                snackbarMessage.value = result.message
            } catch (e: Exception) {
                snackbarMessage.value = "Error sinkronisasi: ${e.message}"
            } finally {
                isSyncingSheets.value = false
            }
        }
    }

    fun updateSettings(settings: AppSettings) {
        viewModelScope.launch {
            repository.updateSettings(settings)
            snackbarMessage.value = "Pengaturan berhasil disimpan."
        }
    }

    fun addOrUpdateNurse(nurse: Nurse) {
        viewModelScope.launch {
            if (nurse.id == 0L) {
                repository.insertNurse(nurse)
                snackbarMessage.value = "Perawat ${nurse.name} berhasil ditambahkan."
            } else {
                repository.updateNurse(nurse)
                snackbarMessage.value = "Data perawat ${nurse.name} berhasil diperbarui."
            }
            refreshFairnessReport()
        }
    }

    fun deleteNurse(nurse: Nurse) {
        viewModelScope.launch {
            repository.deleteNurse(nurse)
            refreshFairnessReport()
            snackbarMessage.value = "Data perawat ${nurse.name} berhasil dihapus."
        }
    }

    fun clearAllNurses() {
        viewModelScope.launch {
            repository.clearAllNurses()
            refreshFairnessReport()
            snackbarMessage.value = "Semua data perawat dan jadwal telah dikosongkan."
        }
    }

    fun loadSampleNurses() {
        viewModelScope.launch {
            repository.loadSampleNurses()
            refreshFairnessReport()
            snackbarMessage.value = "17 data perawat percontohan berhasil dimuat."
        }
    }

    fun resetDefaultNurses() {
        clearAllNurses()
    }

    fun updateMachine(machine: Machine) {
        viewModelScope.launch {
            repository.updateMachine(machine)
            snackbarMessage.value = "Data ${machine.name} berhasil diperbarui."
        }
    }

    fun toggleMachineStatus(machine: Machine) {
        viewModelScope.launch {
            val newStatus = if (machine.status == MachineStatus.AKTIF) {
                MachineStatus.TIDAK_DIGUNAKAN
            } else {
                MachineStatus.AKTIF
            }
            val updated = machine.copy(status = newStatus)
            repository.updateMachine(updated)
            repository.generateDailyMachineAllocation(selectedDate.value)
            val statusLabel = if (newStatus == MachineStatus.AKTIF) "Aktif (Siap Operasi)" else "Tidak Aktif (${newStatus.label})"
            snackbarMessage.value = "${machine.name} diubah menjadi: $statusLabel (Jadwal dinas disesuaikan)"
        }
    }

    fun setMachineStatus(machine: Machine, newStatus: MachineStatus, reason: String = "") {
        viewModelScope.launch {
            val updatedNotes = if (reason.isNotBlank()) {
                if (machine.notes.isNotBlank()) "${machine.notes} | $reason" else reason
            } else {
                machine.notes
            }
            val updated = machine.copy(status = newStatus, notes = updatedNotes)
            repository.updateMachine(updated)
            repository.generateDailyMachineAllocation(selectedDate.value)
            val statusLabel = when (newStatus) {
                MachineStatus.AKTIF -> "Aktif (Siap Operasi)"
                MachineStatus.TIDAK_DIGUNAKAN -> "Tidak Digunakan (Non-aktif)"
                MachineStatus.MAINTENANCE -> "Dalam Perawatan (Maintenance)"
                MachineStatus.RUSAK -> "Rusak / Off"
            }
            snackbarMessage.value = "${machine.name} diset: $statusLabel (Jadwal dinas disesuaikan)"
        }
    }

    fun setAllMachinesActive() {
        viewModelScope.launch {
            allMachines.value.forEach { machine ->
                if (machine.status != MachineStatus.AKTIF) {
                    repository.updateMachine(machine.copy(status = MachineStatus.AKTIF))
                }
            }
            repository.generateDailyMachineAllocation(selectedDate.value)
            snackbarMessage.value = "Semua mesin berhasil diaktifkan."
        }
    }

    fun shareCsv(context: Context) {
        val ymStr = String.format("%04d-%02d", selectedYear.value, selectedMonth.value)
        GoogleSheetsService.shareCsvFile(
            context = context,
            monthStr = ymStr,
            assignments = monthlyAssignments.value,
            machines = allMachines.value
        )
    }

    fun copyTable(context: Context) {
        GoogleSheetsService.copyTableToClipboard(
            context = context,
            assignments = monthlyAssignments.value,
            machines = allMachines.value
        )
    }

    fun clearSnackbar() {
        snackbarMessage.value = null
    }
}
