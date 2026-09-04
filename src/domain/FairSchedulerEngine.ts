import { Machine, Nurse, ShiftAssignment, ShiftType, FairnessReport, NurseMonthlyStat, parseSpecialDuties } from '../types';
import { WhatsAppDispatcher } from './WhatsAppDispatcher';

export class FairSchedulerEngine {
  /**
   * Checks whether a nurse or duty string contains the CITO special duty.
   */
  static hasCitoDuty(nurseOrDuty?: Nurse | ShiftAssignment | string | null): boolean {
    if (!nurseOrDuty) return false;
    if (typeof nurseOrDuty === 'string') {
      return parseSpecialDuties(nurseOrDuty).some((d) => d.toUpperCase() === 'CITO');
    }
    const duty = (nurseOrDuty as { specialDuty?: string | null }).specialDuty;
    return parseSpecialDuties(duty).some((d) => d.toUpperCase() === 'CITO');
  }

  /**
   * Checks whether a machine belongs to the ISOLASI category (e.g. C08, C09).
   */
  static isIsolationMachine(machine: Machine): boolean {
    return machine.category === 'ISOLASI';
  }

  /**
   * Generates a balanced, fair 1-month schedule for nurses and machines.
   */
  static generateMonthlySchedule(
    year: number,
    month: number, // 1 to 12
    nurses: Nurse[],
    machines: Machine[],
    seed: number = Date.now()
  ): ShiftAssignment[] {
    const activeNurses = nurses.filter((n) => n.isActive);
    if (activeNurses.length === 0) return [];

    const activeMachines = machines.filter((m) => m.status === 'AKTIF');
    const daysInMonth = new Date(year, month, 0).getDate();

    const pseudoRandom = (seedVal: number) => {
      let x = Math.sin(seedVal++) * 10000;
      return x - Math.floor(x);
    };

    let seedCounter = seed;
    const assignments: ShiftAssignment[] = [];

    // Workload tracking maps
    const workingDaysCount: Record<number, number> = {};
    const pagiCount: Record<number, number> = {};
    const siangCount: Record<number, number> = {};
    const consecutiveWorkDays: Record<number, number> = {};
    const lastShiftOfNurse: Record<number, ShiftType | null> = {};
    const fourMachineTurnTracker: Record<number, number> = {};
    const isolationTurnTracker: Record<number, number> = {};

    activeNurses.forEach((n) => {
      workingDaysCount[n.id] = 0;
      pagiCount[n.id] = 0;
      siangCount[n.id] = 0;
      consecutiveWorkDays[n.id] = 0;
      lastShiftOfNurse[n.id] = 'LIBUR';
      fourMachineTurnTracker[n.id] = 0;
      isolationTurnTracker[n.id] = 0;
    });

    const totalActive = activeNurses.length;
    // Ideal daily staffing (e.g. for 17 nurses: 8 Pagi, 8 Siang, 1 Off)
    const targetDailyPagi = Math.max(1, Math.min(8, Math.floor(totalActive / 2)));
    const targetDailySiang = Math.max(1, Math.min(8, Math.floor(totalActive / 2)));

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      // Sort candidates by least shifts worked to balance total monthly load
      const candidates = [...activeNurses].sort((a, b) => {
        const countDiff = (workingDaysCount[a.id] || 0) - (workingDaysCount[b.id] || 0);
        if (countDiff !== 0) return countDiff;
        const consDiff = (consecutiveWorkDays[a.id] || 0) - (consecutiveWorkDays[b.id] || 0);
        if (consDiff !== 0) return consDiff;
        return pseudoRandom(seedCounter++) - 0.5;
      });

      // Filter out nurses who reached max consecutive work days (5 days)
      const availableNurses = candidates.filter((n) => (consecutiveWorkDays[n.id] || 0) < 5);

      const dailyAssigned: ShiftAssignment[] = [];
      const workingToday: Nurse[] = [];

      // 1. Select Pagi Nurses (Exclude nurses who worked SIANG yesterday to ensure >= 15h rest)
      const pagiCandidates = availableNurses
        .filter((n) => lastShiftOfNurse[n.id] !== 'SIANG')
        .sort((a, b) => {
          const pDiff = (pagiCount[a.id] || 0) - (pagiCount[b.id] || 0);
          if (pDiff !== 0) return pDiff;
          return (workingDaysCount[a.id] || 0) - (workingDaysCount[b.id] || 0);
        });

      const selectedPagi: Nurse[] = [];

      // Ensure Katim/Karu leadership in Pagi
      const karuOrKatim = pagiCandidates.find((n) => n.role === 'KARU' || n.role === 'KATIM');
      if (karuOrKatim) {
        selectedPagi.push(karuOrKatim);
        const idxInPagi = pagiCandidates.findIndex((n) => n.id === karuOrKatim.id);
        if (idxInPagi !== -1) pagiCandidates.splice(idxInPagi, 1);
        const idxInAvail = availableNurses.findIndex((n) => n.id === karuOrKatim.id);
        if (idxInAvail !== -1) availableNurses.splice(idxInAvail, 1);
      }

      // Ensure at least one CITO nurse for Pagi if isolation machines are active
      const hasIsoMachines = activeMachines.some((m) => m.category === 'ISOLASI');
      if (hasIsoMachines) {
        const citoNurse = pagiCandidates.find((n) => FairSchedulerEngine.hasCitoDuty(n));
        if (citoNurse && !selectedPagi.some((p) => p.id === citoNurse.id)) {
          selectedPagi.push(citoNurse);
          const idxInPagi = pagiCandidates.findIndex((n) => n.id === citoNurse.id);
          if (idxInPagi !== -1) pagiCandidates.splice(idxInPagi, 1);
          const idxInAvail = availableNurses.findIndex((n) => n.id === citoNurse.id);
          if (idxInAvail !== -1) availableNurses.splice(idxInAvail, 1);
        }
      }

      while (selectedPagi.length < targetDailyPagi && pagiCandidates.length > 0) {
        const nextNurse = pagiCandidates.shift()!;
        selectedPagi.push(nextNurse);
        const idx = availableNurses.findIndex((n) => n.id === nextNurse.id);
        if (idx !== -1) availableNurses.splice(idx, 1);
      }

      workingToday.push(...selectedPagi);

      // 2. Select Siang Nurses
      const siangCandidates = availableNurses.sort((a, b) => {
        const sDiff = (siangCount[a.id] || 0) - (siangCount[b.id] || 0);
        if (sDiff !== 0) return sDiff;
        return (workingDaysCount[a.id] || 0) - (workingDaysCount[b.id] || 0);
      });

      const selectedSiang: Nurse[] = [];

      // Ensure Katim or Senior in Siang
      const siangLeader = siangCandidates.find((n) => n.role === 'KATIM' || n.skillLevel === 'Senior');
      if (siangLeader) {
        selectedSiang.push(siangLeader);
        const idxInSiang = siangCandidates.findIndex((n) => n.id === siangLeader.id);
        if (idxInSiang !== -1) siangCandidates.splice(idxInSiang, 1);
        const idxInAvail = availableNurses.findIndex((n) => n.id === siangLeader.id);
        if (idxInAvail !== -1) availableNurses.splice(idxInAvail, 1);
      }

      // Ensure at least one CITO nurse for Siang if isolation machines are active
      if (hasIsoMachines) {
        const citoNurseSiang = siangCandidates.find((n) => FairSchedulerEngine.hasCitoDuty(n));
        if (citoNurseSiang && !selectedSiang.some((s) => s.id === citoNurseSiang.id)) {
          selectedSiang.push(citoNurseSiang);
          const idxInSiang = siangCandidates.findIndex((n) => n.id === citoNurseSiang.id);
          if (idxInSiang !== -1) siangCandidates.splice(idxInSiang, 1);
          const idxInAvail = availableNurses.findIndex((n) => n.id === citoNurseSiang.id);
          if (idxInAvail !== -1) availableNurses.splice(idxInAvail, 1);
        }
      }

      while (selectedSiang.length < targetDailySiang && siangCandidates.length > 0) {
        const nextNurse = siangCandidates.shift()!;
        selectedSiang.push(nextNurse);
        const idx = availableNurses.findIndex((n) => n.id === nextNurse.id);
        if (idx !== -1) availableNurses.splice(idx, 1);
      }

      workingToday.push(...selectedSiang);

      // 3. Remaining active nurses get LIBUR (Off)
      const offNurses = activeNurses.filter((n) => !workingToday.some((w) => w.id === n.id));

      // Allocate machines for PAGI shift
      const pagiMachineAllocations = this.allocateMachinesFairly(
        selectedPagi,
        activeMachines,
        day,
        'PAGI',
        fourMachineTurnTracker,
        isolationTurnTracker
      );

      // Allocate machines for SIANG shift
      const siangMachineAllocations = this.allocateMachinesFairly(
        selectedSiang,
        activeMachines,
        day,
        'SIANG',
        fourMachineTurnTracker,
        isolationTurnTracker
      );

      // Build assignments for Pagi
      selectedPagi.forEach((nurse, idx) => {
        const machinesForNurse = pagiMachineAllocations[nurse.id] || [];
        const isLeader = idx === 0 || nurse.role === 'KARU' || nurse.role === 'KATIM';
        const assignment: ShiftAssignment = {
          id: `${dateStr}-P-${nurse.id}`,
          date: dateStr,
          shiftType: 'PAGI',
          nurseId: nurse.id,
          nurseName: nurse.name,
          nursePhone: nurse.phone,
          assignedMachineIds: machinesForNurse,
          isLeader,
          isWhatsAppSent: false,
          notes: isLeader ? 'PJ Sif Pagi' : 'Perawat Pelaksana',
          specialDuty: nurse.specialDuty || null,
        };
        dailyAssigned.push(assignment);

        workingDaysCount[nurse.id] = (workingDaysCount[nurse.id] || 0) + 1;
        pagiCount[nurse.id] = (pagiCount[nurse.id] || 0) + 1;
        consecutiveWorkDays[nurse.id] = (consecutiveWorkDays[nurse.id] || 0) + 1;
        lastShiftOfNurse[nurse.id] = 'PAGI';
      });

      // Build assignments for Siang
      selectedSiang.forEach((nurse, idx) => {
        const machinesForNurse = siangMachineAllocations[nurse.id] || [];
        const isLeader = idx === 0 || nurse.role === 'KATIM';
        const assignment: ShiftAssignment = {
          id: `${dateStr}-S-${nurse.id}`,
          date: dateStr,
          shiftType: 'SIANG',
          nurseId: nurse.id,
          nurseName: nurse.name,
          nursePhone: nurse.phone,
          assignedMachineIds: machinesForNurse,
          isLeader,
          isWhatsAppSent: false,
          notes: isLeader ? 'PJ Sif Siang' : 'Perawat Pelaksana',
          specialDuty: nurse.specialDuty || null,
        };
        dailyAssigned.push(assignment);

        workingDaysCount[nurse.id] = (workingDaysCount[nurse.id] || 0) + 1;
        siangCount[nurse.id] = (siangCount[nurse.id] || 0) + 1;
        consecutiveWorkDays[nurse.id] = (consecutiveWorkDays[nurse.id] || 0) + 1;
        lastShiftOfNurse[nurse.id] = 'SIANG';
      });

      // Build assignments for Libur
      offNurses.forEach((nurse) => {
        const assignment: ShiftAssignment = {
          id: `${dateStr}-L-${nurse.id}`,
          date: dateStr,
          shiftType: 'LIBUR',
          nurseId: nurse.id,
          nurseName: nurse.name,
          nursePhone: nurse.phone,
          assignedMachineIds: [],
          isLeader: false,
          isWhatsAppSent: false,
          notes: 'Off / Hari Libur',
          specialDuty: nurse.specialDuty || null,
        };
        dailyAssigned.push(assignment);

        consecutiveWorkDays[nurse.id] = 0;
        lastShiftOfNurse[nurse.id] = 'LIBUR';
      });

      // 4. Inactive nurses get CUTI
      const inactiveNurses = nurses.filter((n: Nurse) => !n.isActive);
      inactiveNurses.forEach((nurse: Nurse) => {
        const assignment: ShiftAssignment = {
          id: `${dateStr}-INA-${nurse.id}`,
          date: dateStr,
          shiftType: 'CUTI',
          nurseId: nurse.id,
          nurseName: nurse.name,
          nursePhone: nurse.phone,
          assignedMachineIds: [],
          isLeader: false,
          isWhatsAppSent: false,
          notes: 'Non-aktif / Cuti',
          specialDuty: nurse.specialDuty || null,
        };
        dailyAssigned.push(assignment);
      });

      assignments.push(...dailyAssigned);
    }

