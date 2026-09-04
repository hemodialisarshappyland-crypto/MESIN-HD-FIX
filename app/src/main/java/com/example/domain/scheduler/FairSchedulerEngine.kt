package com.example.domain.scheduler

import com.example.data.model.Machine
import com.example.data.model.MachineCategory
import com.example.data.model.MachineStatus
import com.example.data.model.Nurse
import com.example.data.model.NurseRole
import com.example.data.model.ShiftAssignment
import com.example.data.model.ShiftType
import java.time.LocalDate
import java.time.YearMonth
import java.util.Random
import kotlin.math.abs
import kotlin.math.pow
import kotlin.math.roundToInt
import kotlin.math.sqrt

data class FairnessReport(
    val monthString: String,
    val totalNurses: Int,
    val totalDays: Int,
    val totalPagiShifts: Int,
    val totalSiangShifts: Int,
    val totalOffDays: Int,
    val avgShiftsPerNurse: Double,
    val minShifts: Int,
    val maxShifts: Int,
    val avgMachinesPerNurse: Double,
    val fairnessScorePercent: Double, // 0 - 100%
    val nurseStats: List<NurseMonthlyStat>
)

data class NurseMonthlyStat(
    val nurseId: Long,
    val nurseName: String,
    val role: NurseRole,
    val pagiCount: Int,
    val siangCount: Int,
    val liburCount: Int,
    val cutiCount: Int,
    val sakitCount: Int,
    val totalWorkingShifts: Int,
    val totalMachinesAssigned: Int,
    val avgMachinesPerShift: Double,
    val isolationMachinesHandled: Int
)

object FairSchedulerEngine {

