import { describe, expect, it } from 'vitest';
import type { MachineRepairListItem } from './types';
import {
  calculateWorkload,
  getActiveRepairsForRepairer,
  getDaysSinceCreation,
  getUnassignedRepairs,
  getWorkloadByRepairer,
  getWorkloadColor,
  groupByState,
  isDelayed,
  needsAttention,
  sortByPriority,
} from './repairer-work';

function repair(overrides: Partial<MachineRepairListItem>): MachineRepairListItem {
  return {
    id: 1,
    first_name: 'Jean',
    last_name: 'Dupont',
    phone: '+32470000000',
    machine_type_name: 'Robot tondeuse',
    robot_type_name: null,
    repair_or_maintenance: 'Réparation',
    robot_code: 'RC1',
    fault_description: '',
    start_timer: null,
    working_time_in_sec: 0,
    state: null,
    createdAt: new Date().toISOString(),
    brand_name: 'Husqvarna',
    repairer_name: null,
    remark: null,
    client_call_times: [],
    hivernage: false,
    eventId: null,
    calendarId: null,
    ...overrides,
  } as MachineRepairListItem;
}

describe('getActiveRepairsForRepairer', () => {
  it('ne garde que les réparations du réparateur, hors états terminés', () => {
    const repairs = [
      repair({ id: 1, repairer_name: 'Julien', state: 'En cours' }),
      repair({ id: 2, repairer_name: 'Julien', state: 'Terminé' }),
      repair({ id: 3, repairer_name: 'Mirko', state: 'En cours' }),
      repair({ id: 4, repairer_name: 'Julien', state: null }),
    ];
    const result = getActiveRepairsForRepairer(repairs, 'Julien');
    expect(result.map((r) => r.id)).toEqual([1, 4]);
  });
});

describe('getUnassignedRepairs', () => {
  it('ne garde que les réparations sans réparateur et non terminées', () => {
    const repairs = [
      repair({ id: 1, repairer_name: null, state: 'Non commencé' }),
      repair({ id: 2, repairer_name: null, state: 'Facturé' }),
      repair({ id: 3, repairer_name: 'Jowel', state: null }),
    ];
    expect(getUnassignedRepairs(repairs).map((r) => r.id)).toEqual([1]);
  });
});

describe('calculateWorkload', () => {
  it('compte les non commencées, en cours, en attente et le temps total', () => {
    const repairs = [
      repair({ state: 'Non commencé', working_time_in_sec: 3600 }),
      repair({ state: 'En cours', working_time_in_sec: 1800 }),
      repair({ state: 'En attente de pièces' }),
      repair({ state: 'Devis en attente' }),
      repair({ state: 'À rappeler' }),
    ];
    expect(calculateWorkload(repairs)).toEqual({
      notStarted: 1,
      inProgress: 1,
      waiting: 3,
      totalHours: 1.5,
    });
  });
});

describe('getWorkloadByRepairer', () => {
  it('agrège la charge de travail par réparateur', () => {
    const repairs = [
      repair({ id: 1, repairer_name: 'Julien', state: 'En cours' }),
      repair({ id: 2, repairer_name: 'Julien', state: 'Non commencé' }),
      repair({ id: 3, repairer_name: 'Mirko', state: 'Terminé' }),
    ];
    const workloads = getWorkloadByRepairer(repairs, ['Julien', 'Mirko']);
    expect(workloads).toEqual([
      expect.objectContaining({ repairerName: 'Julien', totalRepairs: 2 }),
      expect.objectContaining({ repairerName: 'Mirko', totalRepairs: 0 }),
    ]);
  });
});

describe('sortByPriority', () => {
  it("place En cours avant Non commencé, avant En attente/Devis, avant le reste", () => {
    const repairs = [
      repair({ id: 1, state: 'Récupéré', createdAt: '2026-01-01' }),
      repair({ id: 2, state: 'En attente de pièces', createdAt: '2026-01-01' }),
      repair({ id: 3, state: 'En cours', createdAt: '2026-01-01' }),
      repair({ id: 4, state: 'Non commencé', createdAt: '2026-01-01' }),
    ];
    const sorted = sortByPriority(repairs);
    expect(sorted.map((r) => r.id)).toEqual([3, 4, 2, 1]);
  });

  it('trie ensuite par ancienneté (le plus ancien en premier) à priorité égale', () => {
    const repairs = [
      repair({ id: 1, state: 'En cours', createdAt: '2026-03-01' }),
      repair({ id: 2, state: 'En cours', createdAt: '2026-01-01' }),
      repair({ id: 3, state: 'En cours', createdAt: '2026-02-01' }),
    ];
    const sorted = sortByPriority(repairs);
    expect(sorted.map((r) => r.id)).toEqual([2, 3, 1]);
  });

  it('ne mute pas le tableau reçu', () => {
    const repairs = [
      repair({ id: 1, state: 'Récupéré', createdAt: '2026-01-01' }),
      repair({ id: 2, state: 'En cours', createdAt: '2026-01-01' }),
    ];
    const original = [...repairs];
    sortByPriority(repairs);
    expect(repairs).toEqual(original);
  });
});

describe('groupByState', () => {
  it("regroupe par état, avec « Non commencé » pour un état vide", () => {
    const repairs = [
      repair({ id: 1, state: 'En cours' }),
      repair({ id: 2, state: null }),
      repair({ id: 3, state: 'En cours' }),
    ];
    const grouped = groupByState(repairs);
    expect(Object.keys(grouped).sort()).toEqual(['En cours', 'Non commencé']);
    expect(grouped['En cours'].map((r) => r.id)).toEqual([1, 3]);
    expect(grouped['Non commencé'].map((r) => r.id)).toEqual([2]);
  });
});

describe('getWorkloadColor', () => {
  it.each([
    [0, 'info'],
    [1, 'success'],
    [3, 'success'],
    [4, 'warning'],
    [6, 'warning'],
    [7, 'error'],
  ] as const)('%i réparation(s) -> %s', (count, expected) => {
    expect(getWorkloadColor(count)).toBe(expected);
  });
});

describe('getDaysSinceCreation / isDelayed / needsAttention', () => {
  const daysAgo = (n: number) =>
    new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();

  it('calcule le nombre de jours écoulés', () => {
    expect(getDaysSinceCreation(daysAgo(5))).toBe(5);
  });

  it('est en retard seulement si non commencée depuis plus de 7 jours', () => {
    expect(isDelayed(repair({ state: null, createdAt: daysAgo(8) }))).toBe(
      true,
    );
    expect(isDelayed(repair({ state: null, createdAt: daysAgo(3) }))).toBe(
      false,
    );
    expect(
      isDelayed(repair({ state: 'En cours', createdAt: daysAgo(10) })),
    ).toBe(false);
  });

  it("nécessite une attention après 3 jours si l'état n'est pas En cours", () => {
    expect(
      needsAttention(repair({ state: 'Non commencé', createdAt: daysAgo(4) })),
    ).toBe(true);
    expect(
      needsAttention(repair({ state: 'En cours', createdAt: daysAgo(10) })),
    ).toBe(false);
  });
});
