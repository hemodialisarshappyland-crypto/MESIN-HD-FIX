package com.example.data.local

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.example.data.model.Nurse
import kotlinx.coroutines.flow.Flow

@Dao
interface NurseDao {
    @Query("SELECT * FROM nurses ORDER BY role ASC, id ASC")
    fun getAllNursesFlow(): Flow<List<Nurse>>

    @Query("SELECT * FROM nurses ORDER BY role ASC, id ASC")
    suspend fun getAllNurses(): List<Nurse>

    @Query("SELECT * FROM nurses WHERE isActive = 1 ORDER BY role ASC, id ASC")
    suspend fun getActiveNurses(): List<Nurse>

    @Query("SELECT * FROM nurses WHERE id = :id")
    suspend fun getNurseById(id: Long): Nurse?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertNurse(nurse: Nurse): Long

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAllNurses(nurses: List<Nurse>)

    @Update
    suspend fun updateNurse(nurse: Nurse)

    @Delete
    suspend fun deleteNurse(nurse: Nurse)

    @Query("DELETE FROM nurses")
    suspend fun deleteAllNurses()

    @Query("SELECT COUNT(*) FROM nurses")
    suspend fun getNurseCount(): Int
}
