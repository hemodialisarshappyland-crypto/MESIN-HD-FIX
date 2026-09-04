package com.example.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Build
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.FilterList
import androidx.compose.material.icons.filled.LocalHospital
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PowerSettingsNew
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
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
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.data.model.Machine
import com.example.data.model.MachineCategory
import com.example.data.model.MachineStatus
import com.example.data.model.ShiftType
import com.example.ui.components.DateSelectorBar
import com.example.ui.components.ShiftPillButton
import com.example.ui.theme.BayAColor
import com.example.ui.theme.BayBColor
import com.example.ui.theme.BayCColor
import com.example.ui.theme.BayIsolasiColor
import com.example.ui.viewmodel.HemoViewModel

@Composable
fun MachineLayoutScreen(
    viewModel: HemoViewModel,
    modifier: Modifier = Modifier
) {
    val selectedDate by viewModel.selectedDate.collectAsStateWithLifecycle()
    val dailyAssignments by viewModel.dailyAssignments.collectAsStateWithLifecycle()
    val allMachines by viewModel.allMachines.collectAsStateWithLifecycle()

    var selectedShiftTab by remember { mutableIntStateOf(0) } // 0: Pagi, 1: Siang
    var selectedStatusFilter by remember { mutableIntStateOf(0) } // 0: Semua, 1: Aktif, 2: Tidak Aktif
    var selectedMachineForEdit by remember { mutableStateOf<Machine?>(null) }
    var selectedMachineForStatusChange by remember { mutableStateOf<Machine?>(null) }
    var showAddMachineDialog by remember { mutableStateOf(false) }

    val currentShift = if (selectedShiftTab == 0) ShiftType.PAGI else ShiftType.SIANG
    val shiftAssignments = dailyAssignments.filter { it.shiftType == currentShift }

    // Filter machines according to active/inactive filter
    val activeCount = allMachines.count { it.status == MachineStatus.AKTIF }
    val inactiveCount = allMachines.size - activeCount

    val filteredMachines = when (selectedStatusFilter) {
        1 -> allMachines.filter { it.status == MachineStatus.AKTIF }
        2 -> allMachines.filter { it.status != MachineStatus.AKTIF }
        else -> allMachines
    }

    Scaffold(
        modifier = modifier.fillMaxSize(),
        containerColor = MaterialTheme.colorScheme.background,
        floatingActionButton = {
            FloatingActionButton(
                onClick = { showAddMachineDialog = true },
                containerColor = Color(0xFF0061A4),
                contentColor = Color.White,
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier
                    .padding(bottom = 60.dp)
                    .testTag("fab_add_machine")
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(Icons.Default.Add, contentDescription = "Tambah Mesin HD")
                    Text("Tambah Mesin", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                }
            }
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            // Date Selector Bar
            DateSelectorBar(
                selectedDateStr = selectedDate,
                onDateSelected = { viewModel.selectDate(it) },
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp)
            )

            // Shift Selector Pills
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 2.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                val pagiCount = dailyAssignments.count { it.shiftType == ShiftType.PAGI }
                val siangCount = dailyAssignments.count { it.shiftType == ShiftType.SIANG }

                ShiftPillButton(
                    title = "SIF PAGI (07.00 - 14.00)",
                    count = pagiCount,
                    isSelected = selectedShiftTab == 0,
                    activeColor = Color(0xFF0061A4),
                    onClick = { selectedShiftTab = 0 },
                    modifier = Modifier.weight(1f)
                )

                ShiftPillButton(
                    title = "SIF SIANG (12.00 - 19.00)",
                    count = siangCount,
                    isSelected = selectedShiftTab == 1,
                    activeColor = Color(0xFF0061A4),
                    onClick = { selectedShiftTab = 1 },
                    modifier = Modifier.weight(1f)
                )
            }

            // Summary Info Banner & Status Toggles
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 6.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                shape = RoundedCornerShape(18.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE2E8F0)),
                elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(12.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .width(4.dp)
                                        .height(14.dp)
                                        .clip(CircleShape)
                                        .background(Color(0xFF0061A4))
                                )
                                Text(
                                    text = "Status & Denah Mesin HD",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 14.sp,
                                    color = Color(0xFF1E293B)
                                )
                            }
                            Text(
                                text = "RS Happy Land Medical Centre • Ruang Dialisis Gedung Timur Lt.3",
                                fontSize = 11.sp,
                                color = Color(0xFF64748B)
                            )
                        }

                        if (inactiveCount > 0) {
                            Button(
                                onClick = { viewModel.setAllMachinesActive() },
                                contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                                shape = RoundedCornerShape(8.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF059669))
                            ) {
                                Icon(Icons.Default.CheckCircle, contentDescription = null, modifier = Modifier.size(13.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("Aktifkan Semua", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }

                    // Filter status chips: Semua, Aktif, Tidak Aktif
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        FilterChip(
                            selected = selectedStatusFilter == 0,
                            onClick = { selectedStatusFilter = 0 },
                            label = { Text("Semua (${allMachines.size})", fontSize = 11.sp) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = Color(0xFFE2E8F0),
                                selectedLabelColor = Color(0xFF1E293B)
                            )
                        )

                        FilterChip(
                            selected = selectedStatusFilter == 1,
                            onClick = { selectedStatusFilter = 1 },
                            label = {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(7.dp)
                                            .clip(CircleShape)
                                            .background(Color(0xFF10B981))
                                    )
                                    Text("Aktif ($activeCount)", fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                                }
                            },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = Color(0xFFECFDF5),
                                selectedLabelColor = Color(0xFF059669)
                            )
                        )

                        FilterChip(
                            selected = selectedStatusFilter == 2,
                            onClick = { selectedStatusFilter = 2 },
                            label = {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(7.dp)
                                            .clip(CircleShape)
                                            .background(Color(0xFFEF4444))
                                    )
                                    Text("Tidak Aktif ($inactiveCount)", fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                                }
                            },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = Color(0xFFFEF2F2),
                                selectedLabelColor = Color(0xFFDC2626)
                            )
                        )
                    }
                }
            }

            // Dynamic Groups of Filtered Machines by Bay
            val bayAGroup = filteredMachines.filter { it.bay.contains("Bay A", ignoreCase = true) || (it.bay.isEmpty() && it.id in 1..8) }
            val bayBGroup = filteredMachines.filter { it.bay.contains("Bay B", ignoreCase = true) || (it.bay.isEmpty() && it.id in 9..16) }
            val bayCGroup = filteredMachines.filter { it.bay.contains("Bay C", ignoreCase = true) || (it.bay.isEmpty() && it.id in 17..22) }
            val isolasiGroup = filteredMachines.filter { it.bay.contains("Isolasi", ignoreCase = true) || it.category.isSpecial || (it.bay.isEmpty() && it.id in 23..25) }
            val otherGroup = filteredMachines.filter { m ->
                !bayAGroup.contains(m) && !bayBGroup.contains(m) && !bayCGroup.contains(m) && !isolasiGroup.contains(m)
            }

            if (filteredMachines.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(32.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.FilterList,
                            contentDescription = null,
                            tint = Color(0xFF94A3B8),
                            modifier = Modifier.size(48.dp)
                        )
                        Text(
                            text = if (selectedStatusFilter == 2) "Semua mesin saat ini dalam status Aktif Normal" else "Tidak ada mesin yang sesuai filter",
                            fontWeight = FontWeight.Medium,
                            fontSize = 13.sp,
                            color = Color(0xFF64748B)
                        )
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp),
                    contentPadding = PaddingValues(top = 4.dp, bottom = 90.dp)
                ) {
                    // Group 1: Bay A
                    if (bayAGroup.isNotEmpty()) {
                        item {
                            BaySection(
                                title = "Bay A (Reguler) • ${bayAGroup.size} Mesin",
                                bayColor = BayAColor,
                                machines = bayAGroup,
                                shiftAssignments = shiftAssignments,
                                onMachineClick = { selectedMachineForEdit = it },
                                onStatusClick = { selectedMachineForStatusChange = it }
                            )
                        }
                    }

                    // Group 2: Bay B
                    if (bayBGroup.isNotEmpty()) {
                        item {
                            BaySection(
                                title = "Bay B (Reguler) • ${bayBGroup.size} Mesin",
                                bayColor = BayBColor,
                                machines = bayBGroup,
                                shiftAssignments = shiftAssignments,
                                onMachineClick = { selectedMachineForEdit = it },
                                onStatusClick = { selectedMachineForStatusChange = it }
                            )
                        }
                    }

                    // Group 3: Bay C
                    if (bayCGroup.isNotEmpty()) {
                        item {
                            BaySection(
                                title = "Bay C (Reguler) • ${bayCGroup.size} Mesin",
                                bayColor = BayCColor,
                                machines = bayCGroup,
                                shiftAssignments = shiftAssignments,
                                onMachineClick = { selectedMachineForEdit = it },
                                onStatusClick = { selectedMachineForStatusChange = it }
                            )
                        }
                    }

                    // Group 4: Ruang Isolasi & Khusus
                    if (isolasiGroup.isNotEmpty()) {
                        item {
                            BaySection(
                                title = "Ruang Khusus & Isolasi • ${isolasiGroup.size} Mesin",
                                bayColor = BayIsolasiColor,
                                machines = isolasiGroup,
                                shiftAssignments = shiftAssignments,
                                onMachineClick = { selectedMachineForEdit = it },
                                onStatusClick = { selectedMachineForStatusChange = it }
                            )
                        }
                    }

                    // Group 5: Other Bays (Tambahan)
                    if (otherGroup.isNotEmpty()) {
                        val customBays = otherGroup.groupBy { it.bay.ifEmpty { "Bay Tambahan" } }
                        customBays.forEach { (bayName, machinesInBay) ->
                            item {
                                BaySection(
                                    title = "$bayName • ${machinesInBay.size} Mesin",
                                    bayColor = Color(0xFF6750A4),
                                    machines = machinesInBay,
                                    shiftAssignments = shiftAssignments,
                                    onMachineClick = { selectedMachineForEdit = it },
                                    onStatusClick = { selectedMachineForStatusChange = it }
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    // Quick Status Selector Dialog
    selectedMachineForStatusChange?.let { machine ->
        QuickMachineStatusDialog(
            machine = machine,
            onDismiss = { selectedMachineForStatusChange = null },
            onUpdateStatus = { newStatus, reason ->
                viewModel.setMachineStatus(machine, newStatus, reason)
                selectedMachineForStatusChange = null
            }
        )
    }

    // Add Machine Dialog
    if (showAddMachineDialog) {
        val nextId = (allMachines.maxOfOrNull { it.id } ?: 0) + 1
        AddMachineDialog(
            suggestedId = nextId,
            onDismiss = { showAddMachineDialog = false },
            onSave = { newMachine ->
                viewModel.addOrUpdateMachine(newMachine)
                showAddMachineDialog = false
            }
        )
    }

    // Edit Machine Dialog
    selectedMachineForEdit?.let { machine ->
        EditMachineDialog(
            machine = machine,
            onDismiss = { selectedMachineForEdit = null },
            onSave = { updated ->
                viewModel.addOrUpdateMachine(updated)
                selectedMachineForEdit = null
            },
            onDelete = { toDelete ->
                viewModel.deleteMachine(toDelete)
                selectedMachineForEdit = null
            }
        )
    }
}

@Composable
fun BaySection(
    title: String,
    bayColor: Color,
    machines: List<Machine>,
    shiftAssignments: List<com.example.data.model.ShiftAssignment>,
    onMachineClick: (Machine) -> Unit,
    onStatusClick: (Machine) -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(10.dp)
                    .clip(CircleShape)
                    .background(bayColor)
            )
            Text(
                text = title,
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold,
                color = bayColor
            )
        }

        // Horizontal pairs or 2-column grid
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            val rows = machines.chunked(2)
            rows.forEach { pair ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    pair.forEach { machine ->
                        val assignedNurse = shiftAssignments.find {
                            it.assignedMachineIds.contains(machine.id)
                        }

                        MachineDetailCard(
                            machine = machine,
                            assignedNurseName = assignedNurse?.nurseName,
                            bayColor = bayColor,
                            onClick = { onMachineClick(machine) },
                            onStatusClick = { onStatusClick(machine) },
                            modifier = Modifier.weight(1f)
                        )
                    }
                    if (pair.size == 1) {
                        Spacer(modifier = Modifier.weight(1f))
                    }
                }
            }
        }
    }
}

