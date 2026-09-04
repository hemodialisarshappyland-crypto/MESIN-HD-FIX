import { Machine, ShiftAssignment, SHIFT_TYPE_INFO, parseSpecialDuties, HeadNurseReportFormat } from '../types';

export class WhatsAppDispatcher {
  static formatIndonesianDate(isoDate: string): string {
    try {
      const date = new Date(isoDate + 'T00:00:00');
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      const dayName = days[date.getDay()];
      const monthName = months[date.getMonth()];
      return `${dayName}, ${date.getDate()} ${monthName} ${date.getFullYear()}`;
    } catch {
      return isoDate;
    }
  }

  /**
   * Sanitizes Indonesian phone numbers into international WhatsApp format (e.g., 0812 -> 62812).
   * Returns empty string if phone number is missing, empty, or invalid.
   */
  static cleanPhoneNumberForWhatsApp(rawPhone?: string | null): string {
    if (!rawPhone) return '';
    let cleaned = String(rawPhone).trim().replace(/[^0-9+]/g, '');
    if (!cleaned) return '';

    if (cleaned.startsWith('+62')) {
      cleaned = cleaned.substring(1);
    } else if (cleaned.startsWith('+')) {
      cleaned = cleaned.substring(1);
    } else if (cleaned.startsWith('0')) {
      cleaned = '62' + cleaned.substring(1);
    } else if (!cleaned.startsWith('62')) {
      cleaned = '62' + cleaned;
    }

    // Must have at least 9 digits to be a valid phone number (e.g., 6281234567)
    if (cleaned.length < 9) {
      return '';
    }
    return cleaned;
  }

  /**
   * Checks if a phone number string is valid for WhatsApp dispatch.
   */
  static isValidPhoneNumber(rawPhone?: string | null): boolean {
    const cleaned = this.cleanPhoneNumberForWhatsApp(rawPhone);
    return cleaned.length >= 9;
  }

  /**
   * Identifies default mock/sample numbers (e.g., 081234567801 .. 081234567817) so users can be warned.
   */
  static isSamplePhoneNumber(rawPhone?: string | null): boolean {
    if (!rawPhone) return false;
    const clean = rawPhone.replace(/[^0-9]/g, '');
    return (
      clean.startsWith('0812345678') ||
      clean.startsWith('62812345678') ||
      clean === '081234567890' ||
      clean === '081122334455'
    );
  }

