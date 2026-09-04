package com.example.domain.sheets

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.core.content.FileProvider
import com.example.data.model.Machine
import com.example.data.model.Nurse
import com.example.data.model.ShiftAssignment
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.FileWriter
import java.util.concurrent.TimeUnit

data class SyncResult(
    val isSuccess: Boolean,
    val message: String,
    val rowsSynced: Int = 0
)

object GoogleSheetsService {

    private val httpClient by lazy {
        OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(15, TimeUnit.SECONDS)
            .writeTimeout(15, TimeUnit.SECONDS)
            .followRedirects(true)
            .followSslRedirects(true)
            .build()
    }

    /**
     * Sends the complete monthly schedule payload directly to Google Apps Script Webhook.
     */
    suspend fun syncToGoogleSheets(
        webhookUrl: String,
        monthString: String,
        nurses: List<Nurse>,
        machines: List<Machine>,
        assignments: List<ShiftAssignment>
    ): SyncResult = withContext(Dispatchers.IO) {
        if (webhookUrl.isBlank()) {
            return@withContext SyncResult(
                isSuccess = false,
                message = "URL Webhook Google Apps Script belum diisi. Silakan masukkan URL di pengaturan."
            )
        }

        try {
            val rootJson = JSONObject()
            rootJson.put("action", "SYNC_SCHEDULE")
            rootJson.put("month", monthString)
            rootJson.put("syncTimestamp", System.currentTimeMillis())

            // Nurses array
            val nursesArray = JSONArray()
            nurses.forEach { n ->
                val nObj = JSONObject()
                nObj.put("id", n.id)
                nObj.put("name", n.name)
                nObj.put("nip", n.nip)
                nObj.put("phone", n.phone)
                nObj.put("role", n.role.title)
                nursesArray.put(nObj)
            }
            rootJson.put("nurses", nursesArray)

            // Machines array
            val machinesArray = JSONArray()
            machines.forEach { m ->
                val mObj = JSONObject()
                mObj.put("id", m.id)
                mObj.put("code", m.code)
                mObj.put("name", m.name)
                mObj.put("bay", m.bay)
                mObj.put("category", m.category.label)
                machinesArray.put(mObj)
            }
            rootJson.put("machines", machinesArray)

            // Assignments array
            val assignmentsArray = JSONArray()
            assignments.forEach { a ->
                val aObj = JSONObject()
                aObj.put("date", a.date)
                aObj.put("shiftType", a.shiftType.label)
                aObj.put("shiftCode", a.shiftType.code)
                aObj.put("nurseId", a.nurseId)
                aObj.put("nurseName", a.nurseName)
                aObj.put("isLeader", a.isLeader)
                val mCodes = a.assignedMachineIds.mapNotNull { mId ->
                    machines.find { it.id == mId }?.code
                }
                aObj.put("machines", JSONArray(mCodes))
                aObj.put("machineCount", a.assignedMachineIds.size)
                aObj.put("notes", a.notes)
                assignmentsArray.put(aObj)
            }
            rootJson.put("assignments", assignmentsArray)

            val mediaType = "application/json; charset=utf-8".toMediaType()
            val body = rootJson.toString().toRequestBody(mediaType)
            val request = Request.Builder()
                .url(webhookUrl.trim())
                .post(body)
                .build()

            val response = httpClient.newCall(request).execute()
            if (response.isSuccessful) {
                SyncResult(
                    isSuccess = true,
                    message = "Berhasil sinkronisasi ${assignments.size} data jadwal ke Google Sheet!",
                    rowsSynced = assignments.size
                )
            } else {
                SyncResult(
                    isSuccess = false,
                    message = "Google Sheets mengembalikan kode error: ${response.code} ${response.message}"
                )
            }
        } catch (e: Exception) {
            SyncResult(
                isSuccess = false,
                message = "Gagal menghubungi Google Sheet: ${e.localizedMessage ?: e.message}"
            )
        }
    }

    /**
     * Generates CSV format representing the monthly schedule & machine allocations.
     */
    fun generateCsv(
        assignments: List<ShiftAssignment>,
        machines: List<Machine>
    ): String {
        val sb = java.lang.StringBuilder()
        sb.append("Tanggal,Sif,Kode Sif,Nama Perawat,Peran,No WhatsApp,Alokasi Mesin HD,Jumlah Mesin,Status Notifikasi,Catatan\n")

        assignments.forEach { a ->
            val machineCodes = a.assignedMachineIds.mapNotNull { id ->
                machines.find { it.id == id }?.code
            }.joinToString(";")

            val leaderStr = if (a.isLeader) "PJ Sif" else "Pelaksana"
            val waStatus = if (a.isWhatsAppSent) "Terkirim" else "Belum"

            sb.append("\"${a.date}\",")
            sb.append("\"${a.shiftType.label}\",")
            sb.append("\"${a.shiftType.code}\",")
            sb.append("\"${a.nurseName}\",")
            sb.append("\"$leaderStr\",")
            sb.append("\"${a.nursePhone}\",")
            sb.append("\"$machineCodes\",")
            sb.append("${a.assignedMachineIds.size},")
            sb.append("\"$waStatus\",")
            sb.append("\"${a.notes}\"\n")
        }

        return sb.toString()
    }

