import { MachineRepair } from './types';

/**
 * Liste des états considérés comme "terminés" (machines qui ne doivent plus apparaître)
 */
export const COMPLETED_STATES = [
  'Terminé',
  'Annulé',
  'Livré',
  'Facturé',
  'Clôturé',
];

/**
 * Interface pour la charge de travail d'un réparateur
 */
export interface RepairerWorkload {
  repairerName: string;
  totalRepairs: number;
  notStarted: number;
  inProgress: number;
  waiting: number;
  totalHours: number;
  repairs: MachineRepair[];
}

/**
 * Filtre les réparations actives pour un réparateur donné
 * @param repairs Liste complète des réparations
 * @param repairerName Nom du réparateur
 * @returns Liste des réparations actives du réparateur
 */
export const getActiveRepairsForRepairer = (
  repairs: MachineRepair[],
  repairerName: string,
): MachineRepair[] => {
  return repairs.filter(
    (repair) =>
      repair.repairer_name === repairerName &&
      (!repair.state || !COMPLETED_STATES.includes(repair.state)),
  );
};

/**
 * Récupère toutes les réparations non attribuées
 * @param repairs Liste complète des réparations
 * @returns Liste des réparations sans réparateur assigné
 */
export const getUnassignedRepairs = (
  repairs: MachineRepair[],
): MachineRepair[] => {
  return repairs.filter(
    (repair) =>
      !repair.repairer_name &&
      (!repair.state || !COMPLETED_STATES.includes(repair.state)),
  );
};

/**
 * Calcule la charge de travail pour un réparateur
 * @param repairs Liste des réparations du réparateur
 * @returns Objet avec les statistiques de charge
 */
export const calculateWorkload = (
  repairs: MachineRepair[],
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

/**
 * Récupère la charge de travail pour tous les réparateurs
 * @param repairs Liste complète des réparations
 * @param repairerNames Liste des noms de réparateurs
 * @returns Map des charges de travail par réparateur
 */
export const getWorkloadByRepairer = (
  repairs: MachineRepair[],
  repairerNames: string[],
): RepairerWorkload[] => {
  return repairerNames.map((repairerName) => {
    const repairerRepairs = getActiveRepairsForRepairer(repairs, repairerName);
    const workload = calculateWorkload(repairerRepairs);

    return {
      repairerName,
      totalRepairs: repairerRepairs.length,
      ...workload,
      repairs: repairerRepairs,
    };
  });
};

/**
 * Trie les réparations par priorité
 * Ordre : En cours > Non commencé > En attente > Autres
 * Puis par ancienneté (plus ancien en premier)
 * @param repairs Liste des réparations à trier
 * @returns Liste triée
 */
export const sortByPriority = (repairs: MachineRepair[]): MachineRepair[] => {
  return [...repairs].sort((a, b) => {
    // 1. Priorité par état
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

    const priorityA = getStatePriority(a.state);
    const priorityB = getStatePriority(b.state);

    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    // 2. Par ancienneté (plus ancien en premier)
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return dateA - dateB;
  });
};

/**
 * Groupe les réparations par état
 * @param repairs Liste des réparations
 * @returns Objet avec les réparations groupées par état
 */
export const groupByState = (
  repairs: MachineRepair[],
): Record<string, MachineRepair[]> => {
  return repairs.reduce(
    (acc, repair) => {
      const state = repair.state || 'Non commencé';
      if (!acc[state]) {
        acc[state] = [];
      }
      acc[state].push(repair);
      return acc;
    },
    {} as Record<string, MachineRepair[]>,
  );
};

/**
 * Obtient une couleur de charge de travail basée sur le nombre de réparations
 * @param repairCount Nombre de réparations
 * @returns Code couleur (success, warning, error)
 */
export const getWorkloadColor = (
  repairCount: number,
): 'success' | 'warning' | 'error' | 'info' => {
  if (repairCount === 0) return 'info';
  if (repairCount <= 3) return 'success';
  if (repairCount <= 6) return 'warning';
  return 'error';
};

/**
 * Formatte le temps en heures/minutes
 * @param seconds Nombre de secondes
 * @returns Chaîne formatée (ex: "2h 30min")
 */
export const formatWorkTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours === 0 && minutes === 0) return '0min';
  if (hours === 0) return `${minutes}min`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}min`;
};

/**
 * Calcule le nombre de jours depuis la création
 * @param createdAt Date de création (ISO string)
 * @returns Nombre de jours
 */
export const getDaysSinceCreation = (createdAt: string): number => {
  const created = new Date(createdAt);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - created.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

/**
 * Détermine si une réparation est en retard (> 7 jours sans être commencée)
 * @param repair Réparation à vérifier
 * @returns true si en retard
 */
export const isDelayed = (repair: MachineRepair): boolean => {
  const days = getDaysSinceCreation(repair.createdAt);
  const notStarted = !repair.state || repair.state === 'Non commencé';
  return notStarted && days > 7;
};

/**
 * Détermine si une réparation nécessite une attention (> 3 jours)
 * @param repair Réparation à vérifier
 * @returns true si nécessite attention
 */
export const needsAttention = (repair: MachineRepair): boolean => {
  const days = getDaysSinceCreation(repair.createdAt);
  return days > 3 && (!repair.state || repair.state !== 'En cours');
};
