import React, { useState } from 'react';
import { X, Copy, Check, FileSpreadsheet, ExternalLink, HelpCircle } from 'lucide-react';
import { GoogleSheetsService } from '../domain/GoogleSheetsService';

interface GoogleScriptGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GoogleScriptGuideModal: React.FC<GoogleScriptGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const scriptCode = GoogleSheetsService.getGoogleAppsScriptTemplate();

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(scriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]"
        id="google-script-guide-modal"
      >
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-lg">
                Panduan Integrasi Google Sheets Otomatis
              </h3>
              <p className="text-xs text-slate-500">
                Setup Webhook Apps Script untuk Sinkronisasi 2-Arah
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 text-sm">
          {/* Step by step */}
          <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-4 space-y-2">
            <h4 className="font-semibold text-emerald-900 flex items-center gap-1.5 text-xs">
              <HelpCircle className="w-4 h-4 text-emerald-600" />
              Langkah Singkat (Hanya 3 Menit):
            </h4>
            <ol className="list-decimal list-inside text-xs text-emerald-800 space-y-1 pl-1">
              <li>Buka spreadsheet Google Sheets baru Anda.</li>
              <li>
                Pilih menu <b>Extensions</b> &gt; <b>Apps Script</b>.
              </li>
              <li>Hapus kode bawaan, lalu paste (tempel) seluruh kode di bawah ini.</li>
              <li>
                Klik <b>Deploy</b> (Terapkan) &gt; <b>New deployment</b>.
              </li>
              <li>
                Pilih jenis <b>Web app</b>, lalu atur <i>Who has access</i> ke{' '}
                <b>"Anyone" (Siapa saja)</b>.
              </li>
              <li>
                Salin <b>Web App URL</b> yang dihasilkan dan tempelkan ke kolom URL Webhook di
                menu Sinkronisasi aplikasi ini.
              </li>
            </ol>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">
                Kode Google Apps Script (`Code.gs`):
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Tersalin ke Clipboard!' : 'Salin Semua Kode'}
              </button>
            </div>
            <pre className="p-3 bg-slate-900 text-emerald-400 rounded-xl font-mono text-xs overflow-x-auto max-h-60 border border-slate-800 leading-relaxed select-all">
              {scriptCode}
            </pre>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <a
            href="https://script.google.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline"
          >
            Buka Google Apps Script <ExternalLink className="w-3 h-3" />
          </a>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-white bg-slate-800 hover:bg-slate-900 rounded-xl transition-colors"
          >
            Tutup Panduan
          </button>
        </div>
      </div>
    </div>
  );
};
