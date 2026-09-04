import React, { useState, useMemo } from 'react';
import { useHemo } from '../context/HemoContext';
import {
  Machine,
  MachineStatus,
  MachineCategory,
  MACHINE_CATEGORY_INFO,
  MACHINE_STATUS_INFO,
  ShiftType,
} from '../types';
import { MachineModal } from '../components/MachineModal';
import { ManageBayModal } from '../components/ManageBayModal';
import { RegenerateMachineAllocationModal } from '../components/RegenerateMachineAllocationModal';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';
import { ReadOnlyBanner } from '../components/ReadOnlyBanner';
import { WhatsAppDispatcher } from '../domain/WhatsAppDispatcher';
import {
  Cpu,
  Plus,
  Edit2,
  Trash2,
  AlertCircle,
  Activity,
  Layers,
  ShieldAlert,
  ShieldCheck,
  Sun,
  Sunset,
  CheckCircle2,
  Wrench,
  PowerOff,
  Sparkles,
  RotateCcw,
  LayoutGrid,
  List,
  Search,
  Check,
  ArrowRight,
  Settings,
} from 'lucide-react';

export const MachineLayoutScreen: React.FC = () => {
  const {
    isAdmin,
    machines,
    dailyAssignments,
    selectedDate,
    bays: contextBays,
    updateMachine,
    addMachine,
    deleteMachine,
    loadDefaultMachines,
    reallocateMachinesForDate,
    updateAssignment,
    showToast,
  } = useHemo();

  const [activeShiftView, setActiveShiftView] = useState<'PAGI' | 'SIANG'>('PAGI');
  const [viewMode, setViewMode] = useState<'BY_BAY' | 'GRID' | 'TABLE'>('BY_BAY');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBayFilter, setSelectedBayFilter] = useState<string>('ALL');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');

  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [machineToDelete, setMachineToDelete] = useState<Machine | null>(null);
  const [assigningMachine, setAssigningMachine] = useState<Machine | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReallocateModalOpen, setIsReallocateModalOpen] = useState(false);
  const [isBayModalOpen, setIsBayModalOpen] = useState(false);
  const [selectedBayToManage, setSelectedBayToManage] = useState<string | undefined>(undefined);

  // Group machines by Bay for visual floor plan layout in room sequence
  const bays = useMemo(() => {
    const deletedBays = new Set<string>(
      JSON.parse(localStorage.getItem('hemo_deleted_bays_v1') || '[]').map((b: string) => b.trim().toLowerCase())
    );
    const bayOrder: string[] = [];
    (contextBays || []).forEach((b) => {
      const trimmed = b?.trim();
      if (trimmed && !deletedBays.has(trimmed.toLowerCase()) && !bayOrder.includes(trimmed)) {
        bayOrder.push(trimmed);
      }
    });
    WhatsAppDispatcher.getSortedMachines(machines).forEach((m) => {
      const trimmed = m.bay?.trim();
      if (trimmed && !deletedBays.has(trimmed.toLowerCase()) && !bayOrder.includes(trimmed)) {
        bayOrder.push(trimmed);
      }
    });
    return bayOrder;
  }, [contextBays, machines]);

  // Nurses working on active shift
  const nursesOnShift = useMemo(() => {
    return dailyAssignments.filter((a) => a.shiftType === activeShiftView);
  }, [dailyAssignments, activeShiftView]);

  // Build a lookup map of machineId -> Nurse assigned on current date & shift
  const machineNurseMap = useMemo(() => {
    const map = new Map<
      number | string,
      { nurseName: string; isLeader: boolean; nurseId: number; specialDuty?: string | null }
    >();
    const shiftAssignments = dailyAssignments.filter((a) => a.shiftType === activeShiftView);

    shiftAssignments.forEach((assignment) => {
      // 1. Resolve structured machines via WhatsAppDispatcher
      const assignedMachines = WhatsAppDispatcher.getAssignedMachinesForAssignment(assignment, machines);
      assignedMachines.forEach((m) => {
        const info = {
          nurseName: assignment.nurseName,
          isLeader: assignment.isLeader,
          nurseId: assignment.nurseId,
          specialDuty: assignment.specialDuty,
        };
        map.set(m.id, info);
        map.set(String(m.id), info);
        if (m.code) {
          map.set(m.code.toUpperCase(), info);
          map.set(m.code.toLowerCase(), info);
        }
      });

      // 2. Also map raw assignedMachineIds
      (assignment.assignedMachineIds || []).forEach((mId) => {
        const info = {
          nurseName: assignment.nurseName,
          isLeader: assignment.isLeader,
          nurseId: assignment.nurseId,
          specialDuty: assignment.specialDuty,
        };
        map.set(mId, info);
        map.set(Number(mId), info);
        map.set(String(mId), info);
      });
    });
    return map;
  }, [dailyAssignments, activeShiftView, machines]);

  // Filtered machines sorted by room layout
  const filteredMachines = useMemo(() => {
    const list = machines.filter((m) => {
      if (selectedBayFilter !== 'ALL' && m.bay !== selectedBayFilter) return false;
      if (selectedCategoryFilter !== 'ALL' && m.category !== selectedCategoryFilter) return false;
      if (selectedStatusFilter !== 'ALL' && m.status !== selectedStatusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesCode = m.code.toLowerCase().includes(q);
        const matchesName = m.name.toLowerCase().includes(q);
        const matchesBay = m.bay.toLowerCase().includes(q);
        const matchesBrand = (m.brandModel || '').toLowerCase().includes(q);
        if (!matchesCode && !matchesName && !matchesBay && !matchesBrand) return false;
      }
      return true;
    });
    return WhatsAppDispatcher.getSortedMachines(list);
  }, [machines, selectedBayFilter, selectedCategoryFilter, selectedStatusFilter, searchQuery]);

  // Group filtered machines by Bay
  const machinesByBay = useMemo(() => {
    const grouped: { [bay: string]: Machine[] } = {};
    bays.forEach((bay) => {
      grouped[bay] = [];
    });
    filteredMachines.forEach((m) => {
      if (!grouped[m.bay]) grouped[m.bay] = [];
      grouped[m.bay].push(m);
    });
    return grouped;
  }, [filteredMachines, bays]);

  // Unallocated active machines on current date & shift
  const unallocatedActiveMachines = useMemo(() => {
    return filteredMachines.filter((m) => {
      const isOperational =
        !m.status ||
        m.status.toUpperCase() === 'AKTIF' ||
        (m.status !== 'MAINTENANCE' && m.status !== 'RUSAK' && m.status !== 'TIDAK_DIGUNAKAN');
      if (!isOperational) return false;
      const assigned =
        machineNurseMap.get(m.id) ||
        machineNurseMap.get(String(m.id)) ||
        (m.code ? machineNurseMap.get(m.code.toUpperCase()) || machineNurseMap.get(m.code.toLowerCase()) : undefined);
      return !assigned;
    });
  }, [filteredMachines, machineNurseMap]);

  // Summary Metrics
  const stats = useMemo(() => {
    const total = machines.length;
    const active = machines.filter((m) => m.status === 'AKTIF').length;
    const maintenance = machines.filter((m) => m.status === 'MAINTENANCE').length;
    const broken = machines.filter((m) => m.status === 'RUSAK').length;
    const isolation = machines.filter((m) => m.category === 'ISOLASI').length;
    const hepatitis = machines.filter((m) => m.category === 'HEPATITIS_B' || m.category === 'HEPATITIS_C').length;
    return { total, active, maintenance, broken, isolation, hepatitis };
  }, [machines]);

  const handleToggleStatus = (machine: Machine) => {
    if (!isAdmin) return;
    const nextStatus: MachineStatus =
      machine.status === 'AKTIF'
        ? 'MAINTENANCE'
        : machine.status === 'MAINTENANCE'
        ? 'RUSAK'
        : 'AKTIF';

    updateMachine({
      ...machine,
      status: nextStatus,
    });
    showToast(`Status ${machine.code} diubah menjadi ${MACHINE_STATUS_INFO[nextStatus].label}`, 'info');
  };

  const handleSaveMachine = (m: Omit<Machine, 'id'> | Machine) => {
    if (!isAdmin) return;
    if ('id' in m) {
      updateMachine(m as Machine);
      showToast(`Mesin ${m.code} berhasil diperbarui`, 'success');
    } else {
      addMachine(m);
      showToast(`Mesin baru ${m.code} berhasil ditambahkan`, 'success');
    }
    setEditingMachine(null);
  };

  const handleManualAssign = (nurseAssignmentId: string, machineId: number) => {
    if (!isAdmin) return;
    const targetAssignment = dailyAssignments.find((a) => a.id === nurseAssignmentId);
    if (!targetAssignment) return;

    // Check if machine is already assigned to someone else in this shift and remove it
    dailyAssignments.forEach((a) => {
      if (a.shiftType === activeShiftView && a.assignedMachineIds.includes(machineId) && a.id !== targetAssignment.id) {
        const remaining = a.assignedMachineIds.filter((id) => id !== machineId);
        updateAssignment(a, a.shiftType, remaining, a.isLeader, a.notes, a.specialDuty);
      }
    });

    const updatedMachines = Array.from(new Set([...targetAssignment.assignedMachineIds, machineId]));
    updateAssignment(
      targetAssignment,
      targetAssignment.shiftType,
      updatedMachines,
      targetAssignment.isLeader,
      targetAssignment.notes,
      targetAssignment.specialDuty
    );
    showToast(`Mesin berhasil dialokasikan ke ${targetAssignment.nurseName}!`, 'success');
    setAssigningMachine(null);
  };

  return (
    <div className="pb-24 space-y-4">
      <ReadOnlyBanner actionDescription="menambah data mesin, merubah status operasional, atau mengalokasikan mesin HD" />

      {/* Main Top Header & Summary Card */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm ring-2 ring-blue-100">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  Status & Denah {machines.length} Mesin HD
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 font-medium">
                  Monitoring alokasi bed, penanggung jawab perawat, dan zonasi infeksius tanggal{' '}
                  <span className="font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                    {selectedDate}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Sif & Actions Bar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Shift View Toggle */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setActiveShiftView('PAGI')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeShiftView === 'PAGI'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/70'
                }`}
              >
                <Sun className="w-4 h-4 text-amber-300" />
                <span>Sif Pagi (06:30 - 14:00)</span>
              </button>
              <button
                onClick={() => setActiveShiftView('SIANG')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeShiftView === 'SIANG'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/70'
                }`}
              >
                <Sunset className="w-4 h-4 text-amber-200" />
                <span>Sif Siang (13:30 - 21:00)</span>
              </button>
            </div>

            {isAdmin && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => {
                    setSelectedBayToManage(undefined);
                    setIsBayModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border-2 border-indigo-300 rounded-xl text-xs font-black shadow-2xs transition-colors cursor-pointer"
                  title="Atur Status, Nama, dan Kategori Bay"
                >
                  <Settings className="w-3.5 h-3.5 text-indigo-700" />
                  <span>Atur & Kelola Bay</span>
                </button>

                <button
                  onClick={() => setIsReallocateModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all"
                  title="Alokasikan mesin secara adil dan merata"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  Alokasi Otomatis
                </button>

                <button
                  onClick={loadDefaultMachines}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold shadow-2xs transition-colors"
                  title="Pulihkan dan pastikan semua 30 mesin HD tampil lengkap"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                  Pulihkan 30 Mesin
                </button>

                <button
                  onClick={() => {
                    setEditingMachine(null);
                    setIsModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tambah
                </button>
              </div>
            )}
          </div>
        </div>

        {/* High-Visibility Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-1">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-300 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">Total Mesin</span>
            <div className="text-xl font-black text-slate-900 mt-0.5">{stats.total} Bed</div>
            <span className="text-[10px] text-slate-500 font-medium">Kapasitas Unit HD</span>
          </div>

          <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-300 shadow-2xs">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">Aktif & Siap Pakai</span>
            <div className="text-xl font-black text-emerald-900 mt-0.5">{stats.active} Bed</div>
            <span className="text-[10px] text-emerald-700 font-semibold">Siap Pelayanan Pasien</span>
          </div>

          <div className="bg-amber-50 p-3 rounded-xl border border-amber-300 shadow-2xs">
            <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider block">Maintenance</span>
            <div className="text-xl font-black text-amber-900 mt-0.5">{stats.maintenance} Bed</div>
            <span className="text-[10px] text-amber-800 font-semibold">Kalibrasi / Pemeliharaan</span>
          </div>

          <div className="bg-rose-50 p-3 rounded-xl border border-rose-300 shadow-2xs">
            <span className="text-[11px] font-bold text-rose-900 uppercase tracking-wider block">Rusak / Tidak Aktif</span>
            <div className="text-xl font-black text-rose-900 mt-0.5">{stats.broken} Bed</div>
            <span className="text-[10px] text-rose-800 font-semibold">Menunggu Perbaikan</span>
          </div>

          <div className="bg-purple-50 p-3 rounded-xl border border-purple-300 shadow-2xs col-span-2 sm:col-span-1">
            <span className="text-[11px] font-bold text-purple-900 uppercase tracking-wider block">Ruang Isolasi & Hep</span>
            <div className="text-xl font-black text-purple-900 mt-0.5">{stats.isolation + stats.hepatitis} Mesin</div>
            <span className="text-[10px] text-purple-800 font-bold">Wajib Perawat CITO</span>
          </div>
        </div>

        {/* View Mode Switcher, Search & Filters Toolbar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2 border-t border-slate-200">
          {/* View Mode Buttons */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs shrink-0">
            <button
              onClick={() => setViewMode('BY_BAY')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                viewMode === 'BY_BAY'
                  ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>Per Ruangan (Bay)</span>
            </button>

            <button
              onClick={() => setViewMode('GRID')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                viewMode === 'GRID'
                  ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 text-blue-600" />
              <span>Grid Lengkap</span>
            </button>

            <button
              onClick={() => setViewMode('TABLE')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                viewMode === 'TABLE'
                  ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5 text-blue-600" />
              <span>Daftar Tabel</span>
            </button>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-wrap items-center gap-2 text-xs flex-1 justify-end">
            <div className="relative min-w-[140px] flex-1 sm:max-w-xs">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari mesin, kode, bay..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select
              value={selectedBayFilter}
              onChange={(e) => setSelectedBayFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-semibold"
            >
              <option value="ALL">Semua Bay ({bays.length})</option>
              {bays.map((bay) => (
                <option key={bay} value={bay}>
                  {bay}
                </option>
              ))}
            </select>

            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-semibold"
            >
              <option value="ALL">Semua Kategori</option>
              <option value="REGULER">Reguler</option>
              <option value="HEPATITIS_B">Hepatitis B</option>
              <option value="HEPATITIS_C">Hepatitis C</option>
              <option value="ISOLASI">Isolasi Khusus</option>
            </select>

            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-semibold"
            >
              <option value="ALL">Semua Status</option>
              <option value="AKTIF">Aktif</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="RUSAK">Rusak</option>
            </select>

            {(selectedBayFilter !== 'ALL' ||
              selectedCategoryFilter !== 'ALL' ||
              selectedStatusFilter !== 'ALL' ||
              searchQuery.trim() !== '') && (
              <button
                onClick={() => {
                  setSelectedBayFilter('ALL');
                  setSelectedCategoryFilter('ALL');
                  setSelectedStatusFilter('ALL');
                  setSearchQuery('');
                }}
                className="px-2 py-1 text-xs text-blue-700 hover:text-blue-900 font-bold underline cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Isolation Machines Clinical Rule Reminder */}
      <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-3.5 sm:p-4 flex items-start gap-3 text-rose-950 shadow-xs">
        <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div className="text-xs sm:text-sm">
          <p className="font-black text-rose-900 flex items-center gap-1.5">
            Kebijakan Alokasi Ruang Isolasi & Mesin Khusus:
          </p>
          <p className="text-rose-800 mt-0.5 leading-relaxed font-medium">
            Hanya Perawat dengan <b>Tugas Khusus CITO</b> yang diperbolehkan dialokasikan ke Mesin Ruang Isolasi.
            Sistem otomatis menandai dan mengunci kepatuhan ini saat penjadwalan.
          </p>
        </div>
      </div>

      {/* Active Unallocated Machines Alert */}
      {unallocatedActiveMachines.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-950 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-black text-amber-900">
                {unallocatedActiveMachines.length} Mesin Aktif Belum Dialokasikan (Sif{' '}
                {activeShiftView === 'PAGI' ? 'Pagi' : 'Siang'}, {selectedDate})
              </p>
              <p className="text-xs text-amber-800 font-medium">
                {nursesOnShift.length > 0
                  ? `Tersedia ${nursesOnShift.length} perawat berdinas pada Sif ${
                      activeShiftView === 'PAGI' ? 'Pagi' : 'Siang'
                    }. Klik tombol untuk mengalokasikan mesin secara otomatis.`
                  : `Belum ada perawat yang dijadwalkan berdinas di Sif ${
                      activeShiftView === 'PAGI' ? 'Pagi' : 'Siang'
                    }. Atur dinas perawat di menu Jadwal Harian.`}
              </p>
            </div>
          </div>
          {isAdmin && nursesOnShift.length > 0 && (
            <button
              onClick={() => reallocateMachinesForDate(selectedDate, { rotateBays: true })}
              className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all cursor-pointer"
            >
              <Cpu className="w-4 h-4" />
              Alokasikan Otomatis
            </button>
          )}
        </div>
      )}

      {/* Empty State when no machines match */}
      {filteredMachines.length === 0 && (
        <div className="bg-white border border-slate-300 rounded-2xl p-8 text-center space-y-3 shadow-xs">
          <AlertCircle className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="font-extrabold text-slate-900 text-base">Tidak ada mesin yang sesuai dengan filter</h3>
          <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
            {machines.length === 0
              ? 'Daftar mesin kosong. Silakan klik tombol "Pulihkan 30 Mesin HD" untuk memuat seluruh 30 mesin.'
              : 'Silakan sesuaikan pencarian atau reset filter untuk menampilkan mesin kembali.'}
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={() => {
                setSelectedBayFilter('ALL');
                setSelectedCategoryFilter('ALL');
                setSelectedStatusFilter('ALL');
                setSearchQuery('');
              }}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs"
            >
              Reset Filter
            </button>
            <button
              onClick={loadDefaultMachines}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-sm"
            >
              Pulihkan 30 Mesin HD
            </button>
          </div>
        </div>
      )}

      {/* VIEW 1: BY BAY / ROOM GROUPED VIEW (MOST INTUITIVE FOR NURSES) */}
      {viewMode === 'BY_BAY' && (
        <div className="space-y-6">
          {bays.map((bay) => {
            const bayMachines = machinesByBay[bay] || [];
            if (bayMachines.length === 0) return null;

            const isIsolationBay = bay.toLowerCase().includes('isolasi') || bay.toLowerCase().includes('cito');
            const isHepBay = bay.toLowerCase().includes('hepatitis');

            return (
              <div
                key={bay}
                className={`rounded-2xl border-2 overflow-hidden shadow-xs ${
                  isIsolationBay
                    ? 'bg-rose-50/40 border-rose-300'
                    : isHepBay
                    ? 'bg-purple-50/40 border-purple-300'
                    : 'bg-white border-slate-300'
                }`}
              >
                {/* Bay Header */}
                <div
                  className={`px-4 py-3 flex items-center justify-between border-b ${
                    isIsolationBay
                      ? 'bg-rose-100/90 border-rose-300 text-rose-950'
                      : isHepBay
                      ? 'bg-purple-100/90 border-purple-300 text-purple-950'
                      : 'bg-slate-100 border-slate-300 text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs ${
                        isIsolationBay
                          ? 'bg-rose-600 text-white'
                          : isHepBay
                          ? 'bg-purple-600 text-white'
                          : 'bg-blue-600 text-white'
                      }`}
                    >
                      {bay.charAt(0)}
                    </span>
                    <div>
                      <h3 className="font-extrabold text-sm sm:text-base tracking-tight flex items-center gap-2">
                        {bay}
                        {isIsolationBay && (
                          <span className="text-[10px] font-black uppercase bg-rose-600 text-white px-2 py-0.5 rounded-full">
                            Ruang Isolasi (Wajib CITO)
                          </span>
                        )}
                      </h3>
                      <span className="text-[11px] font-medium text-slate-600">
                        {bayMachines.length} Mesin HD terdaftar di area ini
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right text-xs font-bold hidden sm:block">
                      <span className="text-emerald-700">
                        {bayMachines.filter((m) => m.status === 'AKTIF').length} Aktif
                      </span>
                      {bayMachines.filter((m) => m.status !== 'AKTIF').length > 0 && (
                        <span className="text-rose-700 ml-2">
                          • {bayMachines.filter((m) => m.status !== 'AKTIF').length} Non-Aktif
                        </span>
                      )}
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => {
                          setSelectedBayToManage(bay);
                          setIsBayModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-300 hover:border-blue-400 rounded-xl text-xs font-bold shadow-2xs transition-all cursor-pointer"
                        title={`Atur Status, Nama, dan Kategori untuk ${bay}`}
                      >
                        <Settings className="w-3.5 h-3.5 text-slate-600" />
                        <span>Atur Bay</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Bay Machines Grid */}
                <div className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {bayMachines.map((machine) => (
                    <MachineCard
                      key={machine.id}
                      machine={machine}
                      activeShiftView={activeShiftView}
                      machineNurseMap={machineNurseMap}
                      isAdmin={isAdmin}
                      onEdit={() => {
                        setEditingMachine(machine);
                        setIsModalOpen(true);
                      }}
                      onToggleStatus={() => handleToggleStatus(machine)}
                      onDelete={() => setMachineToDelete(machine)}
                      onAssign={() => setAssigningMachine(machine)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 2: FLAT ALL MACHINES GRID */}
      {viewMode === 'GRID' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredMachines.map((machine) => (
            <MachineCard
              key={machine.id}
              machine={machine}
              activeShiftView={activeShiftView}
              machineNurseMap={machineNurseMap}
              isAdmin={isAdmin}
              onEdit={() => {
                setEditingMachine(machine);
                setIsModalOpen(true);
              }}
              onToggleStatus={() => handleToggleStatus(machine)}
              onDelete={() => setMachineToDelete(machine)}
              onAssign={() => setAssigningMachine(machine)}
            />
          ))}
        </div>
      )}

      {/* VIEW 3: COMPACT TABLE VIEW */}
      {viewMode === 'TABLE' && (
        <div className="bg-white rounded-2xl border-2 border-slate-300 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-extrabold border-b border-slate-300">
                  <th className="py-3 px-3">Kode Bed</th>
                  <th className="py-3 px-3">Nama Mesin</th>
                  <th className="py-3 px-3">Ruangan / Bay</th>
                  <th className="py-3 px-3">Kategori Infeksius</th>
                  <th className="py-3 px-3">Status Mesin</th>
                  <th className="py-3 px-3">PJ Perawat ({activeShiftView})</th>
                  {isAdmin && <th className="py-3 px-3 text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredMachines.map((m) => {
                  const assigned =
                    machineNurseMap.get(m.id) ||
                    machineNurseMap.get(String(m.id)) ||
                    (m.code
                      ? machineNurseMap.get(m.code.toUpperCase()) || machineNurseMap.get(m.code.toLowerCase())
                      : undefined);
                  const catInfo = MACHINE_CATEGORY_INFO[m.category];
                  const statusInfo = MACHINE_STATUS_INFO[m.status];
                  const isIso = m.category === 'ISOLASI';

                  return (
                    <tr
                      key={m.id}
                      className={`hover:bg-slate-50 font-medium ${
                        isIso ? 'bg-rose-50/40' : m.status !== 'AKTIF' ? 'bg-slate-50/70 opacity-80' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 font-mono font-black text-slate-900 text-sm">
                        <span className="inline-flex items-center gap-1">
                          {m.code}
                          {isIso && <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">{m.name}</div>
                        <div className="text-[10px] text-slate-500">{m.brandModel}</div>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{m.bay}</td>
                      <td className="py-2.5 px-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${catInfo.badgeClass}`}>
                          {catInfo.label}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-md font-bold border inline-flex items-center gap-1 ${statusInfo.colorClass}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotClass}`} />
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        {assigned ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-md bg-blue-600 text-white font-black text-[10px] flex items-center justify-center">
                              {assigned.nurseName.charAt(0)}
                            </div>
                            <span className="font-extrabold text-blue-900">{assigned.nurseName}</span>
                            {assigned.isLeader && (
                              <span className="text-[9px] font-black px-1.5 py-0.2 bg-indigo-100 text-indigo-800 rounded">
                                KATIM
                              </span>
                            )}
                          </div>
                        ) : m.status === 'AKTIF' ? (
                          <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                            Belum Ada PJ
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-500 italic">Non-Aktif</span>
                        )}
                      </td>
                      {isAdmin && (
                        <td className="py-2.5 px-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => {
                                setEditingMachine(m);
                                setIsModalOpen(true);
                              }}
                              className="p-1 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Edit Mesin"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleToggleStatus(m)}
                              className="p-1 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                              title="Ganti Status"
                            >
                              <Wrench className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setMachineToDelete(m)}
                              className="p-1 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                              title="Hapus Mesin"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Manual Direct Assign Modal */}
      {assigningMachine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-300 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-4 bg-slate-100 border-b border-slate-300 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-1.5">
                  Tugaskan Mesin {assigningMachine.code} ({assigningMachine.name})
                </h3>
                <p className="text-xs text-slate-600 font-medium">
                  Pilih perawat dinas Sif {activeShiftView === 'PAGI' ? 'Pagi' : 'Siang'} ({selectedDate})
                </p>
              </div>
              <button
                onClick={() => setAssigningMachine(null)}
                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors font-bold"
              >
                ✕
              </button>
            </div>

            {/* If assigning ISOLASI machine, show reminder banner */}
            {assigningMachine.category === 'ISOLASI' && (
              <div className="p-3 bg-rose-50 border-b border-rose-200 text-xs text-rose-900 flex items-center gap-2 font-semibold">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Mesin Isolasi wajib ditugaskan ke perawat dengan Tugas Khusus CITO.</span>
              </div>
            )}

            <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
              {nursesOnShift.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs">
                  Tidak ada perawat dinas pada sif ini. Silakan tentukan dinas perawat di menu Jadwal Harian terlebih dahulu.
                </div>
              ) : (
                nursesOnShift.map((assignment) => {
                  const currentCount = assignment.assignedMachineIds.length;
                  const isCurrentHolder = assignment.assignedMachineIds.includes(assigningMachine.id);
                  const isCitoNurse = (assignment.specialDuty || '').toUpperCase().includes('CITO');

                  return (
                    <button
                      key={assignment.id}
                      onClick={() => handleManualAssign(assignment.id, assigningMachine.id)}
                      className={`w-full text-left p-3 rounded-xl border-2 flex items-center justify-between transition-all cursor-pointer ${
                        isCurrentHolder
                          ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20'
                          : assigningMachine.category === 'ISOLASI' && isCitoNurse
                          ? 'bg-rose-50/60 border-rose-300 hover:bg-rose-100/60'
                          : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl font-bold text-sm flex items-center justify-center text-white ${
                            isCitoNurse ? 'bg-rose-600' : 'bg-blue-600'
                          }`}
                        >
                          {assignment.nurseName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                            {assignment.nurseName}
                            {assignment.isLeader && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 bg-indigo-100 text-indigo-800 rounded">
                                KATIM
                              </span>
                            )}
                            {isCitoNurse && (
                              <span className="text-[10px] font-black px-1.5 py-0.2 bg-rose-100 text-rose-800 rounded border border-rose-300">
                                CITO
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-slate-600 font-medium">
                            Memegang {currentCount} mesin saat ini
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        {isCurrentHolder ? (
                          <span className="text-xs font-black text-blue-700 bg-blue-100 px-2.5 py-1 rounded-md border border-blue-300">
                            Penanggung Jawab
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-300 hover:bg-blue-600 hover:text-white transition-colors">
                            Pilih
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <div className="p-3 bg-slate-100 border-t border-slate-300 flex items-center justify-between">
              <button
                onClick={() => {
                  reallocateMachinesForDate(selectedDate, { rotateBays: true });
                  setAssigningMachine(null);
                }}
                className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-900"
              >
                <Cpu className="w-3.5 h-3.5" />
                Alokasikan Otomatis Semua Mesin
              </button>
              <button
                onClick={() => setAssigningMachine(null)}
                className="px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200 rounded-lg"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Machine Add/Edit Modal */}
      <MachineModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingMachine(null);
        }}
        onSave={handleSaveMachine}
        onDelete={(m) => setMachineToDelete(m)}
        machine={editingMachine}
      />

      {isReallocateModalOpen && (
        <RegenerateMachineAllocationModal
          isOpen={isReallocateModalOpen}
          onClose={() => setIsReallocateModalOpen(false)}
          defaultScope="DAILY"
        />
      )}

      {/* Delete Machine Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!machineToDelete}
        onClose={() => setMachineToDelete(null)}
        onConfirm={() => {
          if (machineToDelete) {
            deleteMachine(machineToDelete.id);
            setMachineToDelete(null);
          }
        }}
        title="Hapus Mesin Dialisis"
        message={`Apakah Anda yakin ingin menghapus Mesin ${machineToDelete?.code || ''} (${machineToDelete?.name || ''}) dari ${machineToDelete?.bay || ''}? Mesin ini akan dihapus dari denah dan jadwal penugasan perawat.`}
        itemName={machineToDelete ? `${machineToDelete.code} - ${machineToDelete.name} (${machineToDelete.bay})` : undefined}
        confirmButtonText="Hapus Mesin"
        note="⚠️ Catatan: Mesin ini akan dihapus dari denah ruangan dan seluruh alokasi sif. Anda dapat memulihkan seluruh 30 mesin HD kapan saja melalui tombol 'Pulihkan 30 Mesin'."
      />

      {/* Manage Bay Modal */}
      <ManageBayModal
        isOpen={isBayModalOpen}
        onClose={() => {
          setIsBayModalOpen(false);
          setSelectedBayToManage(undefined);
        }}
        initialBayName={selectedBayToManage}
      />
    </div>
  );
};

// Extracted Sub-Component: MachineCard with High Contrast & Clear Indicators
interface MachineCardProps {
  machine: Machine;
  activeShiftView: 'PAGI' | 'SIANG';
  machineNurseMap: Map<number | string, { nurseName: string; isLeader: boolean; nurseId: number; specialDuty?: string | null }>;
  isAdmin: boolean;
  onEdit: () => void;
  onToggleStatus: () => void;
  onDelete: () => void;
  onAssign: () => void;
}

const MachineCard: React.FC<MachineCardProps> = ({
  machine,
  activeShiftView,
  machineNurseMap,
  isAdmin,
  onEdit,
  onToggleStatus,
  onDelete,
  onAssign,
}) => {
  const assigned =
    machineNurseMap.get(machine.id) ||
    machineNurseMap.get(String(machine.id)) ||
    (machine.code
      ? machineNurseMap.get(machine.code.toUpperCase()) || machineNurseMap.get(machine.code.toLowerCase())
      : undefined);

  const catInfo = MACHINE_CATEGORY_INFO[machine.category];
  const statusInfo = MACHINE_STATUS_INFO[machine.status];
  const isOperational =
    !machine.status ||
    machine.status.toUpperCase() === 'AKTIF' ||
    (machine.status !== 'MAINTENANCE' && machine.status !== 'RUSAK' && machine.status !== 'TIDAK_DIGUNAKAN');

  const isIsolation = machine.category === 'ISOLASI';
  const isHepB = machine.category === 'HEPATITIS_B';
  const isHepC = machine.category === 'HEPATITIS_C';

  return (
    <div
      className={`rounded-2xl p-4 border-2 transition-all relative flex flex-col justify-between shadow-xs ${
        !isOperational
          ? 'bg-slate-100/90 border-slate-300 opacity-80'
          : isIsolation
          ? 'bg-rose-50/40 border-rose-300 ring-1 ring-rose-400/20'
          : assigned
          ? 'bg-white border-blue-300 ring-1 ring-blue-500/10'
          : 'bg-white border-amber-300 ring-1 ring-amber-400/30'
      }`}
    >
      <div>
        {/* Machine Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            {/* High-Visibility Machine Number Badge */}
            <div
              className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center font-mono font-black shadow-xs shrink-0 ${
                isIsolation
                  ? 'bg-rose-600 text-white'
                  : isHepB
                  ? 'bg-purple-600 text-white'
                  : isHepC
                  ? 'bg-amber-600 text-white'
                  : 'bg-blue-600 text-white'
              }`}
            >
              <span className="text-[9px] uppercase tracking-wider opacity-90 leading-none">BED</span>
              <span className="text-base leading-none mt-0.5">
                {machine.code.replace('M-', '')}
              </span>
            </div>

            <div className="min-w-0">
              <h4 className="font-black text-slate-900 text-sm truncate flex items-center gap-1">
                {machine.name}
                {isIsolation && <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
              </h4>
              <p className="text-[11px] text-slate-600 font-semibold truncate max-w-[130px]">
                {machine.brandModel || 'Fresenius 4008S'}
              </p>
            </div>
          </div>

          {/* Admin Controls */}
          {isAdmin && (
            <div className="flex items-center gap-0.5 shrink-0 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                onClick={onEdit}
                className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-white rounded-md transition-colors"
                title="Edit Mesin"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onToggleStatus}
                className="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-white rounded-md transition-colors"
                title="Ganti Status (Aktif / Maintenance / Rusak)"
              >
                <Wrench className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onDelete}
                className="p-1.5 text-slate-600 hover:text-rose-700 hover:bg-white rounded-md transition-colors"
                title="Hapus Mesin HD"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Badges: Bay, Category, Status */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-200 text-slate-800 font-bold">
            {machine.bay}
          </span>
          <span className={`text-[10px] px-2 py-0.5 rounded-md font-extrabold ${catInfo.badgeClass}`}>
            {catInfo.label}
          </span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-md border font-extrabold inline-flex items-center gap-1 ${statusInfo.colorClass}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotClass}`} />
            {statusInfo.label}
          </span>
        </div>

        {/* Isolation rule indicator banner */}
        {isIsolation && (
          <div className="mt-2.5 px-2.5 py-1 bg-rose-100 text-rose-900 rounded-lg border border-rose-300 text-[10px] font-black flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span>ZONA ISOLASI • WAJIB CITO</span>
          </div>
        )}

        {machine.notes && (
          <p className="mt-2 text-[11px] text-slate-600 bg-slate-100 p-1.5 rounded-lg border border-slate-200 italic font-medium">
            "{machine.notes}"
          </p>
        )}
      </div>

      {/* PJ Perawat Footer */}
      <div className="mt-4 pt-3 border-t border-slate-200">
        <span className="text-[10px] font-extrabold uppercase text-slate-600 tracking-wider block mb-1">
          PJ Perawat ({activeShiftView}):
        </span>

        {assigned ? (
          <div className="flex items-center justify-between bg-blue-50 p-2 rounded-xl border border-blue-300">
            <div className="flex items-center gap-2 truncate min-w-0">
              <div className="w-6 h-6 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                {assigned.nurseName.charAt(0)}
              </div>
              <div className="truncate">
                <span className="font-extrabold text-xs text-blue-950 block truncate">
                  {assigned.nurseName}
                </span>
                {assigned.specialDuty && (
                  <span className="text-[9px] text-blue-700 font-bold block truncate">
                    Tugas: {assigned.specialDuty}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0 ml-1">
              {assigned.isLeader && (
                <span className="text-[9px] font-black px-1.5 py-0.5 bg-indigo-100 text-indigo-900 rounded border border-indigo-300">
                  KATIM
                </span>
              )}
              {isAdmin && (
                <button
                  onClick={onAssign}
                  className="text-[10px] text-blue-700 hover:text-blue-900 font-extrabold px-2 py-0.5 bg-blue-100 hover:bg-blue-200 rounded transition-colors"
                  title="Pindahkan alokasi mesin"
                >
                  Ubah
                </button>
              )}
            </div>
          </div>
        ) : isOperational ? (
          <div className="flex items-center justify-between bg-amber-50 text-amber-950 p-2 rounded-xl text-xs border border-amber-300">
            <div className="flex items-center gap-1.5 truncate">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="text-[11px] font-black">Belum Ada PJ</span>
            </div>
            {isAdmin && (
              <button
                onClick={onAssign}
                className="text-[10px] font-black px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-md shadow-2xs transition-colors cursor-pointer"
                title="Tugaskan perawat untuk mesin ini"
              >
                Tugaskan
              </button>
            )}
          </div>
        ) : (
          <div className="bg-slate-200 text-slate-600 p-2 rounded-xl text-xs flex items-center gap-1.5 font-semibold">
            <PowerOff className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="text-[11px]">Mesin Non-Aktif</span>
          </div>
        )}
      </div>
    </div>
  );
};
