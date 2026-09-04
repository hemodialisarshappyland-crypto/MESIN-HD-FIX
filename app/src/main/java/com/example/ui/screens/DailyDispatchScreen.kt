package com.example.ui.screens

import android.widget.Toast
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
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
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.ElectricBolt
import androidx.compose.material.icons.filled.Group
import androidx.compose.material.icons.filled.LocalHospital
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Send
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.SupervisorAccount
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.PrimaryTabRow
import androidx.compose.material3.SecondaryTabRow
import androidx.compose.material3.Surface
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.data.model.Machine
import com.example.data.model.MachineStatus
import com.example.data.model.ShiftAssignment
import com.example.data.model.ShiftType
import com.example.domain.whatsapp.WhatsAppDispatcher
import com.example.ui.components.DateSelectorBar
import com.example.ui.components.EditAssignmentDialog
import com.example.ui.components.MachineChip
import com.example.ui.components.NurseRoleBadge
import com.example.ui.components.ShiftBadge
import com.example.ui.components.ShiftPillButton
import com.example.ui.components.StatMetricCard
import com.example.ui.theme.ShiftOffColor
import com.example.ui.theme.ShiftPagiColor
import com.example.ui.theme.ShiftSiangColor
import com.example.ui.theme.WhatsAppDark
import com.example.ui.theme.WhatsAppGreen
import com.example.ui.theme.WhatsAppLight
import com.example.ui.viewmodel.HemoViewModel