@Composable
fun MachineDetailCard(
    machine: Machine,
    assignedNurseName: String?,
    bayColor: Color,
    onClick: () -> Unit,
    onStatusClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val isInactive = machine.status != MachineStatus.AKTIF

    Card(
        modifier = modifier
            .fillMaxWidth()
            .clickable { onClick() },
        colors = CardDefaults.cardColors(
            containerColor = if (isInactive) Color(0xFFFEF2F2) else MaterialTheme.colorScheme.surface
        ),
        shape = RoundedCornerShape(14.dp),
        border = androidx.compose.foundation.BorderStroke(
            1.dp,
            if (isInactive) Color(0xFFFCA5A5) else bayColor.copy(alpha = 0.3f)
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(
            modifier = Modifier.padding(10.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            // Header Row: Machine Code & Status Badge / Toggle
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(6.dp))
                        .background(if (isInactive) Color(0xFFFEE2E2) else bayColor.copy(alpha = 0.15f))
                        .padding(horizontal = 6.dp, vertical = 2.dp)
                ) {
                    Text(
                        text = machine.code,
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp,
                        color = if (isInactive) Color(0xFFDC2626) else bayColor
                    )
                }

                // Interactive Status Pill / Button
                val pillBg = when (machine.status) {
                    MachineStatus.AKTIF -> Color(0xFF10B981).copy(alpha = 0.12f)
                    MachineStatus.TIDAK_DIGUNAKAN -> Color(0xFF64748B).copy(alpha = 0.15f)
                    MachineStatus.MAINTENANCE -> Color(0xFFF59E0B).copy(alpha = 0.15f)
                    MachineStatus.RUSAK -> Color(0xFFEF4444).copy(alpha = 0.12f)
                }
                val pillBorder = when (machine.status) {
                    MachineStatus.AKTIF -> Color(0xFF10B981)
                    MachineStatus.TIDAK_DIGUNAKAN -> Color(0xFF64748B)
                    MachineStatus.MAINTENANCE -> Color(0xFFF59E0B)
                    MachineStatus.RUSAK -> Color(0xFFEF4444)
                }
                val pillDot = when (machine.status) {
                    MachineStatus.AKTIF -> Color(0xFF10B981)
                    MachineStatus.TIDAK_DIGUNAKAN -> Color(0xFF64748B)
                    MachineStatus.MAINTENANCE -> Color(0xFFF59E0B)
                    MachineStatus.RUSAK -> Color(0xFFEF4444)
                }
                val pillText = when (machine.status) {
                    MachineStatus.AKTIF -> "Aktif"
                    MachineStatus.TIDAK_DIGUNAKAN -> "Tidak Pakai"
                    MachineStatus.MAINTENANCE -> "Perawatan"
                    MachineStatus.RUSAK -> "Rusak"
                }
                val pillTextColor = when (machine.status) {
                    MachineStatus.AKTIF -> Color(0xFF059669)
                    MachineStatus.TIDAK_DIGUNAKAN -> Color(0xFF334155)
                    MachineStatus.MAINTENANCE -> Color(0xFF92400E)
                    MachineStatus.RUSAK -> Color(0xFFDC2626)
                }

                Surface(
                    onClick = onStatusClick,
                    shape = RoundedCornerShape(8.dp),
                    color = pillBg,
                    border = androidx.compose.foundation.BorderStroke(0.5.dp, pillBorder)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(6.dp)
                                .clip(CircleShape)
                                .background(pillDot)
                        )
                        Text(
                            text = pillText,
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold,
                            color = pillTextColor
                        )
                    }
                }
            }

            // Machine Name & Special category
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = machine.name,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 13.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f)
                )

                if (machine.category.isSpecial) {
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(4.dp))
                            .background(BayIsolasiColor)
                            .padding(horizontal = 4.dp, vertical = 1.dp)
                    ) {
                        Text(
                            text = machine.category.label,
                            fontSize = 8.sp,
                            color = Color.White,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }

            // Inactive warning or nurse assignment
            if (isInactive) {
                val inactiveBg = when (machine.status) {
                    MachineStatus.TIDAK_DIGUNAKAN -> Color(0xFFF1F5F9)
                    MachineStatus.MAINTENANCE -> Color(0xFFFEF3C7)
                    else -> Color(0xFFFEE2E2)
                }
                val inactiveTextColor = when (machine.status) {
                    MachineStatus.TIDAK_DIGUNAKAN -> Color(0xFF475569)
                    MachineStatus.MAINTENANCE -> Color(0xFFB45309)
                    else -> Color(0xFFB91C1C)
                }
                val inactiveIcon = when (machine.status) {
                    MachineStatus.TIDAK_DIGUNAKAN -> Icons.Default.Pause
                    MachineStatus.MAINTENANCE -> Icons.Default.Build
                    else -> Icons.Default.Warning
                }
                val inactiveLabel = when (machine.status) {
                    MachineStatus.TIDAK_DIGUNAKAN -> "Tidak Digunakan"
                    MachineStatus.MAINTENANCE -> "Dalam Perawatan"
                    MachineStatus.RUSAK -> "Rusak / Off"
                    else -> "Non-aktif"
                }

                Surface(
                    shape = RoundedCornerShape(6.dp),
                    color = inactiveBg,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Icon(
                            imageVector = inactiveIcon,
                            contentDescription = null,
                            tint = inactiveTextColor,
                            modifier = Modifier.size(12.dp)
                        )
                        Text(
                            text = inactiveLabel,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = inactiveTextColor,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }
            } else {
                // Assigned nurse on duty indicator
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Person,
                        contentDescription = null,
                        tint = if (assignedNurseName != null) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline,
                        modifier = Modifier.size(13.dp)
                    )
                    Text(
                        text = assignedNurseName ?: "Belum ditugaskan",
                        fontSize = 11.sp,
                        fontWeight = if (assignedNurseName != null) FontWeight.SemiBold else FontWeight.Normal,
                        color = if (assignedNurseName != null) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.outline,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
        }
    }
}

