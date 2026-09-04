package com.example.domain.whatsapp

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.Toast
import com.example.data.model.Machine
import com.example.data.model.ShiftAssignment
import com.example.data.model.ShiftType
import java.net.URLEncoder
import java.nio.charset.StandardCharsets
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale

object WhatsAppDispatcher {

    fun formatIndonesianDate(isoDate: String): String {
        return try {
            val date = LocalDate.parse(isoDate)
            val dayName = when (date.dayOfWeek.value) {
                1 -> "Senin"
                2 -> "Selasa"
                3 -> "Rabu"
                4 -> "Kamis"
                5 -> "Jumat"
                6 -> "Sabtu"
                7 -> "Minggu"
                else -> ""
            }
            val monthName = when (date.monthValue) {
                1 -> "Januari"; 2 -> "Februari"; 3 -> "Maret"; 4 -> "April"
                5 -> "Mei"; 6 -> "Juni"; 7 -> "Juli"; 8 -> "Agustus"
                9 -> "September"; 10 -> "Oktober"; 11 -> "November"; 12 -> "Desember"
                else -> ""
            }
            "$dayName, ${date.dayOfMonth} $monthName ${date.year}"
        } catch (e: Exception) {
            isoDate
        }
    }

    /**
     * Sanitizes Indonesian phone numbers into international WhatsApp format (e.g., 0812 -> 62812).
     */
    fun cleanPhoneNumberForWhatsApp(rawPhone: String): String {
        var cleaned = rawPhone.replace(Regex("[^0-9+]"), "")
        if (cleaned.startsWith("+62")) {
            cleaned = cleaned.substring(1)
        } else if (cleaned.startsWith("0")) {
            cleaned = "62" + cleaned.substring(1)
        } else if (!cleaned.startsWith("62")) {
            cleaned = "62$cleaned"
        }
        return cleaned
    }

    /**
     * Creates personal notification message for a single nurse.
     */
    fun generateNurseMessage(
        assignment: ShiftAssignment,
        machines: List<Machine>,
        hospitalName: String = "RS Happy Land Medical Centre",
        roomName: String = "Ruang Dialisis Gedung Timur Lt.3"
    ): String {
        val formattedDate = formatIndonesianDate(assignment.date)
        val shiftIcon = if (assignment.shiftType == ShiftType.PAGI) "🌅" else "🌇"
        val shiftBadge = when (assignment.shiftType) {
            ShiftType.PAGI -> "*$shiftIcon SIF PAGI (07.00 - 14.00 WIB)*"
            ShiftType.SIANG -> "*$shiftIcon SIF SIANG (12.00 - 19.00 WIB)*"
            ShiftType.LIBUR -> "*🌴 HARI LIBUR / OFF*"
            ShiftType.CUTI -> "*🏖️ CUTI TAHUNAN*"
            ShiftType.SAKIT -> "*🩺 IZIN / SAKIT*"
        }

        val assignedMachines = assignment.assignedMachineIds.mapNotNull { mId ->
            machines.find { it.id == mId }
        }

        val sb = StringBuilder()
        sb.append("🏥 *$hospitalName*\n")
        sb.append("📍 $roomName\n")
        sb.append("━━━━━━━━━━━━━━━━━━━━━━\n")
        sb.append("📋 *JADWAL DINAS & ALOKASI MESIN HD*\n\n")
        sb.append("👤 *Nama:* ${assignment.nurseName}\n")
        sb.append("📅 *Tanggal:* $formattedDate\n")
        sb.append("⏰ *Sif:* $shiftBadge\n")
        if (assignment.isLeader) {
            sb.append("⭐ *Peran:* PJ Sif / Koordinator Sif\n")
        }

        if (assignment.shiftType.isWorkShift) {
            sb.append("\n📟 *ALOKASI MESIN DIKELOLA (${assignedMachines.size} Mesin):*\n")
            if (assignedMachines.isEmpty()) {
                sb.append("_(Belum ada mesin yang ditugaskan)_\n")
            } else {
                assignedMachines.forEach { m ->
                    val specNote = if (m.category.isSpecial) " [${m.category.label}]" else ""
                    sb.append("▶ *[${m.code}]* ${m.name} - ${m.bay}$specNote\n")
                }
            }

            sb.append("\n📝 *SOP & Petunjuk Pelayanan:*")
            sb.append("\n• Lakukan briefing 15 menit sebelum sif dimulai")
            sb.append("\n• Priming & pemeriksaan dialyzer sesuai standar keselamatan")
            sb.append("\n• Monitoring TTV & parameter mesin tiap 30-60 menit")
            sb.append("\n• Operan pasien & desinfeksi mesin bersama sif berikutnya")
        } else {
            sb.append("\nSelamat beristirahat dan mengisi kembali energi. Terima kasih atas dedikasi Anda! 🙏✨")
        }

        sb.append("\n━━━━━━━━━━━━━━━━━━━━━━\n")
        sb.append("_Sistem Otomasi Jadwal & Alokasi HD HemoShift_")

        return sb.toString()
    }

