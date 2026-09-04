import { Nurse, ShiftAssignment, ShiftType, Machine, SHIFT_TYPE_INFO } from '../types';
import { FairSchedulerEngine } from './FairSchedulerEngine';

// Dynamic loader for XLSX to keep initial mobile bundle ultra-lightweight
const getXLSX = async () => {
  return await import('xlsx');
};

export interface ImportPreviewItem {
  date: string;
  nurseId: number;
  nurseName: string;
  nursePhone: string;
  shiftType: ShiftType;
  rawShiftCode: string;
  assignedMachineIds: number[];
  isLeader: boolean;
  notes: string;
  isMatched: boolean;
  warning?: string;
}

export interface ImportParseResult {
  isSuccess: boolean;
  message: string;
  monthString: string; // e.g. "2026-09"
  totalRows: number;
  detectedNursesCount: number;
  unmatchedNurses: string[];
  newNursesCreated?: Nurse[];
  daysCount: number;
  shiftCounts: {
    pagi: number;
    siang: number;
    libur: number;
    cuti: number;
    sakit: number;
    other: number;
  };
  assignments: ShiftAssignment[];
  previewList: ImportPreviewItem[];
}

export class ScheduleImportService {
  /**
   * Normalizes arbitrary string into recognized ShiftType.
   */
  static normalizeShiftCode(raw: string | number | undefined | null): ShiftType {
    if (raw === undefined || raw === null) return 'LIBUR';
    const str = String(raw).trim().toUpperCase();

    if (!str || str === '-' || str === '0') return 'LIBUR';

    // PAGI
    if (
      str === 'P' ||
      str === 'PAGI' ||
      str === 'P1' ||
      str === 'P2' ||
      str === 'MORNING' ||
      str === 'M' ||
      str.includes('PAGI')
    ) {
      return 'PAGI';
    }

    // SIANG / SORE
    if (
      str === 'S' ||
      str === 'SIANG' ||
      str === 'SORE' ||
      str === 'AFTERNOON' ||
      str === 'A' ||
      str === 'E' || // Evening
      str.includes('SIANG') ||
      str.includes('SORE')
    ) {
      return 'SIANG';
    }

    // CUTI
    if (
      str === 'C' ||
      str === 'CUTI' ||
      str === 'CT' ||
      str === 'LEAVE' ||
      str.includes('CUTI')
    ) {
      return 'CUTI';
    }

    // SAKIT / IZIN
    if (
      str === 'SKT' ||
      str === 'SAKIT' ||
      str === 'IZIN' ||
      str === 'IJIN' ||
      str === 'I' ||
      str === 'SICK' ||
      str.includes('SAKIT') ||
      str.includes('IZIN')
    ) {
      return 'SAKIT';
    }

    // LIBUR / OFF
    if (
      str === 'L' ||
      str === 'LIBUR' ||
      str === 'OFF' ||
      str === 'O' ||
      str === 'F' ||
      str === 'FREE' ||
      str.includes('LIBUR') ||
      str.includes('OFF')
    ) {
      return 'LIBUR';
    }

    return 'LIBUR';
  }

  /**
   * Matches a raw nurse name or NIP to existing Nurse record.
   */
  static matchNurse(rawName: string, nurses: Nurse[]): Nurse | null {
    if (!rawName) return null;
    const cleanRaw = rawName.trim().toLowerCase().replace(/^(ns\.|ners|dr\.|hj\.|h\.)\s*/i, '');

    // 1. Exact match
    const exact = nurses.find((n) => n.name.toLowerCase() === cleanRaw || n.name.toLowerCase() === rawName.trim().toLowerCase());
    if (exact) return exact;

    // 2. NIP match
    const byNip = nurses.find((n) => n.nip && n.nip.trim() === rawName.trim());
    if (byNip) return byNip;

    // 3. Substring / Includes match
    const partial = nurses.find((n) => {
      const nClean = n.name.toLowerCase().replace(/^(ns\.|ners|dr\.|hj\.|h\.)\s*/i, '');
      return cleanRaw.includes(nClean) || nClean.includes(cleanRaw);
    });
    if (partial) return partial;

    // 4. First word match (e.g. "Sri", "Wahyu")
    const firstWordRaw = cleanRaw.split(/\s+/)[0];
    if (firstWordRaw && firstWordRaw.length >= 3) {
      const byFirstWord = nurses.find((n) => {
        const nClean = n.name.toLowerCase().replace(/^(ns\.|ners|dr\.|hj\.|h\.)\s*/i, '');
        return nClean.split(/\s+/)[0] === firstWordRaw;
      });
      if (byFirstWord) return byFirstWord;
    }

    return null;
  }

