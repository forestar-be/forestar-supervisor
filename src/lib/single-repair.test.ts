import { describe, expect, it } from 'vitest';
import {
  computeManualWorkingTime,
  diffRepairFields,
  formatPrice,
  getFormattedWorkingTime,
  getSuffixPrice,
  getTotalPrice,
  getTotalPriceParts,
  getWorkingTimePrice,
  possibleReplacedPartToString,
  replacedPartToString,
} from './single-repair';

describe('formatPrice', () => {
  it('formate en euros avec une virgule', () => {
    expect(formatPrice(12.5)).toBe('12,50€');
    expect(formatPrice(0)).toBe('0,00€');
  });
});

describe('getFormattedWorkingTime', () => {
  it('formate heures et minutes sans les secondes par défaut', () => {
    expect(getFormattedWorkingTime(3725)).toBe('1h 2m ');
  });

  it('inclut les secondes si demandé', () => {
    expect(getFormattedWorkingTime(3725, true)).toBe('1h 2m 5s');
  });
});

describe('getWorkingTimePrice', () => {
  it('calcule le prix de la main d’œuvre au taux horaire', () => {
    // 3600s à 30€/h => 30€
    expect(getWorkingTimePrice({ working_time_in_sec: 3600 }, 30)).toBe(
      '30,00€',
    );
    // 1800s (30min) à 30€/h => 15€
    expect(getWorkingTimePrice({ working_time_in_sec: 1800 }, 30)).toBe(
      '15,00€',
    );
  });
});

const replacedPartList = [
  { quantity: 2, replacedPart: { name: 'Lame', price: 5 } },
  { quantity: 1, replacedPart: { name: 'Roue', price: 10 } },
];

describe('getTotalPriceParts', () => {
  it('additionne prix x quantité pour chaque pièce', () => {
    expect(getTotalPriceParts({ replaced_part_list: replacedPartList })).toBe(
      '20,00€',
    );
  });

  it('renvoie 0€ sans pièce', () => {
    expect(getTotalPriceParts({ replaced_part_list: [] })).toBe('0,00€');
  });
});

describe('getTotalPrice', () => {
  it('additionne pièces, main d’œuvre et hivernage si coché', () => {
    const repair = {
      replaced_part_list: replacedPartList,
      working_time_in_sec: 3600,
      hivernage: true,
    };
    // 20€ pièces + 30€ main d'œuvre + 15€ hivernage
    expect(getTotalPrice(repair, 30, 15)).toBe('65,00€');
  });

  it('ignore le prix hivernage si non coché', () => {
    const repair = {
      replaced_part_list: replacedPartList,
      working_time_in_sec: 3600,
      hivernage: false,
    };
    expect(getTotalPrice(repair, 30, 15)).toBe('50,00€');
  });
});

describe('getSuffixPrice', () => {
  it('affiche le supplément si actif', () => {
    expect(getSuffixPrice(true, 25)).toBe(' +25€');
  });

  it('ne renvoie rien si inactif', () => {
    expect(getSuffixPrice(false, 25)).toBe('');
  });

  it('remplace le point décimal par une virgule', () => {
    expect(getSuffixPrice(true, 25.5)).toBe(' +25,5€');
  });
});

describe('replacedPartToString / possibleReplacedPartToString', () => {
  it('formate une pièce remplacée avec sa quantité', () => {
    expect(
      replacedPartToString({ quantity: 3, replacedPart: { name: 'Lame', price: 5 } }),
    ).toBe('3x Lame (5€)');
  });

  it('formate une pièce disponible', () => {
    expect(possibleReplacedPartToString({ name: 'Roue', price: 10 })).toBe(
      'Roue - 10€',
    );
  });
});

describe('computeManualWorkingTime', () => {
  it('met à jour les heures en conservant minutes et secondes', () => {
    // 1h 5m 10s = 3910s -> passer à 2h => garder 5m10s (310s restant)
    expect(computeManualWorkingTime(3910, 'hour', '2')).toBe(2 * 3600 + 310);
  });

  it('met à jour les minutes en conservant heures et secondes', () => {
    expect(computeManualWorkingTime(3910, 'minute', '10')).toBe(
      3600 + 10 * 60 + 10,
    );
  });

  it('met à jour les secondes en conservant heures et minutes', () => {
    expect(computeManualWorkingTime(3910, 'second', '45')).toBe(
      3600 + 5 * 60 + 45,
    );
  });

  it('traite une saisie sans chiffre comme 0, comme l’ancien composant', () => {
    // Tous les caractères non numériques sont retirés avant conversion ;
    // une chaîne sans chiffre devient 0, pas NaN.
    expect(computeManualWorkingTime(3910, 'hour', 'abc')).toBe(310);
  });

  it('nettoie les caractères non numériques', () => {
    expect(computeManualWorkingTime(0, 'minute', '12min')).toBe(12 * 60);
  });
});

describe('diffRepairFields', () => {
  it('ne renvoie que les champs modifiés', () => {
    const initial = { a: 1, b: 'x', c: true };
    const current = { a: 1, b: 'y', c: true };
    expect(diffRepairFields(current, initial)).toEqual({ b: 'y' });
  });

  it('renvoie un objet vide sans changement', () => {
    const state = { a: 1, b: 'x' };
    expect(diffRepairFields({ ...state }, { ...state })).toEqual({});
  });

  it('compare les tableaux par référence, comme l’ancien handleUpdate', () => {
    const initial = { list: [1, 2, 3] };
    const current = { list: [1, 2, 3] }; // même contenu, référence différente
    expect(diffRepairFields(current, initial)).toEqual({ list: [1, 2, 3] });
  });
});
