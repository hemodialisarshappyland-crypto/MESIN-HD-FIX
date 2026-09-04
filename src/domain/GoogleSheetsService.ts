import { Machine, Nurse, ShiftAssignment, SHIFT_TYPE_INFO } from '../types';

export interface SyncResult {
  isSuccess: boolean;
  message: string;
  rowsSynced?: number;
}

export class GoogleSheetsService {
  /**
   * Sends the complete monthly schedule payload directly to Google Apps Script Webhook.
   */
  static async syncToGoogleSheets(
    webhookUrl: string,
    monthString: string,
    nurses: Nurse[],
    machines: Machine[],
    assignments: ShiftAssignment[]
  ): Promise<SyncResult> {
    if (!webhookUrl || webhookUrl.trim() === '') {
      return {
        isSuccess: false,
        message: 'URL Webhook Google Apps Script belum diisi. Silakan masukkan URL di tab Laporan & Sync.',
      };
    }

    try {
      const payload = {
        action: 'SYNC_SCHEDULE',
        month: monthString,
        syncTimestamp: Date.now(),
        nurses: nurses.map((n) => ({
          id: n.id,
          name: n.name,
          nip: n.nip,
          phone: n.phone,
          role: n.role,
        })),
        machines: machines.map((m) => ({
          id: m.id,
          code: m.code,
          name: m.name,
          bay: m.bay,
          category: m.category,
        })),
        assignments: assignments.map((a) => {
          const mCodes = (a.assignedMachineIds || [])
            .map((mId) => machines.find((m) => m.id === mId)?.code)
            .filter(Boolean);
          return {
            date: a.date,
            shiftType: SHIFT_TYPE_INFO[a.shiftType]?.label || a.shiftType,
            shiftCode: SHIFT_TYPE_INFO[a.shiftType]?.code || a.shiftType,
            nurseId: a.nurseId,
            nurseName: a.nurseName,
            isLeader: a.isLeader,
            machines: mCodes,
            machineCount: a.assignedMachineIds?.length || 0,
            notes: a.notes,
          };
        }),
      };

      // Since Google Apps Script Webhooks typically redirect with 302, mode 'no-cors' or standard POST
      const response = await fetch(webhookUrl.trim(), {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok || response.type === 'opaque') {
        return {
          isSuccess: true,
          message: `Berhasil sinkronisasi ${assignments.length} data jadwal ke Google Sheets!`,
          rowsSynced: assignments.length,
        };
      } else {
        return {
          isSuccess: false,
          message: `Google Sheets mengembalikan status: ${response.status} ${response.statusText}`,
        };
      }
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      return {
        isSuccess: false,
        message: `Gagal menghubungi Google Sheet: ${errorMsg}`,
      };
    }
  }

  /**
   * Generates CSV format representing the monthly schedule & machine allocations.
   */
  static generateCsv(assignments: ShiftAssignment[], machines: Machine[]): string {
    const rows: string[] = [];
    rows.push('Tanggal,Sif,Kode Sif,Nama Perawat,Peran,No WhatsApp,Alokasi Mesin HD,Jumlah Mesin,Status Notifikasi,Catatan');

    assignments.forEach((a) => {
      const machineCodes = (a.assignedMachineIds || [])
        .map((id) => machines.find((m) => m.id === id)?.code)
        .filter(Boolean)
        .join(';');

      const leaderStr = a.isLeader ? 'PJ Sif' : 'Pelaksana';
      const waStatus = a.isWhatsAppSent ? 'Terkirim' : 'Belum';
      const shiftLabel = SHIFT_TYPE_INFO[a.shiftType]?.label || a.shiftType;
      const shiftCode = SHIFT_TYPE_INFO[a.shiftType]?.code || a.shiftType;

      rows.push(
        `"${a.date}","${shiftLabel}","${shiftCode}","${a.nurseName}","${leaderStr}","${a.nursePhone}","${machineCodes}",${a.assignedMachineIds?.length || 0},"${waStatus}","${a.notes || ''}"`
      );
    });

    return rows.join('\n');
  }

  /**
   * Triggers browser download of CSV file.
   */
  static downloadCsvFile(monthStr: string, assignments: ShiftAssignment[], machines: Machine[]): void {
    const csvContent = this.generateCsv(assignments, machines);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Jadwal_HD_${monthStr.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Exports monthly schedule matrix to CSV.
   */
  static exportMonthlyScheduleToCSV(monthStr: string, nurses: Nurse[], assignments: ShiftAssignment[]): void {
    const activeNurses = nurses.filter((n) => n.isActive);
    const parts = monthStr.split('-');
    const year = parseInt(parts[0], 10) || new Date().getFullYear();
    const month = parseInt(parts[1], 10) || (new Date().getMonth() + 1);
    const daysInMonth = new Date(year, month, 0).getDate();

    const headers = ['Nama Perawat', 'Jabatan'];
    for (let d = 1; d <= daysInMonth; d++) {
      headers.push(String(d));
    }
    headers.push('Total Sif');

    const rows = [headers.join(',')];

    activeNurses.forEach((nurse) => {
      let totalWork = 0;
      const row = [`"${nurse.name}"`, `"${nurse.role}"`];

      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const assignment = assignments.find((a) => a.date === dateStr && a.nurseId === nurse.id);
        const code = assignment ? SHIFT_TYPE_INFO[assignment.shiftType]?.code || assignment.shiftType : 'L';
        if (assignment && (assignment.shiftType === 'PAGI' || assignment.shiftType === 'SIANG')) {
          totalWork++;
        }
        row.push(`"${code}"`);
      }
      row.push(String(totalWork));
      rows.push(row.join(','));
    });

    const csvContent = rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Jadwal_Matriks_HD_${monthStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Copies TSV table to Clipboard for pasting directly into Google Sheets / Excel.
   */
  static async copyTableToClipboard(assignments: ShiftAssignment[], machines: Machine[]): Promise<boolean> {
    const rows: string[] = [];
    rows.push('Tanggal\tSif\tNama Perawat\tPeran\tAlokasi Mesin HD\tJumlah Mesin\tNo WhatsApp\tCatatan');

    assignments.forEach((a) => {
      const machineCodes = (a.assignedMachineIds || [])
        .map((id) => machines.find((m) => m.id === id)?.code)
        .filter(Boolean)
        .join(', ');
      const leaderStr = a.isLeader ? 'PJ Sif' : 'Pelaksana';
      const shiftLabel = SHIFT_TYPE_INFO[a.shiftType]?.label || a.shiftType;

      rows.push(`${a.date}\t${shiftLabel}\t${a.nurseName}\t${leaderStr}\t${machineCodes}\t${a.assignedMachineIds?.length || 0}\t${a.nursePhone}\t${a.notes || ''}`);
    });

    try {
      await navigator.clipboard.writeText(rows.join('\n'));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Ready-to-use Google Apps Script code for Webhook endpoint.
   */
  static getGoogleAppsScriptTemplate(): string {
    return `// ==========================================
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
    ]]).setBackground("#0061A4").setFontColor("#FFFFFF").setFontWeight("bold");
    
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
}`;
  }
}
