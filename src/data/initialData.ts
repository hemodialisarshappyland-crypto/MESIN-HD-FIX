import { Machine, Nurse, AppSettings } from '../types';

export const INITIAL_MACHINES: Machine[] = [
  // 1. Urutan Pertama: Bay A (A01 - A12)
  { id: 1, code: "A01", name: "Mesin HD A01", bay: "Bay A (Reguler)", category: "REGULER", status: "AKTIF", brandModel: "Fresenius 4008S" },
  { id: 2, code: "A02", name: "Mesin HD A02", bay: "Bay A (Reguler)", category: "REGULER", status: "AKTIF", brandModel: "Fresenius 4008S" },
  { id: 3, code: "A03", name: "Mesin HD A03", bay: "Bay A (Reguler)", category: "REGULER", status: "AKTIF", brandModel: "Fresenius 4008S" },
  { id: 4, code: "A04", name: "Mesin HD A04", bay: "Bay A (Reguler)", category: "REGULER", status: "AKTIF", brandModel: "Fresenius 4008S" },
  { id: 5, code: "A05", name: "Mesin HD A05", bay: "Bay A (Reguler)", category: "REGULER", status: "AKTIF", brandModel: "Fresenius 4008S" },
  { id: 6, code: "A06", name: "Mesin HD A06", bay: "Bay A (Reguler)", category: "REGULER", status: "AKTIF", brandModel: "Fresenius 4008S" },
  { id: 7, code: "A07", name: "Mesin HD A07", bay: "Bay A (Reguler)", category: "REGULER", status: "AKTIF", brandModel: "Fresenius 4008S" },
  { id: 8, code: "A08", name: "Mesin HD A08", bay: "Bay A (Reguler)", category: "REGULER", status: "AKTIF", brandModel: "Fresenius 4008S" },
  { id: 9, code: "A09", name: "Mesin HD A09", bay: "Bay A (Reguler)", category: "REGULER", status: "AKTIF", brandModel: "Fresenius 4008S" },
  { id: 10, code: "A10", name: "Mesin HD A10", bay: "Bay A (Reguler)", category: "REGULER", status: "AKTIF", brandModel: "Fresenius 4008S" },
  { id: 11, code: "A11", name: "Mesin HD A11", bay: "Bay A (Reguler)", category: "REGULER", status: "AKTIF", brandModel: "Fresenius 4008S" },
  { id: 12, code: "A12", name: "Mesin HD A12", bay: "Bay A (Reguler)", category: "REGULER", status: "AKTIF", brandModel: "Fresenius 4008S" },

  // 2. Urutan Kedua: Bay C Depan (C01 - C04)
  { id: 13, code: "C01", name: "Mesin HD C01", bay: "Bay C (Depan)", category: "REGULER", status: "AKTIF", brandModel: "Nipro Surdial 55Plus" },
  { id: 14, code: "C02", name: "Mesin HD C02", bay: "Bay C (Depan)", category: "REGULER", status: "AKTIF", brandModel: "Nipro Surdial 55Plus" },
  { id: 15, code: "C03", name: "Mesin HD C03", bay: "Bay C (Depan)", category: "REGULER", status: "AKTIF", brandModel: "Nipro Surdial 55Plus" },
  { id: 16, code: "C04", name: "Mesin HD C04", bay: "Bay C (Depan)", category: "REGULER", status: "AKTIF", brandModel: "Nipro Surdial 55Plus" },

  // 3. Urutan Ketiga: Bay B (B01 - B09)
  { id: 17, code: "B01", name: "Mesin HD B01", bay: "Bay B (Reguler)", category: "REGULER", status: "AKTIF", brandModel: "Gambro AK98" },
  { id: 18, code: "B02", name: "Mesin HD B02", bay: "Bay B (Reguler)", category: "REGULER", status: "AKTIF", brandModel: "Gambro AK98" },
  { id: 19, code: "B03", name: "Mesin HD B03", bay: "Bay B (Reguler)", category: "REGULER", status: "AKTIF", brandModel: "Gambro AK98" },
  { id: 20, code: "B04", name: "Mesin HD B04", bay: "Bay B (Reguler)", category: "REGULER", status: "AKTIF", brandModel: "Gambro AK98" },
  { id: 21, code: "B05", name: "Mesin HD B05", bay: "Bay B (Reguler)", category: "REGULER", status: "AKTIF", brandModel: "Gambro AK98" },
  { id: 22, code: "B06", name: "Mesin HD B06", bay: "Bay B (Reguler)", category: "REGULER", status: "AKTIF", brandModel: "Gambro AK98" },
  { id: 23, code: "B07", name: "Mesin HD B07", bay: "Bay B (Reguler)", category: "REGULER", status: "AKTIF", brandModel: "Gambro AK98" },
  { id: 24, code: "B08", name: "Mesin HD B08", bay: "Bay B (Reguler)", category: "REGULER", status: "AKTIF", brandModel: "Gambro AK98" },
  { id: 25, code: "B09", name: "Mesin HD B09", bay: "Bay B (Reguler)", category: "REGULER", status: "AKTIF", brandModel: "Gambro AK98" },

  // 4. Urutan Keempat: Bay C Khusus & Isolasi (C05 - C09)
  { id: 26, code: "C05", name: "Mesin HD C05", bay: "Bay C (Khusus & Isolasi)", category: "REGULER", status: "AKTIF", brandModel: "Nipro Surdial 55Plus" },
  { id: 27, code: "C06", name: "Mesin HD C06 (Hep B)", bay: "Bay C (Khusus & Isolasi)", category: "HEPATITIS_B", status: "AKTIF", brandModel: "Fresenius 4008S Dedicated", notes: "Khusus Hepatitis B" },
  { id: 28, code: "C07", name: "Mesin HD C07 (Hep C)", bay: "Bay C (Khusus & Isolasi)", category: "HEPATITIS_C", status: "AKTIF", brandModel: "Gambro AK98 Dedicated", notes: "Khusus Hepatitis C" },
  { id: 29, code: "C08", name: "Mesin HD C08 (Isolasi)", bay: "Bay C (Khusus & Isolasi)", category: "ISOLASI", status: "AKTIF", brandModel: "Fresenius 5008S Multi-filter", notes: "Ruang Isolasi Tekanan Negatif" },
  { id: 30, code: "C09", name: "Mesin HD C09 (Isolasi)", bay: "Bay C (Khusus & Isolasi)", category: "ISOLASI", status: "AKTIF", brandModel: "Fresenius 5008S Multi-filter", notes: "Ruang Isolasi Tekanan Negatif / Cito" },
];