    /**
     * Creates a group broadcast summary for the whole shift or day.
     */
    fun generateGroupBroadcastMessage(
        dateStr: String,
        shiftType: ShiftType?,
        assignments: List<ShiftAssignment>,
        machines: List<Machine>,
        hospitalName: String = "RS Happy Land Medical Centre"
    ): String {
        val formattedDate = formatIndonesianDate(dateStr)
        val sb = StringBuilder()
        sb.append("📢 *REKAP JADWAL & ALOKASI MESIN HD*\n")
        sb.append("🏥 *$hospitalName*\n")
        sb.append("📅 $formattedDate\n")
        sb.append("━━━━━━━━━━━━━━━━━━━━━━\n")

        val shiftsToInclude = if (shiftType != null) listOf(shiftType) else listOf(ShiftType.PAGI, ShiftType.SIANG)

        for (st in shiftsToInclude) {
            val shiftIcon = if (st == ShiftType.PAGI) "🌅" else "🌇"
            sb.append("\n$shiftIcon *${st.label.uppercase()} (${st.timeRange})*\n")
            val onDuty = assignments.filter { it.shiftType == st }

            if (onDuty.isEmpty()) {
                sb.append("_Tidak ada jadwal dinas terdata_\n")
            } else {
                onDuty.forEachIndexed { index, assign ->
                    val leaderTag = if (assign.isLeader) " 👑 (PJ Sif)" else ""
                    val mCodes = assign.assignedMachineIds.mapNotNull { mId ->
                        machines.find { it.id == mId }?.code
                    }.joinToString(", ")

                    sb.append("${index + 1}. *${assign.nurseName}*$leaderTag\n")
                    sb.append("   ↳ Mesin: ${if (mCodes.isNotEmpty()) mCodes else '-'}\n")
                }
            }
        }

        val offList = assignments.filter { it.shiftType == ShiftType.LIBUR }
        if (offList.isNotEmpty()) {
            sb.append("\n🌴 *LIBUR / OFF:*\n")
            sb.append(offList.joinToString(", ") { it.nurseName })
            sb.append("\n")
        }

        sb.append("━━━━━━━━━━━━━━━━━━━━━━\n")
        sb.append("_Mohon hadir 15 menit sebelum operan sif dimulai. Semangat melayani!_ 💉🩺")

        return sb.toString()
    }

