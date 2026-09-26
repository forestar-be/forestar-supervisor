import { describe, expect, it } from 'vitest';
import {
  daysAtWorkshop,
  inPeriod,
  machineLabel,
  matchesPresence,
  matchesSearch,
  presenceOf,
  type HistoryItem,
} from './repair-history';

function item(overrides: Partial<HistoryItem>): HistoryItem {
  return {
    id: 1,
    client: {
      id: 1,
      firstName: 'Hélène',
      lastName: 'Dupont',
      phone: '+32 470 11 22 33',
    },
    machine_type_name: 'Robot tondeuse',
    brand_name: 'Husqvarna',
    robot_type_name: 'Automower 315',
    repair_or_maintenance: 'Réparation',
    state: 'En cours',
    archived_at: null,
    entry_date: '2026-09-18T08:00:00.000Z',
    exit_date: null,
    createdAt: '2026-09-18T08:00:00.000Z',
    ...overrides,
  };
}

const returned = item({
  exit_date: '2026-09-25T15:00:00.000Z',
  archived_at: '2026-09-25T15:00:00.000Z',
});
const archivedNoExit = item({ archived_at: '2026-09-20T10:00:00.000Z' });

describe('presenceOf', () => {
  it('distingue à l’atelier, rendue et archivée sans sortie', () => {
    expect(presenceOf(item({}))).toBe('at_workshop');
    expect(presenceOf(returned)).toBe('returned');
    expect(presenceOf(archivedNoExit)).toBe('archived_no_exit');
  });

  it('« Tous » garde les archivées sans sortie, les deux autres filtres non', () => {
    expect(matchesPresence(archivedNoExit, 'all')).toBe(true);
    expect(matchesPresence(archivedNoExit, 'at_workshop')).toBe(false);
    expect(matchesPresence(archivedNoExit, 'returned')).toBe(false);
    expect(matchesPresence(returned, 'returned')).toBe(true);
  });
});

describe('daysAtWorkshop', () => {
  it('compte les jours de l’entrée à la sortie', () => {
    expect(daysAtWorkshop(returned)).toBe(7);
  });

  it('compte jusqu’à aujourd’hui pour une machine encore là', () => {
    expect(daysAtWorkshop(item({}), new Date('2026-09-24T10:00:00.000Z'))).toBe(
      6,
    );
  });

  it('une remise le jour même vaut 0 jour, en jours de Bruxelles', () => {
    // 23 h 30 UTC le 17 = 01 h 30 le 18 à Bruxelles : même jour que la sortie.
    expect(
      daysAtWorkshop(
        item({
          entry_date: '2026-09-17T23:30:00.000Z',
          exit_date: '2026-09-18T16:00:00.000Z',
        }),
      ),
    ).toBe(0);
  });

  it('ne compte rien pour une fiche archivée sans sortie', () => {
    expect(daysAtWorkshop(archivedNoExit)).toBeNull();
  });

  it('prend la création si la date d’entrée manque', () => {
    expect(
      daysAtWorkshop(
        item({ entry_date: null, createdAt: '2026-09-20T08:00:00.000Z' }),
        new Date('2026-09-24T08:00:00.000Z'),
      ),
    ).toBe(4);
  });
});

describe('inPeriod', () => {
  const september = {
    start: new Date('2026-09-01T00:00:00+02:00'),
    end: new Date('2026-09-30T00:00:00+02:00'),
  };

  it('retient un passage entré ou sorti dans la période', () => {
    const enteredBefore = item({
      entry_date: '2026-08-20T08:00:00.000Z',
      exit_date: '2026-09-05T08:00:00.000Z',
    });
    const enteredAfter = item({ entry_date: '2026-10-02T08:00:00.000Z' });
    expect(inPeriod(item({}), september)).toBe(true);
    expect(inPeriod(enteredBefore, september)).toBe(true);
    expect(inPeriod(enteredAfter, september)).toBe(false);
  });

  it('inclut le dernier jour et accepte une borne ouverte', () => {
    // 21 h 30 UTC le 30 = 23 h 30 à Bruxelles : encore septembre.
    const lastDay = item({ entry_date: '2026-09-30T21:30:00.000Z' });
    // 22 h 30 UTC le 30 = 0 h 30 le 1er octobre à Bruxelles.
    const nextDay = item({ entry_date: '2026-09-30T22:30:00.000Z' });
    expect(inPeriod(lastDay, september)).toBe(true);
    expect(inPeriod(nextDay, september)).toBe(false);
    expect(inPeriod(item({}), { start: september.start, end: undefined })).toBe(
      true,
    );
    expect(inPeriod(item({}), { start: undefined, end: undefined })).toBe(true);
  });
});

describe('machineLabel et matchesSearch', () => {
  it('assemble type, marque et modèle', () => {
    expect(machineLabel(item({}))).toBe(
      'Robot tondeuse · Husqvarna · Automower 315',
    );
    expect(
      machineLabel(
        item({
          machine_type_name: 'Tondeuse',
          brand_name: 'Honda',
          robot_type_name: null,
        }),
      ),
    ).toBe('Tondeuse · Honda');
  });

  it('cherche dans le client, le téléphone et la machine, sans accents', () => {
    expect(matchesSearch(item({}), 'helene automower')).toBe(true);
    expect(matchesSearch(item({}), '470112233')).toBe(true);
    expect(matchesSearch(item({}), '0470112233'), 'format national').toBe(true);
    expect(matchesSearch(item({}), '0470 11')).toBe(true);
    expect(matchesSearch(item({}), '0471')).toBe(false);
    expect(matchesSearch(item({}), 'stihl')).toBe(false);
    expect(matchesSearch(item({}), '  ')).toBe(true);
  });
});
