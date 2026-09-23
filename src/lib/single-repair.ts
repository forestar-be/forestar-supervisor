import type { MachineRepair, ReplacedPart } from './types';

/**
 * Calculs purs de la fiche réparation, portés de l'ancien
 * `src/utils/singleRepair.utils.ts`. Aucune dépendance React ni réseau ici :
 * tout ce qui touche l'API ou l'état des composants reste dans
 * `src/components/repair/`.
 */

export function formatPrice(value: number): string {
  return `${value.toFixed(2).replace('.', ',')}€`;
}

function getHoursMinutesAndSeconds(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;
  return { hours, minutes, remainingSeconds };
}

export function getFormattedWorkingTime(
  seconds: number,
  withSeconds = false,
): string {
  const { hours, minutes, remainingSeconds } =
    getHoursMinutesAndSeconds(seconds);
  return `${hours}h ${minutes}m ${withSeconds ? `${remainingSeconds}s` : ''}`;
}

export function getWorkingTimePrice(
  repair: Pick<MachineRepair, 'working_time_in_sec'>,
  hourlyRate: number,
): string {
  const price = repair.working_time_in_sec * (hourlyRate / 3600);
  return formatPrice(price);
}

function sumReplacedParts(
  replacedPartList: MachineRepair['replaced_part_list'],
): number {
  return replacedPartList.reduce(
    (acc, part) => acc + part.replacedPart.price * part.quantity,
    0,
  );
}

export function getTotalPriceParts(
  repair: Pick<MachineRepair, 'replaced_part_list'>,
): string {
  return formatPrice(sumReplacedParts(repair.replaced_part_list));
}

export function getTotalPrice(
  repair: Pick<
    MachineRepair,
    'replaced_part_list' | 'working_time_in_sec' | 'hivernage'
  >,
  hourlyRate: number,
  priceHivernage: number,
): string {
  const partsTotal = sumReplacedParts(repair.replaced_part_list);
  const workingTimePrice = repair.working_time_in_sec * (hourlyRate / 3600);
  return formatPrice(
    partsTotal + workingTimePrice + (repair.hivernage ? priceHivernage : 0),
  );
}

export function getSuffixPrice(showPrice: boolean, price: number): string {
  return showPrice ? ` +${String(price).replace('.', ',')}€` : '';
}

export function replacedPartToString(
  replacedPart: MachineRepair['replaced_part_list'][number],
): string {
  return `${replacedPart.quantity}x ${replacedPart.replacedPart.name} (${replacedPart.replacedPart.price}€)`;
}

export function possibleReplacedPartToString(part: ReplacedPart): string {
  return `${part.name} - ${part.price}€`;
}

export type ManualTimeField = 'hour' | 'minute' | 'second';

/**
 * Recalcule le temps de travail (en secondes) après une saisie manuelle d'un
 * des trois champs (heure, minute, seconde). Une saisie non numérique laisse
 * le temps inchangé, comme l'ancien composant.
 */
export function computeManualWorkingTime(
  currentSeconds: number,
  field: ManualTimeField,
  rawValue: string,
): number {
  const value = Number(String(rawValue).replace(/\D/g, ''));
  if (Number.isNaN(value)) {
    return currentSeconds;
  }
  if (field === 'hour') {
    return value * 3600 + (currentSeconds % 3600);
  }
  if (field === 'minute') {
    return (
      Math.floor(currentSeconds / 3600) * 3600 +
      value * 60 +
      (currentSeconds % 60)
    );
  }
  return Math.floor(currentSeconds / 60) * 60 + value;
}

/**
 * Ne renvoie que les champs qui diffèrent entre l'état courant et l'état
 * initial — c'est le corps de la requête `PATCH`. Comparaison par référence
 * pour les tableaux et les `Date`, comme l'ancien `handleUpdate` : un nouveau
 * tableau ou une nouvelle date compte comme un changement même si son contenu
 * est identique.
 */
export function diffRepairFields<T extends Record<string, unknown>>(
  current: T,
  initial: T,
): Partial<T> {
  const changed: Partial<T> = {};
  (Object.keys(current) as Array<keyof T>).forEach((key) => {
    if (current[key] !== initial[key]) {
      changed[key] = current[key];
    }
  });
  return changed;
}
