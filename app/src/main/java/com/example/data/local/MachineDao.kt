package com.example.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.example.data.model.Machine
import kotlinx.coroutines.flow.Flow

@Dao
interface MachineDao {
    @Query("SELECT * FROM machines ORDER BY id ASC")
    fun getAllMachinesFlow(): Flow<List<Machine>>

    @Query("SELECT * FROM machines ORDER BY id ASC")
    suspend fun getAllMachines(): List<Machine>

    @Query("SELECT * FROM machines WHERE status = 'AKTIF' ORDER BY id ASC")
    suspend fun getActiveMachines(): List<Machine>

    @Query("SELECT * FROM machines WHERE id = :id")
    suspend fun getMachineById(id: Int): Machine?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAllMachines(machines: List<Machine>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertMachine(machine: Machine): Long

    @Update
    suspend fun updateMachine(machine: Machine)

    @androidx.room.Delete
    suspend fun deleteMachine(machine: Machine)

    @Query("SELECT COUNT(*) FROM machines")
    suspend fun getMachineCount(): Int
}