  /**
   * Creates personal notification message for a single nurse.
   */
  static generateNurseMessage(
    assignment: ShiftAssignment,
    machines: Machine[],
    hospitalName: string = 'RS Happy Land Medical Centre',
    roomName: string = 'Ruang Dialisis Gedung Timur Lt.3',
    fallbackSpecialDuty?: string | null
  ): string {
    const formattedDate = this.formatIndonesianDate(assignment.date);
    const shiftIcon = assignment.shiftType === 'PAGI' ? '🌅' : '🌇';
    let shiftBadge = '';
    switch (assignment.shiftType) {
      case 'PAGI':
        shiftBadge = `${shiftIcon} SIF PAGI (07.00 - 14.00 WIB)`;
        break;
      case 'SIANG':
        shiftBadge = `${shiftIcon} SIF SIANG (12.00 - 19.00 WIB)`;
        break;
      case 'LIBUR':
        shiftBadge = '🌴 HARI LIBUR / OFF';
        break;
      case 'CUTI':
        shiftBadge = '🏖️ CUTI TAHUNAN';
        break;
      case 'SAKIT':
        shiftBadge = '🩺 IZIN / SAKIT';
        break;
    }

    const assignedMachines = this.getAssignedMachinesForAssignment(assignment, machines);

    const sb: string[] = [];
    sb.push(`🏥 ${hospitalName}`);
    sb.push(`📍 ${roomName}`);
    sb.push('━━━━━━━━━━━━━━━━━━━━━━');
    sb.push('📋 JADWAL DINAS & ALOKASI MESIN HD');
    sb.push('');
    sb.push(`👤 Nama: ${assignment.nurseName}`);
    sb.push(`📅 Tanggal: ${formattedDate}`);
    sb.push(`⏰ Sif: ${shiftBadge}`);

    const roleText = assignment.isLeader ? 'PJ Sif / Koordinator Sif' : 'Perawat Pelaksana HD';
    sb.push(`⭐ Peran: ${roleText}`);

    const resolvedDuty =
      assignment.specialDuty && assignment.specialDuty.trim() !== ''
        ? assignment.specialDuty.trim()
        : fallbackSpecialDuty && fallbackSpecialDuty.trim() !== ''
        ? fallbackSpecialDuty.trim()
        : null;

    const dutyText = resolvedDuty ? resolvedDuty : '-';
    sb.push(`🏷️ Tugas Khusus PIC: ${dutyText}`);
    sb.push(' ');

    const isWorkShift = SHIFT_TYPE_INFO[assignment.shiftType]?.isWorkShift;
    if (isWorkShift) {
      sb.push(`📟 ALOKASI MESIN DIKELOLA (${assignedMachines.length} Mesin):`);
      if (assignedMachines.length === 0) {
        sb.push('*(Belum ada mesin yang ditugaskan)*');
      } else {
        assignedMachines.forEach((m) => {
          sb.push(`▶️ [${m.code}] ${m.name}`);
        });
      }

      sb.push('');
      sb.push('📝 SOP & Petunjuk Pelayanan:');
      sb.push('* Lakukan briefing 15 menit sebelum sif dimulai');
      sb.push('* Priming & pemeriksaan dialyzer sesuai standar keselamatan');
      sb.push('* Monitoring TTV & parameter mesin tiap 30-60 menit');
      sb.push('* Operan pasien & desinfeksi mesin bersama sif berikutnya');
    } else {
      sb.push('');
      sb.push('Selamat beristirahat dan mengisi kembali energi. Terima kasih atas dedikasi Anda! 🙏✨');
    }

    sb.push('');
    sb.push('━━━━━━━━━━━━━━━━━━━━━━');
    sb.push('Sistem Otomasi Jadwal & Alokasi HD HemoShift');

    return sb.join('\n');
  }

  /**
   * Creates a group broadcast summary for the whole shift or day.
   */
  static generateGroupBroadcastMessage(
    dateStr: string,
    shiftType: 'PAGI' | 'SIANG' | null,
    assignments: ShiftAssignment[],
    machines: Machine[],
    hospitalName: string = 'RS Happy Land Medical Centre'
  ): string {
    const formattedDate = this.formatIndonesianDate(dateStr);
    const sb: string[] = [];
    sb.push('📢 *REKAP JADWAL & ALOKASI MESIN HD*');
    sb.push(`🏥 *${hospitalName}*`);
    sb.push(`📅 ${formattedDate}`);
    sb.push('━━━━━━━━━━━━━━━━━━━━━━');

    const shiftsToInclude: ('PAGI' | 'SIANG')[] = shiftType ? [shiftType] : ['PAGI', 'SIANG'];

    for (const st of shiftsToInclude) {
      const shiftIcon = st === 'PAGI' ? '🌅' : '🌇';
      const timeRange = st === 'PAGI' ? '07.00 - 14.00 WIB' : '12.00 - 19.00 WIB';
      sb.push(`\n${shiftIcon} *SIF ${st} (${timeRange})*`);
      const onDuty = this.sortAssignmentsByMachineOrder(
        assignments.filter((a) => a.shiftType === st),
        machines
      );

      if (onDuty.length === 0) {
        sb.push('_Tidak ada jadwal dinas terdata_');
      } else {
        onDuty.forEach((assign, index) => {
          const leaderTag = assign.isLeader ? ' 👑 (PJ Sif)' : '';
          const dutyTag = assign.specialDuty ? ` • [${assign.specialDuty}]` : '';
          const sortedMachines = this.getAssignedMachinesForAssignment(assign, machines);
          const mCodes = sortedMachines.map((m) => m.code).join(', ');
          const mSummary =
            sortedMachines.length > 0
              ? `${mCodes} (${sortedMachines.length} mesin)`
              : 'Belum ada mesin';

          sb.push(`${index + 1}. *${assign.nurseName}*${leaderTag}${dutyTag}`);
          sb.push(`   ↳ Alokasi: ${mSummary}`);
        });
      }
    }

    const dutyMap = new Map<string, { nurseName: string; shiftType: string }[]>();
    assignments.forEach((a) => {
      if (a.specialDuty && (a.shiftType === 'PAGI' || a.shiftType === 'SIANG')) {
        const duties = parseSpecialDuties(a.specialDuty);
        duties.forEach((d) => {
          if (!dutyMap.has(d)) dutyMap.set(d, []);
          dutyMap.get(d)!.push({ nurseName: a.nurseName, shiftType: a.shiftType });
        });
      }
    });
    if (dutyMap.size > 0) {
      sb.push('\n🏷️ *PENANGGUNG JAWAB KHUSUS HARI INI:*');
      dutyMap.forEach((holders, duty) => {
        const holderStr = holders.map((h) => `${h.nurseName} (Sif ${h.shiftType})`).join(', ');
        sb.push(`• *${duty}:* ${holderStr}`);
      });
    }

    const offList = assignments.filter((a) => a.shiftType === 'LIBUR');
    if (offList.length > 0) {
      sb.push('\n🌴 *LIBUR / OFF:*');
      sb.push(offList.map((a) => a.nurseName).join(', '));
      sb.push('');
    }

    sb.push('━━━━━━━━━━━━━━━━━━━━━━');
    sb.push('_Mohon hadir 15 menit sebelum operan sif dimulai. Semangat melayani!_ 💉🩺');

    return sb.join('\n');
  }

