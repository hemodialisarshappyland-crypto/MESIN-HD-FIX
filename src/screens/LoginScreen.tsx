import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useHemo } from '../context/HemoContext';
import { UserRole } from '../types';
import {
  Activity,
  Lock,
  Mail,
  User,
  ShieldCheck,
  Smartphone,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  Sparkles,
  HelpCircle,
  X,
  KeyRound,
} from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, sendPasswordResetLink } = useAuth();
  const { nurses, settings, showToast } = useHemo();


  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('nurse');
  const [selectedNurseId, setSelectedNurseId] = useState<number | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forgot password modal state
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        if (!email.trim() || !password) {
          throw new Error('Harap masukkan alamat email / ID akun dan kata sandi.');
        }
        await signInWithEmail(email.trim(), password);
        showToast('Berhasil masuk ke HemoShift HD!', 'success');
      } else {
        if (!name.trim() || !email.trim() || !password) {
          throw new Error('Harap lengkapi nama, email, dan kata sandi.');
        }
        if (password.length < 6) {
          throw new Error('Kata sandi minimal 6 karakter.');
        }
        await signUpWithEmail(
          email.trim(),
          password,
          name.trim(),
          role,
          selectedNurseId ? Number(selectedNurseId) : null,
          phone.trim()
        );
        showToast('Pendaftaran akun berhasil!', 'success');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('belum terdaftar')) {
        setError(msg);
      } else if (msg.includes('user-not-found')) {
        setError('Akun belum terdaftar. Anda belum bisa login sebelum mendaftar. Silakan klik tab "Daftar Akun Baru".');
      } else if (msg.includes('wrong-password') || msg.includes('tidak sesuai')) {
        setError('Kata sandi yang Anda masukkan salah. Silakan periksa kembali.');
      } else if (msg.includes('invalid-credential')) {
        setError('Akun belum terdaftar atau email/kata sandi salah. Silakan mendaftar di tab "Daftar Akun Baru" jika belum memiliki akun.');
      } else if (msg.includes('email-already-in-use') || msg.includes('sudah terdaftar')) {
        setError('Email ini sudah terdaftar. Silakan beralih ke tab "Masuk Akun" untuk login.');
      } else {
        setError(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsSubmitting(true);
    const isRegistering = mode === 'register';
    try {
      await signInWithGoogle(role, isRegistering);
      showToast(
        isRegistering
          ? 'Pendaftaran dengan akun Google berhasil!'
          : 'Berhasil masuk dengan akun Google!',
        'success'
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || 'Gagal memproses akun Google.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      setResetMessage({ type: 'error', text: 'Harap masukkan alamat email Anda.' });
      return;
    }
    setIsResetting(true);
    setResetMessage(null);
    try {
      await sendPasswordResetLink(resetEmail.trim());
      setResetMessage({
        type: 'success',
        text: 'Tautan reset kata sandi telah dikirim ke email Anda. Silakan periksa kotak masuk atau folder spam Anda.',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setResetMessage({ type: 'error', text: msg || 'Gagal mengirim email reset kata sandi.' });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center items-center p-3 sm:p-6 antialiased relative">
      {/* Top Bar with Brand */}
      <div className="w-full max-w-lg mb-4 flex items-center justify-between px-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-sm ring-2 ring-blue-100">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <span className="font-extrabold text-base text-slate-900 tracking-tight block">
              HemoShift HD
            </span>
            <span className="text-[11px] text-slate-600 block -mt-0.5 font-medium">
              {settings.hospitalName || 'RSUD Dialysis Center'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200/90 dark:border-slate-800 overflow-hidden">
        {/* Card Header */}
        <div className="p-6 pb-5 bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-800 text-white">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest bg-white/20 px-2.5 py-0.5 rounded-full border border-white/20">
              Gerbang Masuk Sistem
            </span>
            <span className="text-[11px] font-medium text-blue-100 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
              Dialisis Terpadu
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black mt-3 tracking-tight">
            Selamat Datang di HemoShift
          </h2>
          <p className="text-xs sm:text-sm text-blue-100 mt-1 leading-relaxed">
            Sistem penjadwalan sif perawat dan alokasi 25 mesin hemodialisa {settings.hospitalName}.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1.5 bg-slate-100/90 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`py-2.5 rounded-2xl transition-all ${
              mode === 'login'
                ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-sky-400 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Masuk Akun
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`py-2.5 rounded-2xl transition-all ${
              mode === 'register'
                ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-sky-400 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Daftar Akun Baru
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl flex items-start gap-2.5 text-rose-800 dark:text-rose-200 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'register' && (
              <>
                {/* Role Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Pilih Kategori Pendaftaran:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Kepala Ruangan */}
                    <button
                      type="button"
                      onClick={() => setRole('karu')}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        role === 'karu'
                          ? 'border-amber-400 bg-amber-50/70 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200 ring-2 ring-amber-400/40 shadow-xs'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-xs">👑 Kepala Ruangan</span>
                        {role === 'karu' && <CheckCircle2 className="w-4 h-4 text-amber-600" />}
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-tight">
                        Wewenang kelola jadwal shift, perawat & 25 mesin HD.
                      </p>
                    </button>

                    {/* Perawat Pelaksana */}
                    <button
                      type="button"
                      onClick={() => setRole('nurse')}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        role === 'nurse'
                          ? 'border-blue-400 bg-blue-50/70 dark:bg-blue-950/40 text-blue-950 dark:text-blue-200 ring-2 ring-blue-400/40 shadow-xs'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-xs">👩‍⚕️ Perawat Pelaksana</span>
                        {role === 'nurse' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-tight">
                        Melihat jadwal dinas harian/bulanan & denah mesin.
                      </p>
                    </button>
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Lengkap & Gelar:
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Ns. Budi Santoso, S.Kep"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-hidden"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    No. Handphone / WhatsApp (Opsional):
                  </label>
                  <div className="relative">
                    <Smartphone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="tel"
                      placeholder="Contoh: 081234567890"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-hidden"
                    />
                  </div>
                </div>

                {/* Optional Nurse Link */}
                {role === 'nurse' && nurses.length > 0 && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Tautkan ke Data Perawat (Opsional):
                    </label>
                    <select
                      value={selectedNurseId}
                      onChange={(e) => setSelectedNurseId(e.target.value ? Number(e.target.value) : '')}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-hidden"
                    >
                      <option value="">-- Pilih Nama dari Data Master (Opsional) --</option>
                      {nurses.map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.name} ({n.role})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            )}

            {/* Identifier (Email / Account ID) Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {mode === 'login' ? 'Alamat Email atau ID Akun:' : 'Alamat Email Aktif:'}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type={mode === 'login' ? 'text' : 'email'}
                  required
                  placeholder={mode === 'login' ? 'nama@rsud.go.id, nama akun, atau email Anda' : 'nama@rsud.go.id atau email Anda'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Kata Sandi:
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setResetEmail(email.includes('@') ? email : '');
                      setResetMessage(null);
                      setShowResetModal(true);
                    }}
                    className="text-[11px] font-semibold text-blue-600 dark:text-sky-400 hover:underline cursor-pointer"
                  >
                    Lupa kata sandi?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Minimal 6 karakter"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-9 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 absolute right-2.5 top-2 cursor-pointer"
                  title={showPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-blue-500/25 transition-all active:scale-98 min-h-[44px] cursor-pointer"
            >
              <span>
                {isSubmitting
                  ? 'Memverifikasi...'
                  : mode === 'login'
                  ? 'Masuk ke Sistem'
                  : 'Daftar & Masuk ke Sistem'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Google Sign-in Alternative */}
          <div className="relative my-3 flex items-center justify-center">
            <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
            <span className="bg-white dark:bg-slate-900 px-3 text-[11px] text-slate-400 font-medium shrink-0">
              {mode === 'login' ? 'atau masuk dengan' : 'atau daftar dengan'}
            </span>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-colors min-h-[40px] cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>
              {mode === 'login' ? 'Masuk dengan Akun Google' : 'Daftar dengan Akun Google'}
            </span>
          </button>

          {/* Access Policy Note */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
            <div className="font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
              Aturan Hak Akses Pengguna:
            </div>
            <ul className="space-y-1 list-disc list-inside">
              <li>
                <b>Kepala Ruang & Admin:</b> Akses penuh menyusun jadwal, mengalokasikan mesin, menambah serta menghapus mesin HD.
              </li>
              <li>
                <b>Perawat Staf:</b> Hanya dapat melihat Halaman Harian & WA, Jadwal 1 Bulan, dan Mesin HD secara real-time tanpa dapat mengubah apapun.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-sky-400 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Reset Kata Sandi
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Bantuan pemulihan kata sandi staf HD
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowResetModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {resetMessage && (
              <div
                className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                  resetMessage.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800'
                }`}
              >
                {resetMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                )}
                <span>{resetMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleSendReset} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Masukkan Alamat Email Terdaftar:
                </label>
                <input
                  type="email"
                  required
                  placeholder="contoh@rsud.go.id"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>

              <button
                type="submit"
                disabled={isResetting}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                {isResetting ? 'Mengirim email reset...' : 'Kirim Tautan Reset Sandi'}
              </button>
            </form>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
              <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                Reset Langsung oleh Kepala Ruangan / Admin:
              </div>
              <p>
                Karu atau Administrator IT dapat langsung mengubah atau mereset kata sandi staf perawat melalui menu <b>Akun Saya → Kelola Akun Staf</b> tanpa perlu menunggu tautan email.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
