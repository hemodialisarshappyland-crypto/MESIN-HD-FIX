import React, { useState, useMemo } from 'react';
import { useHemo } from '../context/HemoContext';
import { ShiftAssignment, ShiftType, SHIFT_TYPE_INFO, NURSE_ROLE_INFO } from '../types';
import { EditAssignmentModal } from '../components/EditAssignmentModal';
import { HeadNurseReportModal } from '../components/HeadNurseReportModal';
import { RegenerateMachineAllocationModal } from '../components/RegenerateMachineAllocationModal';
import { WhatsAppDispatchModal } from '../components/WhatsAppDispatchModal';
import { WhatsAppBroadcastModal } from '../components/WhatsAppBroadcastModal';
import { SpecialDutyBadge } from '../components/SpecialDutyBadge';
import { ReadOnlyBanner } from '../components/ReadOnlyBanner';
import { WhatsAppDispatcher } from '../domain/WhatsAppDispatcher';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Sun,
  Sunset,
  Sparkles,
  Send,
  Share2,
  FileText,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Cpu,
  Phone,
  Shield,
  MessageSquare,
  Copy,
  Clock,
  Filter,
} from 'lucide-react';

export const DailyDispatchScreen: React.FC = () => {
  const {
    isAdmin,
    selectedDate,
    selectDate,
    dailyAssignments,
    nurses,
    machines,
    settings,
    dispatchWhatsAppToNurse,
    dispatchGroupBroadcast,
    generateDailyMachineAllocation,
    updateAssignment,
    isGenerating,
    showToast,
  } = useHemo();

  const [shiftFilter, setShiftFilter] = useState<'ALL' | 'PAGI' | 'SIANG' | 'OFF'>('ALL');
  const [reallocateShiftTarget, setReallocateShiftTarget] = useState<'ALL' | 'PAGI' | 'SIANG'>('ALL');
  const [editingAssignment, setEditingAssignment] = useState<ShiftAssignment | null>(null);
  const [dispatchingAssignment, setDispatchingAssignment] = useState<ShiftAssignment | null>(null);
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [isHeadNurseModalOpen, setIsHeadNurseModalOpen] = useState(false);
  const [isReallocateModalOpen, setIsReallocateModalOpen] = useState(false);

  // Parse current date
  const dateObj = useMemo(() => {
    try {
      const parts = selectedDate.split('-');
      if (parts.length === 3) {
        return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      }
    } catch {
      // fallback
    }
    return new Date();
  }, [selectedDate]);

  const handlePrevDay = () => {
    const prev = new Date(dateObj);
    prev.setDate(prev.getDate() - 1);
    const dStr = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-${String(
      prev.getDate()
    ).padStart(2, '0')}`;
    selectDate(dStr);
  };

  const handleNextDay = () => {
    const next = new Date(dateObj);
    next.setDate(next.getDate() + 1);
    const dStr = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(
      next.getDate()
    ).padStart(2, '0')}`;
    selectDate(dStr);
  };

  const handleToday = () => {
    const today = new Date();
    const dStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
      today.getDate()
    ).padStart(2, '0')}`;
    selectDate(dStr);
  };

  const handleTomorrow = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(
      tomorrow.getDate()
    ).padStart(2, '0')}`;
    selectDate(dStr);
  };

  // Group metrics sorted by machine allocation order
  const pagiList = useMemo(
    () => WhatsAppDispatcher.sortAssignmentsByMachineOrder(dailyAssignments.filter((a) => a.shiftType === 'PAGI'), machines),
    [dailyAssignments, machines]
  );
  const siangList = useMemo(
    () => WhatsAppDispatcher.sortAssignmentsByMachineOrder(dailyAssignments.filter((a) => a.shiftType === 'SIANG'), machines),
    [dailyAssignments, machines]
  );
  const offList = useMemo(
    () => dailyAssignments.filter((a) => a.shiftType === 'LIBUR' || a.shiftType === 'CUTI' || a.shiftType === 'SAKIT'),
    [dailyAssignments]
  );

  const filteredAssignments = useMemo(() => {
    if (shiftFilter === 'PAGI') return pagiList;
    if (shiftFilter === 'SIANG') return siangList;
    if (shiftFilter === 'OFF') return offList;
    return [...pagiList, ...siangList, ...offList];
  }, [shiftFilter, pagiList, siangList, offList]);

  const activeMachinesCount = useMemo(
    () =>
      machines.filter(
        (m) =>
          (m.status || 'AKTIF').toUpperCase() === 'AKTIF' &&
          m.status !== 'MAINTENANCE' &&
          m.status !== 'RUSAK' &&
          m.status !== 'TIDAK_DIGUNAKAN'
      ).length,
    [machines]
  );

  return (
    <div className="pb-24 space-y-4">
      <ReadOnlyBanner actionDescription="merubah alokasi mesin atau jadwal sif harian" />

      {/* Top Date Navigator & Quick Actions */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 shadow-soft border border-slate-200/80 dark:border-slate-800/80 space-y-3.5 transition-all">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Date Selector */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between bg-slate-50 dark:bg-slate-800/60 p-1.5 rounded-2xl border border-slate-200/70 dark:border-slate-700/70">
            <button
              onClick={handlePrevDay}
              className="p-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700/60 shadow-2xs transition-all active:scale-95"
              title="Hari Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 px-2">
              <Calendar className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => selectDate(e.target.value)}
                className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-sm border-none focus:outline-none focus:ring-0 bg-transparent cursor-pointer"
              />
            </div>

            <button
              onClick={handleNextDay}
              className="p-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700/60 shadow-2xs transition-all active:scale-95"
              title="Hari Berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Date Chips & Actions */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            <button
              onClick={handleToday}
              className="px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800/80 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-2xs transition-all active:scale-95"
            >
              Hari Ini
            </button>
            <button
              onClick={handleTomorrow}
              className="px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800/80 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-2xs transition-all active:scale-95"
            >
              Besok
            </button>
            {isAdmin && (
              <button
                onClick={() => {
                  const target = shiftFilter === 'PAGI' ? 'PAGI' : shiftFilter === 'SIANG' ? 'SIANG' : 'ALL';
                  setReallocateShiftTarget(target);
                  setIsReallocateModalOpen(true);
                }}
                disabled={isGenerating}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white text-xs font-extrabold shadow-soft-md transition-all active:scale-95 disabled:opacity-50"
                title="Generate Ulang Alokasi Mesin Adil (Bisa pilih Sif Pagi, Sif Siang, atau Keduanya)"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                <span>
                  {isGenerating
                    ? 'Mengalokasikan...'
                    : shiftFilter === 'PAGI'
                    ? 'Alokasi Sif Pagi'
                    : shiftFilter === 'SIANG'
                    ? 'Alokasi Sif Siang'
                    : 'Alokasi Mesin Adil'}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Date Full Label & Broadcast Action Buttons */}
        <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
            <span className="font-extrabold text-slate-800 dark:text-slate-200 tracking-tight text-xs sm:text-sm">
              {WhatsAppDispatcher.formatIndonesianDate(selectedDate)}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsBroadcastModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800/80 hover:bg-emerald-100/90 font-bold transition-all shadow-2xs active:scale-95 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Broadcast Grup WA</span>
            </button>
            <button
              onClick={() => setIsHeadNurseModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800/80 hover:bg-blue-100/90 font-bold transition-all shadow-2xs active:scale-95"
            >
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>Laporan ke Karu</span>
            </button>
          </div>
        </div>
      </div>

      {/* Shift Overview Metrics & Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
        <button
          onClick={() => setShiftFilter('ALL')}
          className={`p-3.5 rounded-3xl border text-left transition-all duration-200 ${
            shiftFilter === 'ALL'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 border-slate-900 dark:border-white shadow-soft-md scale-[1.01]'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200/80 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/60 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-bold opacity-80 text-[11px] uppercase tracking-wider">Semua Staf</span>
            <Filter className="w-3.5 h-3.5 opacity-60" />
          </div>
          <div className="text-2xl font-black mt-1.5 tracking-tight">{nurses.length} Staf</div>
          <div className="text-[11px] opacity-70 mt-0.5">{nurses.filter((n) => n.isActive).length} Aktif Bertugas</div>
        </button>

        <button
          onClick={() => setShiftFilter('PAGI')}
          className={`p-3.5 rounded-3xl border text-left transition-all duration-200 ${
            shiftFilter === 'PAGI'
              ? 'bg-gradient-to-tr from-sky-600 to-blue-600 text-white border-sky-600 shadow-soft-md ring-2 ring-sky-400/50 scale-[1.01]'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200/80 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/60 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`font-bold flex items-center gap-1 text-[11px] uppercase tracking-wider ${shiftFilter === 'PAGI' ? 'text-white' : 'text-sky-600 dark:text-sky-400'}`}>
              <Sun className="w-3.5 h-3.5 text-amber-300" />
              Sif Pagi
            </span>
            <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${shiftFilter === 'PAGI' ? 'bg-white/20 text-white' : 'bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-200'}`}>
              07-14
            </span>
          </div>
          <div className={`text-2xl font-black mt-1.5 tracking-tight ${shiftFilter === 'PAGI' ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{pagiList.length} Perawat</div>
          <div className={`text-[11px] mt-0.5 ${shiftFilter === 'PAGI' ? 'text-sky-100' : 'text-slate-500 dark:text-slate-400'}`}>
            {pagiList.reduce((sum, a) => sum + (a.assignedMachineIds?.length || 0), 0)} Mesin tercover
          </div>
        </button>

        <button
          onClick={() => setShiftFilter('SIANG')}
          className={`p-3.5 rounded-3xl border text-left transition-all duration-200 ${
            shiftFilter === 'SIANG'
              ? 'bg-gradient-to-tr from-amber-600 to-orange-600 text-white border-amber-600 shadow-soft-md ring-2 ring-amber-400/50 scale-[1.01]'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200/80 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/60 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`font-bold flex items-center gap-1 text-[11px] uppercase tracking-wider ${shiftFilter === 'SIANG' ? 'text-white' : 'text-amber-600 dark:text-amber-400'}`}>
              <Sunset className="w-3.5 h-3.5 text-amber-300" />
              Sif Siang
            </span>
            <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${shiftFilter === 'SIANG' ? 'bg-white/20 text-white' : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200'}`}>
              12-19
            </span>
          </div>
          <div className={`text-2xl font-black mt-1.5 tracking-tight ${shiftFilter === 'SIANG' ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{siangList.length} Perawat</div>
          <div className={`text-[11px] mt-0.5 ${shiftFilter === 'SIANG' ? 'text-amber-100' : 'text-slate-500 dark:text-slate-400'}`}>
            {siangList.reduce((sum, a) => sum + (a.assignedMachineIds?.length || 0), 0)} Mesin tercover
          </div>
        </button>

        <button
          onClick={() => setShiftFilter('OFF')}
          className={`p-3.5 rounded-3xl border text-left transition-all duration-200 ${
            shiftFilter === 'OFF'
              ? 'bg-slate-700 text-white border-slate-700 shadow-soft-md ring-2 ring-slate-400/50 scale-[1.01]'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200/80 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/60 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`font-bold text-[11px] uppercase tracking-wider ${shiftFilter === 'OFF' ? 'text-white' : 'text-slate-600 dark:text-slate-400'}`}>Libur / Cuti</span>
            <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${shiftFilter === 'OFF' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
              OFF
            </span>
          </div>
          <div className={`text-2xl font-black mt-1.5 tracking-tight ${shiftFilter === 'OFF' ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{offList.length} Orang</div>
          <div className={`text-[11px] mt-0.5 ${shiftFilter === 'OFF' ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>Tidak Berdinas</div>
        </button>
      </div>

      {/* Daily Nurse Assignment Cards Grid */}
      <div className="space-y-3">
        {filteredAssignments.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-12 text-center border border-slate-200/80 dark:border-slate-800/80 shadow-soft space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-sky-50 dark:bg-sky-950/60 flex items-center justify-center mx-auto text-sky-600 dark:text-sky-400 border border-sky-200/80 dark:border-sky-800/80 shadow-2xs">
              <Calendar className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base sm:text-lg">
                Belum Ada Jadwal Pada Tanggal Ini
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                {isAdmin
                  ? 'Silakan klik tombol "Alokasi Mesin Adil" atau buka tab "Jadwal 1 Bulan" untuk menyusun jadwal perawat secara otomatis.'
                  : 'Jadwal dinas untuk tanggal ini belum diterbitkan oleh Kepala Ruangan (Karu).'}
              </p>
            </div>
            {isAdmin && (
              <button
                onClick={() => generateDailyMachineAllocation(selectedDate)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-700 hover:to-blue-800 text-white rounded-2xl text-xs font-extrabold shadow-soft-md transition-all active:scale-95"
              >
                <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                Generate Jadwal Tanggal Ini
              </button>
            )}
          </div>
        ) : (
          filteredAssignments.map((assignment) => {
            const shiftInfo = SHIFT_TYPE_INFO[assignment.shiftType];
            const nurse = nurses.find((n) => n.id === assignment.nurseId);
            const roleInfo = nurse ? NURSE_ROLE_INFO[nurse.role] : NURSE_ROLE_INFO.PELAKSANA;
            const isWork = shiftInfo.isWorkShift;
            const assignedMachines = WhatsAppDispatcher.getAssignedMachinesForAssignment(assignment, machines);

            return (
              <div
                key={assignment.id}
                className={`bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border transition-all duration-200 shadow-soft ${
                  isWork
                    ? 'border-slate-200/80 dark:border-slate-800/80 hover:border-sky-300 dark:hover:border-sky-700 hover:shadow-soft-md'
                    : 'border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/40 opacity-90'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
                  {/* Nurse details */}
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`w-11 h-11 rounded-2xl font-black text-sm flex items-center justify-center shadow-soft-sm shrink-0 border border-white/20 ${
                        nurse?.role === 'KARU'
                          ? 'bg-gradient-to-tr from-amber-500 to-orange-600 text-white'
                          : assignment.isLeader
                          ? 'bg-gradient-to-tr from-indigo-600 to-purple-600 text-white'
                          : assignment.shiftType === 'PAGI'
                          ? 'bg-gradient-to-tr from-sky-500 to-blue-600 text-white'
                          : assignment.shiftType === 'SIANG'
                          ? 'bg-gradient-to-tr from-amber-500 to-yellow-600 text-white'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {assignment.nurseName.charAt(0)}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-extrabold text-slate-900 dark:text-white text-sm tracking-tight">
                          {assignment.nurseName}
                        </h4>
                        {assignment.isLeader && (
                          <span className="text-[10px] font-extrabold px-2.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80 rounded-full shadow-2xs">
                            👑 PJ SIF / KATIM
                          </span>
                        )}
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border shadow-2xs ${roleInfo.badgeClass}`}>
                          {roleInfo.title}
                        </span>
                        {(assignment.specialDuty || nurse?.specialDuty) && (
                          <SpecialDutyBadge
                            duty={assignment.specialDuty || nurse?.specialDuty}
                            size="sm"
                          />
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1.5 font-mono text-[11px]">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {assignment.nursePhone}
                        </span>
                        {nurse?.skillLevel && (
                          <span className="text-slate-400 dark:text-slate-500">&bull; {nurse.skillLevel}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Shift Badge & Time */}
                  <div className="flex items-center gap-2 self-start sm:self-center">
                    <div className={`px-3 py-1.5 rounded-2xl border text-xs font-bold flex items-center gap-2 shadow-2xs ${shiftInfo.bgClass} ${shiftInfo.textClass}`}>
                      <span className={`w-5 h-5 rounded-lg flex items-center justify-center font-black text-[10px] shadow-2xs ${shiftInfo.badgeClass}`}>
                        {shiftInfo.code}
                      </span>
                      <span>{shiftInfo.label}</span>
                      {shiftInfo.isWorkShift && (
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium hidden sm:inline">
                          ({shiftInfo.timeRange})
                        </span>
                      )}
                    </div>

                    {isAdmin && (
                      <button
                        onClick={() => setEditingAssignment(assignment)}
                        className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all active:scale-95"
                        title="Edit Sif & Alokasi Mesin"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Machine Allocations Chips */}
                {isWork && (
                  <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                        Mesin Tanggung Jawab ({assignedMachines.length} Bed Dialisis):
                      </span>
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                        Rasio HD: 1 : {assignedMachines.length}
                      </span>
                    </div>

                    {assignedMachines.length === 0 ? (
                      <div className="text-xs text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 px-3 py-2 rounded-2xl border border-amber-200/80 dark:border-amber-800/60 inline-flex items-center gap-2">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        Belum ada mesin yang dialokasikan.
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        {assignedMachines.map((m) => {
                          if (!m) return null;
                          const isSpecial = m.category !== 'REGULER';
                          return (
                            <span
                              key={m.id}
                              className={`px-3 py-1.5 rounded-2xl text-xs font-semibold border flex items-center gap-2 shadow-2xs transition-all ${
                                m.category === 'ISOLASI'
                                  ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800/80'
                                  : m.category === 'HEPATITIS_B'
                                  ? 'bg-purple-50 dark:bg-purple-950/50 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-800/80'
                                  : m.category === 'HEPATITIS_C'
                                  ? 'bg-pink-50 dark:bg-pink-950/50 text-pink-800 dark:text-pink-200 border-pink-200 dark:border-pink-800/80'
                                  : 'bg-slate-50 dark:bg-slate-800/70 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700/70'
                              }`}
                            >
                              <b className="font-mono font-black text-sky-700 dark:text-sky-300">{m.code}</b>
                              <span className="text-[11px] text-slate-600 dark:text-slate-400 truncate max-w-[110px]">
                                {m.name.replace('Mesin HD ', '#')} ({m.bay.split(' ')[0]})
                              </span>
                              {isSpecial && (
                                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" title={m.category} />
                              )}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Bottom WhatsApp Dispatch Button */}
                <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {assignment.isWhatsAppSent ? (
                      <span className="text-emerald-700 dark:text-emerald-400 font-bold inline-flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        Notifikasi WA Terkirim
                      </span>
                    ) : (
                      'Belum dikirim via WhatsApp'
                    )}
                  </span>

                  <button
                    onClick={() => setDispatchingAssignment(assignment)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-extrabold shadow-soft-sm transition-all active:scale-95 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Kirim WA</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modals */}
      {dispatchingAssignment && (
        <WhatsAppDispatchModal
          isOpen={!!dispatchingAssignment}
          assignment={dispatchingAssignment}
          onClose={() => setDispatchingAssignment(null)}
        />
      )}

      {isBroadcastModalOpen && (
        <WhatsAppBroadcastModal
          isOpen={isBroadcastModalOpen}
          initialShiftFilter={shiftFilter === 'PAGI' ? 'PAGI' : shiftFilter === 'SIANG' ? 'SIANG' : null}
          onClose={() => setIsBroadcastModalOpen(false)}
        />
      )}

      {editingAssignment && (
        <EditAssignmentModal
          assignment={editingAssignment}
          machines={machines}
          onClose={() => setEditingAssignment(null)}
          onSave={updateAssignment}
          showSpecialDuty={true}
        />
      )}

      {isHeadNurseModalOpen && (
        <HeadNurseReportModal onClose={() => setIsHeadNurseModalOpen(false)} />
      )}

      {isReallocateModalOpen && (
        <RegenerateMachineAllocationModal
          isOpen={isReallocateModalOpen}
          onClose={() => setIsReallocateModalOpen(false)}
          defaultScope="DAILY"
          defaultShift={reallocateShiftTarget}
        />
      )}
    </div>
  );
};
