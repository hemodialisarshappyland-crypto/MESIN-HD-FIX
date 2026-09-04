import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useHemo } from '../context/HemoContext';
import { useTheme } from '../context/ThemeContext';
import { AdminAccountsManager } from '../components/AdminAccountsManager';
import {
  User,
  KeyRound,
  ShieldCheck,
  Smartphone,
  Mail,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Sparkles,
  Save,
  Lock,
  Eye,
  EyeOff,
  Building,
  UserCheck,
  Send,
  Info,
  Palette,
  Layers,
  CalendarDays,
  HeartPulse,
  Users,
} from 'lucide-react';

export const AccountScreen: React.FC = () => {
  const { userProfile, role, isAdmin, logout, updateUserProfileData, changeAccountPassword, sendPasswordResetLink } =
    useAuth();
  const { nurses, machines, settings, showToast, updateNurse } = useHemo();
  const { currentThemeConfig } = useTheme();

  // Profile Edit State
  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [phone, setPhone] = useState(userProfile?.phone || '');
  const [selectedNurseId, setSelectedNurseId] = useState<number | ''>(
    userProfile?.nurseId ?? ''
  );
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password Change State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Reset Password via Email State
  const [isSendingResetEmail, setIsSendingResetEmail] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  // Logout confirm modal state
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  if (!userProfile) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 text-center">
        <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-4">
          <User className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Belum Ada Akun Masuk</h3>
        <p className="text-xs text-slate-500 mt-1">Silakan masuk untuk mengakses pengaturan akun Anda.</p>
      </div>
    );
  }

  // Handle Profile Update
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(false);

    const trimmedName = displayName.trim();
    if (!trimmedName) {
      setProfileError('Nama lengkap tidak boleh kosong.');
      return;
    }

    setIsUpdatingProfile(true);
    try {
      const nurseIdVal = selectedNurseId === '' ? null : Number(selectedNurseId);

      await updateUserProfileData({
        displayName: trimmedName,
        phone: phone.trim(),
        nurseId: nurseIdVal,
      });

      // If nurseId is linked, also sync the nurse's name/phone in the nurse roster
      if (nurseIdVal) {
        const targetNurse = nurses.find((n) => n.id === nurseIdVal);
        if (targetNurse) {
          updateNurse({
            ...targetNurse,
            name: trimmedName,
            phone: phone.trim() || targetNurse.phone,
          });
        }
      }

      setProfileSuccess(true);
      showToast('Profil akun berhasil diperbarui!', 'success');
      setTimeout(() => setProfileSuccess(false), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setProfileError(msg || 'Gagal menyimpan perubahan profil.');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // Handle Password Change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (!newPassword || newPassword.length < 6) {
      setPasswordError('Kata sandi baru minimal harus 6 karakter.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Konfirmasi kata sandi tidak cocok. Harap periksa kembali.');
      return;
    }

    setIsChangingPassword(true);
    try {
      await changeAccountPassword(newPassword);
      setPasswordSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
      showToast('Kata sandi akun Anda berhasil diubah!', 'success');
      setTimeout(() => setPasswordSuccess(false), 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setPasswordError(msg || 'Gagal mengubah kata sandi.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Handle Send Reset Password Link to Registered Email
  const handleSendResetLink = async () => {
    if (!userProfile.email) return;
    setIsSendingResetEmail(true);
    setPasswordError(null);
    try {
      await sendPasswordResetLink(userProfile.email);
      setResetEmailSent(true);
      showToast(`Tautan reset sandi telah dikirimkan ke email ${userProfile.email}`, 'info');
      setTimeout(() => setResetEmailSent(false), 6000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setPasswordError(msg || 'Gagal mengirim instruksi reset kata sandi.');
    } finally {
      setIsSendingResetEmail(false);
    }
  };

  const linkedNurse = nurses.find((n) => n.id === userProfile.nurseId);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div
            className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${currentThemeConfig.primaryGradient} text-white flex items-center justify-center font-extrabold text-2xl shadow-md ring-4 ring-slate-100 dark:ring-slate-800 shrink-0`}
          >
            {userProfile.displayName ? userProfile.displayName.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                {userProfile.displayName}
              </h2>
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                  role === 'admin'
                    ? 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950 dark:text-purple-200 dark:border-purple-800'
                    : role === 'karu'
                    ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800'
                    : 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-800'
                }`}
              >
                {role === 'admin'
                  ? '🛠️ Administrator Sistem'
                  : role === 'karu'
                  ? '👑 Kepala Ruangan (Karu)'
                  : '👩‍⚕️ Perawat Pelaksana'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              <span>{userProfile.email}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 font-bold text-xs transition-colors min-h-[40px] cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar Akun</span>
          </button>
        </div>
      </div>

      {/* Main Form Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Ubah Profil / Data Diri (7 Cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-sky-400 flex items-center justify-center border border-blue-200 dark:border-blue-800">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base">
                  Profil & Nama Pengguna
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Ubah nama panggilan, nomor telepon, dan tautan daftar perawat
                </p>
              </div>
            </div>

            {profileSuccess && (
              <div className="mt-4 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Perubahan nama dan profil berhasil disimpan.</span>
              </div>
            )}

            {profileError && (
              <div className="mt-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{profileError}</span>
              </div>
            )}

            <form id="profile-form" onSubmit={handleSaveProfile} className="mt-5 space-y-4">
              {/* Nama Lengkap */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Nama Lengkap / Panggilan Resmi
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Contoh: Ns. Siti Rahma, S.Kep"
                    className="w-full pl-10 pr-3 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Nama ini akan tertera pada jadwal shift, laporan dinas, dan pengumuman WhatsApp.
                </p>
              </div>

              {/* Email (Readonly) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Alamat Email (Akun Terdaftar)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    disabled
                    value={userProfile.email}
                    className="w-full pl-10 pr-3 py-2.5 rounded-2xl bg-slate-100/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-mono cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Nomor WhatsApp / Telepon */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Nomor WhatsApp Aktif
                </label>
                <div className="relative">
                  <Smartphone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Contoh: 081234567890"
                    className="w-full pl-10 pr-3 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Digunakan untuk menerima notifikasi pengiriman jadwal harian via WhatsApp.
                </p>
              </div>

              {/* Tautan Profil Perawat di Jadwal (Optional) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Tautkan ke Nama Perawat dalam Jadwal
                </label>
                <div className="relative">
                  <UserCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    value={selectedNurseId}
                    onChange={(e) =>
                      setSelectedNurseId(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className="w-full pl-10 pr-8 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden appearance-none cursor-pointer"
                  >
                    <option value="">-- Tidak Ditautkan / Akun Manajerial --</option>
                    {nurses.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.name} ({n.role}) - {n.specialDuty || 'Pelaksana'}
                      </option>
                    ))}
                  </select>
                </div>
                {linkedNurse && (
                  <div className="mt-1.5 text-[11px] text-blue-600 dark:text-sky-400 bg-blue-50 dark:bg-blue-950/40 p-2 rounded-xl border border-blue-200 dark:border-blue-900/60 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      Akun tertaut ke <strong>{linkedNurse.name}</strong> ({linkedNurse.role} &bull;{' '}
                      {linkedNurse.skillLevel}).
                    </span>
                  </div>
                )}
              </div>
            </form>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              type="submit"
              form="profile-form"
              disabled={isUpdatingProfile}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50 cursor-pointer min-h-[42px]"
            >
              <Save className="w-4 h-4" />
              <span>{isUpdatingProfile ? 'Menyimpan...' : 'Simpan Perubahan Nama'}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Reset Kata Sandi & Info Hak Akses (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Ubah Kata Sandi Langsung */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200 dark:border-amber-800">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base">
                  Ganti Kata Sandi (Password)
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Perbarui sandi untuk menjaga keamanan akun
                </p>
              </div>
            </div>

            {passwordSuccess && (
              <div className="mt-4 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Kata sandi Anda berhasil diperbarui!</span>
              </div>
            )}

            {passwordError && (
              <div className="mt-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Kata Sandi Baru
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full pl-10 pr-10 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Konfirmasi Kata Sandi Baru
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ketik ulang kata sandi baru"
                    className="w-full pl-10 pr-3 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isChangingPassword || !newPassword}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs sm:text-sm shadow-sm active:scale-95 transition-all disabled:opacity-50 cursor-pointer min-h-[40px] mt-2"
              >
                <KeyRound className="w-4 h-4" />
                <span>{isChangingPassword ? 'Menyimpan Sandi...' : 'Ubah Kata Sandi'}</span>
              </button>
            </form>

            {/* Opsi Kirim Link Reset Email */}
            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Lupa kata sandi lama?
                </span>
                <button
                  type="button"
                  onClick={handleSendResetLink}
                  disabled={isSendingResetEmail}
                  className="inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-sky-400 font-bold hover:underline disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSendingResetEmail ? 'Mengirim...' : 'Kirim Link Reset ke Email'}</span>
                </button>
              </div>

              {resetEmailSent && (
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-2 bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  Instruksi pemulihan telah dikirim ke kotak masuk email Anda.
                </p>
              )}
            </div>
          </div>

          {/* Informasi Hak Akses Ruangan */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs text-xs space-y-3">
            <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Detail Akses Instalasi Hemodialisa</span>
            </div>

            <div className="space-y-2 text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span>Unit / Ruangan:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {settings.hospitalName} &bull; {settings.roomName}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span>Kapasitas Unit:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {machines.length} Mesin Dialisis &bull; {nurses.length} Perawat
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span>Wewenang Anda:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {role === 'admin'
                    ? 'Administrator IT (Kelola Akun, Hak Akses & Sistem)'
                    : role === 'karu'
                    ? 'Kepala Ruang (Manajemen Shift, Perawat & Mesin HD)'
                    : 'Perawat Pelaksana (Melihat Jadwal Realtime & Tugas)'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ADMIN ONLY: User Accounts & Permissions Management Panel */}
      {role === 'admin' && (
        <div className="pt-2">
          <AdminAccountsManager />
        </div>
      )}

      {/* KARU ONLY: Clinical Management Overview Panel */}
      {role === 'karu' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-amber-200/80 dark:border-amber-900/60 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-amber-100 dark:border-amber-900/40">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200 dark:border-amber-800 shadow-2xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                Panel Wewenang Kepala Ruangan (Karu HD)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Pengelolaan klinis keperawatan hemodialisa, validasi shift kerja, dan optimalisasi mesin HD.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40">
              <div className="flex items-center gap-2 font-extrabold text-xs text-amber-900 dark:text-amber-200">
                <Users className="w-4 h-4 text-amber-600" />
                <span>{nurses.length} Perawat Hemodialisa</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
                Anda berwenang mengatur kualifikasi (Senior/Junior), batas shift malam, dan pembagian beban kerja adil.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40">
              <div className="flex items-center gap-2 font-extrabold text-xs text-amber-900 dark:text-amber-200">
                <HeartPulse className="w-4 h-4 text-amber-600" />
                <span>25 Mesin Dialisis</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
                Anda berwenang mengatur tata letak mesin HD, zona reguler, isolasi Hepatitis B/C, dan rasio perawat per mesin.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40">
              <div className="flex items-center gap-2 font-extrabold text-xs text-amber-900 dark:text-amber-200">
                <CalendarDays className="w-4 h-4 text-amber-600" />
                <span>Jadwal & AI Auto-Roster</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
                Menjalankan AI Roster Generator, mengunci jadwal bulanan, dan menerbitkan pesan harian WhatsApp dinas.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              <strong>Catatan Hak Akses:</strong> Pembuatan akun staf baru, reset sandi staf, dan pengaturan IT dikelola oleh <strong>Administrator Sistem</strong>. Karu berfokus penuh pada manajemen klinis dan rotasi perawat.
            </span>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-300 flex items-center justify-center mx-auto">
              <LogOut className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-extrabold text-slate-900 dark:text-white text-base">Konfirmasi Keluar</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Apakah Anda yakin ingin keluar dari akun <strong>{userProfile.displayName}</strong>?
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 px-4 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowLogoutConfirm(false);
                  await logout();
                  showToast('Anda telah keluar dari akun.', 'info');
                }}
                className="flex-1 py-2.5 px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors shadow-sm"
              >
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
