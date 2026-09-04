package com.example.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.example.data.model.ShiftAssignment
import com.example.data.model.ShiftType
import kotlinx.coroutines.flow.Flow

@Dao
interface ShiftAssignmentDao {
    @Query("SELECT * FROM shift_assignments WHERE date = :date ORDER BY shiftType ASC, isLeader DESC, nurseName ASC")
    fun getAssignmentsForDateFlow(date: String): Flow<List<ShiftAssignment>>

    @Query("SELECT * FROM shift_assignments WHERE date = :date ORDER BY shiftType ASC, isLeader DESC, nurseName ASC")
    suspend fun getAssignmentsForDate(date: String): List<ShiftAssignment>

    @Query("SELECT * FROM shift_assignments WHERE date = :date AND shiftType = :shiftType ORDER BY isLeader DESC, nurseName ASC")
    suspend fun getAssignmentsForDateAndShift(date: String, shiftType: ShiftType): List<ShiftAssignment>

    @Query("SELECT * FROM shift_assignments WHERE date LIKE :monthPrefix || '%' ORDER BY date ASC, nurseId ASC")
    fun getAssignmentsForMonthFlow(monthPrefix: String): Flow<List<ShiftAssignment>>

    @Query("SELECT * FROM shift_assignments WHERE date LIKE :monthPrefix || '%' ORDER BY date ASC, nurseId ASC")
    suspend fun getAssignmentsForMonth(monthPrefix: String): List<ShiftAssignment>

    @Query("SELECT * FROM shift_assignments WHERE nurseId = :nurseId AND date LIKE :monthPrefix || '%' ORDER BY date ASC")
    suspend fun getNurseAssignmentsForMonth(nurseId: Long, monthPrefix: String): List<ShiftAssignment>

    @Query("SELECT * FROM shift_assignments WHERE date = :date AND nurseId = :nurseId LIMIT 1")
    suspend fun getAssignment(date: String, nurseId: Long): ShiftAssignment?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAssignment(assignment: ShiftAssignment): Long

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAllAssignments(assignments: List<ShiftAssignment>)

    @Update
    suspend fun updateAssignment(assignment: ShiftAssignment)

    @Query("UPDATE shift_assignments SET isWhatsAppSent = :sent WHERE id = :id")
    suspend fun markWhatsAppSent(id: Long, sent: Boolean = true)

    @Query("DELETE FROM shift_assignments WHERE date LIKE :monthPrefix || '%'")
    suspend fun deleteAssignmentsForMonth(monthPrefix: String)

    @Query("DELETE FROM shift_assignments WHERE date = :date")
    suspend fun deleteAssignmentsForDate(date: String)

    @Query("DELETE FROM shift_assignments WHERE nurseId = :nurseId")
    suspend fun deleteAssignmentsForNurse(nurseId: Long)

    @Query("DELETE FROM shift_assignments")
    suspend fun deleteAllAssignments()
}