  /**
   * Calculates priority rank based on the hospital dialysis room's physical layout order:
   * 1. A01 - A12
   * 2. C01 - C04
   * 3. B01 - B09
   * 4. C05 - C09
   */
  static getRoomMachineRank(target: Machine | string | number): number {
    let str = '';
    if (typeof target === 'object' && target !== null) {
      str = target.code || target.name || String(target.id);
    } else {
      str = String(target ?? '');
    }

    str = str.trim().toUpperCase();

    // Match letter (A, B, or C) and digits (e.g. A01, A1, B-05, C04)
    const match =
      str.match(/\b([ABC])\s*[-_]?\s*0*(\d+)\b/) ||
      str.match(/([ABC])\s*[-_]?\s*0*(\d+)/);

    if (match) {
      const letter = match[1];
      const num = parseInt(match[2], 10);

      if (letter === 'A') {
        if (num >= 1 && num <= 12) {
          return num; // A01..A12 -> Ranks 1 .. 12
        }
        return 100 + num; // Any other A
      } else if (letter === 'C') {
        if (num >= 1 && num <= 4) {
          return 12 + num; // C01..C04 -> Ranks 13 .. 16
        } else if (num >= 5 && num <= 9) {
          return 25 + (num - 4); // C05..C09 -> Ranks 26 .. 30 (after B01..B09 which ends at 25)
        }
        return 300 + num; // Any other C
      } else if (letter === 'B') {
        if (num >= 1 && num <= 9) {
          return 16 + num; // B01..B09 -> Ranks 17 .. 25 (after C01..C04 which ends at 16)
        }
        return 200 + num; // Any other B
      }
    }

    // Fallback for M-01 .. M-25 or other numeric patterns
    const numOnly = parseInt(str.replace(/\D/g, ''), 10);
    if (!isNaN(numOnly)) {
      return 1000 + numOnly;
    }

    return 9999;
  }

  /**
   * Helper to retrieve sorted assigned machines for an assignment,
   * safely resolving machine IDs (numeric or string) or machine codes.
   */
  static getAssignedMachinesForAssignment(
    assign: ShiftAssignment,
    machines: Machine[]
  ): Machine[] {
    const ids = assign.assignedMachineIds || [];
    const list: Machine[] = [];
    ids.forEach((mId) => {
      const found = machines.find(
        (m) =>
          m.id === mId ||
          String(m.id) === String(mId) ||
          (m.code && m.code.toLowerCase() === String(mId).toLowerCase()) ||
          (m.code &&
            m.code.replace(/[^A-Za-z0-9]/g, '').toLowerCase() ===
              String(mId).replace(/[^A-Za-z0-9]/g, '').toLowerCase())
      );
      if (found && !list.some((existing) => existing.id === found.id)) {
        list.push(found);
      }
    });
    return this.getSortedMachines(list);
  }