  /**
   * Parses an ArrayBuffer (from Excel .xlsx, .xls, .csv) into structured Schedule.
   */
  static async parseExcelFile(
    fileBuffer: ArrayBuffer,
    targetMonth: string, // e.g. "2026-09"
    nurses: Nurse[],
    machines: Machine[],
    autoAllocateMachines: boolean = true
  ): Promise<ImportParseResult> {
    try {
      const XLSX = await getXLSX();
      const workbook = XLSX.read(fileBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        return {
          isSuccess: false,
          message: 'File Excel tidak memiliki lembar kerja (Sheet) yang valid.',
          monthString: targetMonth,
          totalRows: 0,
          detectedNursesCount: 0,
          unmatchedNurses: [],
          daysCount: 0,
          shiftCounts: { pagi: 0, siang: 0, libur: 0, cuti: 0, sakit: 0, other: 0 },
          assignments: [],
          previewList: [],
        };
      }

      const worksheet = workbook.Sheets[sheetName];
      const rawRows: (string | number | undefined | null)[][] = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: '',
      });

      return this.parseRawMatrixOrList(rawRows, targetMonth, nurses, machines, autoAllocateMachines);
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      return {
        isSuccess: false,
        message: `Gagal membaca file Excel: ${errorMsg}`,
        monthString: targetMonth,
        totalRows: 0,
        detectedNursesCount: 0,
        unmatchedNurses: [],
        daysCount: 0,
        shiftCounts: { pagi: 0, siang: 0, libur: 0, cuti: 0, sakit: 0, other: 0 },
        assignments: [],
        previewList: [],
      };
    }
  }

  /**
   * Parses Raw 2D Array Matrix (from Excel, CSV, TSV, or Google Sheets).
   */
  static parseRawMatrixOrList(
    rows: (string | number | undefined | null)[][],
    targetMonth: string,
    nurses: Nurse[],
    machines: Machine[],
    autoAllocateMachines: boolean = true
  ): ImportParseResult {
    if (!rows || rows.length === 0) {
      return {
        isSuccess: false,
        message: 'Data kosong atau tidak dapat dibaca.',
        monthString: targetMonth,
        totalRows: 0,
        detectedNursesCount: 0,
        unmatchedNurses: [],
        newNursesCreated: [],
        daysCount: 0,
        shiftCounts: { pagi: 0, siang: 0, libur: 0, cuti: 0, sakit: 0, other: 0 },
        assignments: [],
        previewList: [],
      };
    }

    // Filter out completely blank rows
    const validRows = rows.filter((r) => r && r.some((cell) => cell !== '' && cell !== null && cell !== undefined));

    // Determine whether this is List Format (columns: Tanggal, Nama, Shift) or Matrix Format (Rows: Nurses, Cols: Days 1..31)
    const isListFormat = this.detectIfListFormat(validRows);

    if (isListFormat) {
      return this.parseListFormat(validRows, targetMonth, nurses, machines, autoAllocateMachines);
    } else {
      return this.parseMatrixFormat(validRows, targetMonth, nurses, machines, autoAllocateMachines);
    }
  }

  /**
   * Helper to detect if tabular data is in flat List format (Tanggal | Nama | Shift).
   */
  private static detectIfListFormat(rows: (string | number | undefined | null)[][]): boolean {
    const firstFew = rows.slice(0, 5);
    for (const row of firstFew) {
      const strRow = row.map((c) => String(c).toLowerCase()).join(' ');
      if (
        (strRow.includes('tanggal') || strRow.includes('date')) &&
        (strRow.includes('nama') || strRow.includes('perawat') || strRow.includes('nurse')) &&
        (strRow.includes('sif') || strRow.includes('shift') || strRow.includes('kode'))
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Parses standard Hospital Schedule Matrix format.
   * Row: [ "Nama Perawat", "Jabatan", "1", "2", "3", ... "31" ]
   */
  private static parseMatrixFormat(
    rows: (string | number | undefined | null)[][],
    targetMonth: string,
    nurses: Nurse[],
    machines: Machine[],
    autoAllocateMachines: boolean
  ): ImportParseResult {
    const [yearStr, monthStr] = targetMonth.split('-');
    const year = parseInt(yearStr, 10) || new Date().getFullYear();
    const month = parseInt(monthStr, 10) || (new Date().getMonth() + 1);
    const daysInMonth = new Date(year, month, 0).getDate();

    // Find header row containing day numbers (1..28/31) or column indicators
    let headerRowIdx = -1;
    let dayColMap: { colIdx: number; day: number }[] = [];

    for (let r = 0; r < Math.min(rows.length, 10); r++) {
      const row = rows[r];
      const cols: { colIdx: number; day: number }[] = [];

      for (let c = 0; c < row.length; c++) {
        const val = row[c];
        if (val !== undefined && val !== null) {
          const num = parseInt(String(val).trim(), 10);
          if (!isNaN(num) && num >= 1 && num <= daysInMonth) {
            cols.push({ colIdx: c, day: num });
          }
        }
      }

      // If we found at least 15 days in this header row, this is the day-header row!
      if (cols.length >= 15) {
        headerRowIdx = r;
        dayColMap = cols.sort((a, b) => a.day - b.day);
        break;
      }
    }

    // Fallback: If no explicit 1..31 header row found, assume columns 2 onwards are days 1..N
    if (headerRowIdx === -1) {
      headerRowIdx = 0;
      dayColMap = [];
      for (let d = 1; d <= daysInMonth; d++) {
        // Assume col index 1 + d (col 0 = No/Name, col 1 = Role/Name, col 2 = Day 1)
        dayColMap.push({ colIdx: d + 1, day: d });
      }
    }

    const assignments: ShiftAssignment[] = [];
    const previewList: ImportPreviewItem[] = [];
    const unmatchedNurses: Set<string> = new Set();
    const matchedNurseIds: Set<number> = new Set();
    const workingNurses = [...nurses];
    const newNursesCreated: Nurse[] = [];
    let nextNurseId = (workingNurses.length > 0 ? Math.max(...workingNurses.map((n) => n.id)) : 0) + 1;

    const shiftCounts = { pagi: 0, siang: 0, libur: 0, cuti: 0, sakit: 0, other: 0 };

    // Process data rows below header
    for (let r = headerRowIdx + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length === 0) continue;

      // Find nurse name column (usually col 0, 1, or 2)
      let rawName = '';
      for (let c = 0; c < Math.min(row.length, 4); c++) {
        const cell = String(row[c] || '').trim();
        // If not a pure number and length > 2
        if (cell && isNaN(Number(cell)) && cell.length >= 2 && !cell.toLowerCase().includes('total') && !cell.toLowerCase().includes('jumlah')) {
          rawName = cell;
          break;
        }
      }

      if (!rawName) continue;

      let matchedNurse = this.matchNurse(rawName, workingNurses);

      if (!matchedNurse) {
        // Auto-register perawat baru dari file import agar jumlah total staf sesuai file user
        matchedNurse = {
          id: nextNurseId++,
          name: rawName,
          nip: '',
          phone: '',
          role: 'PELAKSANA',
          isActive: true,
          defaultOffDay: null,
          skillLevel: 'Senior',
          specialDuty: null,
        };
        workingNurses.push(matchedNurse);
        newNursesCreated.push(matchedNurse);
      }

      matchedNurseIds.add(matchedNurse.id);

      // Process each day column
      dayColMap.forEach(({ colIdx, day }) => {
        if (day > daysInMonth) return;
        const cellVal = row[colIdx];
        const rawCode = cellVal !== undefined && cellVal !== null ? String(cellVal).trim() : '';
        const shiftType = this.normalizeShiftCode(rawCode);

        // Update counts
        if (shiftType === 'PAGI') shiftCounts.pagi++;
        else if (shiftType === 'SIANG') shiftCounts.siang++;
        else if (shiftType === 'LIBUR') shiftCounts.libur++;
        else if (shiftType === 'CUTI') shiftCounts.cuti++;
        else if (shiftType === 'SAKIT') shiftCounts.sakit++;
        else shiftCounts.other++;

        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const assignmentId = `asg-${dateStr}-${matchedNurse.id}`;

        const assignment: ShiftAssignment = {
          id: assignmentId,
          date: dateStr,
          shiftType,
          nurseId: matchedNurse.id,
          nurseName: matchedNurse.name,
          nursePhone: matchedNurse.phone || '',
          assignedMachineIds: [], // will be filled if autoAllocateMachines is true
          isLeader: matchedNurse.role === 'KATIM' || matchedNurse.role === 'KARU',
          isWhatsAppSent: false,
          notes: rawCode && rawCode !== SHIFT_TYPE_INFO[shiftType]?.code ? `Import: ${rawCode}` : '',
          specialDuty: matchedNurse.specialDuty || null,
        };

        assignments.push(assignment);

        // Add to preview (sample first 60 items for fast rendering)
        if (previewList.length < 60) {
          previewList.push({
            date: dateStr,
            nurseId: matchedNurse.id,
            nurseName: matchedNurse.name,
            nursePhone: matchedNurse.phone,
            shiftType,
            rawShiftCode: rawCode || '-',
            assignedMachineIds: [],
            isLeader: assignment.isLeader,
            notes: assignment.notes,
            isMatched: true,
          });
        }
      });
    }

    if (assignments.length === 0) {
      return {
        isSuccess: false,
        message: 'Tidak ditemukan data perawat atau jadwal yang cocok. Periksa apakah nama perawat di file sesuai dengan daftar staf HD.',
        monthString: targetMonth,
        totalRows: rows.length,
        detectedNursesCount: matchedNurseIds.size,
        unmatchedNurses: Array.from(unmatchedNurses),
        newNursesCreated: [],
        daysCount: dayColMap.length,
        shiftCounts,
        assignments: [],
        previewList: [],
      };
    }

    // If auto allocation is enabled, allocate fair machines across the month
    let finalAssignments = assignments;
    if (autoAllocateMachines) {
      finalAssignments = FairSchedulerEngine.reallocateMonthlyMachinesPreservingShifts(
        targetMonth,
        assignments,
        workingNurses,
        machines,
        { rotateBays: true, consecutiveIsolationProtection: true }
      );
    }

    return {
      isSuccess: true,
      message: `Berhasil mengimpor jadwal untuk ${matchedNurseIds.size} perawat (${assignments.length} entri shift).${
        newNursesCreated.length > 0 ? ` Termasuk ${newNursesCreated.length} perawat baru didaftarkan.` : ''
      }`,
      monthString: targetMonth,
      totalRows: rows.length,
      detectedNursesCount: matchedNurseIds.size,
      unmatchedNurses: Array.from(unmatchedNurses),
      newNursesCreated,
      daysCount: dayColMap.length,
      shiftCounts,
      assignments: finalAssignments,
      previewList: previewList.map((p) => {
        const full = finalAssignments.find((a) => a.date === p.date && a.nurseId === p.nurseId);
        return {
          ...p,
          assignedMachineIds: full?.assignedMachineIds || [],
        };
      }),
    };
  }

  /**
   * Parses flat List format:
   * Columns: Tanggal, Nama Perawat, Sif, [Alokasi Mesin], [Catatan]
   */
  private static parseListFormat(
    rows: (string | number | undefined | null)[][],
    targetMonth: string,
    nurses: Nurse[],
    machines: Machine[],
    autoAllocateMachines: boolean
  ): ImportParseResult {
    let headerIdx = 0;
    let colDate = -1;
    let colName = -1;
    let colShift = -1;
    let colMachines = -1;
    let colNotes = -1;

    for (let r = 0; r < Math.min(rows.length, 5); r++) {
      const row = rows[r];
      for (let c = 0; c < row.length; c++) {
        const text = String(row[c] || '').toLowerCase().trim();
        if (text.includes('tanggal') || text.includes('date')) colDate = c;
        else if (text.includes('nama') || text.includes('perawat') || text.includes('nurse')) colName = c;
        else if (text.includes('sif') || text.includes('shift') || text.includes('kode')) colShift = c;
        else if (text.includes('mesin') || text.includes('machine')) colMachines = c;
        else if (text.includes('catatan') || text.includes('notes')) colNotes = c;
      }
      if (colDate !== -1 && colName !== -1 && colShift !== -1) {
        headerIdx = r;
        break;
      }
    }

    // Default fallback columns
    if (colDate === -1) colDate = 0;
    if (colName === -1) colName = 1;
    if (colShift === -1) colShift = 2;

    const assignments: ShiftAssignment[] = [];
    const previewList: ImportPreviewItem[] = [];
    const unmatchedNurses: Set<string> = new Set();
    const matchedNurseIds: Set<number> = new Set();
    const workingNurses = [...nurses];
    const newNursesCreated: Nurse[] = [];
    let nextNurseId = (workingNurses.length > 0 ? Math.max(...workingNurses.map((n) => n.id)) : 0) + 1;
    const shiftCounts = { pagi: 0, siang: 0, libur: 0, cuti: 0, sakit: 0, other: 0 };

    for (let r = headerIdx + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length <= Math.max(colDate, colName, colShift)) continue;

      const rawDate = String(row[colDate] || '').trim();
      const rawName = String(row[colName] || '').trim();
      const rawShift = String(row[colShift] || '').trim();
      const rawMachines = colMachines !== -1 ? String(row[colMachines] || '').trim() : '';
      const rawNotes = colNotes !== -1 ? String(row[colNotes] || '').trim() : '';

      if (!rawDate || !rawName) continue;

      // Normalize date to YYYY-MM-DD
      const normalizedDate = this.normalizeDateString(rawDate, targetMonth);
      if (!normalizedDate) continue;

      let matchedNurse = this.matchNurse(rawName, workingNurses);
      if (!matchedNurse) {
        matchedNurse = {
          id: nextNurseId++,
          name: rawName,
          nip: '',
          phone: '',
          role: 'PELAKSANA',
          isActive: true,
          defaultOffDay: null,
          skillLevel: 'Senior',
          specialDuty: null,
        };
        workingNurses.push(matchedNurse);
        newNursesCreated.push(matchedNurse);
      }

      matchedNurseIds.add(matchedNurse.id);
      const shiftType = this.normalizeShiftCode(rawShift);

      if (shiftType === 'PAGI') shiftCounts.pagi++;
      else if (shiftType === 'SIANG') shiftCounts.siang++;
      else if (shiftType === 'LIBUR') shiftCounts.libur++;
      else if (shiftType === 'CUTI') shiftCounts.cuti++;
      else if (shiftType === 'SAKIT') shiftCounts.sakit++;
      else shiftCounts.other++;

      // Parse machine IDs if explicitly provided (e.g. "A01, A02", "C01", "B05", "M-01")
      const parsedMachineIds: number[] = [];
      if (rawMachines) {
        const parts = rawMachines.split(/[;,|\t ]+/).map((s) => s.trim()).filter(Boolean);
        parts.forEach((p) => {
          const cleanP = p.toUpperCase().replace(/[^A-Z0-9]/g, '');
          const matchedByCode = machines.find(
            (m) =>
              m.code.toUpperCase().replace(/[^A-Z0-9]/g, '') === cleanP ||
              m.name.toUpperCase().replace(/[^A-Z0-9]/g, '') === cleanP
          );
          if (matchedByCode) {
            if (!parsedMachineIds.includes(matchedByCode.id)) {
              parsedMachineIds.push(matchedByCode.id);
            }
            return;
          }

          const mNum = parseInt(p.replace(/[^0-9]/g, ''), 10);
          if (!isNaN(mNum)) {
            const matchedById = machines.find((m) => m.id === mNum);
            if (matchedById && !parsedMachineIds.includes(matchedById.id)) {
              parsedMachineIds.push(matchedById.id);
            }
          }
        });
      }

      const assignmentId = `asg-${normalizedDate}-${matchedNurse.id}`;
      const assignment: ShiftAssignment = {
        id: assignmentId,
        date: normalizedDate,
        shiftType,
        nurseId: matchedNurse.id,
        nurseName: matchedNurse.name,
        nursePhone: matchedNurse.phone || '',
        assignedMachineIds: parsedMachineIds,
        isLeader: matchedNurse.role === 'KATIM' || matchedNurse.role === 'KARU',
        isWhatsAppSent: false,
        notes: rawNotes,
        specialDuty: matchedNurse.specialDuty || null,
      };

      assignments.push(assignment);

      if (previewList.length < 60) {
        previewList.push({
          date: normalizedDate,
          nurseId: matchedNurse.id,
          nurseName: matchedNurse.name,
          nursePhone: matchedNurse.phone,
          shiftType,
          rawShiftCode: rawShift,
          assignedMachineIds: parsedMachineIds,
          isLeader: assignment.isLeader,
          notes: rawNotes,
          isMatched: true,
        });
      }
    }

    let finalAssignments = assignments;
    if (autoAllocateMachines && assignments.some((a) => a.assignedMachineIds.length === 0)) {
      finalAssignments = FairSchedulerEngine.reallocateMonthlyMachinesPreservingShifts(
        targetMonth,
        assignments,
        workingNurses,
        machines,
        { rotateBays: true, consecutiveIsolationProtection: true }
      );
    }

    return {
      isSuccess: assignments.length > 0,
      message:
        assignments.length > 0
          ? `Berhasil mengimpor ${assignments.length} baris jadwal untuk ${matchedNurseIds.size} perawat.${
              newNursesCreated.length > 0 ? ` Termasuk ${newNursesCreated.length} perawat baru didaftarkan.` : ''
            }`
          : 'Gagal mengimpor daftar jadwal.',
      monthString: targetMonth,
      totalRows: rows.length,
      detectedNursesCount: matchedNurseIds.size,
      unmatchedNurses: Array.from(unmatchedNurses),
      newNursesCreated,
      daysCount: new Set(assignments.map((a) => a.date)).size,
      shiftCounts,
      assignments: finalAssignments,
      previewList,
    };
  }

  /**
   * Normalizes various date inputs into YYYY-MM-DD.
   */
  private static normalizeDateString(rawDate: string, targetMonth: string): string | null {
    if (!rawDate) return null;
    const clean = rawDate.trim();

    // Already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
      return clean;
    }

    // DD/MM/YYYY or DD-MM-YYYY
    const dmy = clean.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (dmy) {
      const d = dmy[1].padStart(2, '0');
      const m = dmy[2].padStart(2, '0');
      const y = dmy[3];
      return `${y}-${m}-${d}`;
    }

    // Just Day number "1" .. "31"
    const justDay = parseInt(clean, 10);
    if (!isNaN(justDay) && justDay >= 1 && justDay <= 31) {
      const [yearStr, monthStr] = targetMonth.split('-');
      return `${yearStr}-${monthStr}-${String(justDay).padStart(2, '0')}`;
    }

    // Standard JavaScript parseable
    const parsed = new Date(clean);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }

    return null;
  }

  /**
   * Fetches CSV from a public Google Sheets URL or Spreadsheet ID.
   */
  static async fetchFromGoogleSheetsUrl(
    sheetUrlOrId: string,
    targetMonth: string,
    nurses: Nurse[],
    machines: Machine[],
    autoAllocateMachines: boolean = true
  ): Promise<ImportParseResult> {
    if (!sheetUrlOrId || !sheetUrlOrId.trim()) {
      return {
        isSuccess: false,
        message: 'Tautan atau ID Google Sheets belum dimasukkan.',
        monthString: targetMonth,
        totalRows: 0,
        detectedNursesCount: 0,
        unmatchedNurses: [],
        daysCount: 0,
        shiftCounts: { pagi: 0, siang: 0, libur: 0, cuti: 0, sakit: 0, other: 0 },
        assignments: [],
        previewList: [],
      };
    }

    const cleanInput = sheetUrlOrId.trim();
    let csvUrl = cleanInput;

    // Extract Spreadsheet ID if a full Google Sheets URL was pasted
    const idMatch = cleanInput.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (idMatch && idMatch[1]) {
      const sheetId = idMatch[1];
      csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`;
    } else if (!cleanInput.startsWith('http') && /^[a-zA-Z0-9-_]{20,}$/.test(cleanInput)) {
      // Plain ID
      csvUrl = `https://docs.google.com/spreadsheets/d/${cleanInput}/gviz/tq?tqx=out:csv`;
    }

    try {
      const response = await fetch(csvUrl);
      if (!response.ok) {
        return {
          isSuccess: false,
          message: `Gagal mengakses Google Sheets (Status ${response.status}). Pastikan Spreadsheet di-share ke 'Anyone with the link can view' (Siapa saja yang memiliki link).`,
          monthString: targetMonth,
          totalRows: 0,
          detectedNursesCount: 0,
          unmatchedNurses: [],
          daysCount: 0,
          shiftCounts: { pagi: 0, siang: 0, libur: 0, cuti: 0, sakit: 0, other: 0 },
          assignments: [],
          previewList: [],
        };
      }

      const csvText = await response.text();
      return await this.parseCsvOrTsvText(csvText, targetMonth, nurses, machines, autoAllocateMachines);
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      return {
        isSuccess: false,
        message: `Koneksi Google Sheets gagal: ${errorMsg}. Pastikan Sheet di-setting publik dan koneksi internet stabil.`,
        monthString: targetMonth,
        totalRows: 0,
        detectedNursesCount: 0,
        unmatchedNurses: [],
        daysCount: 0,
        shiftCounts: { pagi: 0, siang: 0, libur: 0, cuti: 0, sakit: 0, other: 0 },
        assignments: [],
        previewList: [],
      };
    }
  }

  /**
   * Parses Raw CSV / TSV text (e.g. pasted directly from clipboard).
   */
  static async parseCsvOrTsvText(
    text: string,
    targetMonth: string,
    nurses: Nurse[],
    machines: Machine[],
    autoAllocateMachines: boolean = true
  ): Promise<ImportParseResult> {
    if (!text || !text.trim()) {
      return {
        isSuccess: false,
        message: 'Teks CSV / TSV kosong.',
        monthString: targetMonth,
        totalRows: 0,
        detectedNursesCount: 0,
        unmatchedNurses: [],
        daysCount: 0,
        shiftCounts: { pagi: 0, siang: 0, libur: 0, cuti: 0, sakit: 0, other: 0 },
        assignments: [],
        previewList: [],
      };
    }

    const XLSX = await getXLSX();

    // Determine delimiter (Tab or Comma or Semicolon)
    const firstLine = text.split('\n')[0] || '';
    let delimiter = ',';
    if (firstLine.includes('\t')) delimiter = '\t';
    else if (firstLine.includes(';') && !firstLine.includes(',')) delimiter = ';';

    const workbook = XLSX.read(text, { type: 'string', raw: true });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawRows: (string | number | undefined | null)[][] = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
    });

    return this.parseRawMatrixOrList(rawRows, targetMonth, nurses, machines, autoAllocateMachines);
  }

  /**
   * Generates a downloadable Excel (.xlsx) Template for Monthly Schedule.
   */
  static async downloadExcelTemplate(monthStr: string, nurses: Nurse[]): Promise<void> {
    const XLSX = await getXLSX();
    const activeNurses = nurses.filter((n) => n.isActive);
    const parts = monthStr.split('-');
    const year = parseInt(parts[0], 10) || new Date().getFullYear();
    const month = parseInt(parts[1], 10) || (new Date().getMonth() + 1);
    const daysInMonth = new Date(year, month, 0).getDate();

    // 1. Headers
    const headers = ['No', 'Nama Perawat', 'NIP', 'Peran'];
    for (let d = 1; d <= daysInMonth; d++) {
      headers.push(String(d));
    }

    // 2. Rows with prefilled nurse list
    const dataRows: (string | number)[][] = [headers];

    activeNurses.forEach((nurse, idx) => {
      const row: (string | number)[] = [
        idx + 1,
        nurse.name,
        nurse.nip || '-',
        nurse.role === 'KARU' ? 'Karu' : nurse.role === 'KATIM' ? 'Katim' : 'Pelaksana',
      ];

      // Sample mock rotation (P, S, L, P, S, L)
      for (let d = 1; d <= daysInMonth; d++) {
        const sampleCode = d % 3 === 1 ? 'P' : d % 3 === 2 ? 'S' : 'L';
        row.push(sampleCode);
      }
      dataRows.push(row);
    });

    // 3. Create Workbook & Worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(dataRows);
    
    // Set column widths
    const colWidths = [
      { wch: 5 },  // No
      { wch: 25 }, // Nama
      { wch: 18 }, // NIP
      { wch: 14 }, // Peran
    ];
    for (let d = 1; d <= daysInMonth; d++) {
      colWidths.push({ wch: 4 });
    }
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Jadwal HD ${monthStr}`);

    // 4. Download file
    XLSX.writeFile(workbook, `Template_Jadwal_HD_${monthStr}.xlsx`);
  }
}
