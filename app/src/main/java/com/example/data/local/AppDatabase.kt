package com.example.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import androidx.sqlite.db.SupportSQLiteDatabase
import com.example.data.model.AppSettings
import com.example.data.model.Machine
import com.example.data.model.MachineCategory
import com.example.data.model.MachineStatus
import com.example.data.model.Nurse
import com.example.data.model.NurseRole
import com.example.data.model.ShiftAssignment
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

@Database(
    entities = [
        Nurse::class,
        Machine::class,
        ShiftAssignment::class,
        AppSettings::class
    ],
    version = 2,
    exportSchema = false
)
@TypeConverters(Converters::class)
abstract class AppDatabase : RoomDatabase() {

    abstract fun nurseDao(): NurseDao
    abstract fun machineDao(): MachineDao
    abstract fun shiftAssignmentDao(): ShiftAssignmentDao
    abstract fun settingsDao(): SettingsDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getDatabase(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "hemodialysis_scheduler.db"
                )
                    .fallbackToDestructiveMigration()
                    .addCallback(object : Callback() {
                        override fun onCreate(db: SupportSQLiteDatabase) {
                            super.onCreate(db)
                            CoroutineScope(Dispatchers.IO).launch {
                                populateInitialData(getDatabase(context))
                            }
                        }
                    })
                    .build()
                INSTANCE = instance
                instance
            }
        }

        suspend fun populateInitialData(database: AppDatabase) {
            val machineDao = database.machineDao()
            val settingsDao = database.settingsDao()

            // 1. Initial 25 Hemodialysis Machines
            if (machineDao.getMachineCount() == 0) {
                val initialMachines = mutableListOf<Machine>()

                // Bay A: Mesin 1-8 (Reguler)
                for (i in 1..8) {
                    val code = String.format("M-%02d", i)
                    val name = String.format("Mesin HD %02d", i)
                    initialMachines.add(
                        Machine(
                            id = i,
                            code = code,
                            name = name,
                            bay = "Bay A (Reguler)",
                            category = MachineCategory.REGULER,
                            status = MachineStatus.AKTIF,
                            brandModel = "Fresenius 4008S"
                        )
                    )
                }

                // Bay B: Mesin 9-16 (Reguler)
                for (i in 9..16) {
                    val code = String.format("M-%02d", i)
                    val name = String.format("Mesin HD %02d", i)
                    initialMachines.add(
                        Machine(
                            id = i,
                            code = code,
                            name = name,
                            bay = "Bay B (Reguler)",
                            category = MachineCategory.REGULER,
                            status = MachineStatus.AKTIF,
                            brandModel = "Gambro AK98"
                        )
                    )
                }

                // Bay C: Mesin 17-22 (Reguler)
                for (i in 17..22) {
                    val code = String.format("M-%02d", i)
                    val name = String.format("Mesin HD %02d", i)
                    initialMachines.add(
                        Machine(
                            id = i,
                            code = code,
                            name = name,
                            bay = "Bay C (Reguler)",
                            category = MachineCategory.REGULER,
                            status = MachineStatus.AKTIF,
                            brandModel = "Nipro Surdial 55Plus"
                        )
                    )
                }

                // Ruang Khusus & Isolasi: Mesin 23-25
                initialMachines.add(
                    Machine(
                        id = 23,
                        code = "M-23",
                        name = "Mesin HD 23 (Hep B)",
                        bay = "Ruang Khusus Hepatitis B",
                        category = MachineCategory.HEPATITIS_B,
                        status = MachineStatus.AKTIF,
                        brandModel = "Fresenius 4008S Dedicated",
                        notes = "Dialyzer reuse khusus Hep B"
                    )
                )

                initialMachines.add(
                    Machine(
                        id = 24,
                        code = "M-24",
                        name = "Mesin HD 24 (Hep C)",
                        bay = "Ruang Khusus Hepatitis C",
                        category = MachineCategory.HEPATITIS_C,
                        status = MachineStatus.AKTIF,
                        brandModel = "Gambro AK98 Dedicated",
                        notes = "Dialyzer reuse khusus Hep C"
                    )
                )

                initialMachines.add(
                    Machine(
                        id = 25,
                        code = "M-25",
                        name = "Mesin HD 25 (Isolasi/Darurat)",
                        bay = "Ruang Isolasi Tekanan Negatif",
                        category = MachineCategory.ISOLASI,
                        status = MachineStatus.AKTIF,
                        brandModel = "Fresenius 5008S Multi-filter",
                        notes = "Pasien infeksius / TB / Covid / HD Cito"
                    )
                )

                machineDao.insertAllMachines(initialMachines)
            }

            // 3. Initial Settings
            if (settingsDao.getSettings() == null) {
                settingsDao.insertSettings(
                    AppSettings(
                        id = 1,
                        hospitalName = "RS Happy Land Medical Centre",
                        roomName = "Ruang Dialisis Gedung Timur Lt.3",
                        googleSheetWebhookUrl = "",
                        googleSpreadsheetIdOrUrl = "",
                        autoSyncGoogleSheets = false,
                        minNursesPerShift = 8,
                        maxConsecutiveWorkDays = 5
                    )
                )
            }
        }

        suspend fun populateSampleNurses(database: AppDatabase) {
            val nurseDao = database.nurseDao()
            val initialNurses = listOf(
                Nurse(1, "Ns. Hendra Wijaya, S.Kep", "198503122008011002", "081234567801", NurseRole.KARU, true, null, "Senior"),
                Nurse(2, "Ns. Siti Rahmawati, S.Kep", "198807242010012004", "081234567802", NurseRole.KATIM, true, null, "Senior"),
                Nurse(3, "Ns. Budi Santoso, S.Kep", "198909152012011003", "081234567803", NurseRole.KATIM, true, null, "Senior"),
                Nurse(4, "Ns. Dewi Anggraini, S.Kep", "199104022014012001", "081234567804", NurseRole.PELAKSANA, true, null, "Senior"),
                Nurse(5, "Ns. Ahmad Fauzi, S.Kep", "199208192015011005", "081234567805", NurseRole.PELAKSANA, true, null, "Senior"),
                Nurse(6, "Ns. Nurul Hidayah, A.Md.Kep", "199301112016012002", "081234567806", NurseRole.PELAKSANA, true, null, "Medium"),
                Nurse(7, "Ns. Rian Pratama, A.Md.Kep", "199312052017011001", "081234567807", NurseRole.PELAKSANA, true, null, "Medium"),
                Nurse(8, "Ns. Eka Putri Lestari, S.Kep", "199405202018012003", "081234567808", NurseRole.PELAKSANA, true, null, "Medium"),
                Nurse(9, "Ns. Muhammad Rizky, A.Md.Kep", "199410142018011002", "081234567809", NurseRole.PELAKSANA, true, null, "Medium"),
                Nurse(10, "Ns. Tri Wahyuni, A.Md.Kep", "199502282019012004", "081234567810", NurseRole.PELAKSANA, true, null, "Medium"),
                Nurse(11, "Ns. Bayu Kurniawan, S.Kep", "199507172019011001", "081234567811", NurseRole.PELAKSANA, true, null, "Medium"),
                Nurse(12, "Ns. Fitri Handayani, A.Md.Kep", "199603092020012002", "081234567812", NurseRole.PELAKSANA, true, null, "Junior"),
                Nurse(13, "Ns. Dimas Ardiansyah, S.Kep", "199609252020011003", "081234567813", NurseRole.PELAKSANA, true, null, "Junior"),
                Nurse(14, "Ns. Ratna Sari, A.Md.Kep", "199701302021012001", "081234567814", NurseRole.PELAKSANA, true, null, "Junior"),
                Nurse(15, "Ns. Ilham Saputra, A.Md.Kep", "199708122021011004", "081234567815", NurseRole.PELAKSANA, true, null, "Junior"),
                Nurse(16, "Ns. Dian Permatasari, S.Kep", "199804052022012003", "081234567816", NurseRole.PELAKSANA, true, null, "Junior"),
                Nurse(17, "Ns. Aditya Nugraha, A.Md.Kep", "199811212022011002", "081234567817", NurseRole.PELAKSANA, true, null, "Junior")
            )
            nurseDao.insertAllNurses(initialNurses)
        }
    }
}
