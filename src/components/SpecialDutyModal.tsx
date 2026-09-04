import React, { useState, useMemo } from 'react';
import { useHemo } from '../context/HemoContext';
import {
  Nurse,
  SPECIAL_DUTY_OPTIONS,
  ShiftAssignment,
  parseSpecialDuties,
  formatSpecialDuties,
} from '../types';
import { LEGACY_SAMPLE_NURSE_NAMES } from '../data/initialData';
import { SpecialDutyBadge } from './SpecialDutyBadge';
import {
  X,
  Tag,
  Calendar,
  Check,
  Crown,
  BookOpen,
  Search,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Trash2,
  AlertCircle,
  ShieldAlert,
  CheckCircle2,
  Sunrise,
  Sun,
  Coffee,
  Layers,
  UserCheck,
  UserX,
} from 'lucide-react';

interface SpecialDutyModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: string;
  initialNurseId?: number;
}

// High-contrast color mapping for duty chips to ensure maximum readability
const DUTY_CHIP_STYLES: Record<
  string,
  {
    active: string;
    inactive: string;
    label: string;
    short: string;
  }
> = {
  CITO: {
    active: 'bg-rose-600 text-white border-rose-700 font-black shadow-xs',
    inactive: 'bg-white text-rose-900 border-rose-300 hover:bg-rose-50 font-extrabold',
    label: 'CITO (HD Darurat & Isolasi)',
    short: 'CITO',
  },
  BHP: {
    active: 'bg-emerald-600 text-white border-emerald-700 font-black shadow-xs',
    inactive: 'bg-white text-emerald-900 border-emerald-300 hover:bg-emerald-50 font-extrabold',
    label: 'BHP (Bahan Habis Pakai)',
    short: 'BHP',
  },
  'NATRIUM RO': {
    active: 'bg-cyan-700 text-white border-cyan-800 font-black shadow-xs',
    inactive: 'bg-white text-cyan-900 border-cyan-300 hover:bg-cyan-50 font-extrabold',
    label: 'NATRIUM RO (Water Treatment)',
    short: 'NATRIUM RO',
  },
  'FARMASI & LOGISTIK': {
    active: 'bg-purple-600 text-white border-purple-700 font-black shadow-xs',
    inactive: 'bg-white text-purple-900 border-purple-300 hover:bg-purple-50 font-extrabold',
    label: 'FARMASI & LOGISTIK',
    short: 'FARMASI',
  },
  'REUSE DIALYZER': {
    active: 'bg-amber-600 text-white border-amber-700 font-black shadow-xs',
    inactive: 'bg-white text-amber-900 border-amber-300 hover:bg-amber-50 font-extrabold',
    label: 'REUSE DIALYZER (Reprocessing)',
    short: 'REUSE',
  },
  'IPCN / PPI HD': {
    active: 'bg-red-700 text-white border-red-800 font-black shadow-xs',
    inactive: 'bg-white text-red-900 border-red-300 hover:bg-red-50 font-extrabold',
    label: 'IPCN / PPI HD (Pencegahan Infeksi)',
    short: 'IPCN / PPI',
  },
  'KLAIM & DOKUMEN BPJS': {
    active: 'bg-blue-600 text-white border-blue-700 font-black shadow-xs',
    inactive: 'bg-white text-blue-900 border-blue-300 hover:bg-blue-50 font-extrabold',
    label: 'KLAIM & DOKUMEN BPJS',
    short: 'KLAIM BPJS',
  },
};

type ShiftTabMode = 'SEPARATE' | 'PAGI' | 'SIANG' | 'LIBUR';

