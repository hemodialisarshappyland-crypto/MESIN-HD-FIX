import React, { useState, useEffect } from 'react';
import {
  Nurse,
  NurseRole,
  SPECIAL_DUTY_OPTIONS,
  parseSpecialDuties,
  formatSpecialDuties,
} from '../types';
import {
  X,
  User,
  Phone,
  Shield,
  Calendar,
  Award,
  Trash2,
  Package,
  Droplets,
  Pill,
  RefreshCw,
  ShieldAlert,
  FileCheck2,
  CheckCircle2,
  Tag,
  HelpCircle,
} from 'lucide-react';
import { DeleteConfirmModal } from './DeleteConfirmModal';

interface NurseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (nurse: Omit<Nurse, 'id'> | Nurse) => void;
  onDelete?: (id: number) => void;
  nurse?: Nurse | null;
}

export const NurseModal: React.FC<NurseModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  nurse,
}) => {
  const [name, setName] = useState('');
  const [nip, setNip] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<NurseRole>('PELAKSANA');
  const [isActive, setIsActive] = useState(true);
  const [defaultOffDay, setDefaultOffDay] = useState<number | null>(null);
  const [skillLevel, setSkillLevel] = useState<'Senior' | 'Medium' | 'Junior'>('Medium');
  const [selectedDuties, setSelectedDuties] = useState<string[]>([]);
  const [isCustomDuty, setIsCustomDuty] = useState<boolean>(false);
  const [customDutyText, setCustomDutyText] = useState<string>('');
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    if (nurse) {
      setName(nurse.name);
      setNip(nurse.nip || '');
      setPhone(nurse.phone || '');
      setRole(nurse.role);
      setIsActive(nurse.isActive);
      setDefaultOffDay(nurse.defaultOffDay ?? null);
      setSkillLevel(nurse.skillLevel);

      const parsed = parseSpecialDuties(nurse.specialDuty);
      const standardDuties = parsed.filter((d) => SPECIAL_DUTY_OPTIONS[d]);
      const customDuties = parsed.filter((d) => !SPECIAL_DUTY_OPTIONS[d]);

      setSelectedDuties(standardDuties);
      if (customDuties.length > 0) {
        setIsCustomDuty(true);
        setCustomDutyText(customDuties.join(', '));
      } else {
        setIsCustomDuty(false);
        setCustomDutyText('');
      }
    } else {
      setName('');
      setNip('');
      setPhone('');
      setRole('PELAKSANA');
      setIsActive(true);
      setDefaultOffDay(null);
      setSkillLevel('Medium');
      setSelectedDuties([]);
      setIsCustomDuty(false);
      setCustomDutyText('');
    }
  }, [nurse, isOpen]);

  if (!isOpen) return null;

  const handleToggleDuty = (dutyCode: string) => {
    setSelectedDuties((prev) =>
      prev.includes(dutyCode)
        ? prev.filter((d) => d !== dutyCode)
        : [...prev, dutyCode]
    );
  };

  const handleToggleCustom = () => {
    if (isCustomDuty) {
      setIsCustomDuty(false);
      setCustomDutyText('');
    } else {
      setIsCustomDuty(true);
    }
  };

  const handleCustomTextChange = (val: string) => {
    setCustomDutyText(val);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    let finalDuties = [...selectedDuties];
    if (isCustomDuty && customDutyText.trim()) {
      const customParts = parseSpecialDuties(customDutyText);
      finalDuties = [...finalDuties, ...customParts];
    }
    const finalDuty = formatSpecialDuties(finalDuties);

    if (nurse) {
      onSave({
        ...nurse,
        name: name.trim(),
        nip: nip.trim(),
        phone: phone.trim(),
        role,
        isActive,
        defaultOffDay,
        skillLevel,
        specialDuty: finalDuty,
      });
    } else {
      onSave({
        name: name.trim(),
        nip: nip.trim(),
        phone: phone.trim(),
        role,
        isActive,
        defaultOffDay,
        skillLevel,
        specialDuty: finalDuty,
      });
    }
    onClose();
  };

  const daysOfWeek = [
    { value: 1, label: 'Senin' },
    { value: 2, label: 'Selasa' },
    { value: 3, label: 'Rabu' },
    { value: 4, label: 'Kamis' },
    { value: 5, label: 'Jumat' },
    { value: 6, label: 'Sabtu' },
    { value: 7, label: 'Minggu' },
  ];

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
        <div
          className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
          id="nurse-modal-dialog"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-800/80">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base sm:text-lg">
                  {nurse ? 'Ubah Data Perawat' : 'Tambah Perawat Baru'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Unit Hemodialisa (HD)</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                Nama Lengkap & Gelar <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="misal: Ns. Siti Rahayu, S.Kep"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-800 dark:text-slate-100"
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                  NIP / NIK / ID Perawat
                </label>
                <input
                  type="text"
                  value={nip}
                  onChange={(e) => setNip(e.target.value)}
                  placeholder="198904122014022001"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 dark:text-slate-100 font-mono text-xs"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                  Nomor WhatsApp <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="081234567890"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 dark:text-slate-100 font-mono text-xs"
                  />
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                  Peran / Jabatan
                </label>
                <div className="relative">
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as NurseRole)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 dark:text-slate-100 font-medium"
                  >
                    <option value="KARU">Kepala Ruangan (KARU)</option>
                    <option value="KATIM">PJ Sif / Katim</option>
                    <option value="PELAKSANA">Perawat Pelaksana</option>
                  </select>
                  <Shield className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                  Kualifikasi & Sertifikasi
                </label>
                <div className="relative">
                  <select
                    value={skillLevel}
                    onChange={(e) => setSkillLevel(e.target.value as 'Senior' | 'Medium' | 'Junior')}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 dark:text-slate-100 font-medium"
                  >
                    <option value="Senior">Senior (Sertifikasi HD Mahir)</option>
                    <option value="Medium">Medium (Pelatihan HD Dasar)</option>
                    <option value="Junior">Junior (Orientasi HD)</option>
                  </select>
                  <Award className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>
            </div>

            {/* Preferensi Hari Libur Rutin */}
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                Preferensi Hari Libur Rutin (Opsional)
              </label>
              <div className="relative">
                <select
                  value={defaultOffDay === null ? '' : defaultOffDay}
                  onChange={(e) =>
                    setDefaultOffDay(e.target.value === '' ? null : Number(e.target.value))
                  }
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 dark:text-slate-100"
                >
                  <option value="">Rotasi Fleksibel (Otomatis)</option>
                  {daysOfWeek.map((day) => (
                    <option key={day.value} value={day.value}>
                      Libur Tetap Setiap Hari {day.label}
                    </option>
                  ))}
                </select>
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            {/* Tugas Khusus / Tanggung Jawab PIC Ruangan */}
            <div className="p-4 bg-slate-50/80 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <Tag className="w-4 h-4" />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                      Tugas Khusus / PIC Ruangan <span className="text-[11px] font-normal text-indigo-600 dark:text-indigo-400">(Bisa pilih &gt; 1 tugas)</span>
                    </label>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Pilih satu atau lebih tanggung jawab spesifik di unit HD
                    </p>
                  </div>
                </div>

                {(selectedDuties.length > 0 || isCustomDuty) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDuties([]);
                      setIsCustomDuty(false);
                      setCustomDutyText('');
                    }}
                    className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline"
                  >
                    Hapus Semua ({selectedDuties.length + (isCustomDuty && customDutyText ? 1 : 0)})
                  </button>
                )}
              </div>

              {/* Predefined Chips */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                {Object.entries(SPECIAL_DUTY_OPTIONS).map(([code, info]) => {
                  const isSelected = selectedDuties.includes(code);
                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => handleToggleDuty(code)}
                      className={`p-2 rounded-xl text-left border transition-all text-xs flex flex-col justify-between min-h-[58px] ${
                        isSelected
                          ? `${info.badgeClass} ring-2 ring-blue-500/30 shadow-xs font-bold`
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 w-full">
                        <span className="font-bold truncate text-[11px]">{info.shortName}</span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-current" />}
                      </div>
                      <span className="text-[9px] text-slate-400 dark:text-slate-500 truncate w-full">
                        {code === 'CITO'
                          ? 'HD Darurat / On-Call'
                          : code === 'BHP'
                          ? 'Stok & Alkes'
                          : code === 'NATRIUM RO'
                          ? 'RO & Bikarbonat'
                          : code === 'FARMASI & LOGISTIK'
                          ? 'Obat & Amprah'
                          : 'Manajerial HD'}
                      </span>
                    </button>
                  );
                })}

                {/* Custom Duty Toggle Button */}
                <button
                  type="button"
                  onClick={handleToggleCustom}
                  className={`p-2 rounded-xl text-left border transition-all text-xs flex flex-col justify-between min-h-[58px] ${
                    isCustomDuty
                      ? 'bg-indigo-50 text-indigo-800 border-indigo-300 dark:bg-indigo-950/70 dark:text-indigo-300 dark:border-indigo-800 ring-2 ring-indigo-500/30 shadow-xs font-bold'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 w-full">
                    <span className="font-bold truncate text-[11px]">Lainnya / Kustom</span>
                    {isCustomDuty && <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-current" />}
                  </div>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 truncate w-full">
                    Ketik manual tugas
                  </span>
                </button>
              </div>

              {/* Custom Input Field */}
              {isCustomDuty && (
                <div className="pt-2 animate-in fade-in duration-150">
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Nama Tugas Khusus Kustom (pisahkan koma jika lebih dari satu):
                  </label>
                  <input
                    type="text"
                    value={customDutyText}
                    onChange={(e) => handleCustomTextChange(e.target.value)}
                    placeholder="Contoh: KALIBRASI & ALKES, STERILISASI, TIM CODE BLUE"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-semibold text-slate-800 dark:text-slate-100 uppercase"
                  />
                </div>
              )}

              {/* Selected Summary Badges */}
              {(selectedDuties.length > 0 || (isCustomDuty && customDutyText.trim())) && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {selectedDuties.map((dCode) => {
                    const opt = SPECIAL_DUTY_OPTIONS[dCode];
                    return (
                      <span
                        key={dCode}
                        className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-xl border font-bold ${
                          opt ? opt.badgeClass : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span>{opt ? opt.shortName : dCode}</span>
                        <button
                          type="button"
                          onClick={() => handleToggleDuty(dCode)}
                          className="hover:opacity-75 p-0.5 ml-0.5"
                          title="Hapus tugas ini"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                  {isCustomDuty &&
                    customDutyText.trim() &&
                    parseSpecialDuties(customDutyText).map((cDuty) => (
                      <span
                        key={cDuty}
                        className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-xl border bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/70 dark:text-indigo-300 dark:border-indigo-800 font-bold"
                      >
                        <span>{cDuty}</span>
                      </span>
                    ))}
                </div>
              )}

              {/* Active Duty Description Note */}
              {selectedDuties.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  {selectedDuties.map((dutyCode) => {
                    const opt = SPECIAL_DUTY_OPTIONS[dutyCode];
                    if (!opt) return null;
                    return (
                      <div
                        key={dutyCode}
                        className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 text-[11px] text-slate-600 dark:text-slate-300 flex items-start gap-2"
                      >
                        <HelpCircle className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {opt.shortName}:
                          </span>{' '}
                          {opt.description}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer select-none p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded-md border-slate-300 dark:border-slate-600 focus:ring-blue-500"
                />
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  Status Aktif Bertugas (Diikutsertakan dalam pembagian jadwal & mesin)
                </span>
              </label>
            </div>

            {/* Modal Footer Actions */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
              {nurse && onDelete ? (
                <button
                  type="button"
                  onClick={() => setIsDeleteConfirmOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 font-bold transition-all min-h-[44px]"
                  title="Hapus perawat ini"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Hapus Perawat</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors font-semibold min-h-[44px]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/25 transition-all font-bold min-h-[44px]"
                >
                  {nurse ? 'Simpan Perubahan' : 'Tambah Perawat'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {nurse && onDelete && (
        <DeleteConfirmModal
          isOpen={isDeleteConfirmOpen}
          onClose={() => setIsDeleteConfirmOpen(false)}
          onConfirm={() => {
            onDelete(nurse.id);
            onClose();
          }}
          title="Hapus Data Perawat"
          message={`Apakah Anda yakin ingin menghapus perawat ${nurse.name}? Semua jadwal tugas terkait akan dihapus.`}
          itemName={`${nurse.name} (${nurse.role}) - ${nurse.phone}`}
        />
      )}
    </>
  );
};
