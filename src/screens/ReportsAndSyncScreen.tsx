import React, { useState, useMemo } from 'react';
import { useHemo } from '../context/HemoContext';
import { FairSchedulerEngine } from '../domain/FairSchedulerEngine';
import { GoogleScriptGuideModal } from '../components/GoogleScriptGuideModal';
import { ImportScheduleModal } from '../components/ImportScheduleModal';
import { ReadOnlyBanner } from '../components/ReadOnlyBanner';
import {
  FileSpreadsheet,
  Award,
  RefreshCw,
  Download,
  Upload,
  CheckCircle2,
  ExternalLink,
  Save,
  RotateCcw,
  Sparkles,
  Database,
  Building,
  Cloud,
  ShieldCheck,
  Laptop,
  Lock,
  Server,
} from 'lucide-react';

export const ReportsAndSyncScreen: React.FC = () => {
  const {
    isAdmin,
    currentMonth,
    nurses,
    machines,
    assignments,
    settings,
    updateSettings,
    syncWithGoogleSheets,
    syncAllDataToCloud,
    isCloudConnected,
    isCloudLoaded,
    resetToInitialData,
    showToast,
  } = useHemo();

  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);

  // Editable settings form
  const [hospitalName, setHospitalName] = useState(settings.hospitalName);
  const [roomName, setRoomName] = useState(settings.roomName);
  const [headNurseName, setHeadNurseName] = useState(settings.headNurseName);
  const [headNursePhone, setHeadNursePhone] = useState(settings.headNursePhone);
  const [googleSheetWebhookUrl, setGoogleSheetWebhookUrl] = useState(
    settings.googleSheetWebhookUrl
  );
  const [googleSpreadsheetIdOrUrl, setGoogleSpreadsheetIdOrUrl] = useState(
    settings.googleSpreadsheetIdOrUrl
  );
  const [autoSync, setAutoSync] = useState(settings.autoSyncGoogleSheets);

  // Compute fairness report for current month
  const fairnessReport = useMemo(() => {
    return FairSchedulerEngine.calculateFairnessReport(
      currentMonth,
      nurses,
      machines,
      assignments
    );
  }, [currentMonth, nurses, machines, assignments]);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    updateSettings({
      ...settings,
      hospitalName: hospitalName.trim(),
      roomName: roomName.trim(),
      headNurseName: headNurseName.trim(),
      headNursePhone: headNursePhone.trim(),
      googleSheetWebhookUrl: googleSheetWebhookUrl.trim(),
      googleSpreadsheetIdOrUrl: googleSpreadsheetIdOrUrl.trim(),
      autoSyncGoogleSheets: autoSync,
    });
    showToast('Pengaturan sistem & integrasi berhasil disimpan', 'success');
  };

  const handleManualSync = async () => {
    if (!isAdmin) return;
    setIsSyncing(true);
    const success = await syncWithGoogleSheets();
    setIsSyncing(false);
    if (success) {
      showToast('Sinkronisasi data ke Google Sheets berhasil!', 'success');
    } else {
      showToast('Sinkronisasi gagal. Periksa URL Webhook Google Apps Script.', 'error');
    }
  };

  const handleExportJSON = () => {
    const data = {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      nurses,
      machines,
      assignments,
      settings,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hemo-shift-backup-${currentMonth}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('File backup JSON berhasil diunduh', 'success');
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdmin) return;
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (parsed.nurses && parsed.machines && parsed.assignments) {
          localStorage.setItem('hemo_nurses_v1', JSON.stringify(parsed.nurses));
          localStorage.setItem('hemo_machines_v1', JSON.stringify(parsed.machines));
          localStorage.setItem('hemo_assignments_v1', JSON.stringify(parsed.assignments));
          if (parsed.settings) {
            localStorage.setItem('hemo_settings_v1', JSON.stringify(parsed.settings));
          }
          showToast('Data berhasil dipulihkan dari backup. Memuat ulang...', 'success');
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        } else {
          showToast('Format file backup tidak valid', 'error');
        }
      } catch {
        showToast('Gagal membaca file backup', 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="pb-24 space-y-5">
      <ReadOnlyBanner actionDescription="menyinkronkan data cloud, merubah pengaturan unit, atau memulihkan/mereset database" />

      {/* Multi-Device Cloud Sync & Data Guarantee Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-xs border border-slate-200/90 dark:border-slate-800 space-y-4 transition-colors">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center border border-sky-200 dark:border-sky-800 shrink-0">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Sinkronisasi Cloud Antar-Perangkat
                </h3>
                {isCloudConnected ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Cloud Terhubung Real-Time
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                    Menghubungkan Cloud...
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Memastikan seluruh jadwal, perawat, dan mesin 100% sama dan tidak berubah saat dibuka di HP, Tablet, maupun Laptop.
              </p>
            </div>
          </div>

          {isAdmin ? (
            <button
              onClick={async () => {
                setIsSyncingCloud(true);
                await syncAllDataToCloud();
                setIsSyncingCloud(false);
              }}
              disabled={isSyncingCloud}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 active:scale-95 text-white rounded-2xl font-bold text-xs shadow-md shadow-sky-500/25 transition-all disabled:opacity-50 min-h-[44px] shrink-0 w-full sm:w-auto"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncingCloud ? 'animate-spin' : ''}`} />
              <span>{isSyncingCloud ? 'Menyinkronkan...' : 'Sinkronkan & Kunci ke Cloud Sekarang'}</span>
            </button>
          ) : (
            <div className="text-xs text-slate-500 italic bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
              Sinkronisasi Cloud dikendalikan otomatis oleh Kepala Ruangan
            </div>
          )}
        </div>

        {/* Cloud Status Stats */}
        <div className="grid grid-cols-3 gap-2.5 pt-1">
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block">
              Jadwal di Cloud
            </span>
            <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              {assignments.length} Sif Terkunci
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block">
              Data Perawat
            </span>
            <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              {nurses.length} Perawat
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block">
              Mesin HD
            </span>
            <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              {machines.length} Mesin
            </span>
          </div>
        </div>

        {/* Step-by-Step Instructions to Keep Data Consistent Across Devices */}
        <div className="p-4 rounded-2xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/60 space-y-2.5">
          <div className="flex items-center gap-2 text-sky-900 dark:text-sky-200 font-bold text-xs">
            <ShieldCheck className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
            <span>Panduan Agar Data Selalu Sama di Semua Perangkat:</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-700 dark:text-slate-300">
            <div className="flex items-start gap-2 p-2 rounded-xl bg-white/70 dark:bg-slate-800/70 border border-sky-100/60 dark:border-slate-700/60">
              <span className="w-5 h-5 rounded-full bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300 font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                1
              </span>
              <div className="leading-snug">
                <b className="text-slate-900 dark:text-white block">Gunakan Tautan / URL yang Sama</b>
                Pastikan membuka link website yang sama di HP, Tablet, maupun Laptop Anda.
              </div>
            </div>

            <div className="flex items-start gap-2 p-2 rounded-xl bg-white/70 dark:bg-slate-800/70 border border-sky-100/60 dark:border-slate-700/60">
              <span className="w-5 h-5 rounded-full bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300 font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                2
              </span>
              <div className="leading-snug">
                <b className="text-slate-900 dark:text-white block">Tersimpan Otomatis ke Cloud</b>
                Setiap perubahan jadwal, mesin, atau perawat otomatis disimpan ke Cloud Firestore dan di-streaming real-time ke semua HP/Laptop.
              </div>
            </div>

            <div className="flex items-start gap-2 p-2 rounded-xl bg-white/70 dark:bg-slate-800/70 border border-sky-100/60 dark:border-slate-700/60">
              <span className="w-5 h-5 rounded-full bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300 font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                3
              </span>
              <div className="leading-snug">
                <b className="text-slate-900 dark:text-white block">Jadwal Sif Terkunci 100%</b>
                Perangkat baru yang membuka aplikasi tidak akan mengacak ulang jadwal. Data selalu dimuat dari server pusat Cloud Firestore.
              </div>
            </div>

            <div className="flex items-start gap-2 p-2 rounded-xl bg-white/70 dark:bg-slate-800/70 border border-sky-100/60 dark:border-slate-700/60">
              <span className="w-5 h-5 rounded-full bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300 font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                4
              </span>
              <div className="leading-snug">
                <b className="text-slate-900 dark:text-white block">Kunci Data Kapan Saja</b>
                Sebelum berganti perangkat, klik tombol <span className="text-sky-600 dark:text-sky-400 font-bold">Sinkronkan & Kunci ke Cloud</span> untuk memastikan 100% data lokal telah terunggah.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fairness & Workload Analysis Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-xs border border-slate-200/90 dark:border-slate-800 space-y-4 transition-colors">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-2xl border border-emerald-100 dark:border-emerald-900/60">
                <Sparkles className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Laporan Analisis Beban Kerja & Keadilan Sif
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Periode Bulan: <b className="text-slate-800 dark:text-slate-200">{currentMonth}</b> &bull; Evaluasi
                  distribusi sif dan alokasi mesin perawat
                </p>
              </div>
            </div>
          </div>

          {/* Fairness Score Badge */}
          <div className="flex items-center gap-3 bg-emerald-50/80 dark:bg-emerald-950/40 px-4 py-2 rounded-2xl border border-emerald-200 dark:border-emerald-800">
            <div className="text-right">
              <span className="text-[10px] font-semibold uppercase text-emerald-700 dark:text-emerald-300 block">
                Skor Keadilan Algoritma
              </span>
              <span className="text-xl font-black text-emerald-900 dark:text-emerald-200">
                {fairnessReport.fairnessScorePercent}%
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Mini stats cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Rata-rata Sif Kerja</span>
            <div className="font-bold text-slate-800 dark:text-white text-base mt-0.5">
              {fairnessReport.avgShiftsPerNurse} Sif / Orang
            </div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Rentang Beban Sif</span>
            <div className="font-bold text-slate-800 dark:text-white text-base mt-0.5">
              Min: {fairnessReport.minShifts} | Max: {fairnessReport.maxShifts}
            </div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Rata-rata Alokasi Mesin</span>
            <div className="font-bold text-slate-800 dark:text-white text-base mt-0.5">
              {fairnessReport.avgMachinesPerNurse} Mesin / Sif
            </div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Total Hari Libur Tim</span>
            <div className="font-bold text-slate-800 dark:text-white text-base mt-0.5">
              {fairnessReport.totalOffDays} Hari
            </div>
          </div>
        </div>

        {/* Nurse Fairness Distribution Table */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2.5 px-3">Nama Perawat</th>
                  <th className="py-2.5 px-2 text-center">Jabatan</th>
                  <th className="py-2.5 px-2 text-center text-sky-700 dark:text-sky-400">Pagi</th>
                  <th className="py-2.5 px-2 text-center text-amber-700 dark:text-amber-400">Siang</th>
                  <th className="py-2.5 px-2 text-center text-slate-500 dark:text-slate-400">Libur</th>
                  <th className="py-2.5 px-2 text-center text-teal-700 dark:text-teal-400">Cuti</th>
                  <th className="py-2.5 px-2 text-center font-bold text-slate-900 dark:text-white">Total Dinas</th>
                  <th className="py-2.5 px-2 text-center font-bold text-blue-700 dark:text-blue-400">Total Mesin</th>
                  <th className="py-2.5 px-2 text-center font-bold text-purple-700 dark:text-purple-400">Mesin Isolasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {fairnessReport.nurseStats.map((stat, idx) => (
                  <tr key={stat.nurseId} className={idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/40 dark:bg-slate-800/40'}>
                    <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">{stat.nurseName}</td>
                    <td className="py-2.5 px-2 text-center text-slate-500 dark:text-slate-400">{stat.role}</td>
                    <td className="py-2.5 px-2 text-center font-semibold text-sky-700 dark:text-sky-400">
                      {stat.pagiCount}
                    </td>
                    <td className="py-2.5 px-2 text-center font-semibold text-amber-700 dark:text-amber-400">
                      {stat.siangCount}
                    </td>
                    <td className="py-2.5 px-2 text-center text-slate-500 dark:text-slate-400">{stat.liburCount}</td>
                    <td className="py-2.5 px-2 text-center text-teal-700 dark:text-teal-400">{stat.cutiCount}</td>
                    <td className="py-2.5 px-2 text-center font-bold text-slate-900 dark:text-white">
                      {stat.totalWorkingShifts}
                    </td>
                    <td className="py-2.5 px-2 text-center font-bold text-blue-700 dark:text-blue-400">
                      {stat.totalMachinesAssigned}
                    </td>
                    <td className="py-2.5 px-2 text-center font-bold text-purple-700 dark:text-purple-400">
                      {stat.isolationMachinesHandled}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Import Jadwal dari Excel / Sheets */}
      <div className="bg-gradient-to-r from-emerald-600/10 via-teal-600/10 to-emerald-600/5 dark:from-emerald-950/40 dark:to-slate-900 rounded-3xl p-5 border border-emerald-300/60 dark:border-emerald-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/20">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Import Jadwal Bulanan dari Excel / Sheet
              </h3>
              <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-300 font-extrabold px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-700">
                Fitur Baru
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              Unggah file (.xlsx, .xls, .csv), tautkan Google Sheets, atau salin-tempel matriks jadwal perawat.
            </p>
          </div>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-emerald-500/25 transition-all active:scale-98 shrink-0 min-h-[44px]"
          >
            <Upload className="w-4 h-4" />
            <span>Buka Pengimpor Jadwal</span>
          </button>
        )}
      </div>

      {/* Google Sheets Integration & Webhook Sync */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-xs border border-slate-200/90 dark:border-slate-800 space-y-4 transition-colors">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-2xl border border-emerald-100 dark:border-emerald-900/60">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Integrasi Cloud Google Sheets (Live Sync)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sinkronisasi otomatis pembagian jadwal & alokasi 25 mesin ke spreadsheet Google
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsGuideOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors min-h-[40px]"
            >
              Panduan Setup <ExternalLink className="w-3.5 h-3.5" />
            </button>
            {isAdmin && (
              <button
                onClick={handleManualSync}
                disabled={isSyncing}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/25 transition-colors disabled:opacity-50 min-h-[40px]"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}
              </button>
            )}
          </div>
        </div>

        {/* Sync Status Banner */}
        {settings.lastSyncTimestamp && (
          <div className="flex items-center justify-between bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-3.5 text-xs text-emerald-800 dark:text-emerald-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>
                Terakhir disinkronkan:{' '}
                <b>{new Date(settings.lastSyncTimestamp).toLocaleString('id-ID')}</b>
              </span>
            </div>
            <span className="font-mono text-[11px] bg-emerald-100/70 dark:bg-emerald-900/60 px-2 py-0.5 rounded-lg">
              Status: {settings.lastSyncStatus || 'OK (200)'}
            </span>
          </div>
        )}

        <form onSubmit={handleSaveSettings} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Google Apps Script Webhook URL (POST):
            </label>
            <input
              type="url"
              value={googleSheetWebhookUrl}
              onChange={(e) => setGoogleSheetWebhookUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono text-slate-800 dark:text-slate-200"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              URL Web App yang diperoleh dari deployment Apps Script pada Spreadsheet Anda.
            </p>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Tautan / ID Spreadsheet (Untuk Akses Langsung):
            </label>
            <input
              type="text"
              value={googleSpreadsheetIdOrUrl}
              onChange={(e) => setGoogleSpreadsheetIdOrUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono text-slate-800 dark:text-slate-200"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoSync}
                onChange={(e) => setAutoSync(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded-sm border-slate-300 focus:ring-emerald-500"
              />
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Otomatis sinkron ke Google Sheets saat generate jadwal atau edit sif
              </span>
            </label>
          </div>

          {/* Unit Settings */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-3 flex items-center gap-1.5">
              <Building className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Identitas Unit & Rumah Sakit
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Nama Rumah Sakit</label>
                <input
                  type="text"
                  value={hospitalName}
                  onChange={(e) => setHospitalName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 dark:text-slate-200 font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Nama Ruangan / Unit</label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 dark:text-slate-200 font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Kepala Ruangan (KARU)
                </label>
                <input
                  type="text"
                  value={headNurseName}
                  onChange={(e) => setHeadNurseName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 dark:text-slate-200 font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nomor WhatsApp KARU (Untuk Laporan)
                </label>
                <input
                  type="tel"
                  value={headNursePhone}
                  onChange={(e) => setHeadNursePhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 dark:text-slate-200 font-mono"
                />
              </div>
            </div>
          </div>

          {isAdmin && (
            <div className="pt-3 flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold shadow-md shadow-blue-500/25 transition-all min-h-[44px]"
              >
                <Save className="w-4 h-4" />
                Simpan Pengaturan
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Backup & Restore Data Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-xs border border-slate-200/90 dark:border-slate-800 space-y-4 transition-colors">
        <div className="flex items-center gap-2.5">
          <span className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl">
            <Database className="w-5 h-5" />
          </span>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Backup & Pemulihan Data</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Simpan cadangan offline data perawat, 25 mesin, dan jadwal sif ke format JSON
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <button
            onClick={handleExportJSON}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-2xl transition-colors min-h-[44px]"
          >
            <Download className="w-4 h-4" />
            Unduh Backup JSON
          </button>

          {isAdmin && (
            <>
              <label className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-2xl cursor-pointer transition-colors min-h-[44px]">
                <Upload className="w-4 h-4" />
                Pulihkan dari Backup JSON
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportJSON}
                  className="hidden"
                />
              </label>

              <button
                onClick={() => {
                  if (
                    window.confirm(
                      'PERINGATAN: Apakah Anda yakin ingin mereset data? Data perawat akan dikosongkan dan susunan 30 mesin HD (A01-A12, C01-C04, B01-B09, C05-C09) akan disiapkan kembali.'
                    )
                  ) {
                    resetToInitialData();
                  }
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-bold rounded-2xl transition-colors ml-auto min-h-[44px]"
              >
                <RotateCcw className="w-4 h-4" />
                Reset Data Ruangan
              </button>
            </>
          )}
        </div>
      </div>

      {/* Guide Modal */}
      <GoogleScriptGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />

      {/* Import Schedule Modal */}
      {isImportModalOpen && (
        <ImportScheduleModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          defaultMonth={currentMonth}
        />
      )}
    </div>
  );
};
