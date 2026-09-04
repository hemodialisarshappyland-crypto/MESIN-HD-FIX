export type NurseRole = 'KARU' | 'KATIM' | 'PELAKSANA';

export type HeadNurseReportFormat = 'LENGKAP_MESIN' | 'RINGKAS' | 'NAMA_PERAWAT';

export interface NurseRoleInfo {
  title: string;
  badgeClass: string;
}

export const NURSE_ROLE_INFO: Record<NurseRole, NurseRoleInfo> = {
  KARU: { title: 'Kepala Ruangan', badgeClass: 'bg-amber-100 text-amber-800 border-amber-300' },
  KATIM: { title: 'PJ Sif / Katim', badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
  PELAKSANA: { title: 'Perawat Pelaksana', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' },
};

export interface Nurse {
  id: number;
  name: string;
  nip: string;
  phone: string; // e.g. "081234567801"
  role: NurseRole;
  isActive: boolean;
  defaultOffDay?: number | null; // 1 for Mon, 7 for Sun
  skillLevel: 'Senior' | 'Medium' | 'Junior';
  specialDuty?: string | null; // e.g. "BHP", "NATRIUM RO", "FARMASI & LOGISTIK", etc.
  isPermanent?: boolean; // Locked & permanently persisted
}

export interface SpecialDutyInfo {
  code: string;
  label: string;
  shortName: string;
  description: string;
  badgeClass: string;
  textClass: string;
  bgClass: string;
  borderClass: string;
  iconName: 'Package' | 'Droplets' | 'Pill' | 'RefreshCw' | 'ShieldAlert' | 'FileCheck2' | 'Tag' | 'Zap' | 'AlertTriangle';
}

export const SPECIAL_DUTY_OPTIONS: Record<string, SpecialDutyInfo> = {
  'CITO': {
    code: 'CITO',
    label: 'CITO (HD Darurat & Mesin Isolasi)',
    shortName: 'CITO',
    description: 'Penanganan tindakan HD darurat/cito serta penanggung jawab mutlak Alokasi Mesin Isolasi (C08 & C09)',
    badgeClass: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950/70 dark:text-red-300 dark:border-red-800',
    textClass: 'text-red-700 dark:text-red-300',
    bgClass: 'bg-red-50 dark:bg-red-950/40',
    borderClass: 'border-red-200 dark:border-red-800',
    iconName: 'Zap',
  },
  'BHP': {
    code: 'BHP',
    label: 'BHP (Bahan Habis Pakai)',
    shortName: 'BHP',
    description: 'Pengelolaan spuit, bloodline, AV fistula, dialyzer, heparin, kassa, & desinfektan mesin HD',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800',
    textClass: 'text-emerald-700 dark:text-emerald-300',
    bgClass: 'bg-emerald-50 dark:bg-emerald-950/40',
    borderClass: 'border-emerald-200 dark:border-emerald-800',
    iconName: 'Package',
  },
  'NATRIUM RO': {
    code: 'NATRIUM RO',
    label: 'NATRIUM RO (Water Treatment & Bikarbonat)',
    shortName: 'NATRIUM RO',
    description: 'Pemantauan Water Treatment RO, uji TDS & klorin, mixing konsentrat natrium bikarbonat harian',
    badgeClass: 'bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-950/70 dark:text-cyan-300 dark:border-cyan-800',
    textClass: 'text-cyan-700 dark:text-cyan-300',
    bgClass: 'bg-cyan-50 dark:bg-cyan-950/40',
    borderClass: 'border-cyan-200 dark:border-cyan-800',
    iconName: 'Droplets',
  },
  'FARMASI & LOGISTIK': {
    code: 'FARMASI & LOGISTIK',
    label: 'FARMASI & LOGISTIK (Obat & Amprah)',
    shortName: 'FARMASI & LOGISTIK',
    description: 'Pengelolaan obat emergensi, EPO / Eritropoietin, zat besi IV, amprah farmasi & logistik umum ruangan',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/70 dark:text-purple-300 dark:border-purple-800',
    textClass: 'text-purple-700 dark:text-purple-300',
    bgClass: 'bg-purple-50 dark:bg-purple-950/40',
    borderClass: 'border-purple-200 dark:border-purple-800',
    iconName: 'Pill',
  },
  'REUSE DIALYZER': {
    code: 'REUSE DIALYZER',
    label: 'REUSE DIALYZER (Reprocessing Tabung)',
    shortName: 'REUSE DIALYZER',
    description: 'Pencucian otomatis/manual, uji bundle volume, sterilisasi & penyimpanan dialyzer reuse',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800',
    textClass: 'text-amber-700 dark:text-amber-300',
    bgClass: 'bg-amber-50 dark:bg-amber-950/40',
    borderClass: 'border-amber-200 dark:border-amber-800',
    iconName: 'RefreshCw',
  },
  'IPCN / PPI HD': {
    code: 'IPCN / PPI HD',
    label: 'IPCN / PPI HD (Pencegahan Infeksi)',
    shortName: 'IPCN / PPI',
    description: 'Audit kepatuhan APD cuci tangan, surveillance flebitis/bakteremia, alur pembuangan limbah medis B3',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800',
    textClass: 'text-rose-700 dark:text-rose-300',
    bgClass: 'bg-rose-50 dark:bg-rose-950/40',
    borderClass: 'border-rose-200 dark:border-rose-800',
    iconName: 'ShieldAlert',
  },
  'KLAIM & DOKUMEN BPJS': {
    code: 'KLAIM & DOKUMEN BPJS',
    label: 'KLAIM & DOKUMEN BPJS (Administrasi Rekam Medis)',
    shortName: 'KLAIM BPJS',
    description: 'Pengecekan resep HD, kelengkapan SEP, travel letter, audit berkas verifikasi klaim BPJS Kesehatan',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-800',
    textClass: 'text-blue-700 dark:text-blue-300',
    bgClass: 'bg-blue-50 dark:bg-blue-950/40',
    borderClass: 'border-blue-200 dark:border-blue-800',
    iconName: 'FileCheck2',
  },
};

/**
 * Parses multiple special duties from a string (comma, semicolon, or slash separated)
 */
export const parseSpecialDuties = (dutyStr?: string | null): string[] => {
  if (!dutyStr || typeof dutyStr !== 'string') return [];
  return dutyStr
    .split(/[,;/]+/)
    .map((s) => s.trim())
    .filter(Boolean);
};

/**
 * Formats multiple special duty codes into a standardized comma-separated string
 */
export const formatSpecialDuties = (duties: string[]): string | null => {
  const unique = Array.from(new Set(duties.map((s) => s.trim()).filter(Boolean)));
  return unique.length > 0 ? unique.join(', ') : null;
};

export type MachineStatus = 'AKTIF' | 'TIDAK_DIGUNAKAN' | 'MAINTENANCE' | 'RUSAK';

export const MACHINE_STATUS_INFO: Record<MachineStatus, { label: string; colorClass: string; dotClass: string }> = {
  AKTIF: { label: 'Aktif Normal', colorClass: 'bg-emerald-100 text-emerald-900 border-emerald-300', dotClass: 'bg-emerald-600' },
  TIDAK_DIGUNAKAN: { label: 'Tidak Digunakan', colorClass: 'bg-slate-200 text-slate-800 border-slate-400', dotClass: 'bg-slate-500' },
  MAINTENANCE: { label: 'Dalam Perawatan', colorClass: 'bg-amber-100 text-amber-900 border-amber-300', dotClass: 'bg-amber-600' },
  RUSAK: { label: 'Rusak / Off', colorClass: 'bg-rose-100 text-rose-900 border-rose-300', dotClass: 'bg-rose-600' },
};

export type MachineCategory = 'REGULER' | 'HEPATITIS_B' | 'HEPATITIS_C' | 'ISOLASI';

export const MACHINE_CATEGORY_INFO: Record<MachineCategory, { label: string; isSpecial: boolean; badgeClass: string }> = {
  REGULER: { label: 'Reguler', isSpecial: false, badgeClass: 'bg-slate-200 text-slate-800 font-bold' },
  HEPATITIS_B: { label: 'Hepatitis B', isSpecial: true, badgeClass: 'bg-purple-100 text-purple-900 font-black border border-purple-300' },
  HEPATITIS_C: { label: 'Hepatitis C', isSpecial: true, badgeClass: 'bg-pink-100 text-pink-900 font-black border border-pink-300' },
  ISOLASI: { label: 'Isolasi Khusus', isSpecial: true, badgeClass: 'bg-red-100 text-red-900 font-black border border-red-300' },
};

export interface Machine {
  id: number; // 1 to 25
  code: string; // "M-01", "M-02" ... "M-25"
  name: string; // "Mesin HD 01"
  bay: string; // "Bay A (Reguler)", "Bay B (Reguler)", "Bay C (Reguler)", "Ruang Khusus Hepatitis B", "Ruang Khusus Hepatitis C", "Ruang Isolasi Tekanan Negatif"
  category: MachineCategory;
  status: MachineStatus;
  brandModel: string;
  notes?: string;
}

export type ShiftType = 'PAGI' | 'SIANG' | 'LIBUR' | 'CUTI' | 'SAKIT';

export const SHIFT_TYPE_INFO: Record<ShiftType, { code: string; label: string; timeRange: string; isWorkShift: boolean; badgeClass: string; textClass: string; bgClass: string }> = {
  PAGI: { code: 'P', label: 'Sif Pagi', timeRange: '07.00 - 14.00 WIB', isWorkShift: true, badgeClass: 'bg-sky-500 text-white', textClass: 'text-sky-700', bgClass: 'bg-sky-50 border-sky-200' },
  SIANG: { code: 'S', label: 'Sif Siang', timeRange: '12.00 - 19.00 WIB', isWorkShift: true, badgeClass: 'bg-amber-500 text-white', textClass: 'text-amber-700', bgClass: 'bg-amber-50 border-amber-200' },
  LIBUR: { code: 'L', label: 'Libur / Off', timeRange: '-', isWorkShift: false, badgeClass: 'bg-slate-400 text-white', textClass: 'text-slate-600', bgClass: 'bg-slate-100 border-slate-200' },
  CUTI: { code: 'C', label: 'Cuti Tahunan', timeRange: '-', isWorkShift: false, badgeClass: 'bg-teal-500 text-white', textClass: 'text-teal-700', bgClass: 'bg-teal-50 border-teal-200' },
  SAKIT: { code: 'Skt', label: 'Sakit / Izin', timeRange: '-', isWorkShift: false, badgeClass: 'bg-rose-500 text-white', textClass: 'text-rose-700', bgClass: 'bg-rose-50 border-rose-200' },
};

export interface ShiftAssignment {
  id: string; // unique ID
  date: string; // "YYYY-MM-DD" e.g. "2026-09-01"
  shiftType: ShiftType;
  nurseId: number;
  nurseName: string;
  nursePhone: string;
  assignedMachineIds: number[];
  isLeader: boolean;
  isWhatsAppSent: boolean;
  notes: string;
  specialDuty?: string | null; // e.g. "BHP", "NATRIUM RO", "FARMASI & LOGISTIK", etc.
}

export interface AppSettings {
  id: number;
  hospitalName: string;
  roomName: string;
  headNurseName: string;
  headNursePhone: string;
  googleSheetWebhookUrl: string;
  googleSpreadsheetIdOrUrl: string;
  autoSyncGoogleSheets: boolean;
  minNursesPerShift: number;
  maxConsecutiveWorkDays: number;
  lastSyncTimestamp?: number;
  lastSyncStatus?: string;
}

export interface NurseMonthlyStat {
  nurseId: number;
  nurseName: string;
  role: NurseRole;
  pagiCount: number;
  siangCount: number;
  liburCount: number;
  cutiCount: number;
  sakitCount: number;
  totalWorkingShifts: number;
  totalMachinesAssigned: number;
  avgMachinesPerShift: number;
  isolationMachinesHandled: number;
}

export interface FairnessReport {
  monthString: string;
  totalNurses: number;
  totalDays: number;
  totalPagiShifts: number;
  totalSiangShifts: number;
  totalOffDays: number;
  avgShiftsPerNurse: number;
  minShifts: number;
  maxShifts: number;
  avgMachinesPerNurse: number;
  fairnessScorePercent: number; // 0 - 100%
  nurseStats: NurseMonthlyStat[];
}

export type UserRole = 'admin' | 'karu' | 'nurse';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  nurseId?: number | null;
  phone?: string;
  photoURL?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RegisteredAccountSummary {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  nurseId?: number | null;
  phone?: string;
  createdAt?: string;
  password?: string;
}