  /**
   * Helper to sort machines in the hospital room's physical order:
   * 1. A01 - A12
   * 2. C01 - C04
   * 3. B01 - B09
   * 4. C05 - C09
   */
  static getSortedMachines(machines: Machine[]): Machine[] {
    return [...machines].sort((a, b) => {
      const rankA = this.getRoomMachineRank(a);
      const rankB = this.getRoomMachineRank(b);
      if (rankA !== rankB) return rankA - rankB;

      if (a.code && b.code) {
        const cmp = a.code.localeCompare(b.code, undefined, {
          numeric: true,
          sensitivity: 'base',
        });
        if (cmp !== 0) return cmp;
      }
      return a.id - b.id;
    });
  }

  /**
   * Sorts shift assignments based on the physical room layout sequence of their allocated machines:
   * Nurses allocated lower priority machines (A01-A12 -> C01-C04 -> B01-B09 -> C05-C09) appear first.
   * Nurses without machine allocations are placed at the end.
   */
  static sortAssignmentsByMachineOrder(
    assignments: ShiftAssignment[],
    machines: Machine[]
  ): ShiftAssignment[] {
    const sortedAllMachines = this.getSortedMachines(machines);
    const machineRankMap = new Map<string, number>();
    sortedAllMachines.forEach((m, idx) => {
      machineRankMap.set(String(m.id), idx);
      if (m.code) {
        machineRankMap.set(m.code.toLowerCase(), idx);
        machineRankMap.set(m.code.replace(/[^A-Za-z0-9]/g, '').toLowerCase(), idx);
      }
    });

    const getMachineRanks = (assign: ShiftAssignment): number[] => {
      const assignedMachines = this.getAssignedMachinesForAssignment(assign, machines);
      if (assignedMachines.length === 0) return [Number.MAX_SAFE_INTEGER];

      const ranks = assignedMachines.map((m) => this.getRoomMachineRank(m));
      ranks.sort((a, b) => a - b);
      return ranks.length > 0 ? ranks : [Number.MAX_SAFE_INTEGER];
    };

    return [...assignments].sort((a, b) => {
      const ranksA = getMachineRanks(a);
      const ranksB = getMachineRanks(b);
      const len = Math.max(ranksA.length, ranksB.length);
      for (let i = 0; i < len; i++) {
        const rA = ranksA[i] !== undefined ? ranksA[i] : Number.MAX_SAFE_INTEGER;
        const rB = ranksB[i] !== undefined ? ranksB[i] : Number.MAX_SAFE_INTEGER;
        if (rA !== rB) return rA - rB;
      }
      return a.nurseName.localeCompare(b.nurseName);
    });
  }

  /**
   * Helper to format clean room/bay names.
   */
  static cleanBayName(bay: string): string {
    if (!bay) return 'Reguler';
    return bay
      .replace(' (Reguler)', '')
      .replace('Ruang Khusus ', '')
      .replace('Ruang Isolasi Tekanan Negatif', 'Isolasi')
      .replace('Ruang ', '')
      .trim();
  }

