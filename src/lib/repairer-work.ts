import type { MachineRepairListItem } from './types';

/**
 * Port de `utils/repairerWorkUtils.ts` (CRA) : logique pure de regroupement,
 * tri et charge de travail utilisée par la vue ouvrier. Aucune dépendance à
 * React ni à l'API : testable directement.
 */

/** États considérés comme « terminés » : les machines ne doivent plus apparaître dans la vue ouvrier. */
export const COMPLETED_STATES = [
  'Terminé',
  'Annulé',
  'Livré',
  'Facturé',
  'Clôturé',
];

export interface RepairerWorkload {
  repairerName: string;
  totalRepairs: number;
  notStarted: number;
  inProgress: number;
  waiting: number;
  totalHours: number;
  repairs: MachineRepairListItem[];
}

/** Réparations actives (état non terminé) d'un réparateur donné. */
export const getActiveRepairsForRepairer = (
  repairs: MachineRepairListItem[],
  repairerName: string,
): MachineRepairListItem[] =>
  repairs.filter(
    (repair) =>
      repair.repairer_name === repairerName &&
      (!repair.state || !COMPLETED_STATES.includes(repair.state)),
  );

/** Réparations actives sans réparateur assigné. */
export const getUnassignedRepairs = (
  repairs: MachineRepairListItem[],
): MachineRepairListItem[] =>
  repairs.filter(
    (repair) =>
      !repair.repairer_name &&
      (!repair.state || !COMPLETED_STATES.includes(repair.state)),
  );

/** Statistiques de charge (non commencées, en cours, en attente, heures) pour un lot de réparations. */
export const calculateWorkload = (
  repairs: MachineRepairListItem[],
): {
  notStarted: number;
  inProgress: number;
  waiting: number;
  totalHours: number;
} => {
  const notStarted = repairs.filter(
    (r) => !r.state || r.state === 'Non commencé',
  ).length;
  const inProgress = repairs.filter((r) => r.state === 'En cours').length;
  const waiting = repairs.filter(
    (r) =>
      r.state &&
      (r.state.includes('attente') ||
        r.state === 'À rappeler' ||
        r.state.includes('Devis')),
  ).length;

  const totalSeconds = repairs.reduce(
    (sum, r) => sum + (r.working_time_in_sec || 0),
    0,
  );
  const totalHours = Math.round((totalSeconds / 3600) * 10) / 10;

  return { notStarted, inProgress, waiting, totalHours };
};

/** Charge de travail de chaque réparateur (pour le sélecteur de réparateur). */
export const getWorkloadByRepairer = (
  repairs: MachineRepairListItem[],
  repairerNames: string[],
): RepairerWorkload[] =>
  repairerNames.map((repairerName) => {
    const repairerRepairs = getActiveRepairsForRepairer(repairs, repairerName);
    const workload = calculateWorkload(repairerRepairs);
    return {
      repairerName,
      totalRepairs: repairerRepairs.length,
      ...workload,
      repairs: repairerRepairs,
    };
  });

/**
 * Trie par priorité : En cours > Non commencé > En attente/Devis/À rappeler > Autres,
 * puis par ancienneté (le plus ancien en premier).
 */
export const sortByPriority = (
  repairs: MachineRepairListItem[],
): MachineRepairListItem[] => {
  const getStatePriority = (state: string | null): number => {
    if (!state || state === 'Non commencé') return 2;
    if (state === 'En cours') return 1;
    if (
      state.includes('attente') ||
      state === 'À rappeler' ||
      state.includes('Devis')
    )
      return 3;
    return 4;
  };

  return [...repairs].sort((a, b) => {
    const priorityA = getStatePriority(a.state);
    const priorityB = getStatePriority(b.state);
    if (priorityA !== priorityB) return priorityA - priorityB;

    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return dateA - dateB;
  });
};

/** Groupe les réparations par état (« Non commencé » pour un état vide). */
export const groupByState = (
  repairs: MachineRepairListItem[],
): Record<string, MachineRepairListItem[]> =>
  repairs.reduce<Record<string, MachineRepairListItem[]>>((acc, repair) => {
    const state = repair.state || 'Non commencé';
    (acc[state] ??= []).push(repair);
    return acc;
  }, {});

/** Couleur d'intention selon le nombre de réparations d'un réparateur. */
export const getWorkloadColor = (
  repairCount: number,
): 'success' | 'warning' | 'error' | 'info' => {
  if (repairCount === 0) return 'info';
  if (repairCount <= 3) return 'success';
  if (repairCount <= 6) return 'warning';
  return 'error';
};

/** Formatte un temps en secondes en `"2h 30min"`. */
export const formatWorkTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours === 0 && minutes === 0) return '0min';
  if (hours === 0) return `${minutes}min`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}min`;
};

/** Nombre de jours écoulés depuis la création (ISO string). */
export const getDaysSinceCreation = (createdAt: string): number => {
  const created = new Date(createdAt);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - created.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/** Réparation en retard : non commencée depuis plus de 7 jours. */
export const isDelayed = (repair: MachineRepairListItem): boolean => {
  const days = getDaysSinceCreation(repair.createdAt);
  const notStarted = !repair.state || repair.state === 'Non commencé';
  return notStarted && days > 7;
};

/** Réparation à surveiller : plus de 3 jours et pas « En cours ». */
export const needsAttention = (repair: MachineRepairListItem): boolean => {
  const days = getDaysSinceCreation(repair.createdAt);
  return days > 3 && (!repair.state || repair.state !== 'En cours');
};