    /**
     * Creates comprehensive daily machine allocation report specifically for the Head Nurse (Kepala Ruang).
     */
    fun generateHeadNurseDailyAllocationMessage(
        dateStr: String,
        assignments: List<ShiftAssignment>,
        machines: List<Machine>,
        hospitalName: String = "RS Happy Land Medical Centre",
        roomName: String = "Ruang Dialisis Gedung Timur Lt.3",
        headNurseName: String = "Kepala Ruang HD"
    ): String {
        val formattedDate = formatIndonesianDate(dateStr)
        val activeMachines = machines.filter { it.status == com.example.data.model.MachineStatus.AKTIF }
        val unusedMachines = machines.filter { it.status == com.example.data.model.MachineStatus.TIDAK_DIGUNAKAN }
        val maintMachines = machines.filter { it.status == com.example.data.model.MachineStatus.MAINTENANCE }
        val brokenMachines = machines.filter { it.status == com.example.data.model.MachineStatus.RUSAK }
        val nonActiveMachines = machines.filter { it.status != com.example.data.model.MachineStatus.AKTIF }

        val sb = StringBuilder()
        sb.append("📋 *LAPORAN HARIAN PEMBAGIAN MESIN & SIF HEMODIALISA*\n")
        sb.append("🏥 *$hospitalName*\n")
        sb.append("📍 $roomName\n")
        sb.append("━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n")

        sb.append("Kepada Yth. *${headNurseName.ifEmpty { "Kepala Ruang Hemodialisa" }}*\n")
        sb.append("📅 *Hari / Tanggal:* $formattedDate\n")
        sb.append("📟 *Kapasitas Mesin:* ${machines.size} Mesin Total (${activeMachines.size} Aktif Beroperasi")
        if (unusedMachines.isNotEmpty()) {
            sb.append(", ${unusedMachines.size} Tidak Digunakan")
        }
        if (maintMachines.isNotEmpty()) {
            sb.append(", ${maintMachines.size} Maintenance")
        }
        if (brokenMachines.isNotEmpty()) {
            sb.append(", ${brokenMachines.size} Rusak")
        }
        sb.append(")\n\n")

        // 1. SIF PAGI
        val pagiAssignments = assignments.filter { it.shiftType == ShiftType.PAGI }
        val pagiLeader = pagiAssignments.find { it.isLeader }
        sb.append("🌅 *SIF PAGI (07.00 - 14.00 WIB)*\n")
        if (pagiLeader != null) {
            sb.append("👑 *PJ Sif:* ${pagiLeader.nurseName}\n")
        }
        sb.append("👥 *Jumlah Perawat Dinas:* ${pagiAssignments.size} Orang\n")
        sb.append("📊 *Rincian Alokasi Mesin per Perawat:*\n")
        if (pagiAssignments.isEmpty()) {
            sb.append("   _(Belum ada jadwal sif pagi terdata)_\n")
        } else {
            pagiAssignments.forEachIndexed { idx, assign ->
                val roleTag = if (assign.isLeader) " (PJ Sif)" else ""
                val assignedList = assign.assignedMachineIds.mapNotNull { mId -> machines.find { it.id == mId } }
                val mSummary = if (assignedList.isNotEmpty()) {
                    assignedList.joinToString(", ") { "${it.code}" } + " (${assignedList.size} mesin)"
                } else {
                    "Belum ada mesin"
                }
                sb.append("   ${idx + 1}. *${assign.nurseName}*$roleTag\n")
                sb.append("      ↳ Alokasi: $mSummary\n")
            }
        }
        sb.append("\n")

        // 2. SIF SIANG
        val siangAssignments = assignments.filter { it.shiftType == ShiftType.SIANG }
        val siangLeader = siangAssignments.find { it.isLeader }
        sb.append("🌇 *SIF SIANG (12.00 - 19.00 WIB)*\n")
        if (siangLeader != null) {
            sb.append("👑 *PJ Sif:* ${siangLeader.nurseName}\n")
        }
        sb.append("👥 *Jumlah Perawat Dinas:* ${siangAssignments.size} Orang\n")
        sb.append("📊 *Rincian Alokasi Mesin per Perawat:*\n")
        if (siangAssignments.isEmpty()) {
            sb.append("   _(Belum ada jadwal sif siang terdata)_\n")
        } else {
            siangAssignments.forEachIndexed { idx, assign ->
                val roleTag = if (assign.isLeader) " (PJ Sif)" else ""
                val assignedList = assign.assignedMachineIds.mapNotNull { mId -> machines.find { it.id == mId } }
                val mSummary = if (assignedList.isNotEmpty()) {
                    assignedList.joinToString(", ") { "${it.code}" } + " (${assignedList.size} mesin)"
                } else {
                    "Belum ada mesin"
                }
                sb.append("   ${idx + 1}. *${assign.nurseName}*$roleTag\n")
                sb.append("      ↳ Alokasi: $mSummary\n")
            }
        }
        sb.append("\n")

        // 3. STATUS LIBUR / CUTI / SAKIT
        val offList = assignments.filter { it.shiftType == ShiftType.LIBUR }
        val cutiList = assignments.filter { it.shiftType == ShiftType.CUTI }
        val sakitList = assignments.filter { it.shiftType == ShiftType.SAKIT }

        if (offList.isNotEmpty() || cutiList.isNotEmpty() || sakitList.isNotEmpty()) {
            sb.append("🌴 *STATUS TIDAK BERDINAS:*\n")
            if (offList.isNotEmpty()) {
                sb.append("• Libur/Off (${offList.size}): ${offList.joinToString(", ") { it.nurseName }}\n")
            }
            if (cutiList.isNotEmpty()) {
                sb.append("• Cuti (${cutiList.size}): ${cutiList.joinToString(", ") { it.nurseName }}\n")
            }
            if (sakitList.isNotEmpty()) {
                sb.append("• Sakit/Izin (${sakitList.size}): ${sakitList.joinToString(", ") { it.nurseName }}\n")
            }
            sb.append("\n")
        }

        // 4. STATUS MESIN NON-AKTIF / TIDAK DIGUNAKAN / MAINTENANCE
        if (nonActiveMachines.isNotEmpty()) {
            sb.append("⚠️ *STATUS MESIN NON-AKTIF / STANDBY / MAINTENANCE:*\n")
            nonActiveMachines.forEach { m ->
                val noteStr = if (m.notes.isNotBlank()) " [${m.notes}]" else ""
                sb.append("• ${m.code} (${m.name}) - *${m.status.label}*$noteStr\n")
            }
            sb.append("\n")
        }

        sb.append("━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")
        sb.append("_Laporan otomatis dibuat dari Sistem Jadwal & Alokasi HemoShift HD._")

        return sb.toString()
    }