export const SpecialDutyModal: React.FC<SpecialDutyModalProps> = ({
  isOpen,
  onClose,
  initialDate,
  initialNurseId,
}) => {
  const {
    nurses,
    assignments,
    updateAssignment,
    selectedDate: globalSelectedDate,
    showToast,
    isAdmin,
  } = useHemo();

  const [currentView, setCurrentView] = useState<'INPUT_HARIAN' | 'PANDUAN_SOP'>('INPUT_HARIAN');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeShiftTab, setActiveShiftTab] = useState<ShiftTabMode>('SEPARATE');
  const [dutyFilter, setDutyFilter] = useState<'ALL' | 'HAS_DUTY' | 'NO_DUTY'>('ALL');

  const [selectedTargetDate, setSelectedTargetDate] = useState<string>(
    initialDate || globalSelectedDate || new Date().toISOString().split('T')[0]
  );

  // 1. Purge any legacy sample default nurses so only real user nurses are used
  const validNurses = useMemo(() => {
    return nurses.filter((n) => !LEGACY_SAMPLE_NURSE_NAMES.has(n.name));
  }, [nurses]);

  const validNurseMap = useMemo(() => {
    return new Map<number, Nurse>(validNurses.map((n) => [n.id, n]));
  }, [validNurses]);

  // 2. Daily assignments for the selected target date - strictly restricted to valid nurses
  const dailyAssignments = useMemo(() => {
    return assignments.filter(
      (a) =>
        a.date === selectedTargetDate &&
        validNurseMap.has(a.nurseId) &&
        !LEGACY_SAMPLE_NURSE_NAMES.has(a.nurseName)
    );
  }, [assignments, selectedTargetDate, validNurseMap]);

  // Quick lookup map: nurseId -> ShiftAssignment
  const dailyMap = useMemo(() => {
    const map = new Map<number, ShiftAssignment>();
    dailyAssignments.forEach((a) => map.set(a.nurseId, a));
    return map;
  }, [dailyAssignments]);

  // Coverage statistics of special duties on this date (separated by shift)
  const dutyAssignmentMap = useMemo(() => {
    const map: Record<string, { pagi: string[]; siang: string[]; all: string[] }> = {};
    Object.keys(SPECIAL_DUTY_OPTIONS).forEach((code) => {
      map[code] = { pagi: [], siang: [], all: [] };
    });

    dailyAssignments.forEach((asg) => {
      if (asg.specialDuty) {
        const duties = parseSpecialDuties(asg.specialDuty);
        duties.forEach((d) => {
          if (!map[d]) map[d] = { pagi: [], siang: [], all: [] };
          map[d].all.push(asg.nurseName);
          if (asg.shiftType === 'PAGI') {
            map[d].pagi.push(asg.nurseName);
          } else if (asg.shiftType === 'SIANG') {
            map[d].siang.push(asg.nurseName);
          }
        });
      }
    });
    return map;
  }, [dailyAssignments]);

  // Helper filter function for search and duty filter
  const matchesFilter = (nurse: Nurse): boolean => {
    const asg = dailyMap.get(nurse.id);
    const hasDuty = Boolean(asg?.specialDuty && asg.specialDuty.trim());

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = nurse.name.toLowerCase().includes(q);
      const matchRole = nurse.role.toLowerCase().includes(q);
      const matchDuty = asg?.specialDuty ? asg.specialDuty.toLowerCase().includes(q) : false;
      if (!matchName && !matchRole && !matchDuty) return false;
    }

    if (dutyFilter === 'HAS_DUTY' && !hasDuty) return false;
    if (dutyFilter === 'NO_DUTY' && hasDuty) return false;

    return true;
  };

  // Sorter: highlighted nurse first, then leaders, then name
  const sortNurses = (a: Nurse, b: Nurse) => {
    if (initialNurseId) {
      if (a.id === initialNurseId) return -1;
      if (b.id === initialNurseId) return 1;
    }

    const asgA = dailyMap.get(a.id);
    const asgB = dailyMap.get(b.id);

    if (asgA?.isLeader && !asgB?.isLeader) return -1;
    if (!asgA?.isLeader && asgB?.isLeader) return 1;

    return a.name.localeCompare(b.name);
  };

  // Distinct nurse groups: Sif Pagi vs Sif Siang vs Libur/Off
  const allPagiNurses = useMemo(() => {
    return validNurses.filter((n) => dailyMap.get(n.id)?.shiftType === 'PAGI');
  }, [validNurses, dailyMap]);

  const allSiangNurses = useMemo(() => {
    return validNurses.filter((n) => dailyMap.get(n.id)?.shiftType === 'SIANG');
  }, [validNurses, dailyMap]);

  const allOffNurses = useMemo(() => {
    return validNurses.filter((n) => {
      const st = dailyMap.get(n.id)?.shiftType;
      return st !== 'PAGI' && st !== 'SIANG';
    });
  }, [validNurses, dailyMap]);

  // Filtered lists for UI rendering
  const filteredPagiNurses = useMemo(() => {
    return allPagiNurses.filter(matchesFilter).sort(sortNurses);
  }, [allPagiNurses, matchesFilter, sortNurses]);

  const filteredSiangNurses = useMemo(() => {
    return allSiangNurses.filter(matchesFilter).sort(sortNurses);
  }, [allSiangNurses, matchesFilter, sortNurses]);

  const filteredOffNurses = useMemo(() => {
    return allOffNurses.filter(matchesFilter).sort(sortNurses);
  }, [allOffNurses, matchesFilter, sortNurses]);

  // Leaders / Katim per shift
  const pagiLeader = useMemo(() => {
    return allPagiNurses.find((n) => dailyMap.get(n.id)?.isLeader);
  }, [allPagiNurses, dailyMap]);

  const siangLeader = useMemo(() => {
    return allSiangNurses.find((n) => dailyMap.get(n.id)?.isLeader);
  }, [allSiangNurses, dailyMap]);

  // Total duty assignments count
  const assignedDutyCount = useMemo(() => {
    return dailyAssignments.filter((a) => Boolean(a.specialDuty && a.specialDuty.trim())).length;
  }, [dailyAssignments]);

  if (!isOpen) return null;

  // Handle assigning / clearing duty for a specific date
  const handleAssignDailyDuty = (
    nurse: Nurse,
    dutyCode: string | null,
    isLeaderOverride?: boolean
  ) => {
    if (!isAdmin) {
      showToast('Hanya Kepala Ruangan (Karu) atau Admin yang berwenang merubah penugasan harian.', 'info');
      return;
    }

    const existingAsg = dailyMap.get(nurse.id);
    if (existingAsg) {
      updateAssignment(
        existingAsg,
        existingAsg.shiftType,
        existingAsg.assignedMachineIds || [],
        isLeaderOverride !== undefined ? isLeaderOverride : existingAsg.isLeader,
        existingAsg.notes || '',
        dutyCode
      );
    } else {
      // Create assignment for this date
      const newAsg: ShiftAssignment = {
        id: `${selectedTargetDate}_${nurse.id}_${Date.now()}`,
        date: selectedTargetDate,
        shiftType: 'LIBUR',
        nurseId: nurse.id,
        nurseName: nurse.name,
        nursePhone: nurse.phone,
        assignedMachineIds: [],
        isLeader: isLeaderOverride || nurse.role === 'KATIM',
        isWhatsAppSent: false,
        notes: '',
        specialDuty: dutyCode,
      };
      updateAssignment(
        newAsg,
        'LIBUR',
        [],
        isLeaderOverride || false,
        '',
        dutyCode
      );
    }

    showToast(
      dutyCode
        ? `Tugas PIC tanggal ${selectedTargetDate} untuk ${nurse.name}: ${dutyCode}`
        : `Tugas PIC tanggal ${selectedTargetDate} untuk ${nurse.name} telah dikosongkan`,
      'success'
    );
  };

  // Toggle single duty code in multi-duty setup for a nurse on this date
  const handleToggleDailyDuty = (nurse: Nurse, dutyCode: string) => {
    if (!isAdmin) {
      showToast('Hanya Kepala Ruangan (Karu) atau Admin yang berwenang merubah penugasan harian.', 'info');
      return;
    }

    const existingAsg = dailyMap.get(nurse.id);
    const currentDutyStr = existingAsg?.specialDuty || '';
    const current = parseSpecialDuties(currentDutyStr);
    let next: string[];
    if (current.includes(dutyCode)) {
      next = current.filter((d) => d !== dutyCode);
    } else {
      next = [...current, dutyCode];
    }
    const formatted = formatSpecialDuties(next);
    handleAssignDailyDuty(nurse, formatted);
  };

  // Quick shift changer right within Special Duty Modal
  const handleQuickChangeShift = (nurse: Nurse, targetShift: 'PAGI' | 'SIANG' | 'LIBUR') => {
    if (!isAdmin) {
      showToast('Hanya Kepala Ruangan (Karu) atau Admin yang berwenang mengubah sif.', 'info');
      return;
    }
    const existingAsg = dailyMap.get(nurse.id);
    if (existingAsg) {
      updateAssignment(
        existingAsg,
        targetShift,
        existingAsg.assignedMachineIds || [],
        targetShift === 'LIBUR' ? false : existingAsg.isLeader,
        existingAsg.notes || '',
        existingAsg.specialDuty
      );
    } else {
      const newAsg: ShiftAssignment = {
        id: `${selectedTargetDate}_${nurse.id}_${Date.now()}`,
        date: selectedTargetDate,
        shiftType: targetShift,
        nurseId: nurse.id,
        nurseName: nurse.name,
        nursePhone: nurse.phone,
        assignedMachineIds: [],
        isLeader: false,
        isWhatsAppSent: false,
        notes: '',
        specialDuty: null,
      };
      updateAssignment(newAsg, targetShift, [], false, '', null);
    }
    showToast(
      `${nurse.name} dialihkan ke ${
        targetShift === 'PAGI' ? 'Sif Pagi' : targetShift === 'SIANG' ? 'Sif Siang' : 'Libur'
      }`,
      'success'
    );
  };

  // Date Navigation
  const shiftDate = (days: number) => {
    try {
      const parts = selectedTargetDate.split('-');
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      d.setDate(d.getDate() + days);
      const newDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;
      setSelectedTargetDate(newDateStr);
    } catch {
      // ignore
    }
  };

  // Indonesian Date Formatter
  const formatIndoDate = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      return d.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Nurse Card Component
  const renderNurseCard = (nurse: Nurse, shiftContext: 'PAGI' | 'SIANG' | 'OFF') => {
    const asg = dailyMap.get(nurse.id);
    const shiftType = asg?.shiftType || (shiftContext === 'OFF' ? 'LIBUR' : shiftContext);
    const isLeader = asg?.isLeader || false;
    const activeDuty = asg?.specialDuty || null;
    const activeDuties = parseSpecialDuties(activeDuty);
    const isWorking = shiftType === 'PAGI' || shiftType === 'SIANG';

    return (
      <div
        key={nurse.id}
        id={`nurse-duty-card-${nurse.id}`}
        className={`p-3.5 sm:p-4 rounded-2xl border-2 transition-all bg-white shadow-xs ${
          activeDuty
            ? shiftContext === 'PAGI'
              ? 'border-sky-400 ring-2 ring-sky-500/15'
              : shiftContext === 'SIANG'
              ? 'border-amber-400 ring-2 ring-amber-500/15'
              : 'border-blue-400 ring-1 ring-blue-500/15'
            : isWorking
            ? 'border-slate-300 hover:border-slate-400'
            : 'border-slate-200 bg-slate-50/70'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Left: Nurse Identity, Shift Badge, and Active Duties */}
          <div className="flex items-start sm:items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl font-black text-xs flex flex-col items-center justify-center shrink-0 shadow-xs ${
                shiftType === 'PAGI'
                  ? 'bg-sky-600 text-white'
                  : shiftType === 'SIANG'
                  ? 'bg-amber-600 text-white'
                  : shiftType === 'CUTI'
                  ? 'bg-teal-600 text-white'
                  : shiftType === 'SAKIT'
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-200 text-slate-800 border border-slate-300'
              }`}
            >
              <span className="text-[9px] uppercase leading-none opacity-90 font-bold">SIF</span>
              <span className="text-sm font-black leading-none mt-0.5">
                {shiftType === 'PAGI'
                  ? 'P'
                  : shiftType === 'SIANG'
                  ? 'S'
                  : shiftType === 'CUTI'
                  ? 'C'
                  : shiftType === 'SAKIT'
                  ? 'SKT'
                  : 'L'}
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm sm:text-base font-black text-slate-900 truncate">
                  {nurse.name}
                </span>

                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${
                    nurse.role === 'KARU'
                      ? 'bg-amber-100 text-amber-950 border-amber-300'
                      : nurse.role === 'KATIM'
                      ? 'bg-sky-100 text-sky-950 border-sky-300'
                      : 'bg-slate-100 text-slate-800 border-slate-300'
                  }`}
                >
                  {nurse.role}
                </span>

                {isLeader && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 border border-amber-500 shadow-2xs">
                    <Crown className="w-3 h-3 text-slate-950" />
                    PJ Sif {shiftContext === 'PAGI' ? 'Pagi' : shiftContext === 'SIANG' ? 'Siang' : ''}
                  </span>
                )}
              </div>

              {/* Shift hours and currently assigned duties */}
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 mt-1 flex-wrap">
                <span className="text-slate-600">
                  {shiftType === 'PAGI'
                    ? '🌅 Dinas Pagi (06:30 - 14:00)'
                    : shiftType === 'SIANG'
                    ? '☀️ Dinas Siang (13:30 - 21:00)'
                    : shiftType === 'CUTI'
                    ? '🏖️ Cuti Tahunan'
                    : shiftType === 'SAKIT'
                    ? '🩺 Izin Sakit'
                    : '☕ Libur Rutin'}
                </span>
                <span>•</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-slate-500 font-semibold text-[11px]">Tugas:</span>
                  {activeDuty ? (
                    <SpecialDutyBadge duty={activeDuty} size="sm" />
                  ) : (
                    <span className="text-slate-400 font-semibold italic text-[11px]">
                      Belum ada tugas PIC
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Duty Selector Buttons & Action Controls */}
          <div className="flex items-center gap-1.5 flex-wrap justify-end pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-200">
            {/* Quick Shift Switcher */}
            <div className="flex items-center gap-0.5 bg-slate-100 p-1 rounded-xl border border-slate-300 text-[11px] font-extrabold mr-1">
              <span className="text-slate-500 text-[10px] px-1 font-bold">Sif:</span>
              <button
                type="button"
                onClick={() => handleQuickChangeShift(nurse, 'PAGI')}
                className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                  shiftType === 'PAGI'
                    ? 'bg-sky-600 text-white font-black shadow-xs'
                    : 'text-sky-950 hover:bg-sky-100'
                }`}
                title="Pindahkan ke Sif Pagi"
              >
                Pagi
              </button>
              <button
                type="button"
                onClick={() => handleQuickChangeShift(nurse, 'SIANG')}
                className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                  shiftType === 'SIANG'
                    ? 'bg-amber-600 text-white font-black shadow-xs'
                    : 'text-amber-950 hover:bg-amber-100'
                }`}
                title="Pindahkan ke Sif Siang"
              >
                Siang
              </button>
              <button
                type="button"
                onClick={() => handleQuickChangeShift(nurse, 'LIBUR')}
                className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                  shiftType !== 'PAGI' && shiftType !== 'SIANG'
                    ? 'bg-slate-700 text-white font-black shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
                title="Pindahkan ke Libur / Off"
              >
                Off
              </button>
            </div>

            {/* PJ SIF (Katim) Button */}
            {isWorking && (
              <button
                type="button"
                id={`btn-pj-${nurse.id}`}
                onClick={() => handleAssignDailyDuty(nurse, activeDuty, !isLeader)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-black border-2 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer ${
                  isLeader
                    ? 'bg-amber-500 border-amber-600 text-slate-950 shadow-xs'
                    : 'bg-white hover:bg-amber-50 border-slate-300 text-slate-800'
                }`}
                title="Tandai perawat ini sebagai Penanggung Jawab Sif (Katim) pada tanggal ini"
              >
                <Crown className="w-3.5 h-3.5" />
                <span>{isLeader ? 'PJ Sif Aktif' : 'Pilih PJ Sif'}</span>
              </button>
            )}

            {/* Duty Chips for this Nurse on this Date */}
            {Object.entries(DUTY_CHIP_STYLES).map(([code, style]) => {
              const isSelected = activeDuties.includes(code);
              return (
                <button
                  key={code}
                  type="button"
                  id={`btn-duty-${nurse.id}-${style.short}`}
                  onClick={() => handleToggleDailyDuty(nurse, code)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs border-2 transition-all flex items-center gap-1 active:scale-95 cursor-pointer ${
                    isSelected ? style.active : style.inactive
                  }`}
                  title={`${style.label}: Klik untuk ${isSelected ? 'membatalkan' : 'menugaskan'} PIC ini pada ${selectedTargetDate}`}
                >
                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[3] text-white" />}
                  <span>{style.short}</span>
                </button>
              );
            })}

            {/* Kosongkan PIC Button */}
            {activeDuty && (
              <button
                type="button"
                id={`btn-clear-duty-${nurse.id}`}
                onClick={() => handleAssignDailyDuty(nurse, null)}
                className="px-2.5 py-1.5 rounded-xl text-xs font-extrabold text-rose-700 bg-rose-50 hover:bg-rose-100 border-2 border-rose-300 transition-colors flex items-center gap-1 cursor-pointer"
                title="Hapus seluruh tugas khusus perawat ini pada tanggal yang dipilih"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Kosongkan</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto antialiased">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-300 my-6 flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-150 text-slate-900">
        
        {/* Header Modal */}
        <div className="p-4 sm:p-5 border-b border-slate-300 flex items-center justify-between bg-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black tracking-tight text-slate-900">
                  Penginputan Tugas Khusus Ruangan HD
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-900 border border-blue-300">
                  Terpisah Sif Pagi & Sif Siang
                </span>
              </div>
              <p className="text-xs text-slate-700 font-medium mt-0.5">
                Alokasi penanggung jawab PIC ruangan & PJ Sif untuk Sif Pagi dan Sif Siang secara terpisah
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentView(currentView === 'INPUT_HARIAN' ? 'PANDUAN_SOP' : 'INPUT_HARIAN')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                currentView === 'PANDUAN_SOP'
                  ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                  : 'bg-white hover:bg-slate-200 text-slate-800 border-slate-300'
              }`}
              title="Lihat standar SOP tugas khusus ruangan HD"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{currentView === 'PANDUAN_SOP' ? 'Kembali ke Input' : 'Panduan SOP'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer"
              title="Tutup Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-50">

          {/* VIEW 1: INPUT TUGAS KHUSUS PER TANGGAL (PAGI & SIANG TERPISAH) */}
          {currentView === 'INPUT_HARIAN' && (
            <div className="space-y-4">
              
              {/* Date Control Bar */}
              <div className="p-3.5 bg-white border-2 border-slate-300 rounded-2xl shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 w-full sm:w-auto justify-between">
                  <button
                    onClick={() => shiftDate(-1)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 shadow-2xs text-slate-800 font-bold transition-colors cursor-pointer"
                    title="Hari Sebelumnya"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-2 px-3 bg-blue-50 border border-blue-300 rounded-xl py-1.5">
                    <Calendar className="w-4 h-4 text-blue-700 shrink-0" />
                    <input
                      type="date"
                      value={selectedTargetDate}
                      onChange={(e) => setSelectedTargetDate(e.target.value)}
                      className="text-xs sm:text-sm font-black bg-transparent border-0 text-slate-900 focus:outline-none cursor-pointer"
                    />
                  </div>

                  <button
                    onClick={() => shiftDate(1)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 shadow-2xs text-slate-800 font-bold transition-colors cursor-pointer"
                    title="Hari Berikutnya"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setSelectedTargetDate(new Date().toISOString().split('T')[0])}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-xs font-bold text-slate-800 cursor-pointer"
                    title="Pilih Hari Ini"
                  >
                    Hari Ini
                  </button>
                </div>

                <div className="text-center sm:text-right">
                  <div className="text-sm sm:text-base font-black text-slate-900">
                    {formatIndoDate(selectedTargetDate)}
                  </div>
                  <div className="text-xs text-slate-700 font-semibold flex items-center justify-center sm:justify-end gap-2 mt-0.5">
                    <span className="text-sky-800 font-extrabold">🌅 Pagi: {allPagiNurses.length}</span>
                    <span>•</span>
                    <span className="text-amber-800 font-extrabold">☀️ Siang: {allSiangNurses.length}</span>
                    <span>•</span>
                    <span className="text-emerald-800 font-bold">{assignedDutyCount} Ada Tugas PIC</span>
                  </div>
                </div>
              </div>

              {/* Isolation Policy Banner */}
              <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-3 flex items-start gap-2.5 text-rose-950 shadow-2xs">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed">
                  <span className="font-black text-rose-900">Ketentuan Mesin Isolasi: </span>
                  <span className="font-semibold text-rose-900">
                    Hanya perawat dengan tugas khusus <b>CITO</b> pada tanggal ini yang akan dialokasikan ke Mesin Isolasi (Bed C08/C09).
                  </span>
                </div>
              </div>

              {/* PIC Coverage Grid (Separated Pagi & Siang) */}
              <div className="bg-white border-2 border-slate-300 rounded-2xl p-3 sm:p-4 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-blue-600" />
                    Status Penugasan PIC Ruangan ({selectedTargetDate})
                  </span>
                  <span className="text-[11px] font-bold text-slate-600">
                    7 Bidang Tugas Ruangan HD
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                  {Object.entries(DUTY_CHIP_STYLES).map(([code, style]) => {
                    const coverage = dutyAssignmentMap[code] || { pagi: [], siang: [], all: [] };
                    const isFilled = coverage.all.length > 0;

                    return (
                      <div
                        key={code}
                        className={`p-2.5 rounded-xl border-2 flex flex-col justify-between transition-all ${
                          isFilled
                            ? 'bg-blue-50 border-blue-400'
                            : 'bg-slate-100 border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[11px] font-black text-slate-900 truncate">
                            {style.short}
                          </span>
                          {isFilled ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          ) : (
                            <span className="text-[9px] font-extrabold text-slate-500 uppercase">
                              Kosong
                            </span>
                          )}
                        </div>

                        {/* Pagi / Siang Breakdown */}
                        <div className="mt-1.5 space-y-1 text-[10px]">
                          {isFilled ? (
                            <>
                              {coverage.pagi.length > 0 && (
                                <div className="text-sky-900 font-bold truncate">
                                  <span className="font-black text-sky-800">[P]</span> {coverage.pagi.join(', ')}
                                </div>
                              )}
                              {coverage.siang.length > 0 && (
                                <div className="text-amber-900 font-bold truncate">
                                  <span className="font-black text-amber-800">[S]</span> {coverage.siang.join(', ')}
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="text-slate-400 italic font-medium">Belum Ditugaskan</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Shift Segmented Tab Switcher (Pisahkan Sif Pagi & Sif Siang) */}
              <div className="bg-white border-2 border-slate-300 rounded-2xl p-2.5 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-300 overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setActiveShiftTab('SEPARATE')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                      activeShiftTab === 'SEPARATE'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Semua (Terpisah Pagi & Siang)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveShiftTab('PAGI')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                      activeShiftTab === 'PAGI'
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'text-sky-900 hover:bg-sky-100'
                    }`}
                  >
                    <Sunrise className="w-3.5 h-3.5" />
                    <span>Sif Pagi ({allPagiNurses.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveShiftTab('SIANG')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                      activeShiftTab === 'SIANG'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-amber-900 hover:bg-amber-100'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5" />
                    <span>Sif Siang ({allSiangNurses.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveShiftTab('LIBUR')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                      activeShiftTab === 'LIBUR'
                        ? 'bg-slate-700 text-white shadow-xs'
                        : 'text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <Coffee className="w-3.5 h-3.5" />
                    <span>Libur / Off ({allOffNurses.length})</span>
                  </button>
                </div>

                {/* Filter and Search Bar */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 sm:w-48">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari perawat..."
                      className="w-full pl-8 pr-2.5 py-1.5 text-xs font-bold rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <select
                    value={dutyFilter}
                    onChange={(e) => setDutyFilter(e.target.value as any)}
                    className="px-2.5 py-1.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-extrabold text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="ALL">Semua Tugas PIC</option>
                    <option value="HAS_DUTY">Sudah Ada Tugas</option>
                    <option value="NO_DUTY">Belum Ada Tugas</option>
                  </select>

                  {(searchQuery.trim() !== '' || dutyFilter !== 'ALL') && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setDutyFilter('ALL');
                      }}
                      className="text-xs text-blue-700 hover:text-blue-900 font-black underline cursor-pointer shrink-0"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>

              {/* EMPTY STATE IF NO NURSES IN SYSTEM */}
              {validNurses.length === 0 ? (
                <div className="p-10 text-center bg-white rounded-3xl border-2 border-dashed border-slate-300 space-y-3 shadow-xs">
                  <UserX className="w-12 h-12 text-slate-400 mx-auto" />
                  <h4 className="text-base font-black text-slate-900">
                    Belum Ada Data Perawat Terdaftar
                  </h4>
                  <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                    Data perawat contoh bawaan telah dibersihkan sesuai instruksi. Silakan tambahkan data perawat ruangan HD Anda terlebih dahulu melalui menu <b>Daftar Perawat</b>.
                  </p>
                  <div className="pt-2">
                    <button
                      onClick={onClose}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-colors"
                    >
                      Tutup & Buka Menu Perawat
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">

                  {/* SECTION 1: SIF PAGI (06:30 - 14:00) */}
                  {(activeShiftTab === 'SEPARATE' || activeShiftTab === 'PAGI') && (
                    <div className="space-y-3 bg-sky-50/60 p-4 rounded-3xl border-2 border-sky-200">
                      {/* Section Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-sky-200">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-xs">
                            <Sunrise className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm sm:text-base font-black text-sky-950">
                                🌅 SIF PAGI (06:30 - 14:00)
                              </h4>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-sky-200 text-sky-900 border border-sky-300">
                                {allPagiNurses.length} Perawat Berdinas
                              </span>
                            </div>
                            <p className="text-xs text-sky-800 font-medium mt-0.5">
                              Tentukan PJ Sif Pagi dan penugasan PIC untuk dinas pagi
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-bold text-sky-900">PJ Sif Pagi:</span>
                          {pagiLeader ? (
                            <span className="inline-flex items-center gap-1 font-black px-2 py-0.5 rounded-lg bg-amber-400 text-slate-950 border border-amber-500 shadow-2xs">
                              <Crown className="w-3 h-3" />
                              {pagiLeader.name}
                            </span>
                          ) : (
                            <span className="text-rose-700 bg-rose-100 border border-rose-300 px-2 py-0.5 rounded-lg font-bold text-[11px]">
                              Belum Ditentukan
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Nurse Cards for Sif Pagi */}
                      {filteredPagiNurses.length === 0 ? (
                        <div className="p-6 text-center bg-white/80 rounded-2xl border border-sky-200 text-xs text-sky-900 space-y-1">
                          <AlertCircle className="w-6 h-6 text-sky-500 mx-auto" />
                          <p className="font-extrabold">
                            {allPagiNurses.length === 0
                              ? `Belum ada perawat terjadwal dinas Sif Pagi pada ${selectedTargetDate}.`
                              : 'Tidak ada perawat Sif Pagi yang cocok dengan filter pencarian.'}
                          </p>
                          {allPagiNurses.length === 0 && (
                            <p className="text-[11px] text-sky-700">
                              Jadwalkan perawat ke Sif Pagi melalui menu Dinas Harian atau Jadwal 1 Bulan.
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {filteredPagiNurses.map((nurse) => renderNurseCard(nurse, 'PAGI'))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* SECTION 2: SIF SIANG (13:30 - 21:00) */}
                  {(activeShiftTab === 'SEPARATE' || activeShiftTab === 'SIANG') && (
                    <div className="space-y-3 bg-amber-50/60 p-4 rounded-3xl border-2 border-amber-200">
                      {/* Section Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-amber-200">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-xs">
                            <Sun className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm sm:text-base font-black text-amber-950">
                                ☀️ SIF SIANG (13:30 - 21:00)
                              </h4>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-200 text-amber-900 border border-amber-300">
                                {allSiangNurses.length} Perawat Berdinas
                              </span>
                            </div>
                            <p className="text-xs text-amber-800 font-medium mt-0.5">
                              Tentukan PJ Sif Siang dan penugasan PIC untuk dinas siang
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-bold text-amber-900">PJ Sif Siang:</span>
                          {siangLeader ? (
                            <span className="inline-flex items-center gap-1 font-black px-2 py-0.5 rounded-lg bg-amber-400 text-slate-950 border border-amber-500 shadow-2xs">
                              <Crown className="w-3 h-3" />
                              {siangLeader.name}
                            </span>
                          ) : (
                            <span className="text-rose-700 bg-rose-100 border border-rose-300 px-2 py-0.5 rounded-lg font-bold text-[11px]">
                              Belum Ditentukan
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Nurse Cards for Sif Siang */}
                      {filteredSiangNurses.length === 0 ? (
                        <div className="p-6 text-center bg-white/80 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-1">
                          <AlertCircle className="w-6 h-6 text-amber-500 mx-auto" />
                          <p className="font-extrabold">
                            {allSiangNurses.length === 0
                              ? `Belum ada perawat terjadwal dinas Sif Siang pada ${selectedTargetDate}.`
                              : 'Tidak ada perawat Sif Siang yang cocok dengan filter pencarian.'}
                          </p>
                          {allSiangNurses.length === 0 && (
                            <p className="text-[11px] text-amber-700">
                              Jadwalkan perawat ke Sif Siang melalui menu Dinas Harian atau Jadwal 1 Bulan.
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {filteredSiangNurses.map((nurse) => renderNurseCard(nurse, 'SIANG'))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* SECTION 3: PERAWAT LIBUR / OFF / CUTI */}
                  {(activeShiftTab === 'SEPARATE' || activeShiftTab === 'LIBUR') && allOffNurses.length > 0 && (
                    <div className="space-y-3 bg-slate-100/80 p-4 rounded-3xl border-2 border-slate-200">
                      {/* Section Header */}
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-slate-600 text-white flex items-center justify-center">
                            <Coffee className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <h4 className="text-xs sm:text-sm font-black text-slate-800">
                              🏖️ Perawat Libur / Cuti / Off ({allOffNurses.length})
                            </h4>
                          </div>
                        </div>
                        <span className="text-[11px] font-bold text-slate-600">
                          Tidak Berdinas pada Tanggal Ini
                        </span>
                      </div>

                      {/* Nurse Cards for Off Nurses */}
                      {filteredOffNurses.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-500 italic">
                          Tidak ada perawat libur yang cocok dengan kriteria pencarian.
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {filteredOffNurses.map((nurse) => renderNurseCard(nurse, 'OFF'))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* VIEW 2: PANDUAN STANDAR SOP RUANGAN HD */}
          {currentView === 'PANDUAN_SOP' && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border-2 border-blue-300 rounded-2xl text-xs text-blue-950 space-y-1">
                <h4 className="font-black text-sm flex items-center gap-2 text-blue-900">
                  <Sparkles className="w-4 h-4 text-blue-700" />
                  Standar Operasional Prosedur (SOP) Tugas Khusus Ruang HD
                </h4>
                <p className="font-semibold text-blue-900 leading-relaxed">
                  Tugas khusus (PIC) dialokasikan setiap sif kerja untuk memastikan keselamatan pasien, kesiapan mesin dialisis, kontrol infeksi, dan kelancaran klaim administrasi.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(SPECIAL_DUTY_OPTIONS).map(([code, opt]) => {
                  const style = DUTY_CHIP_STYLES[code] || {
                    short: opt.shortName || code,
                    label: opt.label || code,
                    active: 'bg-blue-600 text-white',
                    inactive: 'bg-white text-slate-800',
                  };

                  return (
                    <div
                      key={code}
                      className="p-3.5 bg-white border-2 border-slate-300 rounded-2xl space-y-2 shadow-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-xl text-xs font-black ${style.active}`}>
                          {style.short}
                        </span>
                        <h5 className="font-black text-xs sm:text-sm text-slate-900">
                          {style.label}
                        </h5>
                      </div>
                      <p className="text-xs text-slate-700 font-medium leading-relaxed">
                        {opt.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-300 bg-slate-100 flex items-center justify-between">
          <div className="text-xs font-bold text-slate-700">
            {assignedDutyCount} penugasan PIC tersimpan untuk {selectedTargetDate}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
