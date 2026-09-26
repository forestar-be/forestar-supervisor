import dayjs from '@/lib/dayjs';
import type { MachineRepairListItemFromApi } from '@/lib/types';

/**
 * Historique des entrées et sorties (QF-5, option 1) : une ligne par passage,
 * c'est-à-dire par fiche (D-01), actives et archivées confondues. Les règles de
 * la page vivent ici, sans React, pour être testées seules.
 */

export type HistoryItem = Pick<
  MachineRepairListItemFromApi,
  | 'id'
  | 'client'
  | 'machine_type_name'
  | 'brand_name'
  | 'robot_type_name'
  | 'repair_or_maintenance'
  | 'state'
  | 'archived_at'
  | 'entry_date'
  | 'exit_date'
  | 'createdAt'
>;

/**
 * - `at_workshop` : pas de sortie, fiche active ;
 * - `returned` : date de sortie posée (machine rendue) ;
 * - `archived_no_exit` : archivée sans sortie (« Archiver sans sortie »,
 *   machines jamais rendues comme les hors service).
 */
export type Presence = 'at_workshop' | 'returned' | 'archived_no_exit';

export type PresenceFilter = 'all' | 'at_workshop' | 'returned';

export interface Period {
  start: Date | undefined;
  end: Date | undefined;
}

const TZ = 'Europe/Brussels';

const dayKey = (value: string | Date) =>
  dayjs(value).tz(TZ).format('YYYY-MM-DD');

/** La date d'entrée, ou la création pour une fiche d'avant R003. */
export const entryOf = (item: HistoryItem): string =>
  item.entry_date ?? item.createdAt;

export function presenceOf(item: HistoryItem): Presence {
  if (item.exit_date) return 'returned';
  if (item.archived_at) return 'archived_no_exit';
  return 'at_workshop';
}

export function matchesPresence(
  item: HistoryItem,
  filter: PresenceFilter,
): boolean {
  return filter === 'all' || presenceOf(item) === filter;
}

/**
 * Jours passés à l'atelier, en jours calendaires de Bruxelles : de l'entrée à
 * la sortie, ou à aujourd'hui si la machine est encore là. Une remise le jour
 * même compte 0 jour. `null` pour une fiche archivée sans sortie : on ne sait
 * pas quand la machine est partie.
 */
export function daysAtWorkshop(
  item: HistoryItem,
  now: Date = new Date(),
): number | null {
  const presence = presenceOf(item);
  if (presence === 'archived_no_exit') return null;
  const end = presence === 'returned' ? item.exit_date! : now;
  const days = dayjs(dayKey(end)).diff(dayjs(dayKey(entryOf(item))), 'day');
  return Math.max(0, days);
}

/** « Robot tondeuse · Husqvarna · Automower 315 ». */
export function machineLabel(item: HistoryItem): string {
  return (
    [item.machine_type_name, item.brand_name, item.robot_type_name]
      .filter((part): part is string => Boolean(part && part.trim()))
      .join(' · ') || 'Machine non renseignée'
  );
}

/**
 * Le passage a une entrée **ou** une sortie dans la période, bornes comprises,
 * en jours de Bruxelles. Une borne absente est ouverte.
 */
export function inPeriod(item: HistoryItem, period: Period): boolean {
  if (!period.start && !period.end) return true;
  const from = period.start ? dayKey(period.start) : null;
  const to = period.end ? dayKey(period.end) : null;
  const within = (value: string | null) => {
    if (!value) return false;
    const key = dayKey(value);
    return (!from || key >= from) && (!to || key <= to);
  };
  return within(entryOf(item)) || within(item.exit_date);
}

export const normalizeSearch = (value: string) =>
  value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Chiffres du téléphone, et leur forme nationale : `+32 470…` → `0470…`. */
function phoneForms(phone: string | null | undefined): string[] {
  const digits = (phone ?? '').replace(/\D/g, '');
  const national = digits.replace(/^(00)?32(?=\d{8,9}$)/, '0');
  return national === digits ? [digits] : [digits, national];
}

/**
 * Chaque mot doit se trouver dans le client, son téléphone ou la machine. Le
 * téléphone se cherche aussi en chiffres seuls et au format national, pour
 * qu'un `0470…` tapé trouve un `+32 470…` saisi.
 */
export function matchesSearch(item: HistoryItem, query: string): boolean {
  const words = normalizeSearch(query.trim()).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = normalizeSearch(
    [
      item.client.firstName,
      item.client.lastName,
      item.client.phone,
      ...phoneForms(item.client.phone),
      machineLabel(item),
    ].join(' '),
  );
  return words.every((word) => haystack.includes(word));
}
