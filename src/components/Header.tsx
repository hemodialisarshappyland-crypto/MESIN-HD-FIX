import React, { useState } from 'react';
import { useHemo } from '../context/HemoContext';
import { useAuth } from '../context/AuthContext';
import { AuthModal } from './AuthModal';
import {
  Activity,
  ShieldCheck,
  Database,
  User,
  LogOut,
} from 'lucide-react';

interface HeaderProps {
  onNavigateToAccount?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onNavigateToAccount }) => {
  const { settings, nurses, machines, isCloudConnected, isSyncing, fetchDataFromCloud } = useHemo();
  const { userProfile, isAuthenticated, role, logout } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const handleAccountClick = () => {
    if (onNavigateToAccount) {
      onNavigateToAccount();
    } else {
      setIsAuthModalOpen(true);
    }
  };

  const activeNurses = nurses.filter((n) => n.isActive).length;
  const activeMachines = machines.filter((m) => m.status === 'AKTIF').length;

  return (
    <>
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2">
          {/* Logo & Hospital Title */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-sm ring-2 ring-blue-100 shrink-0"
            >
              <Activity className="w-5 h-5 drop-shadow-xs" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="text-base sm:text-lg font-extrabold text-slate-900 leading-tight tracking-tight">
                  HemoShift HD
                </h1>
                <span className="text-[9px] sm:text-[10px] font-bold tracking-wider bg-sky-100 text-sky-800 px-2 py-0.5 rounded-full border border-sky-300 hidden xs:inline-block shadow-2xs">
                  {machines.length} MESIN • {nurses.length} PERAWAT
                </span>
                {isCloudConnected ? (
                  <button
                    onClick={() => fetchDataFromCloud()}
                    disabled={isSyncing}
                    className="inline-flex items-center gap-1.5 text-[9px] font-extrabold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 px-2.5 py-0.5 rounded-full border border-emerald-300 shadow-2xs transition-all active:scale-95 cursor-pointer"
                    title="Database Cloud Firestore terhubung secara real-time. Klik untuk menyegarkan data dari Cloud."
                  >
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-600"></span>
                    </span>
                    <span>{isSyncing ? 'Sinkron...' : 'Live Sync'}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => fetchDataFromCloud()}
                    disabled={isSyncing}
                    className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 px-2.5 py-0.5 rounded-full border border-amber-300 shadow-2xs transition-all active:scale-95 cursor-pointer"
                    title="Klik untuk menghubungkan ke Cloud Firestore"
                  >
                    <span>{isSyncing ? 'Menghubungkan...' : 'Hubungkan Cloud'}</span>
                  </button>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-slate-600 font-medium truncate max-w-[170px] sm:max-w-xs md:max-w-md mt-0.5">
                {settings.hospitalName} &bull; <span className="text-slate-900 font-bold">{settings.roomName}</span>
              </p>
            </div>
          </div>

          {/* Action Bar (Stats, Auth Profile) */}
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs shrink-0">
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-semibold shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>{activeNurses} Perawat Aktif</span>
            </div>

            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-semibold shadow-2xs">
              <Database className="w-3.5 h-3.5 text-blue-600" />
              <span>{activeMachines}/{machines.length} Mesin HD</span>
            </div>

            {/* User Account / Profile & Logout Button */}
            {isAuthenticated && userProfile ? (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleAccountClick}
                  className={`inline-flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl border font-bold transition-all shadow-2xs min-h-[38px] active:scale-95 ${
                    role === 'admin'
                      ? 'bg-purple-50 border-purple-300 text-purple-900 hover:bg-purple-100'
                      : role === 'karu'
                      ? 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100'
                      : 'bg-sky-50 border-sky-300 text-sky-900 hover:bg-sky-100'
                  }`}
                  title={`Akun: ${userProfile.displayName} (${
                    role === 'admin' ? 'Administrator Sistem' : role === 'karu' ? 'Kepala Ruangan' : 'Perawat Pelaksana'
                  }). Klik untuk membuka pengaturan akun.`}
                >
                  <div
                    className={`w-6 h-6 rounded-lg text-white flex items-center justify-center text-xs font-black shadow-2xs ${
                      role === 'admin'
                        ? 'bg-purple-600'
                        : role === 'karu'
                        ? 'bg-amber-600'
                        : 'bg-blue-600'
                    }`}
                  >
                    {userProfile.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left hidden sm:block max-w-[90px] md:max-w-[130px] truncate leading-tight">
                    <span className="block text-[11px] font-bold truncate">
                      {userProfile.displayName.split(',')[0]}
                    </span>
                    <span className="block text-[9px] text-slate-600 font-bold uppercase tracking-wider">
                      {role === 'admin' ? 'Admin IT' : role === 'karu' ? 'Karu HD' : 'Perawat'}
                    </span>
                  </div>
                </button>

                <button
                  onClick={logout}
                  className="inline-flex items-center justify-center p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-300 transition-colors min-h-[38px] min-w-[38px]"
                  title="Keluar dari Sistem (Logout)"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold transition-all shadow-sm min-h-[38px] active:scale-95"
                title="Masuk atau Daftar Akun untuk Kelola Jadwal"
              >
                <User className="w-4 h-4" />
                <span>Masuk / Daftar</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Modals */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </>
  );
};

