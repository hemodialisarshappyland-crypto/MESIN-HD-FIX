import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, isPermanentAdminEmail } from '../context/AuthContext';
import { useHemo } from '../context/HemoContext';
import { RegisteredAccountSummary, UserRole } from '../types';
import {
  Users,
  Search,
  RefreshCw,
  ShieldCheck,
  User,
  KeyRound,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Lock,
  Mail,
  Phone,
  Building,
  UserCheck,
  ShieldAlert,
} from 'lucide-react';

export const AdminAccountsManager: React.FC = () => {
  const {
    userProfile,
    getAllRegisteredAccounts,
    adminUpdateAccountRole,
    adminResetUserPassword,
    adminDeleteAccount,
  } = useAuth();
  const { nurses, showToast } = useHemo();

  const [accounts, setAccounts] = useState<RegisteredAccountSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | UserRole>('all');

  // Modal reset password
  const [selectedAccountForPassword, setSelectedAccountForPassword] =
    useState<RegisteredAccountSummary | null>(null);
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Modal delete confirmation
  const [selectedAccountForDelete, setSelectedAccountForDelete] =
    useState<RegisteredAccountSummary | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      if (getAllRegisteredAccounts) {
        const list = await getAllRegisteredAccounts();
        setAccounts(list);
      }
    } catch (err) {
      console.error('Error loading accounts:', err);
      showToast('Gagal memuat daftar akun terdaftar.', 'error');
    } finally {
      setLoading(false);
    }
  }, [getAllRegisteredAccounts, showToast]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // Handle role change
  const handleRoleChange = async (email: string, newRole: UserRole) => {
    try {
      if (adminUpdateAccountRole) {
        await adminUpdateAccountRole(email, newRole);
        showToast(
          `Peran akun ${email} berhasil diubah menjadi ${
            newRole === 'admin'
              ? 'Administrator'
              : newRole === 'karu'
              ? 'Kepala Ruangan (Karu)'
              : 'Perawat Pelaksana'
          }.`,
          'success'
        );
        fetchAccounts();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memperbarui peran akun';
      showToast(msg, 'error');
    }
  };

  // Handle direct password reset
  const handleConfirmResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountForPassword) return;
    if (newAdminPassword.length < 6) {
      showToast('Kata sandi baru minimal 6 karakter.', 'error');
      return;
    }

    setIsResettingPassword(true);
    try {
      if (adminResetUserPassword) {
        await adminResetUserPassword(selectedAccountForPassword.email, newAdminPassword);
        showToast(
          `Kata sandi untuk ${selectedAccountForPassword.displayName} berhasil diatur ulang!`,
          'success'
        );
        setSelectedAccountForPassword(null);
        setNewAdminPassword('');
        fetchAccounts();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mereset kata sandi';
      showToast(msg, 'error');
    } finally {
      setIsResettingPassword(false);
    }
  };

  // Handle account deletion
  const handleConfirmDelete = async () => {
    if (!selectedAccountForDelete) return;

    if (selectedAccountForDelete.email.toLowerCase() === userProfile?.email.toLowerCase()) {
      showToast('Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif!', 'error');
      setSelectedAccountForDelete(null);
      return;
    }

    setIsDeleting(true);
    try {
      if (adminDeleteAccount) {
        await adminDeleteAccount(selectedAccountForDelete.email);
        showToast(
          `Akun ${selectedAccountForDelete.displayName} (${selectedAccountForDelete.email}) berhasil dihapus.`,
          'info'
        );
        setSelectedAccountForDelete(null);
        fetchAccounts();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus akun';
      showToast(msg, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter accounts
  const filteredAccounts = accounts.filter((acc) => {
    const matchesSearch =
      acc.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      acc.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (acc.phone && acc.phone.includes(searchQuery));
    const matchesRole = filterRole === 'all' || acc.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (accRole: UserRole) => {
    switch (accRole) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-900 dark:text-purple-200 border border-purple-300 dark:border-purple-800">
            <ShieldAlert className="w-3 h-3 text-purple-600 dark:text-purple-400" />
            Administrator IT
          </span>
        );
      case 'karu':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800">
            <ShieldCheck className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            👑 Kepala Ruangan
          </span>
        );
      case 'nurse':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-900 dark:text-blue-200 border border-blue-300 dark:border-blue-800">
            <User className="w-3 h-3 text-blue-600 dark:text-blue-400" />
            👩‍⚕️ Perawat Pelaksana
          </span>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-200 dark:border-purple-800 shadow-2xs">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
              Manajemen Akun & Hak Akses Login
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Kelola siapa saja yang diizinkan masuk, tetapkan peran (Karu/Admin/Perawat), dan reset sandi staf.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchAccounts}
          disabled={loading}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer min-h-[36px]"
          title="Segarkan daftar akun"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          <span>{loading ? 'Memuat...' : 'Segarkan Data'}</span>
        </button>
      </div>

      {/* Role Difference Explanatory Banner */}
      <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
        <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
          <Building className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <span>Struktur Pemisahan Hak Akses:</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1 text-[11px]">
          <div className="p-2.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50">
            <div className="font-extrabold text-amber-900 dark:text-amber-200 flex items-center gap-1 mb-1">
              <span>👑 Kepala Ruang (Karu)</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-snug">
              Manajer klinis. Mengatur jadwal harian/bulanan, rotasi dinas 17 perawat, dan 25 mesin hemodialisa.
            </p>
          </div>

          <div className="p-2.5 rounded-xl bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/50">
            <div className="font-extrabold text-purple-900 dark:text-purple-200 flex items-center gap-1 mb-1">
              <span>🛠️ Administrator Sistem</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-snug">
              Pengelola teknis & IT. Berwenang mengatur akun login staf, mengubah hak akses, serta reset sandi.
            </p>
          </div>

          <div className="p-2.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50">
            <div className="font-extrabold text-blue-900 dark:text-blue-200 flex items-center gap-1 mb-1">
              <span>👩‍⚕️ Perawat Pelaksana</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-snug">
              Staf operasional. Akses melihat jadwal dinas shift harian & bulanan, denah mesin, dan format pesan WhatsApp.
            </p>
          </div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Cari nama, email, atau no HP akun..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-purple-500 outline-hidden"
          />
        </div>

        <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setFilterRole('all')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
              filterRole === 'all'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            Semua ({accounts.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterRole('karu')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
              filterRole === 'karu'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            Karu ({accounts.filter((a) => a.role === 'karu').length})
          </button>
          <button
            type="button"
            onClick={() => setFilterRole('admin')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
              filterRole === 'admin'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            Admin ({accounts.filter((a) => a.role === 'admin').length})
          </button>
          <button
            type="button"
            onClick={() => setFilterRole('nurse')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
              filterRole === 'nurse'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            Perawat ({accounts.filter((a) => a.role === 'nurse').length})
          </button>
        </div>
      </div>

      {/* Account List Table / Cards */}
      <div className="space-y-3">
        {filteredAccounts.length === 0 ? (
          <div className="text-center py-8 px-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-slate-500">
            <Users className="w-8 h-8 mx-auto text-slate-400 mb-2 opacity-60" />
            <p className="text-xs font-medium">Tidak ada akun yang sesuai dengan pencarian atau filter.</p>
          </div>
        ) : (
          filteredAccounts.map((account) => {
            const isCurrentAuthUser =
              account.email.toLowerCase() === userProfile?.email.toLowerCase();
            const isPermAdmin = isPermanentAdminEmail(account.email);
            const linkedNurseInfo = nurses.find((n) => n.id === account.nurseId);

            return (
              <div
                key={account.email}
                className={`p-4 rounded-2xl border transition-all ${
                  isPermAdmin
                    ? 'border-purple-400/80 dark:border-purple-600 bg-purple-50/50 dark:bg-purple-950/30 shadow-xs'
                    : isCurrentAuthUser
                    ? 'border-purple-300 dark:border-purple-800 bg-purple-50/40 dark:bg-purple-950/20 shadow-xs'
                    : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/80 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  {/* User Profile Details */}
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-sm text-white shrink-0 ${
                        account.role === 'admin'
                          ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 shadow-xs'
                          : account.role === 'karu'
                          ? 'bg-gradient-to-tr from-amber-500 to-orange-600 shadow-xs'
                          : 'bg-gradient-to-tr from-blue-600 to-cyan-600 shadow-xs'
                      }`}
                    >
                      {account.displayName.charAt(0).toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-sm truncate">
                          {account.displayName}
                        </span>
                        {isPermAdmin ? (
                          <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-purple-200 dark:bg-purple-900/80 text-purple-900 dark:text-purple-100 border border-purple-300 dark:border-purple-700 inline-flex items-center gap-1 shadow-xs">
                            👑 Admin Tetap
                          </span>
                        ) : (
                          getRoleBadge(account.role)
                        )}
                        {isCurrentAuthUser && (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            Akun Anda
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>{account.email}</span>
                        </span>
                        {account.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{account.phone}</span>
                          </span>
                        )}
                        {linkedNurseInfo && (
                          <span className="flex items-center gap-1 text-blue-600 dark:text-sky-400 font-semibold">
                            <UserCheck className="w-3 h-3" />
                            <span>Terhubung: {linkedNurseInfo.name}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions & Role Switcher */}
                  <div className="flex items-center gap-2 flex-wrap pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800 self-end md:self-center">
                    {/* Role Selection Dropdown */}
                    <div className="flex items-center gap-1">
                      <label className="text-[10px] font-bold text-slate-500 hidden sm:inline">
                        Peran:
                      </label>
                      {isPermAdmin ? (
                        <span className="text-xs font-bold py-1.5 px-3 rounded-xl bg-purple-100 dark:bg-purple-950/80 border border-purple-300 dark:border-purple-700 text-purple-900 dark:text-purple-200 inline-flex items-center gap-1">
                          <Lock className="w-3 h-3 text-purple-600" />
                          Admin Tetap
                        </span>
                      ) : (
                        <select
                          value={account.role}
                          onChange={(e) => handleRoleChange(account.email, e.target.value as UserRole)}
                          className={`text-xs font-bold py-1.5 px-2.5 rounded-xl border transition-colors outline-hidden cursor-pointer ${
                            account.role === 'admin'
                              ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-300 dark:border-purple-800 text-purple-900 dark:text-purple-200'
                              : account.role === 'karu'
                              ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                              : 'bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-200'
                          }`}
                          title="Ubah peran akun ini"
                        >
                          <option value="karu">👑 Kepala Ruang (Karu)</option>
                          <option value="admin">🛠️ Administrator IT</option>
                          <option value="nurse">👩‍⚕️ Perawat Pelaksana</option>
                        </select>
                      )}
                    </div>

                    {/* Reset Password Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAccountForPassword(account);
                        setNewAdminPassword('');
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors min-h-[32px] cursor-pointer"
                      title="Atur ulang kata sandi pengguna ini"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      <span className="hidden sm:inline">Reset Sandi</span>
                    </button>

                    {/* Delete Account Button (only if not current user and not permanent admin) */}
                    {!isCurrentAuthUser && !isPermAdmin && (
                      <button
                        type="button"
                        onClick={() => setSelectedAccountForDelete(account)}
                        className="inline-flex items-center gap-1 p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 dark:hover:border-rose-900/60 transition-colors min-h-[32px] min-w-[32px] cursor-pointer"
                        title="Hapus akun pengguna ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Reset Password User */}
      {selectedAccountForPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">
                  Reset Sandi Pengguna
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {selectedAccountForPassword.displayName}
                </p>
              </div>
            </div>

            <form onSubmit={handleConfirmResetPassword} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Masukkan Kata Sandi Baru untuk Staf:
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    minLength={6}
                    placeholder="Minimal 6 karakter"
                    value={newAdminPassword}
                    onChange={(e) => setNewAdminPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 outline-hidden font-mono"
                  />
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                  Pengguna dapat langsung login dengan email dan kata sandi baru ini.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAccountForPassword(null);
                    setNewAdminPassword('');
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isResettingPassword || newAdminPassword.length < 6}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isResettingPassword ? 'Menyimpan...' : 'Simpan Sandi Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Akun */}
      {selectedAccountForDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-300 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-extrabold text-slate-900 dark:text-white text-base">Hapus Akun Pengguna</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Apakah Anda yakin ingin menghapus akun <strong>{selectedAccountForDelete.displayName}</strong> ({selectedAccountForDelete.email})? Pengguna tidak akan bisa login lagi sebelum mendaftar ulang.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedAccountForDelete(null)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? 'Menghapus...' : 'Ya, Hapus Akun'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
