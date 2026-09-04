import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Eye, Lock, LogIn } from 'lucide-react';

interface ReadOnlyBannerProps {
  onOpenAuth?: () => void;
  actionDescription?: string;
}

export const ReadOnlyBanner: React.FC<ReadOnlyBannerProps> = ({
  onOpenAuth,
  actionDescription = 'mengubah data atau melakukan generate jadwal',
}) => {
  const { canManageRoster, userProfile } = useAuth();

  if (canManageRoster) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-amber-50 via-sky-50 to-indigo-50 dark:from-slate-900 dark:via-slate-850 dark:to-slate-900 border border-amber-200/80 dark:border-amber-900/40 rounded-2xl p-3 sm:p-3.5 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-amber-500/15 dark:bg-amber-450/20 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
          <Eye className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100">
            <span>Mode Lihat Data (Hanya Baca)</span>
            <span className="text-[10px] font-semibold px-2 py-0.2 bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 rounded-full border border-amber-300 dark:border-amber-800 flex items-center gap-0.5">
              <Lock className="w-2.5 h-2.5" /> Read-Only
            </span>
          </div>
          <p className="text-slate-600 dark:text-slate-400 mt-0.5">
            {userProfile
              ? `Anda masuk sebagai ${userProfile.displayName}. `
              : 'Anda saat ini mengakses sebagai staf/tamu. '}
            Hak akses {actionDescription} khusus untuk <b>Kepala Ruangan (Karu)</b>.
          </p>
        </div>
      </div>

      {onOpenAuth && (
        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <button
            onClick={onOpenAuth}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-2xs transition-all active:scale-95"
            title="Masuk dengan akun Karu"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Masuk Akun</span>
          </button>
        </div>
      )}
    </div>
  );
};
