import React, { useState, useMemo } from 'react';
import { WhatsAppDispatcher } from '../domain/WhatsAppDispatcher';
import { useHemo } from '../context/HemoContext';
import {
  X,
  Send,
  Copy,
  CheckCircle2,
  ExternalLink,
  Share2,
  Sun,
  Sunset,
  Sparkles,
  Phone,
  MessageSquare,
  Globe,
} from 'lucide-react';

interface WhatsAppBroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialShiftFilter?: 'PAGI' | 'SIANG' | null;
}

export const WhatsAppBroadcastModal: React.FC<WhatsAppBroadcastModalProps> = ({
  isOpen,
  onClose,
  initialShiftFilter = null,
}) => {
  const { dailyAssignments, machines, settings, selectedDate, showToast } = useHemo();

  const [shiftSelection, setShiftSelection] = useState<'ALL' | 'PAGI' | 'SIANG'>(
    initialShiftFilter === 'PAGI' ? 'PAGI' : initialShiftFilter === 'SIANG' ? 'SIANG' : 'ALL'
  );
  const [customPhone, setCustomPhone] = useState('');
  const [copied, setCopied] = useState(false);

  const filterArg: 'PAGI' | 'SIANG' | null =
    shiftSelection === 'ALL' ? null : shiftSelection;

  const broadcastMessage = useMemo(() => {
    return WhatsAppDispatcher.generateGroupBroadcastMessage(
      selectedDate,
      filterArg,
      dailyAssignments,
      machines,
      settings.hospitalName
    );
  }, [selectedDate, filterArg, dailyAssignments, machines, settings.hospitalName]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(broadcastMessage);
      setCopied(true);
      showToast('Rekap jadwal WhatsApp berhasil disalin ke clipboard!', 'success');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      showToast('Gagal menyalin pesan ke clipboard.', 'error');
    }
  };

  const handleOpenWhatsAppGroup = () => {
    // Open general WhatsApp (allows selecting group) and copy to clipboard
    WhatsAppDispatcher.openWhatsApp(null, broadcastMessage);
    showToast('Membuka WhatsApp... Silakan pilih Grup WhatsApp HD Anda!', 'success');
    onClose();
  };

  const handleOpenWhatsAppWeb = () => {
    WhatsAppDispatcher.openWhatsApp(null, broadcastMessage, true);
    showToast('Membuka WhatsApp Web di tab browser baru...', 'success');
    onClose();
  };

  const handleSendToCustomPhone = () => {
    if (!customPhone.trim()) {
      showToast('Masukkan nomor tujuan terlebih dahulu.', 'info');
      return;
    }
    WhatsAppDispatcher.openWhatsApp(customPhone.trim(), broadcastMessage);
    showToast(`Membuka WhatsApp untuk nomor ${customPhone}...`, 'success');
    onClose();
  };

  const waGroupUrl = WhatsAppDispatcher.getWhatsAppUrl(null, broadcastMessage);
  const formattedDate = WhatsAppDispatcher.formatIndonesianDate(selectedDate);

  const pagiCount = dailyAssignments.filter((a) => a.shiftType === 'PAGI').length;
  const siangCount = dailyAssignments.filter((a) => a.shiftType === 'SIANG').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200/80 dark:border-slate-800 my-8 space-y-4 max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shadow-xs border border-emerald-200/80 dark:border-emerald-800">
              <Share2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                Broadcast Rekap Jadwal ke Grup WA
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {formattedDate} &bull; Siap dikirim ke Grup WhatsApp Ruang Hemodialisa
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="space-y-4 overflow-y-auto pr-1 flex-1 text-xs">
          {/* Shift Filter Pills */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 dark:text-slate-300">Pilih Lingkup Jadwal:</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setShiftSelection('ALL')}
                className={`py-2 px-3 rounded-xl font-bold border transition-all text-center ${
                  shiftSelection === 'ALL'
                    ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 shadow-soft-sm'
                    : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                Semua Sif ({pagiCount + siangCount} Perawat)
              </button>
              <button
                type="button"
                onClick={() => setShiftSelection('PAGI')}
                className={`py-2 px-3 rounded-xl font-bold border transition-all text-center flex items-center justify-center gap-1.5 ${
                  shiftSelection === 'PAGI'
                    ? 'bg-sky-600 text-white border-sky-600 shadow-soft-sm'
                    : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                <Sun className="w-3.5 h-3.5 text-amber-300" />
                Sif Pagi Saja ({pagiCount})
              </button>
              <button
                type="button"
                onClick={() => setShiftSelection('SIANG')}
                className={`py-2 px-3 rounded-xl font-bold border transition-all text-center flex items-center justify-center gap-1.5 ${
                  shiftSelection === 'SIANG'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-soft-sm'
                    : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                <Sunset className="w-3.5 h-3.5 text-amber-300" />
                Sif Siang Saja ({siangCount})
              </button>
            </div>
          </div>

          {/* Live Message Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                Pratinjau Pesan Rekap Grup WA:
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:text-emerald-600 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600 font-bold">Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin Pesan</span>
                  </>
                )}
              </button>
            </div>

            <div className="bg-[#EFEAE2] dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-300/80 dark:border-slate-800 max-h-64 overflow-y-auto">
              <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 shadow-xs border border-emerald-200/50 dark:border-emerald-900/30 font-mono text-[11px] text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                {broadcastMessage}
              </div>
            </div>
          </div>

          {/* Optional Direct Send to Specific Phone */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-2">
            <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              Atau Kirim Langsung ke Nomor Tertentu (Opsional):
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customPhone}
                onChange={(e) => setCustomPhone(e.target.value)}
                placeholder="Contoh: 08123456789 (misal no. PJ Sif atau Karu)"
                className="flex-1 py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
              <button
                type="button"
                onClick={handleSendToCustomPhone}
                disabled={!customPhone.trim()}
                className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold text-xs transition-colors disabled:opacity-40"
              >
                Kirim ke Nomor
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5 shrink-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* Primary Action: Open WhatsApp Group */}
            <button
              type="button"
              onClick={handleOpenWhatsAppGroup}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs shadow-soft-sm transition-all active:scale-98 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Buka WA (Pilih Grup)</span>
            </button>

            {/* Open WhatsApp Web for PC */}
            <button
              type="button"
              onClick={handleOpenWhatsAppWeb}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700 transition-all active:scale-98 cursor-pointer"
              title="Buka WhatsApp Web di tab browser baru (Cocok untuk Laptop/PC)"
            >
              <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Buka WA Web (PC)</span>
            </button>

            {/* Secondary Action: Copy text */}
            <button
              type="button"
              onClick={handleCopy}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700 transition-all active:scale-98 cursor-pointer"
            >
              <Copy className="w-4 h-4 text-emerald-600" />
              <span>{copied ? 'Tersalin!' : 'Salin Pesan'}</span>
            </button>
          </div>

          {/* Direct Link Backup */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1 pt-1">
            <span>Teks otomatis disalin saat tombol diklik.</span>
            <a
              href={waGroupUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
              className="text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 font-semibold"
            >
              <span>Buka tautan WhatsApp manual</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
