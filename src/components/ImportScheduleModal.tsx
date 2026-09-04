import React, { useState, useRef } from 'react';
import { useHemo } from '../context/HemoContext';
import {
  X,
  FileSpreadsheet,
  Upload,
  Link,
  ClipboardList,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Info,
  Download,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Layers,
  FileText,
  RefreshCw,
  Search,
  Check,
} from 'lucide-react';
import { ScheduleImportService, ImportParseResult } from '../domain/ScheduleImportService';
import { SHIFT_TYPE_INFO } from '../types';

interface ImportScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMonth?: string;
}

type ImportSourceTab = 'FILE' | 'GOOGLE_SHEETS' | 'PASTE';

export const ImportScheduleModal: React.FC<ImportScheduleModalProps> = ({
  isOpen,
  onClose,
  defaultMonth,
}) => {
  const {
    currentMonth,
    nurses,
    machines,
    importScheduleAssignments,
    showToast,
    settings,
  } = useHemo();

  const [activeTab, setActiveTab] = useState<ImportSourceTab>('FILE');
  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonth || currentMonth);
  const [autoAllocateMachines, setAutoAllocateMachines] = useState<boolean>(true);
  const [replaceExisting, setReplaceExisting] = useState<boolean>(true);

  // File Upload State
  const [dragOver, setDragOver] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Google Sheets URL State
  const [googleSheetUrl, setGoogleSheetUrl] = useState<string>(settings?.googleSpreadsheetIdOrUrl || '');

  // Paste Text State
  const [pastedText, setPastedText] = useState<string>('');

  // Processing & Preview State
  const [isLoading, setIsLoading] = useState(false);
  const [parseResult, setParseResult] = useState<ImportParseResult | null>(null);
  const [step, setStep] = useState<'INPUT' | 'PREVIEW'>('INPUT');
  const [searchPreview, setSearchPreview] = useState('');

  if (!isOpen) return null;

  // Handle File Selection (XLSX, XLS, CSV)
  const handleFile = (file: File) => {
    if (!file) return;
    setUploadedFileName(file.name);
    setIsLoading(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const buffer = e.target?.result as ArrayBuffer;
      if (buffer) {
        try {
          const result = await ScheduleImportService.parseExcelFile(
            buffer,
            selectedMonth,
            nurses,
            machines,
            autoAllocateMachines
          );
          setIsLoading(false);
          setParseResult(result);
          if (result.isSuccess) {
            setStep('PREVIEW');
          } else {
            showToast(result.message, 'error');
          }
        } catch (err) {
          setIsLoading(false);
          showToast('Gagal memproses file: ' + (err instanceof Error ? err.message : String(err)), 'error');
        }
      }
    };
    reader.onerror = () => {
      setIsLoading(false);
      showToast('Gagal membaca file.', 'error');
    };
    reader.readAsArrayBuffer(file);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const onDragLeave = () => {
    setDragOver(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  // Handle Google Sheets Live Import
  const handleFetchGoogleSheets = async () => {
    if (!googleSheetUrl.trim()) {
      showToast('Masukkan link atau ID Google Sheets terlebih dahulu.', 'error');
      return;
    }
    setIsLoading(true);
    const result = await ScheduleImportService.fetchFromGoogleSheetsUrl(
      googleSheetUrl,
      selectedMonth,
      nurses,
      machines,
      autoAllocateMachines
    );
    setIsLoading(false);
    setParseResult(result);
    if (result.isSuccess) {
      setStep('PREVIEW');
    } else {
      showToast(result.message, 'error');
    }
  };

  // Handle Pasted Text Parsing
  const handleParsePastedText = async () => {
    if (!pastedText.trim()) {
      showToast('Tempelkan data tabel jadwal terlebih dahulu.', 'error');
      return;
    }
    setIsLoading(true);
    try {
      const result = await ScheduleImportService.parseCsvOrTsvText(
        pastedText,
        selectedMonth,
        nurses,
        machines,
        autoAllocateMachines
      );
      setIsLoading(false);
      setParseResult(result);
      if (result.isSuccess) {
        setStep('PREVIEW');
      } else {
        showToast(result.message, 'error');
      }
    } catch (err) {
      setIsLoading(false);
      showToast('Gagal memproses teks: ' + (err instanceof Error ? err.message : String(err)), 'error');
    }
  };

  // Commit imported schedule to context & Firestore
  const handleConfirmImport = () => {
    if (!parseResult || parseResult.assignments.length === 0) return;
    importScheduleAssignments(
      parseResult.assignments,
      selectedMonth,
      replaceExisting,
      parseResult.newNursesCreated
    );
    onClose();
  };

  // Filter preview items
  const filteredPreview = (parseResult?.previewList || []).filter((item) => {
    if (!searchPreview) return true;
    const q = searchPreview.toLowerCase();
    return (
      item.nurseName.toLowerCase().includes(q) ||
      item.date.includes(q) ||
      item.shiftType.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        id="import-schedule-modal"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30">
              <FileSpreadsheet className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg leading-tight">
                Import Jadwal Bulanan
              </h3>
              <p className="text-[11px] text-emerald-100">
                Excel (.xlsx, .xls, .csv), Google Sheets, atau Salin-Tempel Tabel
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

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm text-slate-800 dark:text-slate-200">
          {step === 'INPUT' ? (
            <>
              {/* Target Month & Settings Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                    Target Periode Bulan:
                  </label>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Alokasi Mesin HD:
                  </label>
                  <label className="flex items-center gap-2 mt-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoAllocateMachines}
                      onChange={(e) => setAutoAllocateMachines(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                    />
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Generate otomatis alokasi 25 mesin adil
                    </span>
                  </label>
                </div>
              </div>

              {/* Source Tabs */}
              <div>
                <div className="flex border-b border-slate-200 dark:border-slate-700 gap-1 pb-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab('FILE')}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs transition-all ${
                      activeTab === 'FILE'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Upload className="w-4 h-4" />
                    Upload File Excel / CSV
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('GOOGLE_SHEETS')}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs transition-all ${
                      activeTab === 'GOOGLE_SHEETS'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Link className="w-4 h-4" />
                    Link Google Sheets
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('PASTE')}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs transition-all ${
                      activeTab === 'PASTE'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <ClipboardList className="w-4 h-4" />
                    Salin-Tempel (Paste)
                  </button>
                </div>
              </div>

              {/* Tab 1: File Upload (Drag & Drop + Click) */}
              {activeTab === 'FILE' && (
                <div className="space-y-3">
                  <div
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2.5 ${
                      dragOver
                        ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30 scale-[1.01]'
                        : 'border-slate-300 dark:border-slate-700 hover:border-emerald-400 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-emerald-50/30'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          handleFile(e.target.files[0]);
                        }
                      }}
                    />

                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                      <FileSpreadsheet className="w-6 h-6" />
                    </div>

                    <div>
                      <span className="font-extrabold text-sm text-slate-800 dark:text-slate-200 block">
                        {uploadedFileName || 'Klik untuk pilih file atau seret file ke sini'}
                      </span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        Mendukung format Microsoft Excel (<strong>.xlsx</strong>, <strong>.xls</strong>) atau <strong>.csv</strong>
                      </span>
                    </div>

                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 text-white text-xs font-bold shadow-xs">
                      <Upload className="w-3.5 h-3.5" />
                      Pilih File dari Komputer/HP
                    </span>
                  </div>

                  {/* Template Download Card */}
                  <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Info className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="text-[11px] text-blue-900 dark:text-blue-200">
                        Belum punya formatnya? Unduh template Excel yang sudah terisi nama 17 perawat HD:
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await ScheduleImportService.downloadExcelTemplate(selectedMonth, nurses);
                        } catch (err) {
                          showToast('Gagal mengunduh template: ' + (err instanceof Error ? err.message : String(err)), 'error');
                        }
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold shadow-xs shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download Template .xlsx
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 2: Google Sheets URL */}
              {activeTab === 'GOOGLE_SHEETS' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      URL atau ID Spreadsheet Google Sheets:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XR.../edit"
                        value={googleSheetUrl}
                        onChange={(e) => setGoogleSheetUrl(e.target.value)}
                        className="flex-1 px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={handleFetchGoogleSheets}
                        disabled={isLoading || !googleSheetUrl.trim()}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 shrink-0"
                      >
                        {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                        Tarik Data
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 text-[11px] text-amber-900 dark:text-amber-200 space-y-1">
                    <p className="font-bold flex items-center gap-1">
                      <Info className="w-3.5 h-3.5 text-amber-600" />
                      Petunjuk Akses Google Sheets:
                    </p>
                    <ol className="list-decimal pl-4 space-y-0.5 text-amber-800 dark:text-amber-300">
                      <li>Buka Spreadsheet jadwal Anda di Google Sheets.</li>
                      <li>Klik tombol <strong>Bagikan (Share)</strong> di pojok kanan atas.</li>
                      <li>Ubah hak akses menjadi <strong>&quot;Siapa saja yang memiliki link (Anyone with the link can view)&quot;</strong>.</li>
                      <li>Salin link Spreadsheet dan tempelkan pada kolom di atas.</li>
                    </ol>
                  </div>
                </div>
              )}

              {/* Tab 3: Paste Text */}
              {activeTab === 'PASTE' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Tempelkan Tabel Hasil Copy dari Excel / Google Sheets:
                    </label>
                    <textarea
                      rows={6}
                      value={pastedText}
                      onChange={(e) => setPastedText(e.target.value)}
                      placeholder={`Contoh Format Matriks:
Nama Perawat\t1\t2\t3\t4\t5...
Sri Wahyuni\tP\tP\tS\tL\tP...
Ahmad Faisal\tS\tS\tL\tP\tP...`}
                      className="w-full p-3 font-mono text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleParsePastedText}
                      disabled={isLoading || !pastedText.trim()}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5"
                    >
                      {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      Proses & Pratinjau
                    </button>
                  </div>
                </div>
              )}

              {/* Supported Shift Codes Legend */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Simbol / Kode Shift yang Dikenali Otomatis:
                </span>
                <div className="flex flex-wrap gap-2 text-[11px]">
                  <span className="px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 font-semibold">
                    <strong>P</strong> / Pagi (07:00 - 14:00)
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-semibold">
                    <strong>S</strong> / Siang (12:00 - 19:00)
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-800 font-semibold">
                    <strong>L</strong> / Off / Libur
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 font-semibold">
                    <strong>C</strong> / Cuti
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-semibold">
                    <strong>Skt</strong> / Sakit / Izin
                  </span>
                </div>
              </div>
            </>
          ) : (
            /* STEP 2: PREVIEW & VERIFICATION */
            <div className="space-y-4">
              {/* Parse Summary Alert */}
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <h4 className="font-bold text-xs sm:text-sm text-emerald-950 dark:text-emerald-200">
                    {parseResult?.message}
                  </h4>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-emerald-800 dark:text-emerald-300 mt-1">
                    <span>
                      👥 <strong>{parseResult?.detectedNursesCount}</strong> Perawat Cocok
                    </span>
                    <span>
                      📅 <strong>{parseResult?.daysCount}</strong> Hari Terdeteksi
                    </span>
                    <span>
                      ⚡ <strong>{parseResult?.assignments.length}</strong> Total Entri Shift
                    </span>
                  </div>
                </div>
              </div>

              {/* Shift Breakdown Badges */}
              {parseResult?.shiftCounts && (
                <div className="grid grid-cols-5 gap-2 text-center text-[11px]">
                  <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/50 border border-sky-200 text-sky-800 dark:text-sky-300">
                    <span className="block text-[10px] text-sky-600">Sif Pagi (P)</span>
                    <span className="font-extrabold text-sm">{parseResult.shiftCounts.pagi}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 text-amber-800 dark:text-amber-300">
                    <span className="block text-[10px] text-amber-600">Sif Siang (S)</span>
                    <span className="font-extrabold text-sm">{parseResult.shiftCounts.siang}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 text-slate-700 dark:text-slate-300">
                    <span className="block text-[10px] text-slate-500">Libur (L)</span>
                    <span className="font-extrabold text-sm">{parseResult.shiftCounts.libur}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/50 border border-teal-200 text-teal-800 dark:text-teal-300">
                    <span className="block text-[10px] text-teal-600">Cuti (C)</span>
                    <span className="font-extrabold text-sm">{parseResult.shiftCounts.cuti}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 text-rose-800 dark:text-rose-300">
                    <span className="block text-[10px] text-rose-600">Sakit/Izin</span>
                    <span className="font-extrabold text-sm">{parseResult.shiftCounts.sakit}</span>
                  </div>
                </div>
              )}

              {/* Auto-detected New Nurses Notice */}
              {parseResult?.newNursesCreated && parseResult.newNursesCreated.length > 0 && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-start gap-2.5 text-[11px] text-emerald-900 dark:text-emerald-200">
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">
                      {parseResult.newNursesCreated.length} Perawat baru terdeteksi di file input:
                    </span>
                    <p className="text-emerald-800 dark:text-emerald-300 mt-0.5 font-medium">
                      {parseResult.newNursesCreated.map((n) => n.name).join(', ')}
                    </p>
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block mt-1">
                      Perawat-perawat ini akan otomatis didaftarkan ke sistem dan jumlah semua staf akan langsung disesuaikan dengan total perawat yang diinputkan.
                    </span>
                  </div>
                </div>
              )}

              {/* Unmatched Nurses Warning */}
              {parseResult?.unmatchedNurses && parseResult.unmatchedNurses.length > 0 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 flex items-start gap-2.5 text-[11px] text-amber-900 dark:text-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">
                      {parseResult.unmatchedNurses.length} nama perawat di file tidak ditemukan di daftar staf HD:
                    </span>
                    <p className="text-amber-800 dark:text-amber-300 mt-0.5 font-mono">
                      {parseResult.unmatchedNurses.join(', ')}
                    </p>
                    <span className="text-[10px] text-amber-700 dark:text-amber-400 block mt-1">
                      (Pastikan nama di file sesuai dengan nama staf di menu Manajemen Perawat).
                    </span>
                  </div>
                </div>
              )}

              {/* Table Preview */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Pratinjau Data Jadwal:
                  </span>
                  <div className="relative w-48">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari perawat/tanggal..."
                      value={searchPreview}
                      onChange={(e) => setSearchPreview(e.target.value)}
                      className="w-full pl-8 pr-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden max-h-56 overflow-y-auto text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300 sticky top-0">
                      <tr>
                        <th className="p-2">Tanggal</th>
                        <th className="p-2">Nama Perawat</th>
                        <th className="p-2">Sif</th>
                        <th className="p-2">Alokasi Mesin HD</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredPreview.map((item, idx) => {
                        const shiftInfo = SHIFT_TYPE_INFO[item.shiftType];
                        const machineList = (item.assignedMachineIds || [])
                          .map((mId) => machines.find((m) => m.id === mId)?.code)
                          .filter(Boolean)
                          .join(', ');

                        return (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="p-2 font-mono text-[11px]">{item.date}</td>
                            <td className="p-2 font-semibold text-slate-900 dark:text-white">
                              {item.nurseName}
                            </td>
                            <td className="p-2">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${shiftInfo?.badgeClass || 'bg-slate-200'}`}>
                                {shiftInfo?.label || item.shiftType}
                              </span>
                            </td>
                            <td className="p-2 text-[11px] text-slate-600 dark:text-slate-400">
                              {machineList ? (
                                <span className="font-semibold text-blue-600 dark:text-sky-400">
                                  {machineList} ({item.assignedMachineIds.length} mesin)
                                </span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
          {step === 'PREVIEW' ? (
            <>
              <button
                type="button"
                onClick={() => setStep('INPUT')}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold text-xs"
              >
                <ArrowLeft className="w-4 h-4" />
                Kembali
              </button>

              <button
                type="button"
                onClick={handleConfirmImport}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs shadow-md shadow-emerald-500/25 transition-all active:scale-98"
              >
                <Check className="w-4 h-4" />
                Terapkan & Simpan ke Cloud
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold text-xs"
              >
                Batal
              </button>

              <div className="text-[11px] text-slate-500">
                Pilih file, URL Google Sheet, atau paste tabel untuk melanjutkan
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
