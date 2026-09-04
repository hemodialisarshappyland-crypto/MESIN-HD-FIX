import React, { useState, useMemo, useEffect } from 'react';
import { useHemo } from '../context/HemoContext';
import {
  Machine,
  MachineCategory,
  MachineStatus,
  MACHINE_CATEGORY_INFO,
  MACHINE_STATUS_INFO,
} from '../types';
import {
  X,
  Layers,
  Edit2,
  Plus,
  Check,
  Cpu,
  AlertCircle,
  ShieldAlert,
  ArrowRight,
  Settings,
  Sparkles,
  Trash2,
} from 'lucide-react';

interface ManageBayModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialBayName?: string;
}

export const ManageBayModal: React.FC<ManageBayModalProps> = ({
  isOpen,
  onClose,
  initialBayName,
}) => {
  const {
    machines,
    bays: contextBays,
    addBay,
    updateBay,
    deleteBay,
    updateMachine,
    showToast,
    isAdmin,
  } = useHemo();

  // Extract all unique existing bays from context bays list
  const existingBays = useMemo(() => {
    const deletedBays = new Set<string>(
      JSON.parse(localStorage.getItem('hemo_deleted_bays_v1') || '[]').map((b: string) => b.trim().toLowerCase())
    );
    const list: string[] = [];
    (contextBays || []).forEach((b) => {
      const trimmed = b?.trim();
      if (trimmed && !deletedBays.has(trimmed.toLowerCase()) && !list.includes(trimmed)) {
        list.push(trimmed);
      }
    });
    if (list.length === 0) {
      list.push('Bay A (Reguler)');
    }
    return list;
  }, [contextBays]);

  const [activeTab, setActiveTab] = useState<'EDIT_BAY' | 'CREATE_BAY'>('EDIT_BAY');
  const [selectedBay, setSelectedBay] = useState<string>(
    initialBayName || existingBays[0] || 'Bay A (Reguler)'
  );

  // Form states for editing selected Bay
  const [newBayName, setNewBayName] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<MachineCategory>('REGULER');
  const [applyCategoryToAll, setApplyCategoryToAll] = useState<boolean>(true);
  const [selectedStatus, setSelectedStatus] = useState<MachineStatus>('AKTIF');
  const [applyStatusToAll, setApplyStatusToAll] = useState<boolean>(false);

  // Delete confirmation state
  const [isConfirmingDelete, setIsConfirmingDelete] = useState<boolean>(false);
  const [targetFallbackBay, setTargetFallbackBay] = useState<string>('');

  // Form states for creating new Bay
  const [createBayName, setCreateBayName] = useState<string>('');
  const [createBayCategory, setCreateBayCategory] = useState<MachineCategory>('REGULER');
  const [createBayStatus, setCreateBayStatus] = useState<MachineStatus>('AKTIF');
  const [selectedMachineIdsForNewBay, setSelectedMachineIdsForNewBay] = useState<number[]>([]);

  // When selectedBay or isOpen changes, prefill form
  useEffect(() => {
    setIsConfirmingDelete(false);
    if (initialBayName && existingBays.some((b) => b.toLowerCase() === initialBayName.toLowerCase())) {
      const found = existingBays.find((b) => b.toLowerCase() === initialBayName.toLowerCase());
      if (found) setSelectedBay(found);
    } else if (!existingBays.includes(selectedBay) && existingBays.length > 0) {
      setSelectedBay(existingBays[0]);
    }
  }, [initialBayName, existingBays, isOpen, selectedBay]);

  useEffect(() => {
    if (selectedBay) {
      setIsConfirmingDelete(false);
      setNewBayName(selectedBay);
      // Determine predominant category & status of machines in this Bay
      const bayMachines = machines.filter(
        (m) => m.bay?.trim().toLowerCase() === selectedBay.trim().toLowerCase()
      );
      if (bayMachines.length > 0) {
        setSelectedCategory(bayMachines[0].category);
        setSelectedStatus(bayMachines[0].status);
      }
    }
  }, [selectedBay, machines]);

  // Machines currently in the selected Bay
  const currentBayMachines = useMemo(() => {
    return machines.filter(
      (m) => m.bay?.trim().toLowerCase() === selectedBay.trim().toLowerCase()
    );
  }, [machines, selectedBay]);

  if (!isOpen) return null;

  // Handle saving edits to existing Bay
  const handleSaveBayChanges = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      showToast('Hanya Kepala Ruangan (Karu) atau Admin yang berwenang merubah pengaturan Bay.', 'info');
      return;
    }

    const trimmedName = newBayName.trim();
    if (!trimmedName) {
      showToast('Nama Bay tidak boleh kosong.', 'error');
      return;
    }

    updateBay(
      selectedBay,
      trimmedName,
      selectedCategory,
      selectedStatus,
      applyCategoryToAll,
      applyStatusToAll
    );

    setSelectedBay(trimmedName);
    onClose();
  };

  // Initiate deleting the selected Bay
  const handleInitiateDeleteBay = () => {
    if (!isAdmin) {
      showToast('Hanya Kepala Ruangan (Karu) atau Admin yang berwenang menghapus Bay.', 'info');
      return;
    }
    if (existingBays.length <= 1) {
      showToast('Minimal harus ada satu Bay aktif di ruangan, tidak dapat menghapus Bay terakhir.', 'error');
      return;
    }
    const fallback =
      existingBays.find((b) => b.trim().toLowerCase() !== selectedBay.trim().toLowerCase()) ||
      existingBays[0] ||
      'Bay A (Reguler)';
    setTargetFallbackBay(fallback);
    setIsConfirmingDelete(true);
  };

  // Execute deleting the selected Bay
  const handleExecuteDeleteBay = () => {
    if (!isAdmin) {
      showToast('Hanya Kepala Ruangan (Karu) atau Admin yang berwenang menghapus Bay.', 'info');
      return;
    }
    if (existingBays.length <= 1) {
      showToast('Tidak dapat menghapus Bay terakhir.', 'error');
      return;
    }
    const fallback =
      targetFallbackBay ||
      existingBays.find((b) => b.trim().toLowerCase() !== selectedBay.trim().toLowerCase()) ||
      'Bay A (Reguler)';

    deleteBay(selectedBay, fallback);
    setIsConfirmingDelete(false);
    const remainingBays = existingBays.filter(
      (b) => b.trim().toLowerCase() !== selectedBay.trim().toLowerCase()
    );
    if (remainingBays.length > 0) {
      setSelectedBay(fallback);
    }
  };

  // Handle creating a new Bay
  const handleCreateNewBay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      showToast('Hanya Kepala Ruangan (Karu) atau Admin yang berwenang membuat Bay baru.', 'info');
      return;
    }

    const trimmedName = createBayName.trim();
    if (!trimmedName) {
      showToast('Nama Bay baru tidak boleh kosong.', 'error');
      return;
    }

    if (existingBays.some((b) => b.toLowerCase() === trimmedName.toLowerCase())) {
      showToast('Nama Bay tersebut sudah digunakan. Silakan gunakan nama lain.', 'error');
      return;
    }

    // Call addBay from context! This adds to bays state, localStorage, and Firestore,
    // and reassigns any selected machines!
    addBay(trimmedName, createBayCategory, createBayStatus, selectedMachineIdsForNewBay);

    setCreateBayName('');
    setSelectedMachineIdsForNewBay([]);
    setSelectedBay(trimmedName);
    setActiveTab('EDIT_BAY');
  };

  // Quick move single machine to another existing bay
  const handleQuickMoveMachine = (machine: Machine, targetBay: string) => {
    if (!isAdmin) return;
    updateMachine({
      ...machine,
      bay: targetBay,
    });
    showToast(`Mesin ${machine.code} dipindahkan ke ${targetBay}.`, 'info');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto antialiased">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border-2 border-slate-300 my-6 flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-150 text-slate-900">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b-2 border-slate-200 flex items-center justify-between bg-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight text-slate-900">
                  Pengaturan & Kelola Bay Ruangan HD
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-900 border border-blue-300">
                  Status, Nama & Kategori
                </span>
              </div>
              <p className="text-xs text-slate-700 font-medium mt-0.5">
                Konfigurasi nama ruangan, status operasional mesin, dan kategori Bay
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 px-4 sm:px-5 pt-3 border-b border-slate-200 bg-white">
          <button
            onClick={() => setActiveTab('EDIT_BAY')}
            className={`pb-2.5 px-3 text-xs font-black border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'EDIT_BAY'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Atur & Ubah Bay</span>
          </button>

          <button
            onClick={() => setActiveTab('CREATE_BAY')}
            className={`pb-2.5 px-3 text-xs font-black border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'CREATE_BAY'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Bay Baru</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-50">

          {/* TAB 1: EDIT EXISTING BAY */}
          {activeTab === 'EDIT_BAY' && (
            <form onSubmit={handleSaveBayChanges} className="space-y-4">
              
              {/* Select Bay to Edit */}
              <div className="bg-white p-3.5 rounded-2xl border-2 border-slate-300 shadow-xs space-y-2">
                <label className="text-xs font-black text-slate-900 uppercase tracking-wider block">
                  Pilih Bay yang Ingin Diatur:
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {existingBays.map((bayName) => {
                    const count = machines.filter(
                      (m) => m.bay?.trim().toLowerCase() === bayName.trim().toLowerCase()
                    ).length;
                    const isSelected = selectedBay.trim().toLowerCase() === bayName.trim().toLowerCase();
                    return (
                      <button
                        key={bayName}
                        type="button"
                        onClick={() => {
                          setSelectedBay(bayName);
                          setIsConfirmingDelete(false);
                        }}
                        className={`px-3 py-2 rounded-xl text-xs font-black border-2 transition-all flex items-center gap-2 cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                        }`}
                      >
                        <span>{bayName}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                            isSelected ? 'bg-blue-800 text-blue-100' : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {count} Mesin
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Edit Bay Name */}
              <div className="bg-white p-4 rounded-2xl border-2 border-slate-300 shadow-xs space-y-2">
                <label className="text-xs font-black text-slate-900 uppercase tracking-wider block">
                  1. Nama Bay / Ruangan:
                </label>
                <input
                  type="text"
                  value={newBayName}
                  onChange={(e) => setNewBayName(e.target.value)}
                  placeholder="Contoh: Bay A (Reguler), Ruang Isolasi 1, dsb..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-300 rounded-xl text-sm font-black text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                  required
                />
                <p className="text-[11px] text-slate-600 font-medium">
                  Perubahan nama akan otomatis diupdate pada seluruh mesin yang terdaftar di Bay ini.
                </p>
              </div>

              {/* Edit Bay Category */}
              <div className="bg-white p-4 rounded-2xl border-2 border-slate-300 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-900 uppercase tracking-wider block">
                    2. Kategori Bay:
                  </label>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={applyCategoryToAll}
                      onChange={(e) => setApplyCategoryToAll(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span>Terapkan ke seluruh mesin di Bay ini</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['REGULER', 'HEPATITIS_B', 'HEPATITIS_C', 'ISOLASI'] as MachineCategory[]).map((cat) => {
                    const info = MACHINE_CATEGORY_INFO[cat];
                    const isSelected = selectedCategory === cat;

                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={`p-2.5 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-blue-50 border-blue-600 ring-2 ring-blue-500/20 shadow-xs'
                            : 'bg-slate-50 hover:bg-slate-100 border-slate-300 text-slate-800'
                        }`}
                      >
                        <span className="text-xs font-black text-slate-900">{info.label}</span>
                        <div className="mt-2 flex items-center justify-between">
                          <span
                            className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                              cat === 'ISOLASI'
                                ? 'bg-rose-100 text-rose-800'
                                : cat === 'HEPATITIS_B'
                                ? 'bg-purple-100 text-purple-800'
                                : cat === 'HEPATITIS_C'
                                ? 'bg-pink-100 text-pink-800'
                                : 'bg-slate-200 text-slate-800'
                            }`}
                          >
                            {cat}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {selectedCategory === 'ISOLASI' && (
                  <div className="p-2.5 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-950 font-bold flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Catatan: Kategori ISOLASI mensyaratkan penugasan Perawat CITO saat rotasi dinas.</span>
                  </div>
                )}
              </div>

              {/* Edit Bay Status */}
              <div className="bg-white p-4 rounded-2xl border-2 border-slate-300 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-900 uppercase tracking-wider block">
                    3. Status Operasional Bay:
                  </label>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={applyStatusToAll}
                      onChange={(e) => setApplyStatusToAll(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span>Terapkan status ke seluruh mesin di Bay ini</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['AKTIF', 'MAINTENANCE', 'TIDAK_DIGUNAKAN', 'RUSAK'] as MachineStatus[]).map((stat) => {
                    const info = MACHINE_STATUS_INFO[stat];
                    const isSelected = selectedStatus === stat;

                    return (
                      <button
                        key={stat}
                        type="button"
                        onClick={() => setSelectedStatus(stat)}
                        className={`p-2.5 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-blue-50 border-blue-600 ring-2 ring-blue-500/20 shadow-xs'
                            : 'bg-slate-50 hover:bg-slate-100 border-slate-300 text-slate-800'
                        }`}
                      >
                        <span className="text-xs font-black text-slate-900">{info.label}</span>
                        <div className="mt-2 flex items-center justify-between">
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${info.dotClass}`}
                          />
                          {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Machines Currently in this Bay */}
              <div className="bg-white p-4 rounded-2xl border-2 border-slate-300 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Daftar Mesin di Bay Ini ({currentBayMachines.length} Mesin):
                  </span>
                </div>

                {currentBayMachines.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-2">Belum ada mesin yang berada di Bay ini.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                    {currentBayMachines.map((m) => (
                      <div
                        key={m.id}
                        className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                            {m.code}
                          </span>
                          <span className="font-bold text-slate-800 truncate">{m.name}</span>
                        </div>

                        {/* Quick move dropdown */}
                        <select
                          value={m.bay}
                          onChange={(e) => handleQuickMoveMachine(m, e.target.value)}
                          className="text-[10px] font-bold bg-white border border-slate-300 rounded px-1.5 py-0.5 text-slate-700 cursor-pointer"
                          title="Pindahkan mesin ke Bay lain"
                        >
                          {existingBays.map((b) => (
                            <option key={b} value={b}>
                              Pindah: {b}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons or Delete Confirmation Box */}
              {isConfirmingDelete ? (
                <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl space-y-3 animate-in fade-in-50">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-rose-100 text-rose-700 rounded-xl shrink-0 mt-0.5">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-black text-rose-950">
                        Konfirmasi Hapus {selectedBay}?
                      </h4>
                      <p className="text-xs text-rose-800 leading-relaxed">
                        {currentBayMachines.length > 0 ? (
                          <>
                            Terdapat <strong>{currentBayMachines.length} mesin</strong> di dalam Bay ini (
                            {currentBayMachines.map((m) => m.code).join(', ')}). Seluruh mesin akan otomatis dipindahkan ke Bay tujuan yang Anda pilih di bawah:
                          </>
                        ) : (
                          <>Bay ini saat ini kosong (tidak ada mesin) dan aman untuk langsung dihapus.</>
                        )}
                      </p>
                    </div>
                  </div>

                  {existingBays.filter((b) => b.trim().toLowerCase() !== selectedBay.trim().toLowerCase()).length > 0 && (
                    <div className="bg-white p-3 rounded-xl border border-rose-200">
                      <label className="text-xs font-black text-slate-800 block mb-1">
                        Pilih Bay Tujuan untuk Mesin:
                      </label>
                      <select
                        value={targetFallbackBay}
                        onChange={(e) => setTargetFallbackBay(e.target.value)}
                        className="w-full text-xs font-black bg-slate-50 border-2 border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-rose-500 cursor-pointer"
                      >
                        {existingBays
                          .filter((b) => b.trim().toLowerCase() !== selectedBay.trim().toLowerCase())
                          .map((b) => (
                            <option key={b} value={b}>
                              Pindahkan ke: {b}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsConfirmingDelete(false)}
                      className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 bg-white border border-slate-300 rounded-xl transition-colors cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleExecuteDeleteBay}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-black text-white bg-rose-600 hover:bg-rose-700 active:scale-95 rounded-xl shadow-md shadow-rose-600/30 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Ya, Hapus Bay Sekarang</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2 pt-2">
                  <div>
                    {existingBays.length > 1 && (
                      <button
                        type="button"
                        onClick={handleInitiateDeleteBay}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>Hapus Bay Ini</span>
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 text-xs font-black bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                    >
                      Simpan Perubahan Bay
                    </button>
                  </div>
                </div>
              )}
            </form>
          )}

          {/* TAB 2: CREATE NEW BAY */}
          {activeTab === 'CREATE_BAY' && (
            <form onSubmit={handleCreateNewBay} className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-950 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  Buat Bay baru (misalnya Bay Khusus, Ruang Isolasi Tambahan, atau Area Bed Baru), lalu pilih mesin yang ingin dipindahkan ke dalamnya.
                </span>
              </div>

              {/* New Bay Name */}
              <div className="bg-white p-4 rounded-2xl border-2 border-slate-300 shadow-xs space-y-2">
                <label className="text-xs font-black text-slate-900 uppercase tracking-wider block">
                  Nama Bay Baru:
                </label>
                <input
                  type="text"
                  value={createBayName}
                  onChange={(e) => setCreateBayName(e.target.value)}
                  placeholder="Contoh: Bay D (Reguler), Bay Melati, Ruang Isolasi 2..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-300 rounded-xl text-sm font-black text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              {/* New Bay Category */}
              <div className="bg-white p-4 rounded-2xl border-2 border-slate-300 shadow-xs space-y-2">
                <label className="text-xs font-black text-slate-900 uppercase tracking-wider block">
                  Kategori Utama Bay Baru:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['REGULER', 'HEPATITIS_B', 'HEPATITIS_C', 'ISOLASI'] as MachineCategory[]).map((cat) => {
                    const isSelected = createBayCategory === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCreateBayCategory(cat)}
                        className={`p-2.5 rounded-xl border-2 text-center text-xs font-black transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                            : 'bg-slate-50 hover:bg-slate-100 border-slate-300 text-slate-800'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* New Bay Status */}
              <div className="bg-white p-4 rounded-2xl border-2 border-slate-300 shadow-xs space-y-2">
                <label className="text-xs font-black text-slate-900 uppercase tracking-wider block">
                  Status Operasional:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['AKTIF', 'MAINTENANCE', 'TIDAK_DIGUNAKAN', 'RUSAK'] as MachineStatus[]).map((stat) => {
                    const isSelected = createBayStatus === stat;
                    return (
                      <button
                        key={stat}
                        type="button"
                        onClick={() => setCreateBayStatus(stat)}
                        className={`p-2.5 rounded-xl border-2 text-center text-xs font-black transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                            : 'bg-slate-50 hover:bg-slate-100 border-slate-300 text-slate-800'
                        }`}
                      >
                        {stat}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Select Machines to move to new Bay */}
              <div className="bg-white p-4 rounded-2xl border-2 border-slate-300 shadow-xs space-y-2">
                <label className="text-xs font-black text-slate-900 uppercase tracking-wider block">
                  Pilih Mesin yang Dialokasikan ke Bay Baru (Opsional):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                  {machines.map((m) => {
                    const isChecked = selectedMachineIdsForNewBay.includes(m.id);
                    return (
                      <label
                        key={m.id}
                        className={`p-2 rounded-xl border flex items-center gap-2 text-xs font-bold cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-blue-50 border-blue-400 text-blue-900'
                            : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedMachineIdsForNewBay([...selectedMachineIdsForNewBay, m.id]);
                            } else {
                              setSelectedMachineIdsForNewBay(
                                selectedMachineIdsForNewBay.filter((id) => id !== m.id)
                              );
                            }
                          }}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="font-black">{m.code}</span>
                        <span className="text-[10px] text-slate-500 truncate">({m.bay.split(' ')[0]})</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('EDIT_BAY')}
                  className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
                >
                  Buat Bay Baru & Simpan
                </button>
              </div>
            </form>
          )}

        </div>

        {/* Footer Note */}
        <div className="p-4 border-t-2 border-slate-200 flex items-center justify-between bg-slate-100 text-xs font-bold text-slate-600">
          <span>Perubahan tersimpan otomatis di perangkat & Cloud Firestore.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl text-xs cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
