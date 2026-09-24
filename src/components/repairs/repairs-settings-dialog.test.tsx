/**
 * « Paramètres » de la liste : chaque colonne se coche ou se décoche tout de
 * suite, et la remise à zéro est un bouton expliqué, sans confirmation.
 */
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { REPAIRS_COLUMN_CHOICES } from './repairs-columns';
import { RepairsSettingsDialog } from './repairs-settings-dialog';

describe('RepairsSettingsDialog', () => {
  it('reflète la visibilité effective et signale chaque changement', () => {
    const onColumnVisibilityChange = vi.fn();
    render(
      <RepairsSettingsDialog
        open
        onOpenChange={() => {}}
        columnVisibility={{ createdAt: false, phone: true }}
        onColumnVisibilityChange={onColumnVisibilityChange}
        onReset={() => {}}
      />,
    );

    expect(screen.getAllByRole('checkbox')).toHaveLength(
      REPAIRS_COLUMN_CHOICES.length,
    );
    const createdAt = screen.getByRole('checkbox', {
      name: /Date de création/,
    });
    expect(createdAt).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: /^Sortie/ })).toBeChecked();

    fireEvent.click(createdAt);
    expect(onColumnVisibilityChange).toHaveBeenCalledWith('createdAt', true);

    fireEvent.click(screen.getByRole('checkbox', { name: /^Téléphone/ }));
    expect(onColumnVisibilityChange).toHaveBeenCalledWith('phone', false);
  });

  it('réinitialise au clic, sans seconde confirmation', () => {
    const onReset = vi.fn();
    render(
      <RepairsSettingsDialog
        open
        onOpenChange={() => {}}
        columnVisibility={{}}
        onColumnVisibilityChange={() => {}}
        onReset={onReset}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Réinitialiser le tableau' }),
    );
    expect(onReset).toHaveBeenCalledOnce();
  });
});