    /**
     * Exports and shares CSV file to Google Drive, Google Sheets, or email.
     */
    fun shareCsvFile(
        context: Context,
        monthStr: String,
        assignments: List<ShiftAssignment>,
        machines: List<Machine>
    ) {
        try {
            val csvContent = generateCsv(assignments, machines)
            val fileName = "Jadwal_HD_${monthStr.replace(" ", "_")}.csv"
            val cacheDir = File(context.cacheDir, "exports")
            if (!cacheDir.exists()) cacheDir.mkdirs()

            val file = File(cacheDir, fileName)
            val writer = FileWriter(file)
            writer.write(csvContent)
            writer.flush()
            writer.close()

            val uri: Uri = FileProvider.getUriForFile(
                context,
                "${context.packageName}.fileprovider",
                file
            )

            val shareIntent = Intent(Intent.ACTION_SEND).apply {
                type = "text/csv"
                putExtra(Intent.EXTRA_STREAM, uri)
                putExtra(Intent.EXTRA_SUBJECT, "Laporan Jadwal & Alokasi Mesin HD - $monthStr")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }

            context.startActivity(
                Intent.createChooser(shareIntent, "Buka di Google Sheets / Bagikan CSV").apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
            )
        } catch (e: Exception) {
            Toast.makeText(context, "Gagal membuat file CSV: ${e.message}", Toast.LENGTH_SHORT).show()
        }
    }

    /**
     * Copies TSV table to Android Clipboard so the user can easily paste directly into Google Sheets.
     */
    fun copyTableToClipboard(
        context: Context,
        assignments: List<ShiftAssignment>,
        machines: List<Machine>
    ) {
        val sb = java.lang.StringBuilder()
        sb.append("Tanggal\tSif\tNama Perawat\tPeran\tAlokasi Mesin HD\tJumlah Mesin\tNo WhatsApp\n")

        assignments.forEach { a ->
            val machineCodes = a.assignedMachineIds.mapNotNull { id ->
                machines.find { it.id == id }?.code
            }.joinToString(", ")
            val leaderStr = if (a.isLeader) "PJ Sif" else "Pelaksana"

            sb.append("${a.date}\t${a.shiftType.label}\t${a.nurseName}\t$leaderStr\t$machineCodes\t${a.assignedMachineIds.size}\t${a.nursePhone}\n")
        }

        val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        val clip = ClipData.newPlainText("Jadwal HD Google Sheets", sb.toString())
        clipboard.setPrimaryClip(clip)

        Toast.makeText(context, "Tabel tersalin! Silakan buka Google Sheets dan tempel (Paste).", Toast.LENGTH_LONG).show()
    }

    /**
     * Ready-to-use Google Apps Script code for Webhook endpoint.
     */
    fun getGoogleAppsScriptTemplate(): String {
        return """
// ==========================================
// GOOGLE APPS SCRIPT WEBHOOK UNTUK HEMOSHIFT HD
// 1. Buat Spreadsheet baru di Google Sheets (sheets.new)
// 2. Klik Extensions > Apps Script
// 3. Hapus semua kode, lalu tempel kode di bawah ini
// 4. Klik Deploy > New deployment > Web app
// 5. Set 'Who has access' ke 'Anyone' (Siapa saja)
// 6. Copy URL Web App dan tempelkan ke aplikasi HemoShift HD
// ==========================================

function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Jadwal HD");
    if (!sheet) {
      sheet = ss.insertSheet("Jadwal HD");
    }
    
    var data = JSON.parse(e.postData.contents);
    var month = data.month || "Periode";
    var assignments = data.assignments || [];
    
    // Clear and Header Setup
    sheet.clear();
    sheet.getRange(1, 1, 1, 8).setValues([[
      "Tanggal", "Sif", "Kode Sif", "Nama Perawat", "Peran", "Alokasi Mesin HD", "Jumlah Mesin", "Catatan"
    ]]).setBackground("#006A6A").setFontColor("#FFFFFF").setFontWeight("bold");
    
    var rows = [];
    for (var i = 0; i < assignments.length; i++) {
      var item = assignments[i];
      var mList = item.machines ? item.machines.join(", ") : "";
      var role = item.isLeader ? "PJ Sif / Katim" : "Perawat Pelaksana";
      rows.push([
        item.date,
        item.shiftType,
        item.shiftCode,
        item.nurseName,
        role,
        mList,
        item.machineCount || 0,
        item.notes || ""
      ]);
    }
    
    if (rows.length > 0) {
      sheet.getRange(2, 1, rows.length, 8).setValues(rows);
      sheet.autoResizeColumns(1, 8);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      "status": "success",
      "message": "Berhasil menyimpan " + rows.length + " data jadwal HD",
      "timestamp": new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      "status": "error",
      "message": err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    "status": "online",
    "service": "HemoShift HD Google Sheets Connector",
    "version": "1.0"
  })).setMimeType(ContentService.MimeType.JSON);
}
""".trimIndent()
    }
}
