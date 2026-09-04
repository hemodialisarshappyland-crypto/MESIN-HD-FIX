package com.example

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import com.example.data.model.Machine
import com.example.data.model.MachineCategory
import com.example.data.model.MachineStatus
import com.example.data.model.Nurse
import com.example.data.model.NurseRole
import com.example.data.model.ShiftType
import com.example.domain.scheduler.FairSchedulerEngine
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [36])
class ExampleRobolectricTest {

    @Test
    fun `read string from context`() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        val appName = context.getString(R.string.app_name)
        assertEquals("HemoShift HD", appName)
    }

    @Test
    fun `test fair monthly schedule generator`() {
        val nurses = (1..17).map { id ->
            Nurse(
                id = id.toLong(),
                name = "Perawat $id",
                phone = "0812345678$id",
                role = if (id == 1) NurseRole.KARU else if (id in 2..3) NurseRole.KATIM else NurseRole.PELAKSANA,
                isActive = true
            )
        }

        val machines = (1..25).map { id ->
            Machine(
                id = id,
                code = "M-$id",
                name = "Mesin $id",
                bay = if (id <= 8) "Bay A" else if (id <= 16) "Bay B" else if (id <= 22) "Bay C" else "Isolasi",
                category = if (id >= 23) MachineCategory.ISOLASI else MachineCategory.REGULER,
                status = MachineStatus.AKTIF
            )
        }

        val assignments = FairSchedulerEngine.generateMonthlySchedule(
            year = 2026,
            month = 9,
            nurses = nurses,
            machines = machines
        )

        // 30 days in September * 17 nurses = 510 assignments
        assertEquals(510, assignments.size)

        // Check report
        val report = FairSchedulerEngine.calculateFairnessReport(2026, 9, nurses, assignments)
        assertTrue("Fairness score should be high", report.fairnessScorePercent >= 90.0)
        assertEquals(17, report.nurseStats.size)
    }

    @Test
    fun `test fair machine allocation across shift nurses`() {
        val nurses = (1..8).map { id ->
            Nurse(
                id = id.toLong(),
                name = "Perawat $id",
                phone = "0812345678$id",
                role = NurseRole.PELAKSANA,
                isActive = true
            )
        }

        val machines = (1..25).map { id ->
            Machine(
                id = id,
                code = "M-$id",
                name = "Mesin $id",
                bay = if (id <= 8) "Bay A" else if (id <= 16) "Bay B" else if (id <= 22) "Bay C" else "Isolasi",
                category = if (id >= 23) MachineCategory.ISOLASI else MachineCategory.REGULER,
                status = MachineStatus.AKTIF
            )
        }

        val allocation = FairSchedulerEngine.allocateMachinesFairly(
            nursesOnShift = nurses,
            activeMachines = machines,
            dayIndex = 1,
            shiftType = ShiftType.PAGI
        )

        assertEquals(8, allocation.size)
        val allAssignedMachines = allocation.values.flatten()
        assertEquals(25, allAssignedMachines.size)
        // Check contiguous machine ranges and 3-4 machines per nurse
        allocation.values.forEach { machineList ->
            assertTrue(machineList.size in 3..4)
        }
    }
}
