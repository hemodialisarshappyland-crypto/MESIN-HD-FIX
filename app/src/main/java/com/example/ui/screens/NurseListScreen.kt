package com.example.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.DeleteOutline
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.MedicalServices
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Send
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.data.model.Nurse
import com.example.data.model.NurseRole
import com.example.domain.whatsapp.WhatsAppDispatcher
import com.example.ui.components.NurseRoleBadge
import com.example.ui.theme.ShiftPagiColor
import com.example.ui.theme.ShiftSiangColor
import com.example.ui.theme.WhatsAppDark
import com.example.ui.theme.WhatsAppGreen
import com.example.ui.theme.WhatsAppLight
import com.example.ui.viewmodel.HemoViewModel

@Composable
fun NurseListScreen(
    viewModel: HemoViewModel,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val allNurses by viewModel.allNurses.collectAsStateWithLifecycle()
    val monthlyAssignments by viewModel.monthlyAssignments.collectAsStateWithLifecycle()
    var editingNurse by remember { mutableStateOf<Nurse?>(null) }
    var nurseToDelete by remember { mutableStateOf<Nurse?>(null) }
    var showClearAllConfirmDialog by remember { mutableStateOf(false) }
    var isAddingNewNurse by remember { mutableStateOf(false) }

    Scaffold(
        modifier = modifier.fillMaxSize(),
        floatingActionButton = {
            FloatingActionButton(
                onClick = { isAddingNewNurse = true },
                containerColor = MaterialTheme.colorScheme.primary,
                contentColor = MaterialTheme.colorScheme.onPrimary,
                modifier = Modifier.testTag("add_nurse_fab")
            ) {
                Icon(Icons.Default.Add, contentDescription = "Tambah Perawat")
            }
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .background(MaterialTheme.colorScheme.background)
        ) {
            // Header Info Card
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                shape = RoundedCornerShape(20.dp),
                border = BorderStroke(1.dp, Color(0xFFDDE2EA)),
                elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .width(4.dp)
                                        .height(16.dp)
                                        .clip(CircleShape)
                                        .background(Color(0xFF0061A4))
                                )
                                Text(
                                    text = "Daftar Tim Perawat HD",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFF1A1C1E)
                                )
                            }
                            Text(
                                text = if (allNurses.isEmpty()) "Data perawat kosong • Siap diisi data riil"
                                       else "${allNurses.size} Perawat Terdaftar • WhatsApp Terintegrasi",
                                fontSize = 12.sp,
                                color = Color(0xFF74777F)
                            )
                        }

                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            if (allNurses.isNotEmpty()) {
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(8.dp))
                                        .background(Color(0xFFD1E4FF))
                                        .padding(horizontal = 10.dp, vertical = 5.dp)
                                ) {
                                    Text(
                                        text = "${allNurses.count { it.isActive }} Aktif",
                                        color = Color(0xFF001D36),
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 12.sp
                                    )
                                }

                                IconButton(
                                    onClick = { showClearAllConfirmDialog = true },
                                    modifier = Modifier
                                        .size(36.dp)
                                        .clip(CircleShape)
                                        .background(Color(0xFFFFEDEC))
                                        .testTag("clear_all_nurses_button")
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.DeleteOutline,
                                        contentDescription = "Kosongkan Semua Data Perawat",
                                        tint = Color(0xFFBA1A1A),
                                        modifier = Modifier.size(18.dp)
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // Nurse List
            if (allNurses.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(24.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                        shape = RoundedCornerShape(24.dp),
                        border = BorderStroke(1.dp, Color(0xFFDDE2EA))
                    ) {
                        Column(
                            modifier = Modifier.padding(28.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(16.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(64.dp)
                                    .clip(CircleShape)
                                    .background(Color(0xFFD1E4FF)),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Person,
                                    contentDescription = null,
                                    tint = Color(0xFF0061A4),
                                    modifier = Modifier.size(36.dp)
                                )
                            }
                            Text(
                                text = "Daftar Perawat Kosong",
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF1A1C1E)
                            )
                            Text(
                                text = "Semua contoh/sample perawat telah dikosongkan. Anda dapat mulai menambahkan data perawat unit Hemodialisa Anda.",
                                style = MaterialTheme.typography.bodyMedium,
                                color = Color(0xFF44474E),
                                textAlign = androidx.compose.ui.text.style.TextAlign.Center
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Button(
                                onClick = { isAddingNewNurse = true },
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0061A4)),
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(48.dp)
                                    .testTag("empty_add_nurse_button")
                            ) {
                                Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(20.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Tambah Perawat Baru", fontWeight = FontWeight.Bold)
                            }

                            OutlinedButton(
                                onClick = { viewModel.loadSampleNurses() },
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(44.dp)
                                    .testTag("empty_load_sample_button")
                            ) {
                                Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Muat Contoh Data Perawat (Demo)")
                            }
                        }
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    contentPadding = PaddingValues(bottom = 80.dp)
                ) {
                    items(allNurses, key = { it.id }) { nurse ->
                        val nurseAssignments = monthlyAssignments.filter { it.nurseId == nurse.id }
                        val pagiCount = nurseAssignments.count { it.shiftType == com.example.data.model.ShiftType.PAGI }
                        val siangCount = nurseAssignments.count { it.shiftType == com.example.data.model.ShiftType.SIANG }
                        val totalMachines = nurseAssignments.sumOf { it.assignedMachineIds.size }

                        NurseCardItem(
                            nurse = nurse,
                            pagiCount = pagiCount,
                            siangCount = siangCount,
                            totalMachines = totalMachines,
                            onEdit = { editingNurse = nurse },
                            onDelete = { nurseToDelete = nurse },
                            onTestWhatsApp = {
                                val msg = "Halo ${nurse.name}, ini adalah pesan uji koneksi WhatsApp Sistem Penjadwalan Hemodialisa HemoShift HD. Terima kasih atas kerja samanya! 🏥🩺"
                                WhatsAppDispatcher.sendWhatsApp(context, nurse.phone, msg)
                            }
                        )
                    }
                }
            }
        }
    }

    // Delete Confirmation Dialog
    if (nurseToDelete != null) {
        val targetNurse = nurseToDelete!!
        AlertDialog(
            onDismissRequest = { nurseToDelete = null },
            icon = {
                Icon(
                    imageVector = Icons.Default.Delete,
                    contentDescription = null,
                    tint = Color(0xFFBA1A1A),
                    modifier = Modifier.size(28.dp)
                )
            },
            title = {
                Text(
                    text = "Hapus Data Perawat?",
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp
                )
            },
            text = {
                Text(
                    text = "Apakah Anda yakin ingin menghapus data \"${targetNurse.name}\"? Seluruh riwayat alokasi tugas & jadwal perawat ini juga akan dihapus dari sistem.",
                    fontSize = 14.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.deleteNurse(targetNurse)
                        nurseToDelete = null
                        if (editingNurse?.id == targetNurse.id) {
                            editingNurse = null
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFBA1A1A)),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.testTag("confirm_delete_nurse_button")
                ) {
                    Text("Ya, Hapus Data", color = Color.White, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(
                    onClick = { nurseToDelete = null }
                ) {
                    Text("Batal")
                }
            }
        )
    }

    // Clear All Confirmation Dialog
    if (showClearAllConfirmDialog) {
        AlertDialog(
            onDismissRequest = { showClearAllConfirmDialog = false },
            icon = {
                Icon(
                    imageVector = Icons.Default.Delete,
                    contentDescription = null,
                    tint = Color(0xFFBA1A1A),
                    modifier = Modifier.size(28.dp)
                )
            },
            title = {
                Text(
                    text = "Kosongkan Semua Data Perawat?",
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp
                )
            },
            text = {
                Text(
                    text = "Tindakan ini akan menghapus semua data perawat (${allNurses.size} orang) beserta seluruh jadwal alokasi tugas dari sistem.",
                    fontSize = 14.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.clearAllNurses()
                        showClearAllConfirmDialog = false
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFBA1A1A)),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.testTag("confirm_clear_all_nurses_btn")
                ) {
                    Text("Ya, Kosongkan Semua", color = Color.White, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showClearAllConfirmDialog = false }) {
                    Text("Batal")
                }
            }
        )
    }

    // Add / Edit Dialog
    if (isAddingNewNurse || editingNurse != null) {
        val nurseToEdit = editingNurse ?: Nurse(
            id = 0,
            name = "",
            nip = "",
            phone = "08",
            role = NurseRole.PELAKSANA,
            skillLevel = "Medium"
        )

        NurseFormDialog(
            nurse = nurseToEdit,
            isNew = isAddingNewNurse,
            onDismiss = {
                isAddingNewNurse = false
                editingNurse = null
            },
            onSave = { savedNurse ->
                viewModel.addOrUpdateNurse(savedNurse)
                isAddingNewNurse = false
                editingNurse = null
            },
            onDelete = if (!isAddingNewNurse && editingNurse != null) {
                {
                    nurseToDelete = editingNurse
                }
            } else null
        )
    }
}