  /**
   * Helper to format machine codes summary cleanly (e.g. A01 s/d A03 (3 mesin) or C03 s/d B01 (3 mesin)).
   */
  static formatMachineSummary(machineCodes: string[], allSortedMachines?: Machine[]): string {
    if (!machineCodes || machineCodes.length === 0) return 'Belum ada alokasi mesin';
    if (machineCodes.length === 1) return `${machineCodes[0]} (1 mesin)`;

    // 1. Check if all machines are strictly contiguous in physical layout order
    if (allSortedMachines && allSortedMachines.length > 0) {
      const indices = machineCodes.map((code) =>
        allSortedMachines.findIndex(
          (m) => m.code && m.code.toLowerCase() === code.toLowerCase()
        )
      );
      const allFound = indices.every((idx) => idx !== -1);
      if (allFound) {
        let isLayoutContiguous = true;
        for (let i = 0; i < indices.length - 1; i++) {
          if (indices[i + 1] !== indices[i] + 1) {
            isLayoutContiguous = false;
            break;
          }
        }
        if (isLayoutContiguous) {
          return `${machineCodes[0]} s/d ${machineCodes[machineCodes.length - 1]} (${machineCodes.length} mesin)`;
        }
      }
    }

    // 2. Check if all machines have the same prefix and consecutive numbers
    const firstPrefix = machineCodes[0].replace(/\d+$/, '');
    const allSamePrefix = machineCodes.every((c) => c.replace(/\d+$/, '') === firstPrefix);
    if (allSamePrefix) {
      const nums = machineCodes.map((c) => parseInt(c.replace(/\D/g, ''), 10));
      let isNumContiguous = nums.every((n) => !isNaN(n));
      if (isNumContiguous) {
        for (let i = 0; i < nums.length - 1; i++) {
          if (nums[i + 1] !== nums[i] + 1) {
            isNumContiguous = false;
            break;
          }
        }
        if (isNumContiguous) {
          return `${machineCodes[0]} s/d ${machineCodes[machineCodes.length - 1]} (${machineCodes.length} mesin)`;
        }
      }
    }

    // 3. Fallback: group contiguous sub-ranges
    const groups: string[] = [];
    let currentGroup: string[] = [machineCodes[0]];

    for (let i = 1; i < machineCodes.length; i++) {
      const prev = machineCodes[i - 1];
      const curr = machineCodes[i];
      const prevPrefix = prev.replace(/\d+$/, '');
      const currPrefix = curr.replace(/\d+$/, '');
      const prevNum = parseInt(prev.replace(/\D/g, ''), 10);
      const currNum = parseInt(curr.replace(/\D/g, ''), 10);

      if (prevPrefix === currPrefix && !isNaN(prevNum) && !isNaN(currNum) && currNum === prevNum + 1) {
        currentGroup.push(curr);
      } else {
        if (currentGroup.length === 1) {
          groups.push(currentGroup[0]);
        } else {
          groups.push(`${currentGroup[0]} s/d ${currentGroup[currentGroup.length - 1]}`);
        }
        currentGroup = [curr];
      }
    }

    if (currentGroup.length === 1) {
      groups.push(currentGroup[0]);
    } else {
      groups.push(`${currentGroup[0]} s/d ${currentGroup[currentGroup.length - 1]}`);
    }

    return `${groups.join(', ')} (${machineCodes.length} mesin)`;
  }

  /**
   * Creates daily machine allocation report specifically for Head Nurse (Kepala Ruangan).
   * Default format is 'RINGKAS' (Ringkasan Jadwal & Alokasi Mesin HD).
   */
  static generateHeadNurseDailyAllocationMessage(
    dateStr: string,
    assignments: ShiftAssignment[],
    machines: Machine[],
    hospitalName: string = 'RS Happy Land Medical Centre',
    roomName: string = 'Ruang Dialisis Gedung Timur Lt.3',
    headNurseName: string = 'Kepala Ruang HD',
    formatMode: HeadNurseReportFormat = 'RINGKAS'
  ): string {
    if (formatMode === 'NAMA_PERAWAT') {
      return this.generateHeadNurseNurseOrderReport(
        dateStr,
        assignments,
        machines,
        hospitalName,
        roomName,
        headNurseName
      );
    }
    return this.generateHeadNurseCompactReport(
      dateStr,
      assignments,
      machines,
      hospitalName,
      roomName,
      headNurseName,
      false
    );
  }

  /**
   * Alias untuk kompatibilitas ke format laporan Karu
   */
  static generateHeadNurseMachineOrderReport(
    dateStr: string,
    assignments: ShiftAssignment[],
    machines: Machine[],
    hospitalName: string = 'RS Happy Land Medical Centre',
    roomName: string = 'Ruang Dialisis Gedung Timur Lt.3',
    headNurseName: string = 'Kepala Ruang HD'
  ): string {
    return this.generateHeadNurseCompactReport(
      dateStr,
      assignments,
      machines,
      hospitalName,
      roomName,
      headNurseName,
      false
    );
  }