@Composable
fun QuickMachineStatusDialog(
    machine: Machine,
    onDismiss: () -> Unit,
    onUpdateStatus: (MachineStatus, String) -> Unit
) {
    var selectedStatus by remember { mutableStateOf(machine.status) }
    var reasonNote by remember { mutableStateOf(machine.notes) }

    val quickReasons = listOf(
        "Siap Operasi Normal",
        "Tidak Digunakan (Penyesuaian Pasien)",
        "Mesin Cadangan / Standby",
        "Desinfeksi Sirkuit & Dialyzer",
        "Kalibrasi Tekanan & Sensor",
        "Perbaikan Teknisi",
        "Pemeriksaan Rutin"
    )

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.PowerSettingsNew,
                    contentDescription = null,
                    tint = if (selectedStatus == MachineStatus.AKTIF) Color(0xFF059669) else Color(0xFFDC2626)
                )
                Text("Ubah Status ${machine.code}", fontWeight = FontWeight.Bold, fontSize = 16.sp)
            }
        },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Text(
                    text = "${machine.name} (${machine.bay})",
                    fontSize = 12.sp,
                    color = Color(0xFF64748B)
                )

                Text("Pilih Status Operasional:", fontWeight = FontWeight.SemiBold, fontSize = 12.sp)

                // Status Options
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    // 1. Aktif
                    Surface(
                        onClick = {
                            selectedStatus = MachineStatus.AKTIF
                            reasonNote = ""
                        },
                        shape = RoundedCornerShape(10.dp),
                        color = if (selectedStatus == MachineStatus.AKTIF) Color(0xFFECFDF5) else Color(0xFFF8FAFC),
                        border = androidx.compose.foundation.BorderStroke(
                            if (selectedStatus == MachineStatus.AKTIF) 1.5.dp else 1.dp,
                            if (selectedStatus == MachineStatus.AKTIF) Color(0xFF10B981) else Color(0xFFE2E8F0)
                        ),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.padding(10.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(10.dp)
                                    .clip(CircleShape)
                                    .background(Color(0xFF10B981))
                            )
                            Column {
                                Text("🟢 Aktif (Siap Pelayanan)", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color(0xFF065F46))
                                Text("Mesin siap dialokasikan untuk pasien", fontSize = 11.sp, color = Color(0xFF047857))
                            }
                        }
                    }

                    // 2. Tidak Digunakan (Standby / Menyesuaikan Pasien)
                    Surface(
                        onClick = {
                            selectedStatus = MachineStatus.TIDAK_DIGUNAKAN
                            if (reasonNote.isEmpty() || reasonNote == "Siap Operasi Normal") {
                                reasonNote = "Tidak Digunakan (Penyesuaian Pasien)"
                            }
                        },
                        shape = RoundedCornerShape(10.dp),
                        color = if (selectedStatus == MachineStatus.TIDAK_DIGUNAKAN) Color(0xFFF1F5F9) else Color(0xFFF8FAFC),
                        border = androidx.compose.foundation.BorderStroke(
                            if (selectedStatus == MachineStatus.TIDAK_DIGUNAKAN) 1.5.dp else 1.dp,
                            if (selectedStatus == MachineStatus.TIDAK_DIGUNAKAN) Color(0xFF64748B) else Color(0xFFE2E8F0)
                        ),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.padding(10.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(10.dp)
                                    .clip(CircleShape)
                                    .background(Color(0xFF64748B))
                            )
                            Column {
                                Text("⚪ Tidak Digunakan (Standby / Off)", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color(0xFF334155))
                                Text("Mesin standby, disesuaikan dengan jumlah pasien", fontSize = 11.sp, color = Color(0xFF475569))
                            }
                        }
                    }

                    // 3. Dalam Perawatan (Maintenance)
                    Surface(
                        onClick = {
                            selectedStatus = MachineStatus.MAINTENANCE
                            if (reasonNote.isEmpty() || reasonNote == "Siap Operasi Normal") {
                                reasonNote = "Desinfeksi Sirkuit & Dialyzer"
                            }
                        },
                        shape = RoundedCornerShape(10.dp),
                        color = if (selectedStatus == MachineStatus.MAINTENANCE) Color(0xFFFEF3C7) else Color(0xFFF8FAFC),
                        border = androidx.compose.foundation.BorderStroke(
                            if (selectedStatus == MachineStatus.MAINTENANCE) 1.5.dp else 1.dp,
                            if (selectedStatus == MachineStatus.MAINTENANCE) Color(0xFFF59E0B) else Color(0xFFE2E8F0)
                        ),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.padding(10.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(10.dp)
                                    .clip(CircleShape)
                                    .background(Color(0xFFF59E0B))
                            )
                            Column {
                                Text("🟡 Dalam Perawatan (Maintenance)", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color(0xFF92400E))
                                Text("Desinfeksi, kalibrasi, atau pembersihan rutin", fontSize = 11.sp, color = Color(0xFFB45309))
                            }
                        }
                    }

                    // 4. Rusak / Off
                    Surface(
                        onClick = {
                            selectedStatus = MachineStatus.RUSAK
                            if (reasonNote.isEmpty() || reasonNote == "Siap Operasi Normal") {
                                reasonNote = "Perbaikan Teknisi"
                            }
                        },
                        shape = RoundedCornerShape(10.dp),
                        color = if (selectedStatus == MachineStatus.RUSAK) Color(0xFFFEF2F2) else Color(0xFFF8FAFC),
                        border = androidx.compose.foundation.BorderStroke(
                            if (selectedStatus == MachineStatus.RUSAK) 1.5.dp else 1.dp,
                            if (selectedStatus == MachineStatus.RUSAK) Color(0xFFEF4444) else Color(0xFFE2E8F0)
                        ),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.padding(10.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(10.dp)
                                    .clip(CircleShape)
                                    .background(Color(0xFFEF4444))
                            )
                            Column {
                                Text("🔴 Rusak / Off (Perlu Teknisi)", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color(0xFF991B1B))
                                Text("Mesin tidak dapat digunakan hingga diperbaiki", fontSize = 11.sp, color = Color(0xFFB91C1C))
                            }
                        }
                    }
                }

                if (selectedStatus != MachineStatus.AKTIF) {
                    Text("Alasan / Catatan Kondisi:", fontWeight = FontWeight.SemiBold, fontSize = 12.sp)

                    // Quick reason chips
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        quickReasons.filter { it != "Siap Operasi Normal" }.chunked(2).forEach { rowReasons ->
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                rowReasons.forEach { r ->
                                    FilterChip(
                                        selected = reasonNote == r,
                                        onClick = { reasonNote = r },
                                        label = { Text(r, fontSize = 10.sp) },
                                        modifier = Modifier.weight(1f)
                                    )
                                }
                            }
                        }
                    }

                    OutlinedTextField(
                        value = reasonNote,
                        onValueChange = { reasonNote = it },
                        label = { Text("Keterangan Kustom (Opsional)") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    onUpdateStatus(selectedStatus, reasonNote.trim())
                },
                colors = ButtonDefaults.buttonColors(
                    containerColor = when (selectedStatus) {
                        MachineStatus.AKTIF -> Color(0xFF059669)
                        MachineStatus.TIDAK_DIGUNAKAN -> Color(0xFF475569)
                        MachineStatus.MAINTENANCE -> Color(0xFFD97706)
                        MachineStatus.RUSAK -> Color(0xFFDC2626)
                    }
                )
            ) {
                Text("Terapkan Status", color = Color.White, fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Batal")
            }
        }
    )
}

