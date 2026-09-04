import React, { useState, useEffect, useMemo } from 'react';
import { Machine, MachineCategory, MachineStatus, MACHINE_CATEGORY_INFO, MACHINE_STATUS_INFO } from '../types';
import { useHemo } from '../context/HemoContext';
import { X, Cpu, Layers, Activity, Trash2, PlusCircle } from 'lucide-react';

interface MachineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (machine: Omit<Machine, 'id'> | Machine) => void;
  onDelete?: (machine: Machine) => void;
  machine?: Machine | null;
}

export const MachineModal: React.FC<MachineModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  machine,
}) => {
  const { bays: contextBays, machines } = useHemo();

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [bay, setBay] = useState('Bay A (Reguler)');
  const [isCustomBay, setIsCustomBay] = useState(false);
  const [customBayInput, setCustomBayInput] = useState('');
  const [category, setCategory] = useState<MachineCategory>('REGULER');
  const [status, setStatus] = useState<MachineStatus>('AKTIF');
  const [brandModel, setBrandModel] = useState('Fresenius 4008S');
  const [notes, setNotes] = useState('');

  // Dynamically resolve all bays created by user or assigned to machines
  const allAvailableBays = useMemo(() => {
    const set = new Set<string>();
    (contextBays || []).forEach((b) => set.add(b));
    machines.forEach((m) => {
      if (m.bay) set.add(m.bay);
    });
    if (machine?.bay) set.add(machine.bay);
    if (set.size === 0) {
      set.add('Bay A (Reguler)');
      set.add('Bay B (Reguler)');
      set.add('Bay C (Depan)');
      set.add('Bay C (Khusus & Isolasi)');
    }
    return Array.from(set);
  }, [contextBays, machines, machine]);

  useEffect(() => {
    if (machine) {
      setCode(machine.code);
      setName(machine.name);
      setBay(machine.bay);
      setIsCustomBay(false);
      setCustomBayInput('');
      setCategory(machine.category);
      setStatus(machine.status);
      setBrandModel(machine.brandModel);
      setNotes(machine.notes || '');
    } else {
      setCode('M-');
      setName('');
      setBay(allAvailableBays[0] || 'Bay A (Reguler)');
      setIsCustomBay(false);
      setCustomBayInput('');
      setCategory('REGULER');
      setStatus('AKTIF');
      setBrandModel('Fresenius 4008S');
      setNotes('');
    }
  }, [machine, isOpen, allAvailableBays]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;

    const finalBay = isCustomBay && customBayInput.trim() ? customBayInput.trim() : bay.trim();
    if (!finalBay) return;

    if (machine) {
      onSave({
        ...machine,
        code: code.trim().toUpperCase(),
        name: name.trim(),
        bay: finalBay,
        category,
        status,
        brandModel: brandModel.trim(),
        notes: notes.trim(),
      });
    } else {
      onSave({
        code: code.trim().toUpperCase(),
        name: name.trim(),
        bay: finalBay,
        category,
        status,
        brandModel: brandModel.trim(),
        notes: notes.trim(),
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]"
        id="machine-modal-dialog"
      >
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-lg">
                {machine ? 'Ubah Data Mesin HD' : 'Tambah Mesin Dialisis'}
              </h3>
              <p className="text-xs text-slate-500">Unit Hemodialisa - Ruang / Bay Dinamis</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kode Mesin *
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="misal: M-01 atau A01"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono font-bold text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Display Bed / Mesin *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="misal: Mesin HD 01"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Zona / Ruang / Bay *
                </label>
                <button
                  type="button"
                  onClick={() => setIsCustomBay(!isCustomBay)}
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
                >
                  <PlusCircle className="w-3 h-3" />
                  <span>{isCustomBay ? 'Pilih dari List' : '+ Ketik Baru'}</span>
                </button>
              </div>
              
              {isCustomBay ? (
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={customBayInput}
                    onChange={(e) => setCustomBayInput(e.target.value)}
                    placeholder="Ketik nama Bay baru..."
                    className="w-full pl-9 pr-3 py-2 bg-white border-2 border-indigo-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 font-bold"
                  />
                  <Layers className="w-4 h-4 text-indigo-600 absolute left-3 top-2.5" />
                </div>
              ) : (
                <div className="relative">
                  <select
                    value={bay}
                    onChange={(e) => {
                      if (e.target.value === '__NEW_BAY__') {
                        setIsCustomBay(true);
                      } else {
                        setBay(e.target.value);
                      }
                    }}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 appearance-none font-medium"
                  >
                    {allAvailableBays.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                    <option value="__NEW_BAY__">+ Tambah / Ketik Bay Baru...</option>
                  </select>
                  <Layers className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kategori Infeksius / Khusus
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as MachineCategory)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 font-medium"
              >
                {Object.entries(MACHINE_CATEGORY_INFO).map(([key, val]) => (
                  <option key={key} value={key}>
                    {val.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Status Operasional
              </label>
              <div className="relative">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as MachineStatus)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 font-medium"
                >
                  {Object.entries(MACHINE_STATUS_INFO).map(([key, val]) => (
                    <option key={key} value={key}>
                      {val.label}
                    </option>
                  ))}
                </select>
                <Activity className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Merk & Model Mesin
              </label>
              <input
                type="text"
                value={brandModel}
                onChange={(e) => setBrandModel(e.target.value)}
                placeholder="Fresenius 4008S, Nipro Surdial, B.Braun"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Catatan Khusus / Maintenance Log
            </label>
            <div className="relative">
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="misal: Kalibrasi pompa heparin, RO filter baru..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
            <div>
              {machine && onDelete && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onDelete(machine);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors border border-rose-200 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Hapus Mesin
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs shadow-indigo-500/30 transition-colors cursor-pointer"
              >
                {machine ? 'Simpan Perubahan' : 'Tambah Mesin'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
