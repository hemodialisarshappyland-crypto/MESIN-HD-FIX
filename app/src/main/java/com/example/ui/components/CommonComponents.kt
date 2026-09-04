package com.example.ui.components

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
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.MedicalServices
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.SwapHoriz
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.model.Machine
import com.example.data.model.MachineCategory
import com.example.data.model.MachineStatus
import com.example.data.model.NurseRole
import com.example.data.model.ShiftAssignment
import com.example.data.model.ShiftType
import com.example.ui.theme.BayAColor
import com.example.ui.theme.BayBColor
import com.example.ui.theme.BayCColor
import com.example.ui.theme.BayIsolasiColor
import com.example.ui.theme.ShiftCutiColor
import com.example.ui.theme.ShiftCutiContainer
import com.example.ui.theme.ShiftOffColor
import com.example.ui.theme.ShiftOffContainer
import com.example.ui.theme.ShiftPagiColor
import com.example.ui.theme.ShiftPagiContainer
import com.example.ui.theme.ShiftSakitColor
import com.example.ui.theme.ShiftSakitContainer
import com.example.ui.theme.ShiftSiangColor
import com.example.ui.theme.ShiftSiangContainer
import com.example.ui.theme.WhatsAppDark
import com.example.ui.theme.WhatsAppGreen
import com.example.ui.theme.WhatsAppLight
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale

@Composable
fun ShiftPillButton(
    title: String,
    count: Int,
    isSelected: Boolean,
    activeColor: Color,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val bg = if (isSelected) Color(0xFFD1E4FF) else Color.White
    val textColor = if (isSelected) Color(0xFF001D36) else Color(0xFF44474E)
    val borderStroke = if (isSelected) Color.Transparent else Color(0xFFC4C6D0)

    Box(
        modifier = modifier
            .height(44.dp)
            .clip(CircleShape)
            .background(bg)
            .border(1.dp, borderStroke, CircleShape)
            .clickable { onClick() }
            .padding(horizontal = 12.dp),
        contentAlignment = Alignment.Center
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            if (isSelected) {
                Box(
                    modifier = Modifier
                        .size(8.dp)
                        .clip(CircleShape)
                        .background(activeColor)
                )
            }
            Text(
                text = title,
                fontSize = 13.sp,
                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                color = textColor
            )
            Box(
                modifier = Modifier
                    .clip(CircleShape)
                    .background(if (isSelected) activeColor.copy(alpha = 0.15f) else Color(0xFFF1F3F9))
                    .padding(horizontal = 6.dp, vertical = 2.dp)
            ) {
                Text(
                    text = "$count",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = if (isSelected) activeColor else Color(0xFF74777F)
                )
            }
        }
    }
}

@Composable
fun ShiftBadge(
    shiftType: ShiftType,
    modifier: Modifier = Modifier,
    isCompact: Boolean = false
) {
    val (bgColor, textColor) = when (shiftType) {
        ShiftType.PAGI -> Pair(ShiftPagiContainer, ShiftPagiColor)
        ShiftType.SIANG -> Pair(ShiftSiangContainer, ShiftSiangColor)
        ShiftType.LIBUR -> Pair(ShiftOffContainer, ShiftOffColor)
        ShiftType.CUTI -> Pair(ShiftCutiContainer, ShiftCutiColor)
        ShiftType.SAKIT -> Pair(ShiftSakitContainer, ShiftSakitColor)
    }

    val text = if (isCompact) shiftType.code else shiftType.label

    Box(
        modifier = modifier
            .clip(RoundedCornerShape(8.dp))
            .background(bgColor)
            .padding(horizontal = if (isCompact) 8.dp else 12.dp, vertical = if (isCompact) 3.dp else 5.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = text,
            color = textColor,
            fontSize = if (isCompact) 11.sp else 12.sp,
            fontWeight = FontWeight.Bold
        )
    }
}

@Composable
fun NurseRoleBadge(role: NurseRole, modifier: Modifier = Modifier) {
    val (bgColor, textColor, label) = when (role) {
        NurseRole.KARU -> Triple(Color(0xFFFEF08A), Color(0xFF854D0E), "Kepala Ruangan")
        NurseRole.KATIM -> Triple(Color(0xFFD1E4FF), Color(0xFF001D36), "PJ Sif / Katim")
        NurseRole.PELAKSANA -> Triple(Color(0xFFE3E2E6), Color(0xFF44474E), "Pelaksana")
    }

    Box(
        modifier = modifier
            .clip(RoundedCornerShape(8.dp))
            .background(bgColor)
            .padding(horizontal = 8.dp, vertical = 3.dp)
    ) {
        Text(
            text = label,
            color = textColor,
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold
        )
    }
}

