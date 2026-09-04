import React, { useState, useEffect } from 'react';
import { useHemo } from '../context/HemoContext';
import {
  X,
  Sparkles,
  Cpu,
  Calendar,
  CalendarDays,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Layers,
  ArrowRight,
  Info,
  Sliders,
  Check,
  Shuffle,
  Sun,
  Sunset,
} from 'lucide-react';
import { WhatsAppDispatcher } from '../domain/WhatsAppDispatcher';

interface RegenerateMachineAllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultScope?: 'DAILY' | 'MONTHLY';
  defaultShift?: 'ALL' | 'PAGI' | 'SIANG';
}

export const RegenerateMachineAllocationModal: React.FC<RegenerateMachineAllocationModalProps> = ({
  isOpen,
  onClose,
  defaultScope = 'DAILY',
  defaultShift = 'ALL',
}) => {
  const {
    selectedDate,
    currentMonth,
    nurses,
    machines,
    dailyAssignments,
    assignments,
    reallocateMachinesForDate,
    reallocateMachinesForMonth,
    isGenerating,
  } = useHemo();

  const [scope, setScope] = useState<'DAILY' | 'MONTHLY'>(defaultScope);
  const [targetShift, setTargetShift] = useState<'ALL' | 'PAGI' | 'SIANG'>(defaultShift);
  const [shuffleNurses, setShuffleNurses] = useState(true);
  const [rotateBays, setRotateBays] = useState(true);
  const [distributeExtraFairly, setDistributeExtraFairly] = useState(true);
  const [leaderLighterLoad, setLeaderLighterLoad] = useState(false);
  const [consecutiveIsolationProtection, setConsecutiveIsolationProtection] = useState(true);

  // Sync state with props whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setScope(defaultScope);
      setTargetShift(defaultShift);
    }
  }, [isOpen, defaultScope, defaultShift]);

  if (!isOpen) return null;

  const activeMachines = machines.filter(
    (m) =>
      (m.status || 'AKTIF').toUpperCase() === 'AKTIF' &&
      m.status !== 'MAINTENANCE' &&
      m.status !== 'RUSAK' &&
      m.status !== 'TIDAK_DIGUNAKAN'
  );
  const inactiveMachines = machines.filter(
    (m) =>
      (m.status || 'AKTIF').toUpperCase() !== 'AKTIF' ||
      m.status === 'MAINTENANCE' ||
      m.status === 'RUSAK' ||
      m.status === 'TIDAK_DIGUNAKAN'
  );

  // Stats for daily
  const pagiCount = dailyAssignments.filter((a) => a.shiftType === 'PAGI').length;
  const siangCount = dailyAssignments.filter((a) => a.shiftType === 'SIANG').length;
  const totalWorkingDaily = pagiCount + siangCount;

  const targetNurseCount =
    targetShift === 'PAGI' ? pagiCount : targetShift === 'SIANG' ? siangCount : totalWorkingDaily;

  const handleExecute = () => {
    const options = {
      rotateBays,
      leaderLighterLoad,
      consecutiveIsolationProtection,
      shuffleNurses,
      targetShift,
    };

    if (scope === 'DAILY') {
      reallocateMachinesForDate(selectedDate, options);
    } else {
      reallocateMachinesForMonth(currentMonth, options);
    }
    onClose();
  };

  const formattedDate = WhatsAppDispatcher.formatIndonesianDate(selectedDate);
  const [yearStr, monthStr] = currentMonth.split('-');
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const monthFormatted = `${monthNames[parseInt(monthStr, 10) - 1] || monthStr} ${yearStr}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        id="regenerate-machine-modal"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-700 via-blue-700 to-sky-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg leading-tight">
                Alokasi Mesin Adil Terpisah
              </h3>
              <p className="text-[11px] text-blue-100">
                Pemisahan distribusi mesin adil untuk Sif Pagi dan Sif Siang
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm text-slate-800 dark:text-slate-200">
          {/* Shift Target Selector (PAGI vs SIANG vs KEDUANYA) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              Pilih Sif Target Alokasi:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {/* Sif Pagi */}
              <button
                type="button"
                onClick={() => setTargetShift('PAGI')}
                className={`p-2.5 rounded-2xl border text-left flex flex-col gap-1 transition-all ${
                  targetShift === 'PAGI'
                    ? 'border-sky-500 bg-sky-50/90 dark:bg-sky-950/60 text-sky-950 dark:text-sky-100 ring-2 ring-sky-500/30 shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs flex items-center gap-1 text-sky-700 dark:text-sky-300">
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    Sif Pagi
                  </span>
                  {targetShift === 'PAGI' && (
                    <span className="w-4 h-4 rounded-full bg-sky-600 text-white flex items-center justify-center text-[10px]">
                      <Check className="w-3 h-3" />
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-bold text-slate-900 dark:text-white">
                  07:00 - 14:00
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  {pagiCount} Perawat dinas
                </span>
              </button>

              {/* Sif Siang */}
              <button
                type="button"
                onClick={() => setTargetShift('SIANG')}
                className={`p-2.5 rounded-2xl border text-left flex flex-col gap-1 transition-all ${
                  targetShift === 'SIANG'
                    ? 'border-amber-500 bg-amber-50/90 dark:bg-amber-950/60 text-amber-950 dark:text-amber-100 ring-2 ring-amber-500/30 shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs flex items-center gap-1 text-amber-700 dark:text-amber-300">
                    <Sunset className="w-3.5 h-3.5 text-amber-500" />
                    Sif Siang
                  </span>
                  {targetShift === 'SIANG' && (
                    <span className="w-4 h-4 rounded-full bg-amber-600 text-white flex items-center justify-center text-[10px]">
                      <Check className="w-3 h-3" />
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-bold text-slate-900 dark:text-white">
                  12:00 - 19:00
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  {siangCount} Perawat dinas
                </span>
              </button>

              {/* Kedua Sif */}
              <button
                type="button"
                onClick={() => setTargetShift('ALL')}
                className={`p-2.5 rounded-2xl border text-left flex flex-col gap-1 transition-all ${
                  targetShift === 'ALL'
                    ? 'border-indigo-500 bg-indigo-50/90 dark:bg-indigo-950/60 text-indigo-950 dark:text-indigo-100 ring-2 ring-indigo-500/30 shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs flex items-center gap-1 text-indigo-700 dark:text-indigo-300">
                    <Layers className="w-3.5 h-3.5 text-indigo-500" />
                    Kedua Sif
                  </span>
                  {targetShift === 'ALL' && (
                    <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">
                      <Check className="w-3 h-3" />
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-bold text-slate-900 dark:text-white">
                  Pagi + Siang
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  {totalWorkingDaily} Perawat total
                </span>
              </button>
            </div>
          </div>

          {/* Scope Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              Pilih Cakupan Tanggal:
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setScope('DAILY')}
                className={`p-3 rounded-2xl border text-left flex flex-col gap-1 transition-all ${
                  scope === 'DAILY'
                    ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/50 text-blue-950 dark:text-blue-200 ring-2 ring-blue-500/20 shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-blue-600 dark:text-sky-400" />
                    Hari Ini Saja
                  </span>
                  {scope === 'DAILY' && (
                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
                      <Check className="w-3 h-3" />
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  {formattedDate}
                </span>
                <span className="text-[10px] text-slate-500">
                  {pagiCount} Sif Pagi &bull; {siangCount} Sif Siang
                </span>
              </button>

              <button
                type="button"
                onClick={() => setScope('MONTHLY')}
                className={`p-3 rounded-2xl border text-left flex flex-col gap-1 transition-all ${
                  scope === 'MONTHLY'
                    ? 'border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/50 text-indigo-950 dark:text-indigo-200 ring-2 ring-indigo-500/20 shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs flex items-center gap-1.5">
                    <CalendarDays className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    Satu Bulan Penuh
                  </span>
                  {scope === 'MONTHLY' && (
                    <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">
                      <Check className="w-3 h-3" />
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  {monthFormatted}
                </span>
                <span className="text-[10px] text-slate-500">
                  Pertahankan jadwal shift &bull; Putar mesin adil
                </span>
              </button>
            </div>
          </div>

          {/* Unit Status Card */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-blue-600" />
                Kapasitas Mesin Aktif:
              </span>
              <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">
                {activeMachines.length} / {machines.length} Mesin
              </span>
            </div>

            {inactiveMachines.length > 0 && (
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-2">
                <Info className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {inactiveMachines.length} mesin tidak aktif ({inactiveMachines.map((m) => m.code).join(', ')}) otomatis dikecualikan.
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-slate-600 dark:text-slate-300">
              <div className="bg-white dark:bg-slate-900/80 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px]">Target Perawat:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {targetShift === 'PAGI'
                    ? `${pagiCount} Perawat Sif Pagi`
                    : targetShift === 'SIANG'
                    ? `${siangCount} Perawat Sif Siang`
                    : `${totalWorkingDaily} Perawat (Pagi & Siang)`}
                </span>
              </div>
              <div className="bg-white dark:bg-slate-900/80 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px]">Area Pembagian:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  Bay A, B, C & Isolasi
                </span>
              </div>
            </div>
          </div>

          {/* Separation Guarantee Banner */}
          <div className={`p-3 rounded-2xl border flex items-start gap-2.5 ${
            targetShift === 'PAGI'
              ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800 text-sky-900 dark:text-sky-200'
              : targetShift === 'SIANG'
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
              : 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200'
          }`}>
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
            <div className="text-[11px] leading-relaxed">
              <span className="font-bold block">
                {targetShift === 'PAGI'
                  ? 'Isolasi Alokasi: Hanya Sif Pagi yang Dialokasikan'
                  : targetShift === 'SIANG'
                  ? 'Isolasi Alokasi: Hanya Sif Siang yang Dialokasikan'
                  : 'Alokasi Bersama: Sif Pagi & Sif Siang'}
              </span>
              <span className="opacity-90 block mt-0.5">
                {targetShift === 'PAGI'
                  ? 'Alokasi mesin perawat Sif Siang dipertahankan 100% aman dan tidak akan tersentuh atau berubah.'
                  : targetShift === 'SIANG'
                  ? 'Alokasi mesin perawat Sif Pagi dipertahankan 100% aman dan tidak akan tersentuh atau berubah.'
                  : 'Kedua sif akan dialokasikan ulang ke seluruh mesin aktif secara adil dan merata.'}
              </span>
            </div>
          </div>

          {/* Rules & Optimization Options */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-indigo-600" />
              Aturan Keadilan & Algoritma Rotasi:
            </label>

            <div className="space-y-2">
              {/* Option 1: Shuffle Nurses Fairly */}
              <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/30 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/40 transition-colors">
                <input
                  type="checkbox"
                  checked={shuffleNurses}
                  onChange={(e) => setShuffleNurses(e.target.checked)}
                  className="mt-0.5 rounded-md text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <div className="min-w-0">
                  <span className="font-bold text-xs text-blue-950 dark:text-blue-200 flex items-center gap-1.5">
                    <Shuffle className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
                    Acak Kembali Urutan Perawat (Reshuffle Adil)
                  </span>
                  <span className="text-[11px] text-blue-800/80 dark:text-blue-300/80 block leading-tight mt-0.5">
                    Mengacak susunan perawat dinas ke mesin aktif agar perawat mendapatkan pengalaman merata di seluruh mesin.
                  </span>
                </div>
              </label>

              {/* Option 2: Bay Rotation */}
              <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <input
                  type="checkbox"
                  checked={rotateBays}
                  onChange={(e) => setRotateBays(e.target.checked)}
                  className="mt-0.5 rounded-md text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <div className="min-w-0">
                  <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">
                    Rotasi Zonasi & Bay Harian (A, B, C, Isolasi)
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block leading-tight mt-0.5">
                    Memastikan perawat bergantian menjaga tiap Bay dan tidak monoton di satu sudut.
                  </span>
                </div>
              </label>

              {/* Option 3: Sisa Mesin Adil */}
              <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <input
                  type="checkbox"
                  checked={distributeExtraFairly}
                  onChange={(e) => setDistributeExtraFairly(e.target.checked)}
                  className="mt-0.5 rounded-md text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <div className="min-w-0">
                  <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">
                    Pemerataan Mesin Ekstra (Beban 4 Mesin Bergilir)
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block leading-tight mt-0.5">
                    Perawat yang memegang 4 mesin akan diprioritaskan memegang 3 mesin pada giliran berikutnya.
                  </span>
                </div>
              </label>

              {/* Option 4: Isolation Balance */}
              <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <input
                  type="checkbox"
                  checked={consecutiveIsolationProtection}
                  onChange={(e) => setConsecutiveIsolationProtection(e.target.checked)}
                  className="mt-0.5 rounded-md text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <div className="min-w-0">
                  <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">
                    Proteksi Mesin Isolasi (Mesin 23 - 25)
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block leading-tight mt-0.5">
                    Menghindari perawat yang sama bertugas di ruang isolasi (HBsAg/Anti-HCV) berturut-turut.
                  </span>
                </div>
              </label>

              {/* Option 5: Leader Load */}
              <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <input
                  type="checkbox"
                  checked={leaderLighterLoad}
                  onChange={(e) => setLeaderLighterLoad(e.target.checked)}
                  className="mt-0.5 rounded-md text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <div className="min-w-0">
                  <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">
                    Beban Lebih Ringan untuk PJ Sif / Katim
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block leading-tight mt-0.5">
                    Katim/Karu memegang 1 mesin lebih sedikit agar fokus pada supervisi klinis & administrasi.
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold text-xs transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleExecute}
            disabled={isGenerating || activeMachines.length === 0}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-extrabold text-xs shadow-md transition-all active:scale-98 disabled:opacity-50 ${
              targetShift === 'PAGI'
                ? 'bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 shadow-sky-500/25'
                : targetShift === 'SIANG'
                ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 shadow-amber-500/25'
                : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 shadow-blue-500/25'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>
              {isGenerating
                ? 'Menghitung Alokasi...'
                : targetShift === 'PAGI'
                ? `Alokasikan Mesin Sif Pagi (${scope === 'DAILY' ? 'Hari Ini' : '1 Bulan'})`
                : targetShift === 'SIANG'
                ? `Alokasikan Mesin Sif Siang (${scope === 'DAILY' ? 'Hari Ini' : '1 Bulan'})`
                : `Alokasikan Semua Sif (${scope === 'DAILY' ? 'Hari Ini' : '1 Bulan'})`}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