@Composable
fun NurseCardItem(
    nurse: Nurse,
    pagiCount: Int,
    siangCount: Int,
    totalMachines: Int,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
    onTestWhatsApp: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .testTag("nurse_item_${nurse.id}"),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        shape = RoundedCornerShape(16.dp),
        border = BorderStroke(1.dp, Color(0xFFDDE2EA)),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier.weight(1f)
                ) {
                    Box(
                        modifier = Modifier
                            .size(40.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(
                                if (nurse.role == NurseRole.KARU) Color(0xFFFEF08A)
                                else if (nurse.role == NurseRole.KATIM) Color(0xFFD1E4FF)
                                else Color(0xFFF1F3F9)
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = if (nurse.role == NurseRole.KARU) Icons.Default.Star else Icons.Default.Person,
                            contentDescription = null,
                            tint = if (nurse.role == NurseRole.KARU) Color(0xFF854D0E)
                                   else if (nurse.role == NurseRole.KATIM) Color(0xFF001D36)
                                   else Color(0xFF0061A4),
                            modifier = Modifier.size(22.dp)
                        )
                    }

                    Column {
                        Text(
                            text = nurse.name,
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp,
                            color = Color(0xFF1A1C1E)
                        )
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            NurseRoleBadge(role = nurse.role)
                            Text(
                                text = "• Tingkat ${nurse.skillLevel}",
                                fontSize = 11.sp,
                                color = Color(0xFF74777F)
                            )
                        }
                    }
                }

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    IconButton(
                        onClick = onEdit,
                        modifier = Modifier
                            .size(34.dp)
                            .clip(CircleShape)
                            .background(Color(0xFFF1F3F9))
                            .testTag("edit_nurse_btn_${nurse.id}")
                    ) {
                        Icon(
                            imageVector = Icons.Default.Edit,
                            contentDescription = "Edit Perawat",
                            tint = Color(0xFF44474E),
                            modifier = Modifier.size(17.dp)
                        )
                    }

                    IconButton(
                        onClick = onDelete,
                        modifier = Modifier
                            .size(34.dp)
                            .clip(CircleShape)
                            .background(Color(0xFFFFEDEC))
                            .testTag("delete_nurse_btn_${nurse.id}")
                    ) {
                        Icon(
                            imageVector = Icons.Default.DeleteOutline,
                            contentDescription = "Hapus Perawat",
                            tint = Color(0xFFBA1A1A),
                            modifier = Modifier.size(17.dp)
                        )
                    }
                }
            }

            // Phone and WhatsApp Test Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Phone,
                        contentDescription = null,
                        tint = Color(0xFF74777F),
                        modifier = Modifier.size(14.dp)
                    )
                    Text(
                        text = "WA: ${nurse.phone.ifBlank { "Belum ada" }}",
                        fontSize = 12.sp,
                        color = Color(0xFF44474E)
                    )
                }

                Row(
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .background(WhatsAppLight)
                        .clickable { onTestWhatsApp() }
                        .padding(horizontal = 10.dp, vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Send,
                        contentDescription = "Tes WhatsApp",
                        tint = WhatsAppDark,
                        modifier = Modifier.size(12.dp)
                    )
                    Text(
                        text = "Tes WA",
                        fontSize = 11.sp,
                        color = WhatsAppDark,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            // Monthly stats mini-pills
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .background(ShiftPagiColor.copy(alpha = 0.12f))
                        .padding(horizontal = 8.dp, vertical = 3.dp)
                ) {
                    Text("Pagi: $pagiCount", fontSize = 11.sp, color = ShiftPagiColor, fontWeight = FontWeight.SemiBold)
                }

                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .background(ShiftSiangColor.copy(alpha = 0.12f))
                        .padding(horizontal = 8.dp, vertical = 3.dp)
                ) {
                    Text("Siang: $siangCount", fontSize = 11.sp, color = ShiftSiangColor, fontWeight = FontWeight.SemiBold)
                }

                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .background(Color(0xFFD1E4FF))
                        .padding(horizontal = 8.dp, vertical = 3.dp)
                ) {
                    Text("Total Mesin: $totalMachines", fontSize = 11.sp, color = Color(0xFF001D36), fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
fun NurseFormDialog(
    nurse: Nurse,
    isNew: Boolean,
    onDismiss: () -> Unit,
    onSave: (Nurse) -> Unit,
    onDelete: (() -> Unit)? = null
) {
    var name by remember { mutableStateOf(nurse.name) }
    var nip by remember { mutableStateOf(nurse.nip) }
    var phone by remember { mutableStateOf(nurse.phone) }
    var role by remember { mutableStateOf(nurse.role) }
    var skillLevel by remember { mutableStateOf(nurse.skillLevel) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(if (isNew) "Tambah Perawat Baru" else "Edit Data Perawat", fontWeight = FontWeight.Bold)
        },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState())
                    .imePadding(),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Nama Lengkap & Gelar") },
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("nurse_name_input")
                )

                OutlinedTextField(
                    value = phone,
                    onValueChange = { phone = it },
                    label = { Text("Nomor WhatsApp (contoh: 08123456789)") },
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("nurse_phone_input")
                )

                OutlinedTextField(
                    value = nip,
                    onValueChange = { nip = it },
                    label = { Text("NIP / STR (Opsional)") },
                    modifier = Modifier.fillMaxWidth()
                )

                Text(
                    text = "Peran / Jabatan:",
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.SemiBold
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    NurseRole.entries.forEach { r ->
                        FilterChip(
                            selected = role == r,
                            onClick = { role = r },
                            label = { Text(r.title, fontSize = 11.sp) }
                        )
                    }
                }

                Text(
                    text = "Tingkat Kompetensi:",
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.SemiBold
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    listOf("Junior", "Medium", "Senior").forEach { level ->
                        FilterChip(
                            selected = skillLevel == level,
                            onClick = { skillLevel = level },
                            label = { Text(level, fontSize = 11.sp) }
                        )
                    }
                }

                if (onDelete != null) {
                    Spacer(modifier = Modifier.height(4.dp))
                    OutlinedButton(
                        onClick = {
                            onDismiss()
                            onDelete()
                        },
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFBA1A1A)),
                        border = BorderStroke(1.dp, Color(0xFFBA1A1A).copy(alpha = 0.5f)),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("dialog_delete_nurse_btn")
                    ) {
                        Icon(Icons.Default.DeleteOutline, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Hapus Data Perawat Ini", fontWeight = FontWeight.Bold)
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (name.isNotBlank()) {
                        onSave(
                            nurse.copy(
                                name = name.trim(),
                                nip = nip.trim(),
                                phone = phone.trim(),
                                role = role,
                                skillLevel = skillLevel
                            )
                        )
                    }
                },
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0061A4)),
                shape = RoundedCornerShape(10.dp),
                modifier = Modifier.testTag("save_nurse_button")
            ) {
                Text("Simpan", fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Batal")
            }
        }
    )
}