@Composable
fun AddMachineDialog(
    suggestedId: Int,
    onDismiss: () -> Unit,
    onSave: (Machine) -> Unit
) {
    var code by remember { mutableStateOf(String.format("M-%02d", suggestedId)) }
    var name by remember { mutableStateOf(String.format("Mesin HD %02d", suggestedId)) }
    var bay by remember { mutableStateOf("Bay A") }
    var category by remember { mutableStateOf(MachineCategory.REGULER) }
    var status by remember { mutableStateOf(MachineStatus.AKTIF) }
    var brandModel by remember { mutableStateOf("Fresenius 4008S / Gambro AK98") }
    var notes by remember { mutableStateOf("") }

    val bayOptions = listOf("Bay A", "Bay B", "Bay C", "Ruang Isolasi")

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(Icons.Default.LocalHospital, contentDescription = null, tint = Color(0xFF0061A4))
                Text("Tambah Mesin HD Baru", fontWeight = FontWeight.Bold)
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
                OutlinedTextField(
                    value = code,
                    onValueChange = { code = it },
                    label = { Text("Kode Mesin (e.g. M-26)") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Nama Mesin") },
                    placeholder = { Text("contoh: Mesin HD 26") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                Text("Pilih Bay / Lokasi:", fontWeight = FontWeight.SemiBold, fontSize = 12.sp)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    bayOptions.forEach { b ->
                        FilterChip(
                            selected = bay == b,
                            onClick = {
                                bay = b
                                if (b == "Ruang Isolasi") {
                                    category = MachineCategory.ISOLASI
                                }
                            },
                            label = { Text(b, fontSize = 11.sp) }
                        )
                    }
                }

                OutlinedTextField(
                    value = bay,
                    onValueChange = { bay = it },
                    label = { Text("Nama Bay / Ruangan (Kustom)") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                Text("Kategori Mesin:", fontWeight = FontWeight.SemiBold, fontSize = 12.sp)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    MachineCategory.entries.forEach { cat ->
                        FilterChip(
                            selected = category == cat,
                            onClick = { category = cat },
                            label = { Text(cat.label, fontSize = 10.sp) }
                        )
                    }
                }

                Text("Status Mesin:", fontWeight = FontWeight.SemiBold, fontSize = 12.sp)
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    MachineStatus.entries.forEach { st ->
                        FilterChip(
                            selected = status == st,
                            onClick = { status = st },
                            label = { Text(st.label, fontSize = 10.sp) }
                        )
                    }
                }

                OutlinedTextField(
                    value = brandModel,
                    onValueChange = { brandModel = it },
                    label = { Text("Tipe / Model Mesin HD") },
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = notes,
                    onValueChange = { notes = it },
                    label = { Text("Catatan Tambahan (Opsional)") },
                    modifier = Modifier.fillMaxWidth(),
                    maxLines = 2
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val finalCode = code.trim().ifEmpty { String.format("M-%02d", suggestedId) }
                    val finalName = name.trim().ifEmpty { String.format("Mesin HD %02d", suggestedId) }
                    onSave(
                        Machine(
                            id = 0, // Auto ID in ViewModel
                            code = finalCode,
                            name = finalName,
                            bay = bay.trim().ifEmpty { "Bay A" },
                            category = category,
                            status = status,
                            brandModel = brandModel.trim(),
                            notes = notes.trim()
                        )
                    )
                },
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0061A4))
            ) {
                Text("Simpan Mesin")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Batal")
            }
        }
    )
}