@Composable
fun MachineChip(
    machine: Machine,
    modifier: Modifier = Modifier,
    isSelected: Boolean = false,
    onClick: (() -> Unit)? = null
) {
    val isInactive = machine.status != MachineStatus.AKTIF
    val bayColor = when {
        isInactive -> Color(0xFFDC2626)
        machine.category.isSpecial -> BayIsolasiColor
        machine.id <= 8 -> BayAColor
        machine.id <= 16 -> BayBColor
        else -> BayCColor
    }

    val bg = when {
        isSelected -> bayColor
        isInactive -> Color(0xFFFEF2F2)
        else -> bayColor.copy(alpha = 0.08f)
    }
    val textColor = when {
        isSelected -> Color.White
        isInactive -> Color(0xFFDC2626)
        else -> bayColor
    }

    Box(
        modifier = modifier
            .clip(RoundedCornerShape(10.dp))
            .background(bg)
            .border(
                1.dp,
                if (isInactive) Color(0xFFEF4444).copy(alpha = 0.5f) else bayColor.copy(alpha = if (isSelected) 1f else 0.25f),
                RoundedCornerShape(10.dp)
            )
            .clickable(enabled = onClick != null) { onClick?.invoke() }
            .padding(horizontal = 10.dp, vertical = 5.dp)
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(5.dp)
        ) {
            Text(
                text = machine.code,
                fontWeight = FontWeight.Bold,
                fontSize = 12.sp,
                color = textColor
            )
            if (isInactive) {
                Text(
                    text = "⚠️ Off",
                    fontSize = 9.sp,
                    fontWeight = FontWeight.Bold,
                    color = if (isSelected) Color.White else Color(0xFFDC2626)
                )
            } else if (machine.category.isSpecial) {
                Box(
                    modifier = Modifier
                        .size(6.dp)
                        .clip(CircleShape)
                        .background(if (isSelected) Color.White else BayIsolasiColor)
                )
            }
        }
    }
}