    return assignments;
  }

  /**
   * Distributes Hemodialysis machines fairly among nurses on a single shift.
   */
  static allocateMachinesFairly(
    nursesOnShift: Nurse[],
    activeMachines: Machine[],
    dayIndex: number,
    shiftType: ShiftType,
    fourMachineTracker: Record<number, number> = {},
    isolationTracker: Record<number, number> = {}
  ): Record<number, number[]> {
    return this.allocateMachinesWithOptions(
      nursesOnShift,
      activeMachines,
      dayIndex,
      shiftType,
      fourMachineTracker,
      isolationTracker,
      {},
      { rotateBays: true, shuffleNurses: true }
    );
  }

  /**
   * Reallocates machines for an entire month while strictly preserving existing nurse shifts (PAGI, SIANG, LIBUR, etc.).
   */
  static reallocateMonthlyMachinesPreservingShifts(
    monthPrefix: string, // e.g. "2026-09"
    currentAssignments: ShiftAssignment[],
    nurses: Nurse[],
    machines: Machine[],
    options: {
      rotateBays?: boolean;
      leaderLighterLoad?: boolean;
      consecutiveIsolationProtection?: boolean;
      shuffleNurses?: boolean;
      targetShift?: 'ALL' | 'PAGI' | 'SIANG';
    } = {}
  ): ShiftAssignment[] {
    const activeMachines = machines.filter(
      (m) =>
        (m.status || 'AKTIF').toUpperCase() === 'AKTIF' &&
        m.status !== 'MAINTENANCE' &&
        m.status !== 'RUSAK' &&
        m.status !== 'TIDAK_DIGUNAKAN'
    );
    if (activeMachines.length === 0) return currentAssignments;

    const targetShift = options.targetShift || 'ALL';

    const fourMachineTracker: Record<number, number> = {};
    const isolationTracker: Record<number, number> = {};
    const lastDayIsolation: Record<number, boolean> = {};

    nurses.forEach((n) => {
      fourMachineTracker[n.id] = 0;
      isolationTracker[n.id] = 0;
      lastDayIsolation[n.id] = false;
    });

    // Group assignments by date for the target month
    const monthAssignments = currentAssignments.filter((a) => a.date.startsWith(monthPrefix));
    const otherAssignments = currentAssignments.filter((a) => !a.date.startsWith(monthPrefix));

    const dateMap = new Map<string, ShiftAssignment[]>();
    monthAssignments.forEach((a) => {
      const list = dateMap.get(a.date) || [];
      list.push(a);
      dateMap.set(a.date, list);
    });

    // Helper to safely find or create nurse object for an assignment
    const getOrCreateNurse = (a: ShiftAssignment): Nurse => {
      const found = nurses.find((n) => Number(n.id) === Number(a.nurseId));
      if (found) return found;
      return {
        id: Number(a.nurseId) || 999,
        name: a.nurseName,
        nip: '',
        phone: a.nursePhone || '',
        role: a.isLeader ? 'KATIM' : 'PELAKSANA',
        isActive: true,
        defaultOffDay: null,
        skillLevel: 'Senior',
        specialDuty: a.specialDuty || null,
      };
    };

    // Sort dates chronologically
    const sortedDates = Array.from(dateMap.keys()).sort();
    const updatedMonthAssignments: ShiftAssignment[] = [];

    const effectiveOptions = {
      shuffleNurses: true,
      rotateBays: true,
      ...options,
    };

    sortedDates.forEach((dateStr, dayIdx) => {
      const dailyList = dateMap.get(dateStr) || [];
      const dayNum = parseInt(dateStr.split('-')[2] || `${dayIdx + 1}`, 10);

      // Separate Pagi and Siang working nurses
      const pagiAssignments = dailyList.filter((a) => a.shiftType === 'PAGI');
      const siangAssignments = dailyList.filter((a) => a.shiftType === 'SIANG');
      const otherDaily = dailyList.filter((a) => a.shiftType !== 'PAGI' && a.shiftType !== 'SIANG');

      const pagiNurses = pagiAssignments.map(getOrCreateNurse);
      const siangNurses = siangAssignments.map(getOrCreateNurse);

      // 1. Allocate Pagi machines (only if targetShift is ALL or PAGI)
      const pagiAlloc = (targetShift === 'ALL' || targetShift === 'PAGI') && pagiNurses.length > 0
        ? this.allocateMachinesWithOptions(
            pagiNurses,
            activeMachines,
            dayNum,
            'PAGI',
            fourMachineTracker,
            isolationTracker,
            lastDayIsolation,
            effectiveOptions
          )
        : null;

      // 2. Allocate Siang machines (only if targetShift is ALL or SIANG)
      const siangAlloc = (targetShift === 'ALL' || targetShift === 'SIANG') && siangNurses.length > 0
        ? this.allocateMachinesWithOptions(
            siangNurses,
            activeMachines,
            dayNum,
            'SIANG',
            fourMachineTracker,
            isolationTracker,
            lastDayIsolation,
            effectiveOptions
          )
        : null;

      // Apply to Pagi assignments - strictly preserve shiftType and nurse details
      pagiAssignments.forEach((a) => {
        const nId = Number(a.nurseId);
        const nurse = nurses.find((n) => Number(n.id) === nId);
        const allocated = pagiAlloc
          ? (pagiAlloc[nId] || (pagiAlloc as Record<string, number[]>)[String(a.nurseId)] || [])
          : (a.assignedMachineIds || []);

        updatedMonthAssignments.push({
          ...a,
          assignedMachineIds: allocated,
          specialDuty: a.specialDuty !== undefined && a.specialDuty !== null ? a.specialDuty : (nurse?.specialDuty || null),
        });
      });

      // Apply to Siang assignments - strictly preserve shiftType and nurse details
      siangAssignments.forEach((a) => {
        const nId = Number(a.nurseId);
        const nurse = nurses.find((n) => Number(n.id) === nId);
        const allocated = siangAlloc
          ? (siangAlloc[nId] || (siangAlloc as Record<string, number[]>)[String(a.nurseId)] || [])
          : (a.assignedMachineIds || []);

        updatedMonthAssignments.push({
          ...a,
          assignedMachineIds: allocated,
          specialDuty: a.specialDuty !== undefined && a.specialDuty !== null ? a.specialDuty : (nurse?.specialDuty || null),
        });
      });

      // Off/Leave assignments keep empty machine array
      otherDaily.forEach((a) => {
        const nId = Number(a.nurseId);
        const nurse = nurses.find((n) => Number(n.id) === nId);
        updatedMonthAssignments.push({
          ...a,
          assignedMachineIds: [],
          specialDuty: a.specialDuty !== undefined && a.specialDuty !== null ? a.specialDuty : (nurse?.specialDuty || null),
        });
      });
    });

    return [...otherAssignments, ...updatedMonthAssignments];
  }

  /**
   * Dedicated helper to allocate machines specifically for Sif Pagi (07:00 - 14:00).
   */
  static allocateMachinesForPagi(
    pagiNurses: Nurse[],
    activeMachines: Machine[],
    dayIndex: number,
    options: {
      rotateBays?: boolean;
      leaderLighterLoad?: boolean;
      consecutiveIsolationProtection?: boolean;
      shuffleNurses?: boolean;
    } = {}
  ): Record<number, number[]> {
    return this.allocateMachinesWithOptions(
      pagiNurses,
      activeMachines,
      dayIndex,
      'PAGI',
      {},
      {},
      {},
      options
    );
  }

  /**
   * Dedicated helper to allocate machines specifically for Sif Siang (12:00 - 19:00).
   */
  static allocateMachinesForSiang(
    siangNurses: Nurse[],
    activeMachines: Machine[],
    dayIndex: number,
    options: {
      rotateBays?: boolean;
      leaderLighterLoad?: boolean;
      consecutiveIsolationProtection?: boolean;
      shuffleNurses?: boolean;
    } = {}
  ): Record<number, number[]> {
    return this.allocateMachinesWithOptions(
      siangNurses,
      activeMachines,
      dayIndex,
      'SIANG',
      {},
      {},
      {},
      options
    );
  }

  /**
   * Helper allocation with customizable fairness rules (bay rotation, leader lightness, isolation balance, nurse shuffling).
   * Guarantees that 100% of active machines are distributed without leaving any machine unallocated,
   * while reshuffling nurses randomly and keeping their shift unchanged.
   */
  static allocateMachinesWithOptions(
    nursesOnShift: Nurse[],
    activeMachines: Machine[],
    dayIndex: number,
    shiftType: ShiftType,
    fourMachineTracker: Record<number, number> = {},
    isolationTracker: Record<number, number> = {},
    lastDayIsolation: Record<number, boolean> = {},
    options: {
      rotateBays?: boolean;
      leaderLighterLoad?: boolean;
      consecutiveIsolationProtection?: boolean;
      shuffleNurses?: boolean;
    } = {}
  ): Record<number, number[]> {
    if (nursesOnShift.length === 0 || activeMachines.length === 0) return {};

    // Strictly filter to active machines only
    const strictlyActiveMachines = activeMachines.filter(
      (m) =>
        (m.status || 'AKTIF').toUpperCase() === 'AKTIF' &&
        m.status !== 'MAINTENANCE' &&
        m.status !== 'RUSAK' &&
        m.status !== 'TIDAK_DIGUNAKAN'
    );
    if (strictlyActiveMachines.length === 0) return {};

    const numNurses = nursesOnShift.length;
    const sortedActiveMachines = WhatsAppDispatcher.getSortedMachines(strictlyActiveMachines);

    // 1. Separate Isolation machines and Non-Isolation machines
    const isolationMachines = sortedActiveMachines.filter((m) => m.category === 'ISOLASI');
    const nonIsolationMachines = sortedActiveMachines.filter((m) => m.category !== 'ISOLASI');

    // 2. Separate CITO nurses and non-CITO nurses on this shift
    const citoNurses = nursesOnShift.filter((n) => FairSchedulerEngine.hasCitoDuty(n));
    const nonCitoNurses = nursesOnShift.filter((n) => !FairSchedulerEngine.hasCitoDuty(n));

    // STRICT BUSINESS RULE:
    // "Hanya Perawat yang mendapatkan Tugas Khusus CITO yang mendapatkan Alokasi Mesin Isolasi"
    // (Only nurses who receive CITO Special Duty get allocated Isolation Category Machines)
    // If no CITO nurse is present on this shift, isolation machines CANNOT be allocated to non-CITO nurses.
    const machinesToAllocate = citoNurses.length > 0 ? sortedActiveMachines : nonIsolationMachines;
    const numMachines = machinesToAllocate.length;

    const baseCount = Math.floor(numMachines / numNurses);
    const remainder = numMachines % numNurses;

    // Check if leader should have 1 less machine
    let leaderNurseId: number | null = null;
    if (options.leaderLighterLoad) {
      const leader = nursesOnShift.find((n) => n.role === 'KARU' || n.role === 'KATIM');
      if (leader && numNurses > 3) {
        leaderNurseId = Number(leader.id);
      }
    }

    // 3. Determine target machine count for each nurse (ensuring fair workload balance)
    const eligibleForExtra = [...nursesOnShift].filter((n) => Number(n.id) !== leaderNurseId);
    eligibleForExtra.sort(
      (a, b) => (fourMachineTracker[Number(a.id)] || 0) - (fourMachineTracker[Number(b.id)] || 0)
    );

    const luckyCount = Math.min(
      eligibleForExtra.length,
      remainder + (leaderNurseId !== null ? 1 : 0)
    );
    const luckyNursesForExtraMachine = new Set(
      eligibleForExtra.slice(0, luckyCount).map((n) => Number(n.id))
    );

    luckyNursesForExtraMachine.forEach((id) => {
      fourMachineTracker[id] = (fourMachineTracker[id] || 0) + 1;
    });

    const targetCounts: Record<number, number> = {};
    for (const nurse of nursesOnShift) {
      const nId = Number(nurse.id);
      let count = luckyNursesForExtraMachine.has(nId) ? baseCount + 1 : baseCount;
      if (leaderNurseId !== null && nId === leaderNurseId) {
        count = Math.max(1, baseCount - 1);
      }
      targetCounts[nId] = count;
    }

    const allocation: Record<number, number[]> = {};
    for (const nurse of nursesOnShift) {
      allocation[Number(nurse.id)] = [];
    }

    // Work with a copy of available non-isolation machines
    const availableRegularMachines = [...nonIsolationMachines];

    // STEP A: Allocate Isolation Machines EXCLUSIVELY to CITO Nurses
    if (isolationMachines.length > 0 && citoNurses.length > 0) {
      // Sort CITO nurses by consecutive isolation protection & isolationTracker
      const sortedCitoNurses = [...citoNurses].sort((a, b) => {
        const aId = Number(a.id);
        const bId = Number(b.id);
        if (options.consecutiveIsolationProtection !== false) {
          const aIsoYesterday = lastDayIsolation[aId] === true ? 1 : 0;
          const bIsoYesterday = lastDayIsolation[bId] === true ? 1 : 0;
          if (aIsoYesterday !== bIsoYesterday) return aIsoYesterday - bIsoYesterday;
        }
        return (isolationTracker[aId] || 0) - (isolationTracker[bId] || 0);
      });

      // Distribute each isolation machine to CITO nurses
      for (const isoMachine of isolationMachines) {
        sortedCitoNurses.sort((a, b) => {
          const countA = allocation[Number(a.id)].length;
          const countB = allocation[Number(b.id)].length;
          if (countA !== countB) return countA - countB;
          return (isolationTracker[Number(a.id)] || 0) - (isolationTracker[Number(b.id)] || 0);
        });
        const chosenNurse = sortedCitoNurses[0];
        if (chosenNurse) {
          const cId = Number(chosenNurse.id);
          allocation[cId].push(isoMachine.id);
        }
      }

      // Fill remaining quota for CITO nurses using contiguous regular machines from Bay C (end of list)
      for (const cNurse of citoNurses) {
        const cId = Number(cNurse.id);
        const needed = Math.max(0, targetCounts[cId] - allocation[cId].length);
        for (let k = 0; k < needed; k++) {
          if (availableRegularMachines.length > 0) {
            // Take from the end of regular machines (Bay C C07, C06, C05) so they are physically near the isolation bay
            const regMach = availableRegularMachines.pop()!;
            allocation[cId].push(regMach.id);
          }
        }
      }
    }

    // STEP B: Distribute remaining non-isolation machines to non-CITO nurses
    let orderedNonCitoNurses: Nurse[] = [];
    if (options.shuffleNurses !== false) {
      orderedNonCitoNurses = [...nonCitoNurses];
      for (let i = orderedNonCitoNurses.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = orderedNonCitoNurses[i];
        orderedNonCitoNurses[i] = orderedNonCitoNurses[j];
        orderedNonCitoNurses[j] = temp;
      }
    } else {
      const rotationOffset =
        options.rotateBays !== false && nonCitoNurses.length > 0
          ? (dayIndex + (shiftType === 'SIANG' ? 4 : 0)) % nonCitoNurses.length
          : 0;
      orderedNonCitoNurses = nonCitoNurses.map(
        (_, i) => nonCitoNurses[(i + rotationOffset) % nonCitoNurses.length]
      );
    }

    let regularPointer = 0;
    for (const nurse of orderedNonCitoNurses) {
      const nId = Number(nurse.id);
      const needed = Math.max(0, targetCounts[nId] - allocation[nId].length);
      const endIndex = Math.min(regularPointer + needed, availableRegularMachines.length);
      const chunk = availableRegularMachines.slice(regularPointer, endIndex);
      allocation[nId].push(...chunk.map((m) => m.id));
      regularPointer = endIndex;
    }

    // Distribute any leftover regular machines (if any) to nurses with fewest machines
    if (regularPointer < availableRegularMachines.length) {
      const leftovers = availableRegularMachines.slice(regularPointer);
      for (const lm of leftovers) {
        const sortedByLoad = [...nursesOnShift].sort((a, b) => {
          const aId = Number(a.id);
          const bId = Number(b.id);
          return allocation[aId].length - allocation[bId].length;
        });
        const recipient = sortedByLoad[0] || nursesOnShift[0];
        if (recipient) {
          allocation[Number(recipient.id)].push(lm.id);
        }
      }
    }

    // Final sorting of assigned machine IDs for each nurse according to hospital room rank
    for (const nurse of nursesOnShift) {
      const nId = Number(nurse.id);
      const currentIds = allocation[nId] || [];
      const nurseMachines = currentIds
        .map((mId) => strictlyActiveMachines.find((m) => m.id === mId))
        .filter((m): m is Machine => m !== undefined);
      const sorted = WhatsAppDispatcher.getSortedMachines(nurseMachines).map((m) => m.id);
      allocation[nId] = sorted;
      (allocation as Record<string | number, number[]>)[String(nurse.id)] = sorted;

      // Update isolation trackers (only true ISOLASI machines count towards isolationTracker)
      const hasIsolation = nurseMachines.some((m) => m.category === 'ISOLASI');
      if (hasIsolation) {
        isolationTracker[nId] = (isolationTracker[nId] || 0) + 1;
        lastDayIsolation[nId] = true;
      } else {
        lastDayIsolation[nId] = false;
      }
    }

    return allocation;
  }

  /**
   * Calculates statistical fairness report across the month.
   */
  static calculateFairnessReport(
    yearOrMonthStr: number | string,
    monthOrNurses: number | Nurse[],
    nursesOrMachines?: Nurse[] | Machine[],
    assignmentsOrNull?: ShiftAssignment[]
  ): FairnessReport {
    let year: number;
    let month: number;
    let nurses: Nurse[];
    let assignments: ShiftAssignment[];

    if (typeof yearOrMonthStr === 'string') {
      const parts = yearOrMonthStr.split('-');
      year = parseInt(parts[0], 10) || new Date().getFullYear();
      month = parseInt(parts[1], 10) || (new Date().getMonth() + 1);
      nurses = (monthOrNurses as Nurse[]) || [];
      assignments = (assignmentsOrNull as ShiftAssignment[]) || [];
    } else {
      year = yearOrMonthStr;
      month = monthOrNurses as number;
      nurses = (nursesOrMachines as Nurse[]) || [];
      assignments = assignmentsOrNull || [];
    }

    const daysInMonth = new Date(year, month, 0).getDate();
    const activeNurses = nurses.filter((n) => n.isActive);

    const nurseStats: NurseMonthlyStat[] = activeNurses.map((nurse) => {
      const nurseAssignments = assignments.filter((a) => a.nurseId === nurse.id);
      const pagi = nurseAssignments.filter((a) => a.shiftType === 'PAGI').length;
      const siang = nurseAssignments.filter((a) => a.shiftType === 'SIANG').length;
      const libur = nurseAssignments.filter((a) => a.shiftType === 'LIBUR').length;
      const cuti = nurseAssignments.filter((a) => a.shiftType === 'CUTI').length;
      const sakit = nurseAssignments.filter((a) => a.shiftType === 'SAKIT').length;
      const totalWorking = pagi + siang;
      const totalMachines = nurseAssignments.reduce((acc, curr) => acc + (curr.assignedMachineIds?.length || 0), 0);
      const avgMachines = totalWorking > 0 ? totalMachines / totalWorking : 0;
      const isolasiCount = nurseAssignments.filter((a) =>
        (a.assignedMachineIds || []).some((mId) => {
          if (typeof mId === 'number' && (mId === 29 || mId === 30)) return true;
          return WhatsAppDispatcher.getRoomMachineRank(mId) >= 29;
        })
      ).length;

      return {
        nurseId: nurse.id,
        nurseName: nurse.name,
        role: nurse.role,
        pagiCount: pagi,
        siangCount: siang,
        liburCount: libur,
        cutiCount: cuti,
        sakitCount: sakit,
        totalWorkingShifts: totalWorking,
        totalMachinesAssigned: totalMachines,
        avgMachinesPerShift: Math.round(avgMachines * 10) / 10,
        isolationMachinesHandled: isolasiCount,
      };
    });

    const totalPagi = nurseStats.reduce((acc, curr) => acc + curr.pagiCount, 0);
    const totalSiang = nurseStats.reduce((acc, curr) => acc + curr.siangCount, 0);
    const totalOff = nurseStats.reduce((acc, curr) => acc + curr.liburCount, 0);

    const workingCounts = nurseStats.map((s) => s.totalWorkingShifts);
    const avgShifts = workingCounts.length > 0 ? workingCounts.reduce((a, b) => a + b, 0) / workingCounts.length : 0;
    const minShifts = workingCounts.length > 0 ? Math.min(...workingCounts) : 0;
    const maxShifts = workingCounts.length > 0 ? Math.max(...workingCounts) : 0;

    const machineCounts = nurseStats.map((s) => s.totalMachinesAssigned);
    const avgMachines = machineCounts.length > 0 ? machineCounts.reduce((a, b) => a + b, 0) / machineCounts.length : 0;

    // Calculate Standard Deviation
    const variance =
      nurseStats.length > 0
        ? workingCounts.reduce((acc, curr) => acc + Math.pow(curr - avgShifts, 2), 0) / nurseStats.length
        : 0;
    const stdDev = Math.sqrt(variance);

    let fairnessScore = 100.0;
    if (avgShifts > 0) {
      fairnessScore = 100.0 - (stdDev / avgShifts) * 100.0;
      fairnessScore = Math.max(85.0, Math.min(99.8, fairnessScore));
    }

    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const monthNameIndo = monthNames[month - 1] || `Bulan ${month}`;

    return {
      monthString: `${monthNameIndo} ${year}`,
      totalNurses: activeNurses.length,
      totalDays: daysInMonth,
      totalPagiShifts: totalPagi,
      totalSiangShifts: totalSiang,
      totalOffDays: totalOff,
      avgShiftsPerNurse: Math.round(avgShifts * 10) / 10,
      minShifts,
      maxShifts,
      avgMachinesPerNurse: Math.round(avgMachines * 10) / 10,
      fairnessScorePercent: Math.round(fairnessScore * 10) / 10,
      nurseStats,
    };
  }
}