  /**
   * Format Ringkasan Jadwal & Alokasi Mesin HD untuk Kepala Ruangan (Karu).
   * Format pelaporan terpadu sesuai standar RS Happy Land Medical Centre.
   */
  static generateHeadNurseCompactReport(
    dateStr: string,
    assignments: ShiftAssignment[],
    machines: Machine[],
    hospitalName: string = 'RS Happy Land Medical Centre',
    roomName: string = 'Ruang Dialisis Gedung Timur Lt.3',
    headNurseName: string = 'Kepala Ruang HD',
    sortByName: boolean = false
  ): string {
    const formattedDate = this.formatIndonesianDate(dateStr);
    const sortedAllMachines = this.getSortedMachines(machines);
    const nonActiveMachines = machines.filter((m) => m.status !== 'AKTIF');

    const sb: string[] = [];
    sb.push('📋 *RINGKASAN JADWAL & ALOKASI MESIN HD*');
    sb.push(`🏥 *${hospitalName}* • ${roomName}`);
    sb.push(`📅 *${formattedDate}*`);
    const cleanKaru = (headNurseName || 'Kepala Ruang HD').trim();
    sb.push(`Kepada Yth. *${cleanKaru}*`);
    sb.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // 1. SIF PAGI
    let pagiAssignments = assignments.filter((a) => a.shiftType === 'PAGI');
    if (sortByName) {
      pagiAssignments = [...pagiAssignments].sort((a, b) =>
        a.nurseName.localeCompare(b.nurseName, undefined, { sensitivity: 'base' })
      );
    } else {
      pagiAssignments = this.sortAssignmentsByMachineOrder(pagiAssignments, machines);
    }
    const pagiLeader = pagiAssignments.find((a) => a.isLeader);

    sb.push(`🌅 *SIF PAGI* (${pagiAssignments.length} Staf)`);
    if (pagiAssignments.length === 0) {
      sb.push('   _(Belum ada perawat dinas pagi)_');
    } else {
      pagiAssignments.forEach((assign, idx) => {
        const sortedList = this.getAssignedMachinesForAssignment(assign, machines);
        const codes = sortedList.map((m) => m.code);
        const summary = this.formatMachineSummary(codes, sortedAllMachines);
        sb.push(`${idx + 1}. *${assign.nurseName.toUpperCase()}* : ${summary}`);
      });
    }
    sb.push('');

    // 2. SIF SIANG
    let siangAssignments = assignments.filter((a) => a.shiftType === 'SIANG');
    if (sortByName) {
      siangAssignments = [...siangAssignments].sort((a, b) =>
        a.nurseName.localeCompare(b.nurseName, undefined, { sensitivity: 'base' })
      );
    } else {
      siangAssignments = this.sortAssignmentsByMachineOrder(siangAssignments, machines);
    }
    const siangLeader = siangAssignments.find((a) => a.isLeader);

    sb.push(`🌇 *SIF SIANG* (${siangAssignments.length} Staf)`);
    if (siangAssignments.length === 0) {
      sb.push('   _(Belum ada perawat dinas siang)_');
    } else {
      siangAssignments.forEach((assign, idx) => {
        const sortedList = this.getAssignedMachinesForAssignment(assign, machines);
        const codes = sortedList.map((m) => m.code);
        const summary = this.formatMachineSummary(codes, sortedAllMachines);
        sb.push(`${idx + 1}. *${assign.nurseName.toUpperCase()}* : ${summary}`);
      });
    }
    sb.push('');

    // 3. TUGAS KHUSUS / PIC HARI INI (Terpisah Sif Pagi & Sif Siang)
    sb.push('🏷️ *TUGAS KHUSUS / PIC HARI INI:*');

    // SIF PAGI
    sb.push('*SIF PAGI*');
    const pagiDutyMap = new Map<string, string[]>();
    pagiAssignments.forEach((a) => {
      if (a.specialDuty) {
        const duties = parseSpecialDuties(a.specialDuty);
        duties.forEach((d) => {
          const cleanD = d.trim();
          if (!pagiDutyMap.has(cleanD)) pagiDutyMap.set(cleanD, []);
          pagiDutyMap.get(cleanD)!.push(a.nurseName.toUpperCase());
        });
      }
    });

    let hasPagiSpecial = false;
    if (pagiLeader) {
      sb.push(`• *PJ SIF :* ${pagiLeader.nurseName.toUpperCase()}`);
      hasPagiSpecial = true;
    }
    pagiDutyMap.forEach((holders, duty) => {
      sb.push(`• *${duty.toUpperCase()} :* ${holders.join(' + ')}`);
      hasPagiSpecial = true;
    });
    if (!hasPagiSpecial) {
      sb.push('• _(Tidak ada penugasan khusus)_');
    }
    sb.push('');

    // SIF SIANG
    sb.push('*SIF SIANG*');
    const siangDutyMap = new Map<string, string[]>();
    siangAssignments.forEach((a) => {
      if (a.specialDuty) {
        const duties = parseSpecialDuties(a.specialDuty);
        duties.forEach((d) => {
          const cleanD = d.trim();
          if (!siangDutyMap.has(cleanD)) siangDutyMap.set(cleanD, []);
          siangDutyMap.get(cleanD)!.push(a.nurseName.toUpperCase());
        });
      }
    });

    let hasSiangSpecial = false;
    if (siangLeader) {
      sb.push(`• *PJ SIF :* ${siangLeader.nurseName.toUpperCase()}`);
      hasSiangSpecial = true;
    }
    siangDutyMap.forEach((holders, duty) => {
      sb.push(`• *${duty.toUpperCase()} :* ${holders.join(' + ')}`);
      hasSiangSpecial = true;
    });
    if (!hasSiangSpecial) {
      sb.push('• _(Tidak ada penugasan khusus)_');
    }
    sb.push('');

    // 4. STATUS OFF / CUTI / SAKIT
    const offList = assignments.filter((a) => a.shiftType === 'LIBUR');
    const cutiList = assignments.filter((a) => a.shiftType === 'CUTI');
    const sakitList = assignments.filter((a) => a.shiftType === 'SAKIT');
    const nonDutyParts: string[] = [];
    if (offList.length > 0) {
      nonDutyParts.push(`Libur: ${offList.map((a) => a.nurseName.toUpperCase()).join(', ')}`);
    }
    if (cutiList.length > 0) {
      nonDutyParts.push(`Cuti: ${cutiList.map((a) => a.nurseName.toUpperCase()).join(', ')}`);
    }
    if (sakitList.length > 0) {
      nonDutyParts.push(`Sakit: ${sakitList.map((a) => a.nurseName.toUpperCase()).join(', ')}`);
    }
    if (nonDutyParts.length > 0) {
      sb.push(`🌴 *Off/Cuti :* ${nonDutyParts.join(' | ')}`);
    }

    // 5. MESIN NON-AKTIF
    if (nonActiveMachines.length > 0) {
      const nonActiveStr = nonActiveMachines.map((m) => m.code).join(', ');
      sb.push(`\n⚠️ *Mesin Non-Aktif :* ${nonActiveStr}.`);
    }

    sb.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    sb.push('_HemoShift HD - HD RS HAPPY LAND_');

    return sb.join('\n');
  }