export const SAMPLE_NURSES: Nurse[] = [];

export const LEGACY_SAMPLE_NURSE_NAMES = new Set([
  "Ns. Hendra Wijaya, S.Kep",
  "Ns. Siti Rahmawati, S.Kep",
  "Ns. Budi Santoso, S.Kep",
  "Ns. Dewi Anggraini, S.Kep",
  "Ns. Ahmad Fauzi, S.Kep",
  "Ns. Nurul Hidayah, A.Md.Kep",
  "Ns. Rian Pratama, A.Md.Kep",
  "Ns. Eka Putri Lestari, S.Kep",
  "Ns. Muhammad Rizky, A.Md.Kep",
  "Ns. Tri Wahyuni, A.Md.Kep",
  "Ns. Bayu Kurniawan, S.Kep",
  "Ns. Fitri Handayani, A.Md.Kep",
  "Ns. Dimas Ardiansyah, S.Kep",
  "Ns. Ratna Sari, A.Md.Kep",
  "Ns. Ilham Saputra, A.Md.Kep",
  "Ns. Dian Permatasari, S.Kep",
  "Ns. Aditya Nugraha, A.Md.Kep",
]);

export const INITIAL_SETTINGS: AppSettings = {
  id: 1,
  hospitalName: "RS Happy Land Medical Centre",
  roomName: "Ruang Dialisis Gedung Timur Lt.3",
  headNurseName: "Kepala Ruang HD",
  headNursePhone: "081234567801",
  googleSheetWebhookUrl: "",
  googleSpreadsheetIdOrUrl: "",
  autoSyncGoogleSheets: false,
  minNursesPerShift: 8,
  maxConsecutiveWorkDays: 5,
  lastSyncTimestamp: 0,
  lastSyncStatus: "Belum pernah disinkronkan"
};