    /**
     * Sends WhatsApp message to a specific nurse phone number.
     */
    fun sendWhatsApp(
        context: Context,
        phoneNumber: String,
        message: String,
        onSuccess: () -> Unit = {}
    ) {
        try {
            val cleanedNumber = cleanPhoneNumberForWhatsApp(phoneNumber)
            val encodedMessage = URLEncoder.encode(message, StandardCharsets.UTF_8.toString())
            val uri = Uri.parse("https://api.whatsapp.com/send?phone=$cleanedNumber&text=$encodedMessage")

            val intent = Intent(Intent.ACTION_VIEW, uri).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            context.startActivity(intent)
            onSuccess()
        } catch (e: Exception) {
            // Fallback to generic share intent
            shareGeneric(context, message)
            onSuccess()
        }
    }

    /**
     * Shares broadcast message to WhatsApp or any messaging app.
     */
    fun shareGeneric(context: Context, message: String) {
        try {
            val intent = Intent(Intent.ACTION_SEND).apply {
                type = "text/plain"
                putExtra(Intent.EXTRA_TEXT, message)
                putExtra(Intent.EXTRA_TITLE, "Jadwal & Alokasi Mesin Hemodialisa")
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            context.startActivity(Intent.createChooser(intent, "Bagikan via WhatsApp / Pesan").apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            })
        } catch (e: Exception) {
            Toast.makeText(context, "Gagal membagikan pesan: ${e.message}", Toast.LENGTH_SHORT).show()
        }
    }
}
