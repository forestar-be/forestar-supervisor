import { describe, expect, it } from 'vitest';
import {
  freePairs,
  freePairsAround,
  isSlotFree,
  levelCells,
  rackCounts,
  searchStorage,
  slotLocationCode,
  storageRobotLabel,
  type StorageOverview,
  type StorageRack,
  type StorageSlot,
} from './storage';

const jean = { id: 10, client: { firstName: 'Jean', lastName: 'Dupont' } };
/** Étage 2 du rack 1 : places A (id 1), B (id 2), C (id 3) libres. */
function level(
  overrides: Partial<Record<'A' | 'B' | 'C', Partial<StorageSlot>>> = {},
) {
  return (['A', 'B', 'C'] as const).map((position, i): StorageSlot => ({
    id: i + 1,
    level: 2,
    position,
    code: `R1/2/${position}`,
    repair: null,
    ...overrides[position],
  }));
}
const largeAB = {
  A: {
    repair: { ...jean, storageSize: 'LARGE' as const, storageSecondSlotId: 2 },
    span: 2 as const,
    secondSlotId: 2,
    locationCode: 'R1/2/A-B',
  },
  B: { coveredBy: { repairId: 10, anchorSlotId: 1 } },
};

describe('Libellé du robot dans le rangement', () => {
  it.each([
    ['Husqvarna', 'Automower 315', 'Husqvarna Automower 315'],
    ['Husqvarna', 'Husqvarna Automower 315', 'Husqvarna Automower 315'],
    ['Husqvarna', 'HUSQVARNA® Automower 315', 'HUSQVARNA® Automower 315'],
    ['Husqvarna', 'Automower Husqvarna 315', 'Automower Husqvarna 315'],
    ['Husqvarna', 'HusqvarnaPro 315', 'Husqvarna HusqvarnaPro 315'],
    ['Husqvarna', null, 'Husqvarna'],
    [null, 'Automower 315', 'Automower 315'],
    [null, null, ''],
  ])('%s + %s donne %s', (brand_name, robot_type_name, expected) => {
    expect(
      storageRobotLabel({
        id: 10,
        client: { firstName: 'Jean', lastName: 'Dupont' },
        brand_name,
        robot_type_name,
      }),
    ).toBe(expected);
  });
});

it('cherche les mots saisis dans les noms, fiches, marques et modèles, sans résultats à vide', () => {
  const data: StorageOverview = {
    settings: { enabled: true, allowOverflow: true, maxRacks: null },
    machineTypes: [],
    racks: [],
    unlocated: [
      {
        id: 42,
        client: { firstName: 'Émilie', lastName: 'Martin' },
        brand_name: 'Husqvarna',
        robot_type_name: 'Automower 315',
      },
    ],
  };
  for (const query of ['', '   ', '#'])
    expect(searchStorage(data, query)).toEqual([]);
  for (const query of [
    'emilie',
    '#42',
    'HUSQVARNA',
    '315 Martin',
    '  automower   Émilie  ',
  ])
    expect(searchStorage(data, query)).toHaveLength(1);
  expect(searchStorage(data, 'Martin 450')).toHaveLength(0);
});

describe('Cellules d’un étage', () => {
  it('garde trois cellules simples quand aucun robot n’est large', () => {
    expect(levelCells(level()).map((cell) => cell.kind)).toEqual([
      'single',
      'single',
      'single',
    ]);
  });
  it('fusionne un large A+B sur l’ancrage et ne rend pas la seconde place', () => {
    const cells = levelCells(level(largeAB));
    expect(cells.map((cell) => cell.kind)).toEqual([
      'wide',
      'covered',
      'single',
    ]);
    expect(cells[0]).toMatchObject({ kind: 'wide', second: { id: 2 } });
  });
  it('fusionne un large B+C et laisse A seule', () => {
    const cells = levelCells(
      level({
        B: { ...largeAB.A, id: 2, secondSlotId: 3, locationCode: 'R1/2/B-C' },
        C: { coveredBy: { repairId: 10, anchorSlotId: 2 } },
      }),
    );
    expect(cells.map((cell) => cell.kind)).toEqual([
      'single',
      'wide',
      'covered',
    ]);
  });
  it('trie par position même si le serveur les envoie dans le désordre', () => {
    expect(
      levelCells([...level()].reverse()).map((cell) => cell.slot.position),
    ).toEqual(['A', 'B', 'C']);
  });
});