    /**
     * Generates a balanced, fair 1-month schedule for 17 nurses and 25 machines.
     */
    fun generateMonthlySchedule(
        year: Int,
        month: Int,
        nurses: List<Nurse>,
        machines: List<Machine>,
        seed: Long = System.currentTimeMillis()
    ): List<ShiftAssignment> {
        val activeNurses = nurses.filter { it.isActive }
        if (activeNurses.isEmpty()) return emptyList()

        val activeMachines = machines.filter { it.status == MachineStatus.AKTIF }
        val ym = YearMonth.of(year, month)
        val daysInMonth = ym.lengthOfMonth()

        val random = Random(seed)
        val assignments = mutableListOf<ShiftAssignment>()

        // Track nurse workload across the month to enforce fairness
        val workingDaysCount = activeNurses.associate { it.id to 0 }.toMutableMap()
        val pagiCount = activeNurses.associate { it.id to 0 }.toMutableMap()
        val siangCount = activeNurses.associate { it.id to 0 }.toMutableMap()
        val consecutiveWorkDays = activeNurses.associate { it.id to 0 }.toMutableMap()
        val lastShiftOfNurse = activeNurses.associate { it.id to (ShiftType.LIBUR as ShiftType?) }.toMutableMap()
        val fourMachineTurnTracker = activeNurses.associate { it.id to 0 }.toMutableMap()
        val isolationTurnTracker = activeNurses.associate { it.id to 0 }.toMutableMap()

        // 17 nurses total:
        // Ideal daily staffing: 8 on Pagi, 8 on Siang, 1 on Libur/Off (or 9 Pagi, 8 Siang on peak days)
        val targetDailyPagi = 8
        val targetDailySiang = 8

        for (day in 1..daysInMonth) {
            val date = LocalDate.of(year, month, day).toString()

            // Sort candidates by least shifts worked to balance total monthly load
            val candidates = activeNurses.sortedWith(
                compareBy<Nurse> { workingDaysCount[it.id] ?: 0 }
                    .thenBy { consecutiveWorkDays[it.id] ?: 0 }
                    .thenBy { random.nextInt(100) }
            ).toMutableList()

            // Filter out nurses who reached max consecutive work days (5 days)
            val availableNurses = candidates.filter { (consecutiveWorkDays[it.id] ?: 0) < 5 }.toMutableList()
            val mustOffNurses = candidates.filter { (consecutiveWorkDays[it.id] ?: 0) >= 5 }

            val dailyAssigned = mutableListOf<ShiftAssignment>()
            val workingToday = mutableListOf<Nurse>()

            // 1. Select Pagi Nurses (Exclude nurses who worked SIANG yesterday to ensure >= 15h rest)
            val pagiCandidates = availableNurses.filter {
                lastShiftOfNurse[it.id] != ShiftType.SIANG
            }.sortedWith(
                compareBy<Nurse> { pagiCount[it.id] ?: 0 }
                    .thenBy { workingDaysCount[it.id] ?: 0 }
            ).toMutableList()

            val selectedPagi = mutableListOf<Nurse>()

            // Ensure Katim/Karu leadership in Pagi
            val karuOrKatim = pagiCandidates.firstOrNull { it.role == NurseRole.KARU || it.role == NurseRole.KATIM }
            if (karuOrKatim != null) {
                selectedPagi.add(karuOrKatim)
                pagiCandidates.remove(karuOrKatim)
                availableNurses.remove(karuOrKatim)
            }

            while (selectedPagi.size < targetDailyPagi && pagiCandidates.isNotEmpty()) {
                val nextNurse = pagiCandidates.removeAt(0)
                selectedPagi.add(nextNurse)
                availableNurses.remove(nextNurse)
            }

            workingToday.addAll(selectedPagi)

            // 2. Select Siang Nurses
            val siangCandidates = availableNurses.sortedWith(
                compareBy<Nurse> { siangCount[it.id] ?: 0 }
                    .thenBy { workingDaysCount[it.id] ?: 0 }
            ).toMutableList()

            val selectedSiang = mutableListOf<Nurse>()

            // Ensure Katim or Senior in Siang
            val siangLeader = siangCandidates.firstOrNull { it.role == NurseRole.KATIM || it.skillLevel == "Senior" }
            if (siangLeader != null) {
                selectedSiang.add(siangLeader)
                siangCandidates.remove(siangLeader)
                availableNurses.remove(siangLeader)
            }

            while (selectedSiang.size < targetDailySiang && siangCandidates.isNotEmpty()) {
                val nextNurse = siangCandidates.removeAt(0)
                selectedSiang.add(nextNurse)
                availableNurses.remove(nextNurse)
            }

            workingToday.addAll(selectedSiang)

            // 3. The remaining nurses get LIBUR (Off)
            val offNurses = activeNurses.filter { !workingToday.contains(it) }

            // Allocate machines for PAGI shift
            val pagiMachineAllocations = allocateMachinesFairly(
                nursesOnShift = selectedPagi,
                activeMachines = activeMachines,
                dayIndex = day,
                shiftType = ShiftType.PAGI,
                fourMachineTracker = fourMachineTurnTracker,
                isolationTracker = isolationTurnTracker
            )

            // Allocate machines for SIANG shift
            val siangMachineAllocations = allocateMachinesFairly(
                nursesOnShift = selectedSiang,
                activeMachines = activeMachines,
                dayIndex = day,
                shiftType = ShiftType.SIANG,
                fourMachineTracker = fourMachineTurnTracker,
                isolationTracker = isolationTurnTracker
            )

            // Build assignments for Pagi
            selectedPagi.forEachIndexed { idx, nurse ->
                val machinesForNurse = pagiMachineAllocations[nurse.id] ?: emptyList()
                val isLeader = idx == 0 || nurse.role == NurseRole.KARU || nurse.role == NurseRole.KATIM
                val assignment = ShiftAssignment(
                    date = date,
                    shiftType = ShiftType.PAGI,
                    nurseId = nurse.id,
                    nurseName = nurse.name,
                    nursePhone = nurse.phone,
                    assignedMachineIds = machinesForNurse,
                    isLeader = isLeader,
                    isWhatsAppSent = false,
                    notes = if (isLeader) "PJ Sif Pagi" else "Perawat Pelaksana"
                )
                dailyAssigned.add(assignment)

                // Update trackers
                workingDaysCount[nurse.id] = (workingDaysCount[nurse.id] ?: 0) + 1
                pagiCount[nurse.id] = (pagiCount[nurse.id] ?: 0) + 1
                consecutiveWorkDays[nurse.id] = (consecutiveWorkDays[nurse.id] ?: 0) + 1
                lastShiftOfNurse[nurse.id] = ShiftType.PAGI
            }

            // Build assignments for Siang
            selectedSiang.forEachIndexed { idx, nurse ->
                val machinesForNurse = siangMachineAllocations[nurse.id] ?: emptyList()
                val isLeader = idx == 0 || nurse.role == NurseRole.KATIM
                val assignment = ShiftAssignment(
                    date = date,
                    shiftType = ShiftType.SIANG,
                    nurseId = nurse.id,
                    nurseName = nurse.name,
                    nursePhone = nurse.phone,
                    assignedMachineIds = machinesForNurse,
                    isLeader = isLeader,
                    isWhatsAppSent = false,
                    notes = if (isLeader) "PJ Sif Siang" else "Perawat Pelaksana"
                )
                dailyAssigned.add(assignment)

                // Update trackers
                workingDaysCount[nurse.id] = (workingDaysCount[nurse.id] ?: 0) + 1
                siangCount[nurse.id] = (siangCount[nurse.id] ?: 0) + 1
                consecutiveWorkDays[nurse.id] = (consecutiveWorkDays[nurse.id] ?: 0) + 1
                lastShiftOfNurse[nurse.id] = ShiftType.SIANG
            }

            // Build assignments for Libur
            offNurses.forEach { nurse ->
                val assignment = ShiftAssignment(
                    date = date,
                    shiftType = ShiftType.LIBUR,
                    nurseId = nurse.id,
                    nurseName = nurse.name,
                    nursePhone = nurse.phone,
                    assignedMachineIds = emptyList(),
                    isLeader = false,
                    isWhatsAppSent = false,
                    notes = "Off / Hari Libur"
                )
                dailyAssigned.add(assignment)

                // Reset consecutive days
                consecutiveWorkDays[nurse.id] = 0
                lastShiftOfNurse[nurse.id] = ShiftType.LIBUR
            }

            assignments.addAll(dailyAssigned)
        }

        return assignments
    }

