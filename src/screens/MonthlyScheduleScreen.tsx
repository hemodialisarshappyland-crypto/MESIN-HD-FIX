import React, { useState, useMemo } from 'react';
import { useHemo } from '../context/HemoContext';
import { ShiftAssignment, ShiftType, SHIFT_TYPE_INFO, NURSE_ROLE_INFO, Nurse } from '../types';
import { GoogleSheetsService } from '../domain/GoogleSheetsService';
import { RegenerateMachineAllocationModal } from '../components/RegenerateMachineAllocationModal';
import { ImportScheduleModal } from '../components/ImportScheduleModal';
import { EditAssignmentModal } from '../components/EditAssignmentModal';
import { SpecialDutyModal } from '../components/SpecialDutyModal';
import { SpecialDutyBadge } from '../components/SpecialDutyBadge';
import { ReadOnlyBanner } from '../components/ReadOnlyBanner';
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Download,
  Upload,
  FileSpreadsheet,
  Filter,
  Users,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Edit2,
  Tag,
} from 'lucide-react';

export const MonthlyScheduleScreen: React.FC = () => {
  const {
    isAdmin,
    currentMonth,
    setCurrentMonth,
    nurses,
    machines,
    assignments,
    setShift,
    updateAssignment,
    generateMonthlySchedule,
    isGenerating,
    showToast,
    selectDate,
  } = useHemo();

  const [selectedNurseFilter, setSelectedNurseFilter] = useState<number | 'ALL'>('ALL');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL');
  const [isReallocateModalOpen, setIsReallocateModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSpecialDutyModalOpen, setIsSpecialDutyModalOpen] = useState(false);
  const [selectedDutyNurseId, setSelectedDutyNurseId] = useState<number | undefined>(undefined);
  const [editingAssignment, setEditingAssignment] = useState<ShiftAssignment | null>(null);
  
  // Mobile Optimization: 7-day Weekly view vs 1-Month Full Matrix
  const [viewScope, setViewScope] = useState<'MONTH' | 'WEEK'>('WEEK');
  const [selectedWeekIndex, setSelectedWeekIndex] = useState<number>(0);

  // Month parsed
  const [yearStr, monthStr] = currentMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10); // 1-12

  // Month navigation
  const handlePrevMonth = () => {
    let newYear = year;
    let newMonth = month - 1;
    if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    }
    setCurrentMonth(`${newYear}-${String(newMonth).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    let newYear = year;
    let newMonth = month + 1;
    if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    }
    setCurrentMonth(`${newYear}-${String(newMonth).padStart(2, '0')}`);
  };

  const handleCurrentMonth = () => {
    const d = new Date();
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  // Days in month calculation
  const totalDaysInMonth = useMemo(() => {
    return new Date(year, month, 0).getDate();
  }, [year, month]);

  const daysArray = useMemo(() => {
    const days = [];
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const d = new Date(year, month - 1, day);
      const dayOfWeek = d.getDay(); // 0 is Sun, 6 is Sat
      const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
      days.push({
        dayNumber: day,
        dateString: dateStr,
        dayName: dayNames[dayOfWeek],
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        isSunday: dayOfWeek === 0,
      });
    }
    return days;
  }, [year, month, totalDaysInMonth]);

  const totalWeeks = Math.ceil(totalDaysInMonth / 7);

  const visibleDays = useMemo(() => {
    if (viewScope === 'WEEK') {
      const startIdx = selectedWeekIndex * 7;
      return daysArray.slice(startIdx, Math.min(startIdx + 7, daysArray.length));
    }
    return daysArray;
  }, [viewScope, selectedWeekIndex, daysArray]);

  // Active Nurses filtered
  const filteredNurses = useMemo(() => {
    return nurses.filter((nurse) => {
      if (!nurse.isActive) return false;
      if (selectedNurseFilter !== 'ALL' && nurse.id !== selectedNurseFilter) return false;
      if (selectedRoleFilter !== 'ALL' && nurse.role !== selectedRoleFilter) return false;
      return true;
    });
  }, [nurses, selectedNurseFilter, selectedRoleFilter]);

  // Assignment Map for ultra-fast lookup: key = `${date}_${nurseId}`
  const assignmentMap = useMemo(() => {
    const map = new Map<string, ShiftType>();
    assignments.forEach((a) => {
      if (a.date.startsWith(currentMonth)) {
        map.set(`${a.date}_${a.nurseId}`, a.shiftType);
      }
    });
    return map;
  }, [assignments, currentMonth]);

  // Detailed Assignment Map: key = `${date}_${nurseId}` -> ShiftAssignment
  const assignmentDetailMap = useMemo(() => {
    const map = new Map<string, ShiftAssignment>();
    assignments.forEach((a) => {
      if (a.date.startsWith(currentMonth)) {
        map.set(`${a.date}_${a.nurseId}`, a);
      }
    });
    return map;
  }, [assignments, currentMonth]);

  const handleOpenEditModal = (dateStr: string, nurse: Nurse) => {
    if (!isAdmin) {
      showToast('Akses Dibatasi: Masuk sebagai Kepala Ruangan (Karu) atau Admin untuk merubah jadwal dinas.', 'info');
      return;
    }
    const existing = assignmentDetailMap.get(`${dateStr}_${nurse.id}`);
    if (existing) {
      setEditingAssignment(existing);
    } else {
      setEditingAssignment({
        id: `${dateStr}_${nurse.id}_${Date.now()}`,
        date: dateStr,
        shiftType: 'LIBUR',
        nurseId: nurse.id,
        nurseName: nurse.name,
        nursePhone: nurse.phone,
        assignedMachineIds: [],
        isLeader: nurse.role === 'KATIM',
        isWhatsAppSent: false,
        notes: '',
        specialDuty: nurse.specialDuty || null,
      });
    }
  };

  // Cycle shift on click: PAGI -> SIANG -> LIBUR -> CUTI -> SAKIT -> PAGI
  const handleCellClick = (dateStr: string, nurseId: number) => {
    if (!isAdmin) {
      showToast('Akses Dibatasi: Masuk sebagai Kepala Ruangan (Karu) atau Admin untuk merubah jadwal dinas.', 'info');
      return;
    }
    const key = `${dateStr}_${nurseId}`;
    const currentShift = assignmentMap.get(key);

    // Exact cycle requested:
    // P -> S -> L -> C -> SKT -> P
    let nextShift: ShiftType;
    if (currentShift === 'PAGI') {
      nextShift = 'SIANG';
    } else if (currentShift === 'SIANG') {
      nextShift = 'LIBUR';
    } else if (currentShift === 'LIBUR') {
      nextShift = 'CUTI';
    } else if (currentShift === 'CUTI') {
      nextShift = 'SAKIT';
    } else {
      // If currently 'SAKIT', or undefined/not set yet
      nextShift = 'PAGI';
    }

    setShift(dateStr, nurseId, nextShift);
  };

  // Month Name formatted (Indonesian)
  const monthNamesId = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ];
  const monthLabel = `${monthNamesId[month - 1]} ${year}`;

  // Monthly summary stats
  const monthlyStats = useMemo(() => {
    let totalP = 0;
    let totalS = 0;
    let totalL = 0;
    let totalC = 0;
    let totalSkt = 0;

    assignments.forEach((a) => {
      if (a.date.startsWith(currentMonth)) {
        if (a.shiftType === 'PAGI') totalP++;
        else if (a.shiftType === 'SIANG') totalS++;
        else if (a.shiftType === 'LIBUR') totalL++;
        else if (a.shiftType === 'CUTI') totalC++;
        else if (a.shiftType === 'SAKIT') totalSkt++;
      }
    });

    const activeCount = nurses.filter((n) => n.isActive).length;
    const avgShifts = activeCount > 0 ? ((totalP + totalS) / activeCount).toFixed(1) : '0';

    return { totalP, totalS, totalL, totalC, totalSkt, avgShifts };
  }, [assignments, currentMonth, nurses]);

  // Export CSV
  const handleExportCSV = () => {
    GoogleSheetsService.exportMonthlyScheduleToCSV(currentMonth, nurses, assignments);
    showToast(`Jadwal bulan ${monthLabel} berhasil diekspor ke CSV`, 'success');
  };

  return (
    <div className="pb-24 space-y-4">
      <ReadOnlyBanner actionDescription="menyusun jadwal 1 bulan, mengimpor Excel/Spreadsheet, atau merubah status sif dinas" />

      {/* Top Header & Monthly Control Panel */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 shadow-soft border border-slate-200/80 dark:border-slate-800/80 space-y-3.5 transition-all">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Month Switcher */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between bg-slate-50 dark:bg-slate-800/60 p-1.5 rounded-2xl border border-slate-200/70 dark:border-slate-700/70">
            <button
              onClick={handlePrevMonth}
              className="p-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700/60 shadow-2xs transition-all active:scale-95"
              title="Bulan Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 px-3">
              <Calendar className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span className="font-black text-slate-900 dark:text-white text-base sm:text-lg min-w-[150px] text-center tracking-tight">
                {monthLabel}
              </span>
            </div>
            <button
              onClick={handleNextMonth}
              className="p-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700/60 shadow-2xs transition-all active:scale-95"
              title="Bulan Berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap justify-end">
            <button
              onClick={handleCurrentMonth}
              className="px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800/80 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-2xs transition-all active:scale-95"
            >
              Bulan Ini
            </button>
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800/80 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-2xs transition-all active:scale-95"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>CSV</span>
            </button>
            {isAdmin && (
              <>
                <button
                  onClick={() => {
                    setSelectedDutyNurseId(undefined);
                    setIsSpecialDutyModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold shadow-soft-sm transition-all active:scale-95"
                  title="Menu khusus untuk menginput dan mengelola tugas khusus ruangan HD (BHP, RO, Farmasi, Reuse, PPI, Klaim BPJS)"
                >
                  <Tag className="w-3.5 h-3.5 text-indigo-200" />
                  <span>Input Tugas Khusus</span>
                </button>
                <button
                  onClick={() => setIsImportModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-soft-sm transition-all active:scale-95"
                  title="Import jadwal dari file Excel (.xlsx, .xls, .csv), Google Sheets, atau Salin-Tempel"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-100" />
                  <span>Import Excel</span>
                </button>
                <button
                  onClick={() => setIsReallocateModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white text-xs font-extrabold shadow-soft-sm transition-all active:scale-95"
                  title="Generate ulang alokasi mesin adil untuk seluruh tanggal bulan ini tanpa merubah jadwal sif"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Mesin Adil</span>
                </button>
                <button
                  onClick={() => generateMonthlySchedule(currentMonth)}
                  disabled={isGenerating}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white text-xs font-extrabold shadow-soft-sm transition-all active:scale-95 disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                  <span>{isGenerating ? 'Menyusun...' : 'Auto-Jadwal 1 Bulan'}</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Filter bar & Mini Stats */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Filter:
            </span>
            <select
              value={selectedRoleFilter}
              onChange={(e) => setSelectedRoleFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 font-medium focus:ring-2 focus:ring-sky-500/20"
            >
              <option value="ALL">Semua Jabatan</option>
              <option value="KARU">Kepala Ruangan (KARU)</option>
              <option value="KATIM">PJ Sif (Katim)</option>
              <option value="PELAKSANA">Pelaksana</option>
            </select>
            <select
              value={selectedNurseFilter}
              onChange={(e) =>
                setSelectedNurseFilter(
                  e.target.value === 'ALL' ? 'ALL' : Number(e.target.value)
                )
              }
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 font-medium focus:ring-2 focus:ring-sky-500/20"
            >
              <option value="ALL">Semua Perawat ({filteredNurses.length})</option>
              {nurses.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300 flex-wrap font-semibold">
            <span className="inline-flex items-center gap-1 bg-sky-50 dark:bg-sky-950/50 px-2 py-1 rounded-lg border border-sky-200/60 dark:border-sky-800/60 text-sky-800 dark:text-sky-300">
              <span className="w-2 h-2 rounded-full bg-sky-500" />
              Pagi: <b>{monthlyStats.totalP}</b>
            </span>
            <span className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-950/50 px-2 py-1 rounded-lg border border-amber-200/60 dark:border-amber-800/60 text-amber-800 dark:text-amber-300">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Siang: <b>{monthlyStats.totalS}</b>
            </span>
            <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              Libur: <b>{monthlyStats.totalL}</b>
            </span>
            <span className="inline-flex items-center gap-1 bg-teal-50 dark:bg-teal-950/50 px-2 py-1 rounded-lg border border-teal-200/60 dark:border-teal-800/60 text-teal-800 dark:text-teal-300">
              <span className="w-2 h-2 rounded-full bg-teal-500" />
              Cuti: <b>{monthlyStats.totalC}</b>
            </span>
            <span className="text-slate-500 dark:text-slate-400 font-medium ml-1">
              Rata-rata: <b>{monthlyStats.avgShifts} sif/orang</b>
            </span>
          </div>
        </div>
      </div>

      {/* Full Monthly Schedule Matrix Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-soft border border-slate-200/80 dark:border-slate-800/80 overflow-hidden transition-all">
        {/* View Scope Controls (Weekly 7-Day vs Full Month) */}
        <div className="px-4 py-3 bg-slate-50/80 dark:bg-slate-850/80 border-b border-slate-200/80 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Tampilan Matriks:</span>
            <div className="inline-flex rounded-2xl p-1 bg-slate-200/80 dark:bg-slate-800 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setViewScope('WEEK')}
                className={`px-3 py-1 rounded-xl transition-all ${
                  viewScope === 'WEEK'
                    ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-2xs font-extrabold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                📱 7 Hari (Pekan)
              </button>
              <button
                type="button"
                onClick={() => setViewScope('MONTH')}
                className={`px-3 py-1 rounded-xl transition-all ${
                  viewScope === 'MONTH'
                    ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-2xs font-extrabold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                1 Bulan Penuh
              </button>
            </div>
          </div>

          {viewScope === 'WEEK' && (
            <div className="flex items-center gap-1.5 overflow-x-auto mobile-smooth-scroll py-0.5 max-w-full">
              {Array.from({ length: totalWeeks }).map((_, wIdx) => {
                const startDay = wIdx * 7 + 1;
                const endDay = Math.min((wIdx + 1) * 7, totalDaysInMonth);
                const isCurrentWeek = selectedWeekIndex === wIdx;
                return (
                  <button
                    key={wIdx}
                    type="button"
                    onClick={() => setSelectedWeekIndex(wIdx)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                      isCurrentWeek
                        ? 'bg-sky-600 text-white font-extrabold shadow-soft-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'
                    }`}
                  >
                    Minggu {wIdx + 1} ({startDay}-{endDay})
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Helper guide */}
        <div className="px-4 py-2 bg-slate-50/50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            {isAdmin ? (
              <span className="flex items-center gap-1.5 flex-wrap">
                <span>
                  💡 <b>Tip:</b> Cukup <b>1 kali klik</b> pada jadwal sif untuk berganti otomatis (
                  <span className="text-sky-700 font-bold">P</span> &rarr;{' '}
                  <span className="text-amber-700 font-bold">S</span> &rarr;{' '}
                  <span className="text-slate-600 font-bold">L</span> &rarr;{' '}
                  <span className="text-teal-700 font-bold">C</span> &rarr;{' '}
                  <span className="text-rose-700 font-bold">SKT</span>). Gunakan tombol <b>Input Tugas Khusus</b> untuk penginputan PIC ruangan & PJ Sif.
                </span>
              </span>
            ) : (
              <span className="text-slate-600 font-medium flex items-center gap-1.5">
                <span>👁️</span> Mode Hanya Lihat: Anda sedang melihat jadwal dinas resmi HD (Hanya Kepala Ruangan yang berwenang merubah data).
              </span>
            )}
          </div>
          <span className="hidden sm:inline text-slate-400">
            {viewScope === 'WEEK' ? 'Menampilkan 7 hari per pekan' : 'Geser horizontal untuk melihat seluruh tanggal'}
          </span>
        </div>

        <div className="overflow-x-auto max-w-full mobile-smooth-scroll">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 sticky top-0 z-10">
                <th className="py-2.5 px-3 font-semibold text-slate-700 min-w-[180px] sticky left-0 bg-slate-100 z-20 border-r border-slate-200">
                  Perawat ({filteredNurses.length})
                </th>
                {visibleDays.map((day) => (
                  <th
                    key={day.dayNumber}
                    onClick={() => selectDate(day.dateString)}
                    className={`py-2 px-1.5 text-center cursor-pointer min-w-[36px] max-w-[40px] font-semibold transition-colors hover:bg-blue-100/50 ${
                      day.isSunday
                        ? 'bg-rose-50/80 text-rose-700 font-bold'
                        : day.isWeekend
                        ? 'bg-amber-50/50 text-amber-800'
                        : 'text-slate-700'
                    }`}
                    title={`Klik untuk buka tanggal ${day.dateString}`}
                  >
                    <div className="text-[10px] uppercase font-normal">{day.dayName}</div>
                    <div className="text-xs">{day.dayNumber}</div>
                  </th>
                ))}
                <th className="py-2.5 px-2 font-semibold text-slate-700 text-center min-w-[45px] bg-slate-100 border-l border-slate-200">
                  P
                </th>
                <th className="py-2.5 px-2 font-semibold text-slate-700 text-center min-w-[45px] bg-slate-100">
                  S
                </th>
                <th className="py-2.5 px-2 font-semibold text-slate-700 text-center min-w-[45px] bg-slate-100">
                  L
                </th>
                <th className="py-2.5 px-2 font-semibold text-slate-700 text-center min-w-[50px] bg-slate-100">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredNurses.map((nurse, index) => {
                let nurseP = 0;
                let nurseS = 0;
                let nurseL = 0;
                let nurseC = 0;
                let nurseSkt = 0;

                // Accurately compute full month stats in memory
                daysArray.forEach((d) => {
                  const shift = assignmentMap.get(`${d.dateString}_${nurse.id}`) || 'LIBUR';
                  if (shift === 'PAGI') nurseP++;
                  else if (shift === 'SIANG') nurseS++;
                  else if (shift === 'LIBUR') nurseL++;
                  else if (shift === 'CUTI') nurseC++;
                  else if (shift === 'SAKIT') nurseSkt++;
                });

                return (
                  <tr
                    key={nurse.id}
                    className={`hover:bg-blue-50/30 transition-colors optimize-render ${
                      index % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                    }`}
                  >
                    {/* Sticky Nurse Name Column */}
                    <td className="py-2 px-3 font-medium text-slate-800 sticky left-0 bg-inherit z-10 border-r border-slate-200">
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="truncate">
                          <span className="font-semibold text-slate-900">{nurse.name}</span>
                          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                            <span className="text-[10px] text-slate-500">
                              {NURSE_ROLE_INFO[nurse.role]?.title}
                            </span>
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedDutyNurseId(nurse.id);
                                  setIsSpecialDutyModalOpen(true);
                                }}
                                className="text-[9px] text-blue-700 hover:underline font-bold px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200"
                                title="Input tugas khusus per tanggal untuk perawat ini"
                              >
                                + PIC Tgl
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Day Cells (Only renders visibleDays - super lightweight on mobile) */}
                    {visibleDays.map((day) => {
                      const key = `${day.dateString}_${nurse.id}`;
                      const shift = assignmentMap.get(key) || 'LIBUR';

                      const shiftInfo = SHIFT_TYPE_INFO[shift];
                      const fullAsg = assignmentDetailMap.get(key);
                      const activeDuty = fullAsg?.specialDuty || null;
                      const hasMachines = Boolean(fullAsg?.assignedMachineIds && fullAsg.assignedMachineIds.length > 0);

                      let cellBg = 'hover:bg-slate-100';
                      let cellText = 'text-slate-400';

                      if (shift === 'PAGI') {
                        cellBg = 'bg-sky-500 text-white font-bold hover:bg-sky-600';
                        cellText = 'text-white';
                      } else if (shift === 'SIANG') {
                        cellBg = 'bg-amber-500 text-white font-bold hover:bg-amber-600';
                        cellText = 'text-white';
                      } else if (shift === 'LIBUR') {
                        cellBg = day.isSunday ? 'bg-rose-50/60 text-slate-500' : 'text-slate-400';
                        cellText = 'text-slate-400';
                      } else if (shift === 'CUTI') {
                        cellBg = 'bg-teal-500 text-white font-bold hover:bg-teal-600';
                        cellText = 'text-white';
                      } else if (shift === 'SAKIT') {
                        cellBg = 'bg-rose-500 text-white font-bold hover:bg-rose-600';
                        cellText = 'text-white';
                      }

                      return (
                        <td
                          key={day.dayNumber}
                          onClick={() => handleCellClick(day.dateString, nurse.id)}
                          onDoubleClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            handleOpenEditModal(day.dateString, nurse);
                          }}
                          className={`py-1.5 px-0.5 text-center border-r border-slate-100/60 select-none transition-all relative group ${
                            isAdmin ? 'cursor-pointer hover:bg-sky-100/60 active:scale-95' : 'cursor-default'
                          } ${day.isSunday ? 'bg-rose-50/20' : ''}`}
                          title={`${nurse.name} | ${day.dateString}: ${shiftInfo?.label}${activeDuty ? ` | Tugas: ${activeDuty}` : ''}${hasMachines ? ` | Mesin: ${fullAsg?.assignedMachineIds.join(', ')}` : ''}${
                            isAdmin ? ' (Klik: P -> S -> L -> C -> SKT)' : ' (Mode Hanya Lihat)'
                          }`}
                        >
                          <div
                            className={`w-7 h-7 mx-auto relative flex items-center justify-center rounded-lg text-xs transition-transform active:scale-90 ${cellBg} ${cellText}`}
                          >
                            {shiftInfo?.code}

                            {/* Indicator for Special Duty */}
                            {activeDuty && (
                              <span
                                className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ring-1 ring-white bg-amber-500"
                                title={`Tugas Khusus: ${activeDuty}`}
                              />
                            )}
                          </div>
                        </td>
                      );
                    })}

                    {/* Nurse Row Totals */}
                    <td className="py-2 px-1 text-center font-bold text-sky-700 bg-slate-50/80 border-l border-slate-200">
                      {nurseP}
                    </td>
                    <td className="py-2 px-1 text-center font-bold text-amber-700 bg-slate-50/80">
                      {nurseS}
                    </td>
                    <td className="py-2 px-1 text-center font-medium text-slate-500 bg-slate-50/80">
                      {nurseL}
                    </td>
                    <td className="py-2 px-1 text-center font-bold text-slate-900 bg-slate-100">
                      {nurseP + nurseS}
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Bottom Summary Row for Daily Total Staff on Duty */}
            <tfoot>
              <tr className="bg-slate-100 font-semibold text-slate-700 border-t-2 border-slate-300">
                <td className="py-2 px-3 sticky left-0 bg-slate-100 z-10 border-r border-slate-200 text-slate-800">
                  Total Dinas (P+S)
                </td>
                {daysArray.map((day) => {
                  let dailyWorkCount = 0;
                  nurses.forEach((nurse) => {
                    const shift = assignmentMap.get(`${day.dateString}_${nurse.id}`);
                    if (shift === 'PAGI' || shift === 'SIANG') dailyWorkCount++;
                  });

                  const isUnderstaffed = dailyWorkCount < 8; // HD target ~ 10-12

                  return (
                    <td
                      key={day.dayNumber}
                      className={`py-2 px-0.5 text-center text-xs ${
                        isUnderstaffed
                          ? 'bg-rose-100 text-rose-800 font-bold'
                          : 'text-slate-800 font-bold'
                      }`}
                      title={`Total ${dailyWorkCount} perawat berdinas`}
                    >
                      {dailyWorkCount}
                    </td>
                  );
                })}
                <td colSpan={4} className="bg-slate-100 border-l border-slate-200" />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Legend & Quick Guidelines */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-semibold text-slate-700">Keterangan:</span>
          <span className="inline-flex items-center gap-1">
            <span className="w-5 h-5 rounded-md bg-sky-500 text-white font-bold flex items-center justify-center text-[10px]">
              P
            </span>
            Sif Pagi (07.00-14.00)
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-5 h-5 rounded-md bg-amber-500 text-white font-bold flex items-center justify-center text-[10px]">
              S
            </span>
            Sif Siang (12.00-19.00)
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-5 h-5 rounded-md bg-slate-300 text-slate-700 font-bold flex items-center justify-center text-[10px]">
              L
            </span>
            Libur / Off
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-5 h-5 rounded-md bg-teal-500 text-white font-bold flex items-center justify-center text-[10px]">
              C
            </span>
            Cuti Tahunan
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-5 h-5 rounded-md bg-rose-500 text-white font-bold flex items-center justify-center text-[10px]">
              Skt
            </span>
            Sakit / Izin
          </span>
          <span className="inline-flex items-center gap-1.5 pl-2 border-l border-slate-200 text-teal-800">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-400 ring-1 ring-teal-500" />
            <span>Dot = Ada Tugas Khusus / PIC</span>
          </span>
        </div>
        <div className="text-slate-500">
          Standar HD: Rasio 1 Perawat : 2-3 Mesin Aktif
        </div>
      </div>

      {editingAssignment && (
        <EditAssignmentModal
          assignment={editingAssignment}
          machines={machines}
          onClose={() => setEditingAssignment(null)}
          onSave={(assignment, newShiftType, newMachines, isLeader, notes, specialDuty) => {
            updateAssignment(assignment, newShiftType, newMachines, isLeader, notes, specialDuty);
            setEditingAssignment(null);
          }}
        />
      )}

      {isReallocateModalOpen && (
        <RegenerateMachineAllocationModal
          isOpen={isReallocateModalOpen}
          onClose={() => setIsReallocateModalOpen(false)}
          defaultScope="MONTHLY"
        />
      )}

      {isImportModalOpen && (
        <ImportScheduleModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          defaultMonth={currentMonth}
        />
      )}

      {isSpecialDutyModalOpen && (
        <SpecialDutyModal
          isOpen={isSpecialDutyModalOpen}
          onClose={() => {
            setIsSpecialDutyModalOpen(false);
            setSelectedDutyNurseId(undefined);
          }}
          initialNurseId={selectedDutyNurseId}
        />
      )}
    </div>
  );
};
