import { describe, expect, it } from 'vitest';
import {
  searchStorage,
  storageRobotLabel,
  type StorageOverview,
} from './storage';

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