@Composable
fun EditMachineDialog(
    machine: Machine,
    onDismiss: () -> Unit,
    onSave: (Machine) -> Unit,
    onDelete: (Machine) -> Unit
) {
    var name by remember { mutableStateOf(machine.name) }
    var code by remember { mutableStateOf(machine.code) }
    var bay by remember { mutableStateOf(machine.bay) }
    var category by remember { mutableStateOf(machine.category) }
    var status by remember { mutableStateOf(machine.status) }
    var notes by remember { mutableStateOf(machine.notes) }
    var brandModel by remember { mutableStateOf(machine.brandModel) }
    var showConfirmDelete by remember { mutableStateOf(false) }

    val bayOptions = listOf("Bay A", "Bay B", "Bay C", "Ruang Isolasi")

    if (showConfirmDelete) {
        AlertDialog(
            onDismissRequest = { showConfirmDelete = false },
            title = { Text("Hapus Mesin?", fontWeight = FontWeight.Bold) },
            text = { Text("Apakah Anda yakin ingin menghapus ${machine.name} (${machine.code}) dari daftar unit HD?") },
            confirmButton = {
                Button(
                    onClick = {
                        showConfirmDelete = false
                        onDelete(machine)
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFDC2626))
                ) {
                    Text("Hapus", color = Color.White)
                }
            },
            dismissButton = {
                TextButton(onClick = { showConfirmDelete = false }) {
                    Text("Batal")
                }
            }
        )
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Edit Data & Status Mesin", fontWeight = FontWeight.Bold)
                IconButton(onClick = { showConfirmDelete = true }) {
                    Icon(Icons.Default.Delete, contentDescription = "Hapus Mesin", tint = Color(0xFFDC2626))
                }
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
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Nama Mesin") },
                    placeholder = { Text("contoh: Mesin HD 01") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = code,
                    onValueChange = { code = it },
                    label = { Text("Kode Mesin") },
                    placeholder = { Text("contoh: M-01") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                Text("Bay / Lokasi:", fontWeight = FontWeight.SemiBold, fontSize = 12.sp)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    bayOptions.forEach { b ->
                        FilterChip(
                            selected = bay.contains(b, ignoreCase = true),
                            onClick = { bay = b },
                            label = { Text(b, fontSize = 11.sp) }
                        )
                    }
                }

                OutlinedTextField(
                    value = bay,
                    onValueChange = { bay = it },
                    label = { Text("Nama Bay / Ruangan") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                Text("Kategori Mesin:", fontWeight = FontWeight.SemiBold, fontSize = 12.sp)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    MachineCategory.entries.forEach { cat ->
                        FilterChip(
                            selected = category == cat,
                            onClick = { category = cat },
                            label = { Text(cat.label, fontSize = 10.sp) }
                        )
                    }
                }

                Text("Status Mesin Operasional:", fontWeight = FontWeight.SemiBold, fontSize = 12.sp)
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    MachineStatus.entries.forEach { st ->
                        FilterChip(
                            selected = status == st,
                            onClick = { status = st },
                            label = { Text(st.label, fontSize = 10.sp) }
                        )
                    }
                }

                OutlinedTextField(
                    value = brandModel,
                    onValueChange = { brandModel = it },
                    label = { Text("Tipe / Model Mesin HD") },
                    placeholder = { Text("contoh: Fresenius 4008S / Gambro AK98") },
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = notes,
                    onValueChange = { notes = it },
                    label = { Text("Catatan Mesin / Pasien Khusus") },
                    modifier = Modifier.fillMaxWidth(),
                    maxLines = 2
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val finalName = name.trim().ifEmpty { machine.name }
                    val finalCode = code.trim().ifEmpty { machine.code }
                    onSave(
                        machine.copy(
                            name = finalName,
                            code = finalCode,
                            bay = bay.trim().ifEmpty { machine.bay },
                            category = category,
                            status = status,
                            notes = notes,
                            brandModel = brandModel
                        )
                    )
                },
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0061A4))
            ) {
                Text("Simpan Perubahan")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Batal")
            }
        }
    )
}
