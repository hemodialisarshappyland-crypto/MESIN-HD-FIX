package com.example.ui.screens

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
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.ElectricBolt
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.data.model.Machine
import com.example.data.model.Nurse
import com.example.data.model.ShiftAssignment
import com.example.data.model.ShiftType
import com.example.ui.components.EditAssignmentDialog
import com.example.ui.components.ShiftBadge
import com.example.ui.theme.ShiftCutiColor
import com.example.ui.theme.ShiftOffColor
import com.example.ui.theme.ShiftPagiColor
import com.example.ui.theme.ShiftSakitColor
import com.example.ui.theme.ShiftSiangColor
import com.example.ui.viewmodel.HemoViewModel
import java.time.LocalDate
import java.time.YearMonth

@Composable
fun MonthlyRosterScreen(
    viewModel: HemoViewModel,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val selectedYear by viewModel.selectedYear.collectAsStateWithLifecycle()
    val selectedMonth by viewModel.selectedMonth.collectAsStateWithLifecycle()
    val monthlyAssignments by viewModel.monthlyAssignments.collectAsStateWithLifecycle()
    val allNurses by viewModel.allNurses.collectAsStateWithLifecycle()
    val allMachines by viewModel.allMachines.collectAsStateWithLifecycle()
    val isGenerating by viewModel.isGenerating.collectAsStateWithLifecycle()
    val fairnessReport by viewModel.fairnessReport.collectAsStateWithLifecycle()

    var editingAssignment by remember { mutableStateOf<ShiftAssignment?>(null) }

    val ym = YearMonth.of(selectedYear, selectedMonth)
    val daysInMonth = ym.lengthOfMonth()

    val monthName = when (selectedMonth) {
        1 -> "Januari"; 2 -> "Februari"; 3 -> "Maret"; 4 -> "April"
        5 -> "Mei"; 6 -> "Juni"; 7 -> "Juli"; 8 -> "Agustus"
        9 -> "September"; 10 -> "Oktober"; 11 -> "November"; 12 -> "Desember"
        else -> "Bulan $selectedMonth"
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        // Month Selector Header
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            shape = RoundedCornerShape(12.dp)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(
                    onClick = {
                        val prevYm = ym.minusMonths(1)
                        viewModel.selectMonth(prevYm.year, prevYm.monthValue)
                    }
                ) {
                    Icon(imageVector = Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Bulan Sebelumnya")
                }

                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = "$monthName $selectedYear",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                    Text(
                        text = "$daysInMonth Hari • ${allNurses.size} Perawat • ${allMachines.size} Mesin HD",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.outline
                    )
                }

                IconButton(
                    onClick = {
                        val nextYm = ym.plusMonths(1)
                        viewModel.selectMonth(nextYm.year, nextYm.monthValue)
                    }
                ) {
                    Icon(imageVector = Icons.AutoMirrored.Filled.ArrowForward, contentDescription = "Bulan Berikutnya")
                }
            }
        }

        // Action Buttons Row: Generate, Copy, Export
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 4.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Button(
                onClick = { viewModel.generateSchedule(force = true) },
                enabled = !isGenerating,
                modifier = Modifier
                    .weight(1.5f)
                    .testTag("generate_monthly_button"),
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                shape = RoundedCornerShape(10.dp)
            ) {
                if (isGenerating) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(16.dp),
                        color = MaterialTheme.colorScheme.onPrimary,
                        strokeWidth = 2.dp
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Menghitung...", fontSize = 12.sp)
                } else {
                    Icon(Icons.Default.ElectricBolt, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Auto-Generate 1 Bulan", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }

            OutlinedButton(
                onClick = { viewModel.copyTable(context) },
                modifier = Modifier.weight(1f),
                shape = RoundedCornerShape(10.dp)
            ) {
                Icon(Icons.Default.ContentCopy, contentDescription = null, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(4.dp))
                Text("Salin Tabel", fontSize = 11.sp)
            }

            OutlinedButton(
                onClick = { viewModel.shareCsv(context) },
                modifier = Modifier.weight(1f),
                shape = RoundedCornerShape(10.dp)
            ) {
                Icon(Icons.Default.Share, contentDescription = null, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(4.dp))
                Text("CSV", fontSize = 11.sp)
            }
        }

        // Legend Row
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 4.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                LegendItem(code = "P", label = "Pagi", color = ShiftPagiColor)
                LegendItem(code = "S", label = "Siang", color = ShiftSiangColor)
                LegendItem(code = "L", label = "Libur", color = ShiftOffColor)
                LegendItem(code = "C", label = "Cuti", color = ShiftCutiColor)
            }

            fairnessReport?.let { report ->
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(6.dp))
                        .background(Color(0xFFECFDF5))
                        .padding(horizontal = 8.dp, vertical = 2.dp)
                ) {
                    Text(
                        text = "Fairness: ${report.fairnessScorePercent}%",
                        color = Color(0xFF059669),
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }

        // Monthly Matrix Grid Table
        val horizontalScrollState = rememberScrollState()

        Card(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
                .padding(horizontal = 16.dp, vertical = 6.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
            shape = RoundedCornerShape(12.dp)
        ) {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .horizontalScroll(horizontalScrollState),
                contentPadding = PaddingValues(bottom = 80.dp)
            ) {
                // Table Header Row
                item {
                    Row(
                        modifier = Modifier
                            .background(MaterialTheme.colorScheme.surfaceVariant)
                            .padding(vertical = 8.dp, horizontal = 4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Left Nurse column header
                        Text(
                            text = "Nama Perawat",
                            modifier = Modifier
                                .width(150.dp)
                                .padding(start = 8.dp),
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )

                        // Day number columns header (1..daysInMonth)
                        for (day in 1..daysInMonth) {
                            Text(
                                text = "$day",
                                modifier = Modifier
                                    .width(36.dp)
                                    .padding(horizontal = 2.dp),
                                textAlign = TextAlign.Center,
                                fontWeight = FontWeight.Bold,
                                fontSize = 11.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }

                        // Summary columns header
                        Text(
                            text = "P",
                            modifier = Modifier.width(32.dp),
                            textAlign = TextAlign.Center,
                            fontWeight = FontWeight.Bold,
                            fontSize = 11.sp,
                            color = ShiftPagiColor
                        )
                        Text(
                            text = "S",
                            modifier = Modifier.width(32.dp),
                            textAlign = TextAlign.Center,
                            fontWeight = FontWeight.Bold,
                            fontSize = 11.sp,
                            color = ShiftSiangColor
                        )
                        Text(
                            text = "L",
                            modifier = Modifier.width(32.dp),
                            textAlign = TextAlign.Center,
                            fontWeight = FontWeight.Bold,
                            fontSize = 11.sp,
                            color = ShiftOffColor
                        )
                        Text(
                            text = "Msn",
                            modifier = Modifier.width(42.dp),
                            textAlign = TextAlign.Center,
                            fontWeight = FontWeight.Bold,
                            fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                }

                // Nurse Rows
                items(allNurses, key = { it.id }) { nurse ->
                    val nurseAssignments = monthlyAssignments.filter { it.nurseId == nurse.id }
                    val pagiCount = nurseAssignments.count { it.shiftType == ShiftType.PAGI }
                    val siangCount = nurseAssignments.count { it.shiftType == ShiftType.SIANG }
                    val liburCount = nurseAssignments.count { it.shiftType == ShiftType.LIBUR }
                    val totalMachines = nurseAssignments.sumOf { it.assignedMachineIds.size }

                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .border(0.5.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
                            .padding(vertical = 6.dp, horizontal = 4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Nurse Name & Role
                        Column(
                            modifier = Modifier
                                .width(150.dp)
                                .padding(start = 8.dp)
                        ) {
                            Text(
                                text = nurse.name,
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 12.sp,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            Text(
                                text = nurse.role.title,
                                fontSize = 10.sp,
                                color = MaterialTheme.colorScheme.outline
                            )
                        }

                        // Daily Shift Cells
                        for (day in 1..daysInMonth) {
                            val dateStr = String.format("%04d-%02d-%02d", selectedYear, selectedMonth, day)
                            val assignment = nurseAssignments.find { it.date == dateStr }

                            val shiftType = assignment?.shiftType ?: ShiftType.LIBUR
                            val (cellBg, cellText) = when (shiftType) {
                                ShiftType.PAGI -> Pair(Color(0xFFFEF3C7), Color(0xFFB45309))
                                ShiftType.SIANG -> Pair(Color(0xFFDBEAFE), Color(0xFF1D4ED8))
                                ShiftType.LIBUR -> Pair(Color(0xFFF1F5F9), Color(0xFF64748B))
                                ShiftType.CUTI -> Pair(Color(0xFFEDE9FE), Color(0xFF6D28D9))
                                ShiftType.SAKIT -> Pair(Color(0xFFFEE2E2), Color(0xFFB91C1C))
                            }

                            Box(
                                modifier = Modifier
                                    .width(36.dp)
                                    .height(30.dp)
                                    .padding(horizontal = 2.dp)
                                    .clip(RoundedCornerShape(4.dp))
                                    .background(cellBg)
                                    .clickable {
                                        if (assignment != null) {
                                            editingAssignment = assignment
                                        }
                                    },
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = shiftType.code,
                                    color = cellText,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }

                        // Summary Totals
                        Text(
                            text = "$pagiCount",
                            modifier = Modifier.width(32.dp),
                            textAlign = TextAlign.Center,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = ShiftPagiColor
                        )
                        Text(
                            text = "$siangCount",
                            modifier = Modifier.width(32.dp),
                            textAlign = TextAlign.Center,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = ShiftSiangColor
                        )
                        Text(
                            text = "$liburCount",
                            modifier = Modifier.width(32.dp),
                            textAlign = TextAlign.Center,
                            fontSize = 11.sp,
                            color = ShiftOffColor
                        )
                        Text(
                            text = "$totalMachines",
                            modifier = Modifier.width(42.dp),
                            textAlign = TextAlign.Center,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                }
            }
        }
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

@Composable
fun LegendItem(code: String, label: String, color: Color) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        Box(
            modifier = Modifier
                .size(14.dp)
                .clip(RoundedCornerShape(3.dp))
                .background(color),
            contentAlignment = Alignment.Center
        ) {
            Text(code, color = Color.White, fontSize = 9.sp, fontWeight = FontWeight.Bold)
        }
        Text(label, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}