@Composable
fun DailyDispatchScreen(
    viewModel: HemoViewModel,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val selectedDate by viewModel.selectedDate.collectAsStateWithLifecycle()
    val dailyAssignments by viewModel.dailyAssignments.collectAsStateWithLifecycle()
    val allMachines by viewModel.allMachines.collectAsStateWithLifecycle()
    val allNurses by viewModel.allNurses.collectAsStateWithLifecycle()
    val isGenerating by viewModel.isGenerating.collectAsStateWithLifecycle()
    val settings by viewModel.settings.collectAsStateWithLifecycle()

    var selectedTab by remember { mutableIntStateOf(0) } // 0: Pagi, 1: Siang, 2: Libur/Off
    var editingAssignment by remember { mutableStateOf<ShiftAssignment?>(null) }
    var showHeadNurseDialog by remember { mutableStateOf(false) }

    val currentShiftFilter = when (selectedTab) {
        0 -> ShiftType.PAGI
        1 -> ShiftType.SIANG
        else -> ShiftType.LIBUR
    }

    val filteredAssignments = dailyAssignments.filter { it.shiftType == currentShiftFilter }
    val totalMachinesOnShift = filteredAssignments.sumOf { it.assignedMachineIds.size }
    val totalWhatsAppSent = filteredAssignments.count { it.isWhatsAppSent }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        // Date Navigator
        DateSelectorBar(
            selectedDateStr = selectedDate,
            onDateSelected = { viewModel.selectDate(it) },
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
        )

        // Shift Selector Pills
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 6.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            val pagiCount = dailyAssignments.count { it.shiftType == ShiftType.PAGI }
            val siangCount = dailyAssignments.count { it.shiftType == ShiftType.SIANG }
            val offCount = dailyAssignments.count { it.shiftType == ShiftType.LIBUR }

            ShiftPillButton(
                title = "PAGI (07-14)",
                count = pagiCount,
                isSelected = selectedTab == 0,
                activeColor = Color(0xFF0061A4),
                onClick = { selectedTab = 0 },
                modifier = Modifier.weight(1f)
            )

            ShiftPillButton(
                title = "SIANG (12-19)",
                count = siangCount,
                isSelected = selectedTab == 1,
                activeColor = Color(0xFF0061A4),
                onClick = { selectedTab = 1 },
                modifier = Modifier.weight(1f)
            )

            ShiftPillButton(
                title = "LIBUR",
                count = offCount,
                isSelected = selectedTab == 2,
                activeColor = Color(0xFF0061A4),
                onClick = { selectedTab = 2 },
                modifier = Modifier.weight(1f)
            )
        }

        // Metrics Summary Row
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 4.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            val activeMachinesCount = allMachines.count { it.status == MachineStatus.AKTIF }
            val activeNursesCount = allNurses.count { it.isActive }

            StatMetricCard(
                title = "Mesin",
                value = "$activeMachinesCount",
                subtitle = "dari ${allMachines.size} Total Unit",
                icon = Icons.Default.LocalHospital,
                iconColor = MaterialTheme.colorScheme.primary,
                modifier = Modifier.weight(1f),
                isHighlighted = false
            )

            StatMetricCard(
                title = "Perawat",
                value = "${allNurses.size}",
                subtitle = "$activeNursesCount Perawat Aktif",
                icon = Icons.Default.Group,
                iconColor = MaterialTheme.colorScheme.primary,
                modifier = Modifier.weight(1f),
                isHighlighted = false
            )

            StatMetricCard(
                title = "Dinas ${currentShiftFilter.code}",
                value = "${filteredAssignments.size} Org",
                subtitle = "$totalMachinesOnShift Mesin Ditugaskan",
                icon = Icons.Default.Person,
                iconColor = Color(0xFF0061A4),
                modifier = Modifier.weight(1f),
                isHighlighted = true
            )
        }

        Spacer(modifier = Modifier.height(6.dp))

        // Main Penugasan Container Card
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
                .padding(horizontal = 16.dp, vertical = 4.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            shape = RoundedCornerShape(24.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFDDE2EA)),
            elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(16.dp)
            ) {
                // Container Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .width(4.dp)
                                .height(16.dp)
                                .clip(CircleShape)
                                .background(Color(0xFF0061A4))
                        )
                        Text(
                            text = "Penugasan Sif ${currentShiftFilter.label}",
                            fontWeight = FontWeight.Bold,
                            fontSize = 15.sp,
                            color = Color(0xFF1A1C1E)
                        )
                    }

                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .background(Color(0xFFD1E4FF))
                            .padding(horizontal = 10.dp, vertical = 4.dp)
                    ) {
                        val activeMachinesCount = allMachines.count { it.status == MachineStatus.AKTIF }
                        Text(
                            text = "$totalMachinesOnShift / $activeMachinesCount Mesin Aktif",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF001D36)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // List of assignments
                if (filteredAssignments.isEmpty()) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .weight(1f),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.AutoAwesome,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.outline,
                                modifier = Modifier.size(44.dp)
                            )
                            Text(
                                text = "Belum ada perawat di sif ini untuk tanggal terpilih.",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Button(
                                onClick = { viewModel.generateMachineAllocation(selectedDate) },
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0061A4)),
                                shape = RoundedCornerShape(14.dp),
                                modifier = Modifier.testTag("generate_schedule_button")
                            ) {
                                if (isGenerating) {
                                    CircularProgressIndicator(
                                        modifier = Modifier.size(18.dp),
                                        color = Color.White,
                                        strokeWidth = 2.dp
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text("Menghitung Pembagian Mesin...", color = Color.White)
                                } else {
                                    Icon(Icons.Default.ElectricBolt, contentDescription = null, modifier = Modifier.size(18.dp), tint = Color.White)
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text("Generate Pembagian Mesin", color = Color.White, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                } else {
                    LazyColumn(
                        modifier = Modifier
                            .fillMaxWidth()
                            .weight(1f),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        items(filteredAssignments.size) { index ->
                            val assignment = filteredAssignments[index]
                            NurseAssignmentCard(
                                index = index + 1,
                                assignment = assignment,
                                allMachines = allMachines,
                                onSendWhatsApp = {
                                    viewModel.dispatchWhatsAppToNurse(context, assignment)
                                },
                                onEdit = {
                                    editingAssignment = assignment
                                }
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                // Bottom sync footer
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(8.dp)
                                .clip(CircleShape)
                                .background(Color(0xFF22C55E))
                        )
                        Text(
                            text = "Tersinkronisasi ke Google Sheet",
                            fontSize = 11.sp,
                            color = Color(0xFF74777F)
                        )
                    }

                    Text(
                        text = "Realtime HD System",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Medium,
                        color = Color(0xFF74777F)
                    )
                }
            }
        }

        // Action Buttons Row (Generate & WhatsApp Broadcast)
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Button(
                onClick = { viewModel.generateMachineAllocation(selectedDate) },
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0061A4)),
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp)
                    .testTag("generate_schedule_button")
            ) {
                if (isGenerating) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(18.dp),
                        color = Color.White,
                        strokeWidth = 2.dp
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Menghitung Pembagian Mesin Adil...", color = Color.White, fontWeight = FontWeight.Bold)
                } else {
                    Icon(Icons.Default.AutoAwesome, contentDescription = null, tint = Color.White, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("GENERATE PEMBAGIAN MESIN", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Button(
                    onClick = {
                        viewModel.dispatchGroupBroadcast(context, currentShiftFilter)
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF25D366)),
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier
                        .weight(1f)
                        .height(44.dp)
                        .testTag("broadcast_whatsapp_button")
                ) {
                    Icon(
                        imageVector = Icons.Default.Share,
                        contentDescription = "Broadcast WhatsApp",
                        tint = Color.White,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Kirim Rekap WA Grup", fontSize = 12.sp, color = Color.White, fontWeight = FontWeight.Bold)
                }

                Button(
                    onClick = { showHeadNurseDialog = true },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E3A8A)),
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier
                        .weight(1.1f)
                        .height(44.dp)
                        .testTag("send_head_nurse_button")
                ) {
                    Icon(
                        imageVector = Icons.Default.SupervisorAccount,
                        contentDescription = "Kirim ke Kepala Ruang",
                        tint = Color.White,
                        modifier = Modifier.size(17.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Kirim ke Kepala Ruang", fontSize = 12.sp, color = Color.White, fontWeight = FontWeight.Bold)
                }
            }
        }
    }

    // Send Head Nurse Daily Report Dialog
    if (showHeadNurseDialog) {
        SendHeadNurseReportDialog(
            dateStr = selectedDate,
            assignments = dailyAssignments,
            machines = allMachines,
            savedHeadNurseName = settings?.headNurseName ?: "Kepala Ruang HD",
            savedHeadNursePhone = settings?.headNursePhone ?: "",
            hospitalName = settings?.hospitalName ?: "RS Happy Land Medical Centre",
            roomName = settings?.roomName ?: "Ruang Dialisis Gedung Timur Lt.3",
            onDismiss = { showHeadNurseDialog = false },
            onSend = { targetPhone, targetName, saveToSettings, isDirectWhatsApp ->
                if (saveToSettings && settings != null) {
                    viewModel.updateSettings(
                        settings!!.copy(
                            headNurseName = targetName,
                            headNursePhone = targetPhone
                        )
                    )
                }
                viewModel.dispatchHeadNurseReport(
                    context = context,
                    headNursePhone = targetPhone,
                    headNurseName = targetName,
                    directWhatsApp = isDirectWhatsApp
                )
                showHeadNurseDialog = false
            }
        )
    }

    // Edit Assignment Dialog
    editingAssignment?.let { assignment ->
        EditAssignmentDialog(
            assignment = assignment,
            allMachines = allMachines,
            onDismiss = { editingAssignment = null },
            onSave = { newShift, newMachines, isLeader, notes ->
                viewModel.updateAssignment(assignment, newShift, newMachines, isLeader, notes)
                editingAssignment = null
            }
        )
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun NurseAssignmentCard(
    index: Int = 1,
    assignment: ShiftAssignment,
    allMachines: List<Machine>,
    onSendWhatsApp: () -> Unit,
    onEdit: () -> Unit,
    modifier: Modifier = Modifier
) {
    val assignedMachines = assignment.assignedMachineIds.mapNotNull { id ->
        allMachines.find { it.id == id }
    }

    Card(
        modifier = modifier
            .fillMaxWidth()
            .testTag("nurse_card_${assignment.nurseId}"),
        colors = CardDefaults.cardColors(containerColor = Color(0xFFF8F9FF)),
        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFDDE2EA)),
        shape = RoundedCornerShape(16.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            // Header Row: Nurse info + PJ badge + Edit
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
                            .size(36.dp)
                            .clip(RoundedCornerShape(10.dp))
                            .background(
                                if (assignment.isLeader) Color(0xFFFEF08A)
                                else Color(0xFF0061A4)
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        if (assignment.isLeader) {
                            Icon(
                                imageVector = Icons.Default.Star,
                                contentDescription = "PJ Sif",
                                tint = Color(0xFFB45309),
                                modifier = Modifier.size(20.dp)
                            )
                        } else {
                            Text(
                                text = String.format("%02d", index),
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                        }
                    }

                    Column {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Text(
                                text = assignment.nurseName,
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF1A1C1E),
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                        Text(
                            text = "WA: ${assignment.nursePhone.ifBlank { "Belum ada no" }}",
                            style = MaterialTheme.typography.bodySmall,
                            color = Color(0xFF74777F)
                        )
                    }
                }

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    if (assignment.isLeader) {
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(8.dp))
                                .background(Color(0xFFFEF08A))
                                .padding(horizontal = 8.dp, vertical = 3.dp)
                        ) {
                            Text(
                                text = "PJ SIF",
                                fontSize = 10.sp,
                                color = Color(0xFF854D0E),
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }

                    IconButton(
                        onClick = onEdit,
                        modifier = Modifier
                            .size(32.dp)
                            .clip(CircleShape)
                            .background(Color.White)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Edit,
                            contentDescription = "Edit Alokasi",
                            tint = Color(0xFF74777F),
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }
            }

            // Machines Section
            if (assignment.shiftType.isWorkShift) {
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Alokasi Mesin HD (${assignedMachines.size} Mesin):",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = Color(0xFF44474E)
                        )
                        if (assignedMachines.any { it.category.isSpecial }) {
                            Text(
                                text = "⚠️ Isolasi/Khusus",
                                fontSize = 10.sp,
                                color = Color(0xFFD97706),
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }

                    if (assignedMachines.isEmpty()) {
                        Text(
                            text = "Belum ada mesin yang ditugaskan",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.outline
                        )
                    } else {
                        FlowRow(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                            verticalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            assignedMachines.forEach { m ->
                                MachineChip(
                                    machine = m,
                                    isSelected = false
                                )
                            }
                        }
                    }
                }
            } else {
                Text(
                    text = "Status: Libur / Off Hari Ini",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.outline
                )
            }

            // WhatsApp Direct Action Button Row
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 4.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                if (assignment.isWhatsAppSent) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = "Terkirim",
                            tint = WhatsAppGreen,
                            modifier = Modifier.size(16.dp)
                        )
                        Text(
                            text = "Jadwal Terkirim ke WA",
                            fontSize = 11.sp,
                            color = WhatsAppDark,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                } else {
                    Text(
                        text = "Belum kirim notifikasi",
                        fontSize = 11.sp,
                        color = Color(0xFF74777F)
                    )
                }

                Button(
                    onClick = onSendWhatsApp,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (assignment.isWhatsAppSent) WhatsAppLight else WhatsAppGreen
                    ),
                    shape = RoundedCornerShape(10.dp),
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                    modifier = Modifier.testTag("send_wa_${assignment.nurseId}")
                ) {
                    Icon(
                        imageVector = Icons.Default.Send,
                        contentDescription = "Kirim WhatsApp",
                        tint = if (assignment.isWhatsAppSent) WhatsAppDark else Color.White,
                        modifier = Modifier.size(13.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = if (assignment.isWhatsAppSent) "Kirim Ulang WA" else "Kirim Pesan WA",
                        fontSize = 11.sp,
                        color = if (assignment.isWhatsAppSent) WhatsAppDark else Color.White,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    }
}

@Composable
fun SendHeadNurseReportDialog(
    dateStr: String,
    assignments: List<ShiftAssignment>,
    machines: List<Machine>,
    savedHeadNurseName: String,
    savedHeadNursePhone: String,
    hospitalName: String,
    roomName: String,
    onDismiss: () -> Unit,
    onSend: (targetPhone: String, targetName: String, saveToSettings: Boolean, isDirectWhatsApp: Boolean) -> Unit
) {
    val context = LocalContext.current
    val clipboardManager = LocalClipboardManager.current
    var headNurseName by remember { mutableStateOf(savedHeadNurseName) }
    var headNursePhone by remember { mutableStateOf(savedHeadNursePhone) }
    var saveToSettings by remember { mutableStateOf(true) }

    val reportText = remember(dateStr, assignments, machines, hospitalName, roomName, headNurseName) {
        WhatsAppDispatcher.generateHeadNurseDailyAllocationMessage(
            dateStr = dateStr,
            assignments = assignments,
            machines = machines,
            hospitalName = hospitalName,
            roomName = roomName,
            headNurseName = headNurseName
        )
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.SupervisorAccount,
                    contentDescription = null,
                    tint = Color(0xFF1E3A8A)
                )
                Text("Laporan Pembagian Mesin ke Kepala Ruang", fontWeight = FontWeight.Bold, fontSize = 16.sp)
            }
        },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState())
                    .imePadding(),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Text(
                    text = "Kirim rekap lengkap alokasi mesin Sif Pagi & Siang 1 hari penuh kepada Kepala Ruangan.",
                    fontSize = 12.sp,
                    color = Color(0xFF49454F)
                )

                OutlinedTextField(
                    value = headNurseName,
                    onValueChange = { headNurseName = it },
                    label = { Text("Nama Kepala Ruangan") },
                    placeholder = { Text("contoh: Ns. Hj. Siti Aminah, S.Kep") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = headNursePhone,
                    onValueChange = { headNursePhone = it },
                    label = { Text("No. WhatsApp Kepala Ruangan") },
                    placeholder = { Text("contoh: 081234567890 / 62812...") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.clickable { saveToSettings = !saveToSettings }
                ) {
                    Checkbox(
                        checked = saveToSettings,
                        onCheckedChange = { saveToSettings = it }
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "Simpan data Kepala Ruang ke Pengaturan Aplikasi",
                        fontSize = 12.sp,
                        color = Color(0xFF1C1B1F)
                    )
                }

                // Preview Card
                Text(
                    text = "Pratinjau Pesan WhatsApp:",
                    fontWeight = FontWeight.Bold,
                    fontSize = 12.sp,
                    color = Color(0xFF1E3A8A)
                )

                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = Color(0xFFF1F5F9),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFCBD5E1)),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(180.dp)
                ) {
                    Column(
                        modifier = Modifier
                            .padding(10.dp)
                            .verticalScroll(rememberScrollState())
                    ) {
                        Text(
                            text = reportText,
                            fontSize = 11.sp,
                            fontFamily = FontFamily.Monospace,
                            color = Color(0xFF1E293B)
                        )
                    }
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End
                ) {
                    TextButton(
                        onClick = {
                            clipboardManager.setText(AnnotatedString(reportText))
                            Toast.makeText(context, "Teks laporan berhasil disalin!", Toast.LENGTH_SHORT).show()
                        }
                    ) {
                        Icon(Icons.Default.ContentCopy, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Salin Teks Laporan", fontSize = 12.sp)
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    onSend(headNursePhone.trim(), headNurseName.trim(), saveToSettings, true)
                },
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF25D366))
            ) {
                Icon(Icons.Default.Send, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text("Kirim via WhatsApp", color = Color.White, fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                OutlinedButton(
                    onClick = {
                        onSend(headNursePhone.trim(), headNurseName.trim(), saveToSettings, false)
                    }
                ) {
                    Icon(Icons.Default.Share, contentDescription = null, modifier = Modifier.size(14.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Bagikan", fontSize = 12.sp)
                }

                TextButton(onClick = onDismiss) {
                    Text("Tutup", fontSize = 12.sp)
                }
            }
        }
    )
}

