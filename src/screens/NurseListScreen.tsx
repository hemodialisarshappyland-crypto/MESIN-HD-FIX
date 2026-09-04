import React, { useState, useMemo } from 'react';
import { useHemo } from '../context/HemoContext';
import { Nurse, NURSE_ROLE_INFO, SPECIAL_DUTY_OPTIONS, parseSpecialDuties } from '../types';
import { NurseModal } from '../components/NurseModal';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';
import { SpecialDutyBadge } from '../components/SpecialDutyBadge';
import { ReadOnlyBanner } from '../components/ReadOnlyBanner';
import { WhatsAppDispatcher } from '../domain/WhatsAppDispatcher';
import {
  Users,
  Plus,
  Search,
  Phone,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Award,
  Calendar,
  MessageSquare,
  ShieldCheck,
  UserX,
  Tag,
  Package,
  Droplets,
  Pill,
  Lock,
} from 'lucide-react';

export const NurseListScreen: React.FC = () => {
  const {
    isAdmin,
    nurses,
    addNurse,
    updateNurse,
    deleteNursePermanent,
    deleteAllNursesPermanent,
    clearDefaultNurses,
    showToast,
  } = useHemo();

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [skillFilter, setSkillFilter] = useState<string>('ALL');
  const [dutyFilter, setDutyFilter] = useState<string>('ALL');
  const [editingNurse, setEditingNurse] = useState<Nurse | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingNurse, setDeletingNurse] = useState<Nurse | null>(null);
  const [isClearDefaultConfirmOpen, setIsClearDefaultConfirmOpen] = useState(false);
  const [isDeleteAllPermanentConfirmOpen, setIsDeleteAllPermanentConfirmOpen] = useState(false);

  const daysOfWeek = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  const filteredNurses = useMemo(() => {
    return nurses.filter((n) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = n.name.toLowerCase().includes(q);
        const matchesNip = (n.nip || '').toLowerCase().includes(q);
        const matchesPhone = (n.phone || '').toLowerCase().includes(q);
        const matchesDuty = (n.specialDuty || '').toLowerCase().includes(q);
        if (!matchesName && !matchesNip && !matchesPhone && !matchesDuty) return false;
      }
      if (roleFilter !== 'ALL' && n.role !== roleFilter) return false;
      if (skillFilter !== 'ALL' && n.skillLevel !== skillFilter) return false;
      if (dutyFilter !== 'ALL') {
        const duties = parseSpecialDuties(n.specialDuty);
        if (dutyFilter === 'NONE') {
          if (duties.length > 0) return false;
        } else if (!duties.includes(dutyFilter)) {
          return false;
        }
      }
      return true;
    });
  }, [nurses, searchQuery, roleFilter, skillFilter, dutyFilter]);

  const stats = useMemo(() => {
    const total = nurses.length;
    const active = nurses.filter((n) => n.isActive).length;
    const karu = nurses.filter((n) => n.role === 'KARU').length;
    const katim = nurses.filter((n) => n.role === 'KATIM').length;
    const pelaksana = nurses.filter((n) => n.role === 'PELAKSANA').length;
    
    // Tugas Khusus counts (supports multi-duty per nurse)
    const dutyCounts: Record<string, number> = {};
    nurses.forEach((n) => {
      if (n.specialDuty) {
        const duties = parseSpecialDuties(n.specialDuty);
        duties.forEach((d) => {
          dutyCounts[d] = (dutyCounts[d] || 0) + 1;
        });
      }
    });

    return { total, active, karu, katim, pelaksana, dutyCounts };
  }, [nurses]);

  const handleSaveNurse = (nurseData: Omit<Nurse, 'id'> | Nurse) => {
    if (!isAdmin) return;
    if ('id' in nurseData) {
      updateNurse(nurseData as Nurse);
      showToast(`Data perawat ${nurseData.name} berhasil diperbarui`, 'success');
    } else {
      addNurse(nurseData);
      showToast(`Perawat baru ${nurseData.name} berhasil ditambahkan`, 'success');
    }
    setEditingNurse(null);
  };

  const handleDeleteConfirmed = () => {
    if (!isAdmin || !deletingNurse) return;
    deleteNursePermanent(deletingNurse.id);
    setDeletingNurse(null);
  };

  const handleToggleActive = (nurse: Nurse) => {
    if (!isAdmin) return;
    updateNurse({
      ...nurse,
      isActive: !nurse.isActive,
    });
    showToast(
      `Status ${nurse.name} diubah menjadi ${!nurse.isActive ? 'Aktif' : 'Nonaktif'}`,
      'info'
    );
  };

  const handleDirectWhatsApp = (phone: string, name: string) => {
    if (!phone || !WhatsAppDispatcher.isValidPhoneNumber(phone)) {
      showToast(`Nomor WhatsApp untuk ${name} belum valid. Silakan edit profil perawat untuk mengisi nomor aktif.`, 'info');
      return;
    }
    const text = `Halo ${name}, salam hangat dari Ruang Hemodialisa (HD). Jadwal dinas & penugasan mesin dapat dicek melalui sistem aplikasi HemoShift.`;
    WhatsAppDispatcher.openWhatsApp(phone, text);
    showToast(`Membuka WhatsApp untuk ${name}...`, 'success');
  };

  return (
    <div className="pb-24 space-y-4">
      <ReadOnlyBanner actionDescription="menambah perawat baru, merubah data staf, atau menghapus perawat" />

      {/* Top Controls & Header */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-6 shadow-xs border border-slate-200/90 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Daftar Tenaga Perawat Hemodialisa ({nurses.length} Perawat)
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1">
                <Lock className="w-3 h-3 text-emerald-700" />
                Data Terkunci Permanen
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-1">
              Data perawat yang Anda input otomatis terkunci permanen. Anda dapat mengolah data dan menghapus permanen kapan saja.
            </p>
          </div>

          {isAdmin && (
            <div className="flex items-center gap-2 self-stretch sm:self-auto flex-wrap">
              {nurses.length > 0 && (
                <button
                  onClick={() => setIsDeleteAllPermanentConfirmOpen(true)}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-2xl text-xs font-bold transition-all min-h-[44px] cursor-pointer"
                  title="Hapus permanen semua perawat untuk mengolah dari awal"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Hapus Permanen Semua</span>
                </button>
              )}
              <button
                onClick={() => {
                  setEditingNurse(null);
                  setIsModalOpen(true);
                }}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-blue-500/25 transition-all flex-1 sm:flex-none min-h-[44px] cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Tambah Perawat
              </button>
            </div>
          )}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Total Tim</span>
            <div className="font-bold text-slate-900 dark:text-white text-lg mt-0.5">{stats.total} Orang</div>
          </div>
          <div className="bg-emerald-50/70 dark:bg-emerald-950/40 p-3 rounded-2xl border border-emerald-100 dark:border-emerald-900/60">
            <span className="text-emerald-700 dark:text-emerald-300 font-medium">Aktif Bertugas</span>
            <div className="font-bold text-emerald-800 dark:text-emerald-200 text-lg mt-0.5">{stats.active} Orang</div>
          </div>
          <div className="bg-amber-50/70 dark:bg-amber-950/40 p-3 rounded-2xl border border-amber-100 dark:border-amber-900/60">
            <span className="text-amber-700 dark:text-amber-300 font-medium">Kepala Ruangan</span>
            <div className="font-bold text-amber-800 dark:text-amber-200 text-lg mt-0.5">{stats.karu} Orang</div>
          </div>
          <div className="bg-indigo-50/70 dark:bg-indigo-950/40 p-3 rounded-2xl border border-indigo-100 dark:border-indigo-900/60">
            <span className="text-indigo-700 dark:text-indigo-300 font-medium">PJ Sif / Katim</span>
            <div className="font-bold text-indigo-800 dark:text-indigo-200 text-lg mt-0.5">{stats.katim} Orang</div>
          </div>
          <div className="bg-blue-50/70 dark:bg-blue-950/40 p-3 rounded-2xl border border-blue-100 dark:border-blue-900/60 col-span-2 sm:col-span-1">
            <span className="text-blue-700 dark:text-blue-300 font-medium">Pelaksana HD</span>
            <div className="font-bold text-blue-800 dark:text-blue-200 text-lg mt-0.5">{stats.pelaksana} Orang</div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1 text-xs">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama, NIP, atau nomor WA..."
              className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="flex-1 sm:flex-none px-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-700 dark:text-slate-200 font-semibold"
            >
              <option value="ALL">Semua Jabatan</option>
              <option value="KARU">Kepala Ruangan (KARU)</option>
              <option value="KATIM">PJ Sif (Katim)</option>
              <option value="PELAKSANA">Pelaksana</option>
            </select>

            <select
              value={skillFilter}
              onChange={(e) => setSkillFilter(e.target.value)}
              className="flex-1 sm:flex-none px-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-700 dark:text-slate-200 font-semibold"
            >
              <option value="ALL">Semua Tingkat</option>
              <option value="Senior">Senior</option>
              <option value="Medium">Medium</option>
              <option value="Junior">Junior</option>
            </select>

            <select
              value={dutyFilter}
              onChange={(e) => setDutyFilter(e.target.value)}
              className="flex-1 sm:flex-none px-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-700 dark:text-slate-200 font-semibold"
            >
              <option value="ALL">Semua Tugas Khusus</option>
              {Object.entries(SPECIAL_DUTY_OPTIONS).map(([code, opt]) => (
                <option key={code} value={code}>
                  PIC {opt.shortName}
                </option>
              ))}
              <option value="NONE">Tanpa Tugas Khusus</option>
            </select>
          </div>
        </div>

        {/* Quick Duty PIC Bar */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 overflow-x-auto text-[11px] pb-1">
          <span className="font-bold text-slate-500 dark:text-slate-400 shrink-0 flex items-center gap-1">
            <Tag className="w-3.5 h-3.5 text-indigo-500" />
            PIC Khusus:
          </span>

          <button
            onClick={() => setDutyFilter('ALL')}
            className={`px-2.5 py-1 rounded-xl font-semibold transition-all shrink-0 ${
              dutyFilter === 'ALL'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            Semua ({nurses.length})
          </button>

          {Object.entries(SPECIAL_DUTY_OPTIONS).map(([code, opt]) => {
            const count = stats.dutyCounts[code] || 0;
            const assignedNurse = nurses.find((n) => n.specialDuty === code);
            const isActiveFilter = dutyFilter === code;
            return (
              <button
                key={code}
                onClick={() => setDutyFilter(isActiveFilter ? 'ALL' : code)}
                className={`px-2.5 py-1 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1.5 border ${
                  isActiveFilter
                    ? `${opt.badgeClass} ring-2 ring-blue-500/30 shadow-xs`
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
                title={`Filter perawat ${opt.shortName}: ${assignedNurse ? assignedNurse.name : 'Belum ditugaskan'}`}
              >
                <span>{opt.shortName}</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-black/10 dark:bg-white/10 rounded-full">
                  {count}
                </span>
                {assignedNurse && (
                  <span className="text-[10px] opacity-75 font-normal truncate max-w-[90px]">
                    ({assignedNurse.name.replace(/^Ns\.\s*/, '')})
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Nurses List Grid */}
      {nurses.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 sm:p-12 border-2 border-slate-300 text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl mx-auto flex items-center justify-center border-2 border-blue-200">
            <Users className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="font-black text-slate-900 text-lg">Belum Ada Data Perawat</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Data perawat bawaan telah dihapus. Silakan tambahkan data tenaga perawat unit dialisis Anda.
              Data perawat yang Anda input akan otomatis tersimpan permanen di perangkat dan Cloud Firestore.
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={() => {
                setEditingNurse(null);
                setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-black shadow-md shadow-blue-500/25 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Tambah Perawat Pertama
            </button>
          )}
        </div>
      ) : filteredNurses.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 text-center space-y-3">
          <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-3xl mx-auto flex items-center justify-center">
            <UserX className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-base">Tidak ada perawat ditemukan</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Coba ubah kata kunci pencarian atau reset filter jabatan di atas.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {filteredNurses.map((nurse) => {
            const roleInfo = NURSE_ROLE_INFO[nurse.role] || {
              title: nurse.role,
              badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
            };
            const isKaru = nurse.role === 'KARU';

            return (
              <div
                key={nurse.id}
                className={`bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border transition-all shadow-xs flex flex-col justify-between ${
                  !nurse.isActive
                    ? 'opacity-60 bg-slate-50/70 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800'
                    : 'border-slate-200/90 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-md'
                }`}
              >
                <div>
                  {/* Card Header & Avatar */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-11 h-11 rounded-2xl font-extrabold text-sm flex items-center justify-center shadow-xs shrink-0 ${
                          isKaru
                            ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white'
                            : nurse.role === 'KATIM'
                            ? 'bg-gradient-to-br from-indigo-500 to-indigo-700 text-white'
                            : 'bg-gradient-to-br from-blue-500 to-sky-600 text-white'
                        }`}
                      >
                        {nurse.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base leading-snug">
                          {nurse.name}
                        </h4>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                          NIP: {nurse.nip || '-'}
                        </p>
                      </div>
                    </div>

                    {/* Actions: Edit, Toggle Active, Delete */}
                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingNurse(nurse);
                            setIsModalOpen(true);
                          }}
                          className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-xl transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center"
                          title="Ubah Data Perawat"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleToggleActive(nurse)}
                          className={`p-2 rounded-xl transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center ${
                            nurse.isActive
                              ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                              : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                          title={nurse.isActive ? 'Klik untuk Nonaktifkan' : 'Klik untuk Aktifkan'}
                        >
                          {nurse.isActive ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            <XCircle className="w-4 h-4" />
                          )}
                        </button>

                        <button
                          onClick={() => setDeletingNurse(nurse)}
                          className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center cursor-pointer"
                          title="Hapus Permanen Perawat"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Badges & Meta */}
                  <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
                    <span
                      className={`text-[10px] px-2.5 py-1 rounded-xl border font-bold ${roleInfo.badgeClass}`}
                    >
                      {roleInfo.title}
                    </span>

                    <span className="text-[10px] px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold inline-flex items-center gap-1">
                      <Award className="w-3 h-3 text-amber-500" />
                      {nurse.skillLevel}
                    </span>

                    {nurse.specialDuty && (
                      <SpecialDutyBadge duty={nurse.specialDuty} size="sm" />
                    )}

                    {nurse.defaultOffDay && (
                      <span className="text-[10px] px-2.5 py-1 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 font-semibold inline-flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-rose-500" />
                        Off Rutin: {daysOfWeek[nurse.defaultOffDay % 7]}
                      </span>
                    )}

                    {nurse.isActive && (
                      <span className="text-[10px] px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 font-semibold inline-flex items-center gap-1 ml-auto">
                        <ShieldCheck className="w-3 h-3" />
                        Aktif
                      </span>
                    )}

                    <span className="text-[10px] px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-bold inline-flex items-center gap-1 border border-indigo-200 dark:border-indigo-800/60">
                      <Lock className="w-3 h-3 text-indigo-600" />
                      Terkunci
                    </span>
                  </div>
                </div>

                {/* WhatsApp & Contact Section */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-mono">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{nurse.phone}</span>
                  </div>

                  <button
                    onClick={() => handleDirectWhatsApp(nurse.phone, nurse.name)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold border border-emerald-200 dark:border-emerald-800/80 transition-all min-h-[38px] active:scale-95 cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Chat WA</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit / Add Modal */}
      <NurseModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingNurse(null);
        }}
        onSave={handleSaveNurse}
        onDelete={(id) => {
          deleteNursePermanent(id);
          setIsModalOpen(false);
          setEditingNurse(null);
        }}
        nurse={editingNurse}
      />

      {/* Delete Confirmation Modal for Card Action */}
      <DeleteConfirmModal
        isOpen={!!deletingNurse}
        onClose={() => setDeletingNurse(null)}
        onConfirm={handleDeleteConfirmed}
        title="Hapus Permanen Data Perawat"
        message={`Apakah Anda yakin ingin menghapus permanen perawat ${deletingNurse?.name}? Data akan dihapus bersih dari perangkat dan Cloud Firestore.`}
        itemName={deletingNurse ? `${deletingNurse.name} (${deletingNurse.role}) - ${deletingNurse.phone}` : ''}
      />

      {/* Delete Confirmation Modal for Delete All Permanent */}
      <DeleteConfirmModal
        isOpen={isDeleteAllPermanentConfirmOpen}
        onClose={() => setIsDeleteAllPermanentConfirmOpen(false)}
        onConfirm={() => {
          deleteAllNursesPermanent();
          setIsDeleteAllPermanentConfirmOpen(false);
        }}
        title="Hapus Permanen Seluruh Data Perawat"
        message="Apakah Anda yakin ingin menghapus permanen SELURUH data perawat? Seluruh data perawat dan jadwal tugas akan dihapus bersih dari sistem dan Cloud Firestore sehingga Anda dapat mengolah data perawat dari awal."
        itemName={`Semua ${nurses.length} Tenaga Perawat`}
      />

      {/* Delete Confirmation Modal for Clear Default Nurses */}
      <DeleteConfirmModal
        isOpen={isClearDefaultConfirmOpen}
        onClose={() => setIsClearDefaultConfirmOpen(false)}
        onConfirm={() => {
          clearDefaultNurses();
          setIsClearDefaultConfirmOpen(false);
        }}
        title="Hapus Seluruh Data Perawat Bawaan"
        message="Apakah Anda yakin ingin membersihkan data perawat contoh bawaan? Seluruh perawat bawaan akan dihapus dari sistem dan Firestore, sehingga Anda dapat menginput daftar perawat Anda sendiri."
        itemName="17 Data Perawat Contoh Bawaan"
      />
    </div>
  );
};
