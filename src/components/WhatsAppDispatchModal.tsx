import React, { useState, useEffect, useMemo } from 'react';
import { ShiftAssignment, Nurse, Machine } from '../types';
import { WhatsAppDispatcher } from '../domain/WhatsAppDispatcher';
import { useHemo } from '../context/HemoContext';
import {
  X,
  Send,
  Copy,
  CheckCircle2,
  Phone,
  AlertTriangle,
  ExternalLink,
  MessageSquare,
  Sparkles,
  Info,
  Globe,
} from 'lucide-react';

interface WhatsAppDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: ShiftAssignment | null;
}

export const WhatsAppDispatchModal: React.FC<WhatsAppDispatchModalProps> = ({
  isOpen,
  onClose,
  assignment,
}) => {
  const { nurses, machines, settings, addOrUpdateNurse, markAssignmentWhatsAppSent, showToast } = useHemo();

  const nurse = useMemo(() => {
    if (!assignment) return null;
    return nurses.find((n) => n.id === assignment.nurseId) || null;
  }, [assignment, nurses]);

  const [phoneNumber, setPhoneNumber] = useState('');
  const [saveToNurse, setSaveToNurse] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Sync phone when assignment changes
  useEffect(() => {
    if (assignment) {
      const initialPhone = assignment.nursePhone || nurse?.phone || '';
      setPhoneNumber(initialPhone);
      setCopied(false);
      setIsSending(false);
    }
  }, [assignment, nurse]);

  if (!isOpen || !assignment) return null;

  const messageText = WhatsAppDispatcher.generateNurseMessage(
    assignment,
    machines,
    settings.hospitalName,
    settings.roomName,
    nurse?.specialDuty
  );

  const isSample = WhatsAppDispatcher.isSamplePhoneNumber(phoneNumber);
  const isValid = WhatsAppDispatcher.isValidPhoneNumber(phoneNumber);
  const directWaUrl = WhatsAppDispatcher.getWhatsAppUrl(phoneNumber, messageText);
  const generalWaUrl = WhatsAppDispatcher.getWhatsAppUrl(null, messageText);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(messageText);
      setCopied(true);
      showToast('Pesan WhatsApp berhasil disalin ke clipboard!', 'success');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      showToast('Gagal menyalin pesan ke clipboard.', 'error');
    }
  };

  const handleSendDirect = () => {
    if (!phoneNumber.trim()) {
      showToast('Masukkan nomor WhatsApp perawat terlebih dahulu.', 'info');
      return;
    }

    if (isSample) {
      // Prompt warning about sample number
      const confirmSend = window.confirm(
        `Nomor "${phoneNumber}" terdeteksi sebagai nomor contoh bawaan sistem (0812345678xx).\n\nApakah Anda yakin ingin tetap membuka WhatsApp dengan nomor ini, atau ingin menggantinya dulu?`
      );
      if (!confirmSend) return;
    }

    setIsSending(true);

    // 1. Save updated phone to nurse profile if requested
    if (nurse && saveToNurse && phoneNumber.trim() !== (nurse.phone || '')) {
      addOrUpdateNurse({
        ...nurse,
        phone: phoneNumber.trim(),
      });
    }

    // 2. Mark assignment as sent
    markAssignmentWhatsAppSent(assignment.id, phoneNumber.trim());

    // 3. Open WhatsApp and copy message
    WhatsAppDispatcher.openWhatsApp(phoneNumber.trim(), messageText);
    showToast(`Membuka WhatsApp untuk ${assignment.nurseName}... Teks pesan juga disalin!`, 'success');

    setTimeout(() => {
      setIsSending(false);
      onClose();
    }, 400);
  };

  const handleSendGeneral = () => {
    setIsSending(true);

    // Mark assignment as sent
    markAssignmentWhatsAppSent(assignment.id);

    // Open WhatsApp contact/group picker
    WhatsAppDispatcher.openWhatsApp(null, messageText);
    showToast(`Membuka WhatsApp (Pilih Kontak)... Teks pesan siap dikirim!`, 'success');

    setTimeout(() => {
      setIsSending(false);
      onClose();
    }, 400);
  };

  const handleSendDesktopWeb = () => {
    setIsSending(true);
    markAssignmentWhatsAppSent(assignment.id, phoneNumber.trim() || undefined);
    WhatsAppDispatcher.openWhatsApp(phoneNumber.trim() || null, messageText, true);
    showToast('Membuka WhatsApp Web di browser baru...', 'success');

    setTimeout(() => {
      setIsSending(false);
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200/80 dark:border-slate-800 my-8 space-y-4 max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shadow-xs border border-emerald-200/80 dark:border-emerald-800">
              <MessageSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                Kirim Jadwal via WhatsApp
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pemberitahuan dinas & alokasi mesin untuk <b>{assignment.nurseName}</b>
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
          {/* Destination Nurse Phone Number */}
          <div className="space-y-2 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
            <div className="flex items-center justify-between">
              <label className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                Nomor WhatsApp Tujuan:
              </label>
              {isSample && (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-700 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Nomor Contoh (Bawaan)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Contoh: 08123456789 atau 628123456789"
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>

            {isSample && (
              <p className="text-[11px] text-amber-700 dark:text-amber-300 flex items-start gap-1.5 bg-amber-50/80 dark:bg-amber-950/40 p-2.5 rounded-xl border border-amber-200 dark:border-amber-800/60">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
                <span>
                  Nomor di atas adalah nomor contoh bawaan sistem. Jika ingin langsung mengirim ke WhatsApp perawat ini, silakan masukkan nomor aslinya.
                </span>
              </p>
            )}

            {nurse && (
              <label className="flex items-center gap-2 cursor-pointer pt-1 text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={saveToNurse}
                  onChange={(e) => setSaveToNurse(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500"
                />
                <span className="text-[11px] font-medium">
                  Simpan nomor ini secara permanen ke profil <b>{nurse.name}</b>
                </span>
              </label>
            )}
          </div>

          {/* Live Message Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-sky-500" />
                Pratinjau Format Pesan WhatsApp:
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:text-emerald-600 inline-flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600">Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin Teks</span>
                  </>
                )}
              </button>
            </div>

            <div className="bg-[#EFEAE2] dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-300/80 dark:border-slate-800 max-h-56 overflow-y-auto">
              <div className="bg-white dark:bg-slate-900 rounded-xl p-3 shadow-xs border border-emerald-200/50 dark:border-emerald-900/30 font-mono text-[11px] text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                {messageText}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5 shrink-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* Direct Send */}
            <button
              type="button"
              onClick={handleSendDirect}
              disabled={isSending}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs shadow-soft-sm transition-all active:scale-98 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>Kirim ke No. WA</span>
            </button>

            {/* General WhatsApp Picker Send */}
            <button
              type="button"
              onClick={handleSendGeneral}
              disabled={isSending}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700 transition-all active:scale-98 cursor-pointer disabled:opacity-50"
              title="Membuka WhatsApp dan memungkinkan Anda memilih kontak perawat secara manual"
            >
              <ExternalLink className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Pilih Kontak di WA</span>
            </button>

            {/* WhatsApp Web for PC */}
            <button
              type="button"
              onClick={handleSendDesktopWeb}
              disabled={isSending}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700 transition-all active:scale-98 cursor-pointer disabled:opacity-50"
              title="Buka WhatsApp Web di tab browser baru (Cocok untuk Laptop/PC)"
            >
              <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Buka WA Web (PC)</span>
            </button>
          </div>

          {/* Direct Link Backup */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1 pt-1">
            <span>Pesan otomatis disalin ke clipboard saat diklik.</span>
            <a
              href={isValid ? directWaUrl : generalWaUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                markAssignmentWhatsAppSent(assignment.id, isValid ? phoneNumber.trim() : undefined);
                onClose();
              }}
              className="text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 font-semibold"
            >
              <span>Buka link manual</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