  /**
   * Format Urut Nama Perawat (A-Z) per Sif.
   */
  static generateHeadNurseNurseOrderReport(
    dateStr: string,
    assignments: ShiftAssignment[],
    machines: Machine[],
    hospitalName: string = 'RS Happy Land Medical Centre',
    roomName: string = 'Ruang Dialisis Gedung Timur Lt.3',
    headNurseName: string = 'Kepala Ruang HD'
  ): string {
    return this.generateHeadNurseCompactReport(
      dateStr,
      assignments,
      machines,
      hospitalName,
      roomName,
      headNurseName,
      true
    );
  }

  /**
   * Detects whether the current client is a mobile device (Android, iOS, iPad).
   */
  static isMobileDevice(): boolean {
    if (typeof navigator === 'undefined') return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(
      navigator.userAgent || ''
    );
  }

  /**
   * Generates the native WhatsApp protocol URL or direct API URL.
   * Direct api.whatsapp.com/send avoids HTTP 302 redirection issues (such as emoji UTF-8 corruption on wa.me).
   */
  static getNativeWhatsAppUrl(phoneNumber?: string | null, message: string = ''): string {
    const cleaned = this.cleanPhoneNumberForWhatsApp(phoneNumber);
    const encoded = encodeURIComponent(message);
    if (cleaned) {
      return `https://api.whatsapp.com/send/?phone=${cleaned}&text=${encoded}`;
    }
    return `https://api.whatsapp.com/send/?text=${encoded}`;
  }