@Composable
fun StatMetricCard(
    title: String,
    value: String,
    subtitle: String,
    icon: ImageVector,
    iconColor: Color,
    modifier: Modifier = Modifier,
    isHighlighted: Boolean = false
) {
    val containerBg = if (isHighlighted) Color(0xFFD1E4FF) else Color(0xFFE3E2E6)
    val labelColor = if (isHighlighted) Color(0xFF001D36) else Color(0xFF44474E)
    val borderStroke = if (isHighlighted) Color(0xFF0061A4).copy(alpha = 0.15f) else Color.Transparent

    Box(
        modifier = modifier
            .clip(RoundedCornerShape(16.dp))
            .background(containerBg)
            .border(1.dp, borderStroke, RoundedCornerShape(16.dp))
            .padding(horizontal = 8.dp, vertical = 10.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(2.dp)
        ) {
            Text(
                text = title.uppercase(),
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                color = labelColor,
                letterSpacing = 0.6.sp
            )
            Text(
                text = value,
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                color = Color(0xFF1A1C1E)
            )
            if (subtitle.isNotBlank()) {
                Text(
                    text = subtitle,
                    fontSize = 10.sp,
                    color = labelColor.copy(alpha = 0.8f),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}

@Composable
fun DateSelectorBar(
    selectedDateStr: String,
    onDateSelected: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val selectedDate = try {
        LocalDate.parse(selectedDateStr)
    } catch (e: Exception) {
        LocalDate.now()
    }

    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        shape = RoundedCornerShape(20.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFDDE2EA)),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(
                    onClick = {
                        val prev = selectedDate.minusDays(1)
                        onDateSelected(prev.toString())
                    },
                    modifier = Modifier
                        .size(36.dp)
                        .clip(CircleShape)
                        .background(Color(0xFFF1F3F9))
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = "Hari Sebelumnya",
                        tint = MaterialTheme.colorScheme.onSurface,
                        modifier = Modifier.size(18.dp)
                    )
                }

                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    val indoDay = when (selectedDate.dayOfWeek.value) {
                        1 -> "Senin"; 2 -> "Selasa"; 3 -> "Rabu"; 4 -> "Kamis"
                        5 -> "Jumat"; 6 -> "Sabtu"; 7 -> "Minggu"; else -> ""
                    }
                    val indoMonth = when (selectedDate.monthValue) {
                        1 -> "Jan"; 2 -> "Feb"; 3 -> "Mar"; 4 -> "Apr"
                        5 -> "Mei"; 6 -> "Jun"; 7 -> "Jul"; 8 -> "Agu"
                        9 -> "Sep"; 10 -> "Okt"; 11 -> "Nov"; 12 -> "Des"; else -> ""
                    }
                    Text(
                        text = "$indoDay, ${selectedDate.dayOfMonth} $indoMonth ${selectedDate.year}",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF1A1C1E)
                    )
                    Text(
                        text = if (selectedDate == LocalDate.now()) "Hari Ini" else "Jadwal Harian",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                }

                IconButton(
                    onClick = {
                        val next = selectedDate.plusDays(1)
                        onDateSelected(next.toString())
                    },
                    modifier = Modifier
                        .size(36.dp)
                        .clip(CircleShape)
                        .background(Color(0xFFF1F3F9))
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ArrowForward,
                        contentDescription = "Hari Berikutnya",
                        tint = MaterialTheme.colorScheme.onSurface,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Quick days strip (-3 to +3 days)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                for (offset in -3..3) {
                    val date = selectedDate.plusDays(offset.toLong())
                    val isCur = date == selectedDate
                    val dayNameShort = when (date.dayOfWeek.value) {
                        1 -> "Sen"; 2 -> "Sel"; 3 -> "Rab"; 4 -> "Kam"
                        5 -> "Jum"; 6 -> "Sab"; 7 -> "Min"; else -> ""
                    }

                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(12.dp))
                            .background(
                                if (isCur) MaterialTheme.colorScheme.primary
                                else Color(0xFFF1F3F9)
                            )
                            .clickable { onDateSelected(date.toString()) }
                            .padding(horizontal = 14.dp, vertical = 8.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(
                                text = dayNameShort,
                                fontSize = 11.sp,
                                fontWeight = if (isCur) FontWeight.Bold else FontWeight.Medium,
                                color = if (isCur) MaterialTheme.colorScheme.onPrimary else Color(0xFF44474E)
                            )
                            Text(
                                text = "${date.dayOfMonth}",
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp,
                                color = if (isCur) MaterialTheme.colorScheme.onPrimary else Color(0xFF1A1C1E)
                            )
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun EditAssignmentDialog(
    assignment: ShiftAssignment,
    allMachines: List<Machine>,
    onDismiss: () -> Unit,
    onSave: (newShift: ShiftType, newMachines: List<Int>, isLeader: Boolean, notes: String) -> Unit
) {
    var selectedShift by remember { mutableStateOf(assignment.shiftType) }
    var selectedMachineIds by remember { mutableStateOf(assignment.assignedMachineIds.toSet()) }
    var isLeader by remember { mutableStateOf(assignment.isLeader) }
    var notesText by remember { mutableStateOf(assignment.notes) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text("Ubah Jadwal & Alokasi Mesin", fontWeight = FontWeight.Bold)
        },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState())
                    .imePadding()
                    .padding(vertical = 4.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(
                    text = assignment.nurseName,
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.primary
                )

                Text(
                    text = "Pilih Sif Dinas:",
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.SemiBold
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    ShiftType.entries.forEach { st ->
                        val isSelected = selectedShift == st
                        FilterChip(
                            selected = isSelected,
                            onClick = { selectedShift = st },
                            label = { Text(st.code, fontSize = 12.sp) }
                        )
                    }
                }

                if (selectedShift.isWorkShift) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Tugaskan sebagai PJ Sif", style = MaterialTheme.typography.bodyMedium)
                        Switch(checked = isLeader, onCheckedChange = { isLeader = it })
                    }

                    Text(
                        text = "Pilih Mesin HD (${selectedMachineIds.size} dipilih):",
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.SemiBold
                    )

                    FlowRow(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                        verticalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        allMachines.forEach { m ->
                            val isChosen = selectedMachineIds.contains(m.id)
                            MachineChip(
                                machine = m,
                                isSelected = isChosen,
                                onClick = {
                                    selectedMachineIds = if (isChosen) {
                                        selectedMachineIds - m.id
                                    } else {
                                        selectedMachineIds + m.id
                                    }
                                }
                            )
                        }
                    }
                }

                OutlinedTextField(
                    value = notesText,
                    onValueChange = { notesText = it },
                    label = { Text("Catatan / Instruksi Khusus") },
                    modifier = Modifier.fillMaxWidth(),
                    maxLines = 2
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val finalMachines = if (selectedShift.isWorkShift) selectedMachineIds.toList().sorted() else emptyList()
                    onSave(selectedShift, finalMachines, isLeader, notesText)
                },
                modifier = Modifier.testTag("save_assignment_button")
            ) {
                Text("Simpan")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Batal")
            }
        }
    )
}