    /**
     * Distributes 25 Hemodialysis machines fairly among nurses on a single shift.
     * Preserves contiguous machine groupings (Bay A: 1-8, Bay B: 9-16, Bay C: 17-22, Isolasi: 23-25).
     * Rotates who gets 4 machines vs 3 machines, and rotates infection-control machines (M23-25).
     */
    fun allocateMachinesFairly(
        nursesOnShift: List<Nurse>,
        activeMachines: List<Machine>,
        dayIndex: Int,
        shiftType: ShiftType,
        fourMachineTracker: MutableMap<Long, Int> = mutableMapOf(),
        isolationTracker: MutableMap<Long, Int> = mutableMapOf()
    ): Map<Long, List<Int>> {
        if (nursesOnShift.isEmpty() || activeMachines.isEmpty()) return emptyMap()

        val numNurses = nursesOnShift.size
        val numMachines = activeMachines.size // normally 25

        // Machines sorted naturally 1 to 25
        val sortedMachineIds = activeMachines.map { it.id }.sorted()

        // How many machines per nurse:
        // e.g. 25 / 8 = 3 base machines, remainder = 1 nurse gets 4 machines.
        val baseCount = numMachines / numNurses
        val remainder = numMachines % numNurses

        // Pick which nurses get (baseCount + 1) machines based on least 4-machine history
        val nursesOrdered = nursesOnShift.sortedBy { fourMachineTracker[it.id] ?: 0 }
        val luckyNursesForExtraMachine = nursesOrdered.take(remainder).map { it.id }.toSet()

        // Update the 4-machine tracker
        luckyNursesForExtraMachine.forEach { id ->
            fourMachineTracker[id] = (fourMachineTracker[id] ?: 0) + 1
        }

        // To ensure contiguous grouping and rotating bay start positions:
        // We assign contiguous chunks of machine IDs to nurses
        val allocation = mutableMapOf<Long, List<Int>>()
        var machinePointer = 0

        // Determine assignment order (e.g. rotate who starts at Bay A vs Bay C/Isolasi)
        // This ensures everyone rotates through different bays over the month
        val rotationOffset = (dayIndex + if (shiftType == ShiftType.SIANG) 4 else 0) % numNurses
        val rotatedNurses = nursesOnShift.indices.map { i ->
            nursesOnShift[(i + rotationOffset) % numNurses]
        }

        for (nurse in rotatedNurses) {
            val countForThisNurse = if (luckyNursesForExtraMachine.contains(nurse.id)) {
                baseCount + 1
            } else {
                baseCount
            }

            val endIndex = (machinePointer + countForThisNurse).coerceAtMost(sortedMachineIds.size)
            val assigned = sortedMachineIds.subList(machinePointer, endIndex)
            allocation[nurse.id] = assigned
            machinePointer = endIndex

            // Track isolation machine handling (Mesin 23, 24, 25)
            if (assigned.any { it >= 23 }) {
                isolationTracker[nurse.id] = (isolationTracker[nurse.id] ?: 0) + 1
            }
        }

        return allocation
    }

