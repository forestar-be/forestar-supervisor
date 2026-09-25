import { describe, expect, it } from 'vitest';
import {
  isMeaningfulValue,
  preselectAllFields,
  preselectMergeChoice,
  resolveFieldValue,
} from './client-merge';
import type { ClientField } from './types';

describe('isMeaningfulValue (D-28)', () => {
  it('rejette le vide, les espaces et la ponctuation seule', () => {
    expect(isMeaningfulValue('')).toBe(false);
    expect(isMeaningfulValue('   ')).toBe(false);
    expect(isMeaningfulValue('/')).toBe(false);
    expect(isMeaningfulValue('.')).toBe(false);
    expect(isMeaningfulValue('-')).toBe(false);
    expect(isMeaningfulValue('´')).toBe(false);
    expect(isMeaningfulValue(null)).toBe(false);
    expect(isMeaningfulValue(undefined)).toBe(false);
  });

  it('accepte toute valeur avec au moins une lettre ou un chiffre', () => {
    expect(isMeaningfulValue('Jean')).toBe(true);
    expect(isMeaningfulValue('0470 11 22 33')).toBe(true);
    expect(isMeaningfulValue('Hélène')).toBe(true);
    expect(isMeaningfulValue('12 rue -')).toBe(true);
  });
});

describe('preselectMergeChoice (D-29)', () => {
  it('choisit le client gardé si sa valeur est utilisable', () => {
    expect(preselectMergeChoice('Jean', 'Paul', 'a')).toBe('a');
    expect(preselectMergeChoice('Jean', 'Paul', 'b')).toBe('b');
  });

  it("choisit l'autre si la valeur du client gardé est vide ou de la ponctuation", () => {
    expect(preselectMergeChoice('', 'Paul', 'a')).toBe('b');
    expect(preselectMergeChoice('/', '0470112233', 'a')).toBe('b');
    expect(preselectMergeChoice('Paul', '', 'b')).toBe('a');
  });

  it('garde le client gardé si aucune des deux valeurs n’est utilisable', () => {
    expect(preselectMergeChoice('', '', 'a')).toBe('a');
    expect(preselectMergeChoice('/', '.', 'b')).toBe('b');
  });
});

describe('preselectAllFields', () => {
  it('présélectionne chaque champ indépendamment', () => {
    const fields: ClientField[] = ['firstName', 'phone', 'city'];
    const a = { firstName: 'Jean', phone: '', city: 'Namur' } as Record<
      ClientField,
      string
    >;
    const b = { firstName: '', phone: '0470112233', city: '/' } as Record<
      ClientField,
      string
    >;
    const result = preselectAllFields(a, b, fields, 'a');
    expect(result.firstName).toBe('a'); // valeur de A utilisable
    expect(result.phone).toBe('b'); // A vide, B utilisable
    expect(result.city).toBe('a'); // B est du remplissage, on garde A
  });
});

describe('resolveFieldValue', () => {
  it('renvoie la valeur du client choisi, ou la saisie libre', () => {
    expect(resolveFieldValue('a', 'Jean', 'Paul', 'Autre')).toBe('Jean');
    expect(resolveFieldValue('b', 'Jean', 'Paul', 'Autre')).toBe('Paul');
    expect(resolveFieldValue('custom', 'Jean', 'Paul', 'Autre')).toBe('Autre');
  });
});