  /**
   * Generates a valid web WhatsApp URL (direct api.whatsapp.com or web.whatsapp.com).
   * Uses direct api.whatsapp.com/send instead of wa.me to prevent HTTP 302 header re-encoding bugs
   * that corrupt multibyte emoji characters like 🏥.
   */
  static getWhatsAppUrl(
    phoneNumber?: string | null,
    message: string = '',
    options?: { preferWebWhatsApp?: boolean }
  ): string {
    const cleaned = this.cleanPhoneNumberForWhatsApp(phoneNumber);
    const encoded = encodeURIComponent(message);

    if (options?.preferWebWhatsApp) {
      if (cleaned) {
        return `https://web.whatsapp.com/send?phone=${cleaned}&text=${encoded}`;
      }
      return `https://web.whatsapp.com/send?text=${encoded}`;
    }

    if (cleaned) {
      return `https://api.whatsapp.com/send/?phone=${cleaned}&text=${encoded}`;
    }
    return `https://api.whatsapp.com/send/?text=${encoded}`;
  }

  /**
   * Opens WhatsApp directly with target phone number and prefilled message.
   * On mobile devices (Android / iPhone), automatically triggers direct WhatsApp API URL (api.whatsapp.com/send)
   * which is registered as an Android App Link / iOS Universal Link to open the native WhatsApp application
   * without losing or corrupting multibyte UTF-8 emojis (e.g. 🏥).
   * On desktop, opens WhatsApp Web or API page in a new tab.
   * Also copies text to clipboard as an automatic backup.
   */
  static openWhatsApp(
    phoneNumber: string | undefined | null,
    message: string,
    preferDesktopWeb: boolean = false
  ): boolean {
    // 1. Always copy text to clipboard as safety net
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(message).catch(() => {});
      }
    } catch {
      // ignore clipboard write errors
    }

    const isMobile = this.isMobileDevice();
    const webUrl = this.getWhatsAppUrl(phoneNumber, message, { preferWebWhatsApp: preferDesktopWeb });

    // 2. Mobile Strategy: Launch native WhatsApp app via direct Universal Link
    if (isMobile && !preferDesktopWeb) {
      try {
        // Direct location change triggers native app intent on Android/iOS via Universal / App Links
        window.location.href = webUrl;
        return true;
      } catch {
        window.location.href = webUrl;
        return true;
      }
    }

    // 3. Desktop Strategy: Open web or desktop link in a new tab
    try {
      const win = window.open(webUrl, '_blank', 'noopener,noreferrer');
      if (!win || win.closed || typeof win.closed === 'undefined') {
        // Fallback if browser blocked popup: use link click
        const a = document.createElement('a');
        a.href = webUrl;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          try {
            if (document.body.contains(a)) document.body.removeChild(a);
          } catch {}
        }, 500);
      }
      return true;
    } catch {
      window.location.href = webUrl;
      return true;
    }
  }

  /**
   * Shares message via navigator.share or copies to clipboard.
   */
  static async shareOrCopy(message: string, title: string = 'Jadwal & Alokasi Mesin HD'): Promise<boolean> {
    // Try copying to clipboard first
    try {
      await navigator.clipboard.writeText(message);
    } catch {
      // ignore
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: message,
        });
        return true;
      } catch (err) {
        // Fallback to clipboard which was already executed
        return true;
      }
    }

    return true;
  }
}