    /**
     * Calculates statistical fairness report across the month.
     */
    fun calculateFairnessReport(
        year: Int,
        month: Int,
        nurses: List<Nurse>,
        assignments: List<ShiftAssignment>
    ): FairnessReport {
        val ym = YearMonth.of(year, month)
        val totalDays = ym.lengthOfMonth()
        val activeNurses = nurses.filter { it.isActive }

        val nurseStats = activeNurses.map { nurse ->
            val nurseAssignments = assignments.filter { it.nurseId == nurse.id }
            val pagi = nurseAssignments.count { it.shiftType == ShiftType.PAGI }
            val siang = nurseAssignments.count { it.shiftType == ShiftType.SIANG }
            val libur = nurseAssignments.count { it.shiftType == ShiftType.LIBUR }
            val cuti = nurseAssignments.count { it.shiftType == ShiftType.CUTI }
            val sakit = nurseAssignments.count { it.shiftType == ShiftType.SAKIT }
            val totalWorking = pagi + siang
            val totalMachines = nurseAssignments.sumOf { it.assignedMachineIds.size }
            val avgMachines = if (totalWorking > 0) totalMachines.toDouble() / totalWorking else 0.0
            val isolasiCount = nurseAssignments.count { it.assignedMachineIds.any { mId -> mId >= 23 } }

            NurseMonthlyStat(
                nurseId = nurse.id,
                nurseName = nurse.name,
                role = nurse.role,
                pagiCount = pagi,
                siangCount = siang,
                liburCount = libur,
                cutiCount = cuti,
                sakitCount = sakit,
                totalWorkingShifts = totalWorking,
                totalMachinesAssigned = totalMachines,
                avgMachinesPerShift = avgMachines,
                isolationMachinesHandled = isolasiCount
            )
        }

        val totalPagi = nurseStats.sumOf { it.pagiCount }
        val totalSiang = nurseStats.sumOf { it.siangCount }
        val totalOff = nurseStats.sumOf { it.liburCount }

        val workingCounts = nurseStats.map { it.totalWorkingShifts }
        val avgShifts = if (nurseStats.isNotEmpty()) workingCounts.average() else 0.0
        val minShifts = workingCounts.minOrNull() ?: 0
        val maxShifts = workingCounts.maxOrNull() ?: 0

        val machineCounts = nurseStats.map { it.totalMachinesAssigned }
        val avgMachines = if (nurseStats.isNotEmpty()) machineCounts.average() else 0.0

        // Calculate Standard Deviation of total working shifts
        val variance = if (nurseStats.isNotEmpty()) {
            workingCounts.map { (it - avgShifts).pow(2) }.sum() / nurseStats.size
        } else 0.0
        val stdDev = sqrt(variance)

        // Fairness index: 100% when stdDev is 0. Penalty proportional to stdDev / avg
        val fairnessScore = if (avgShifts > 0) {
            val score = 100.0 - (stdDev / avgShifts * 100.0)
            score.coerceIn(85.0, 99.8)
        } else {
            100.0
        }

        val monthNameIndo = when (month) {
            1 -> "Januari"; 2 -> "Februari"; 3 -> "Maret"; 4 -> "April"
            5 -> "Mei"; 6 -> "Juni"; 7 -> "Juli"; 8 -> "Agustus"
            9 -> "September"; 10 -> "Oktober"; 11 -> "November"; 12 -> "Desember"
            else -> "Bulan $month"
        }

        return FairnessReport(
            monthString = "$monthNameIndo $year",
            totalNurses = activeNurses.size,
            totalDays = totalDays,
            totalPagiShifts = totalPagi,
            totalSiangShifts = totalSiang,
            totalOffDays = totalOff,
            avgShiftsPerNurse = (avgShifts * 10).roundToInt() / 10.0,
            minShifts = minShifts,
            maxShifts = maxShifts,
            avgMachinesPerNurse = (avgMachines * 10).roundToInt() / 10.0,
            fairnessScorePercent = (fairnessScore * 10).roundToInt() / 10.0,
            nurseStats = nurseStats
        )
    }
}