describe('Places libres et compteurs', () => {
  it('une seconde place couverte n’est jamais libre', () => {
    const [a, b, c] = level(largeAB);
    expect([a, b, c].map(isSlotFree)).toEqual([false, false, true]);
  });
  it('compte les places couvertes comme occupées', () => {
    const rack = {
      slots: [
        ...level(largeAB),
        ...level().map((s) => ({ ...s, id: s.id + 10, level: 3 })),
      ],
    };
    expect(rackCounts(rack)).toEqual({ total: 6, free: 4, occupied: 2 });
    expect(rackCounts({ slots: level() })).toEqual({
      total: 3,
      free: 3,
      occupied: 0,
    });
  });
  it('affiche le code double quand il existe, sinon le code simple', () => {
    const [a, b] = level(largeAB);
    expect(slotLocationCode(a)).toBe('R1/2/A-B');
    expect(slotLocationCode(b)).toBe('R1/2/B');
  });
});

describe('Paires libres pour un robot large', () => {
  it('propose A-B et B-C comme deux destinations distinctes quand tout est libre', () => {
    const pairs = freePairs(level());
    expect(pairs.map((p) => [p.code, p.anchor.id, p.second.id])).toEqual([
      ['R1/2/A-B', 1, 2],
      ['R1/2/B-C', 2, 3],
    ]);
  });
  it('ne propose rien quand la place du milieu est prise', () => {
    expect(freePairs(level({ B: { repair: jean } }))).toEqual([]);
  });
  it('ne propose pas la paire qui recouvre un large', () => {
    expect(freePairs(level(largeAB))).toEqual([]);
    expect(
      freePairs(level({ A: { repair: jean } })).map((p) => p.code),
    ).toEqual(['R1/2/B-C']);
  });
  it('ne propose pas une place couverte même si repair est null', () => {
    const slots = level({
      A: { coveredBy: { repairId: 99, anchorSlotId: 7 } },
    });
    expect(freePairs(slots).map((p) => p.code)).toEqual(['R1/2/B-C']);
  });
  it('limite les paires à celles qui contiennent la place visée', () => {
    const rack: Pick<StorageRack, 'slots'> = {
      slots: [
        ...level(),
        ...level().map((s) => ({
          ...s,
          id: s.id + 10,
          level: 3,
          code: `R1/3/${s.position}`,
        })),
      ],
    };
    const [a, b, c] = rack.slots;
    expect(freePairsAround(rack, a).map((p) => p.code)).toEqual(['R1/2/A-B']);
    expect(freePairsAround(rack, b).map((p) => p.code)).toEqual([
      'R1/2/A-B',
      'R1/2/B-C',
    ]);
    expect(freePairsAround(rack, c).map((p) => p.code)).toEqual(['R1/2/B-C']);
  });
});

it('retrouve un robot large par son code double ou par sa place seconde', () => {
  const slots = level(largeAB);
  const data: StorageOverview = {
    settings: { enabled: true, allowOverflow: true, maxRacks: null },
    machineTypes: [],
    racks: [{ id: 1, number: 1, active: true, category: 'ATELIER', slots }],
    unlocated: [],
  };
  expect(searchStorage(data, 'R1/2/A-B')).toHaveLength(1);
  expect(searchStorage(data, 'r1/2/b')).toHaveLength(1);
  expect(searchStorage(data, 'R1/2/C')).toHaveLength(0);
});
