/**
 * R003-S05 — « Machine rendue au client » (D-18) : la boîte avertit quand
 * l'état n'est ni « Terminé » ni « Terminé et en hivernage », jamais sinon,
 * et confirme avec la date de sortie du jour par défaut.
 */
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import dayjs from '@/lib/dayjs';
import { HandoverDialog } from './handover-dialog';

describe('HandoverDialog', () => {
  it('avertit quand la fiche n’est pas « Terminé » ou « Terminé et en hivernage »', () => {
    render(
      <HandoverDialog
        open
        onOpenChange={() => {}}
        state="En cours"
        loading={false}
        onConfirm={async () => {}}
      />,
    );

    expect(
      screen.getByText(
        'La fiche est « En cours » : rendre la machine quand même ?',
      ),
    ).toBeInTheDocument();
  });

  it('affiche « sans état » quand la fiche n’a pas d’état', () => {
    render(
      <HandoverDialog
        open
        onOpenChange={() => {}}
        state={null}
        loading={false}
        onConfirm={async () => {}}
      />,
    );

    expect(
      screen.getByText(
        'La fiche est « sans état » : rendre la machine quand même ?',
      ),
    ).toBeInTheDocument();
  });

  it.each(['Terminé', 'Terminé et en hivernage'])(
    "n'avertit pas quand l'état est « %s »",
    (state) => {
      render(
        <HandoverDialog
          open
          onOpenChange={() => {}}
          state={state}
          loading={false}
          onConfirm={async () => {}}
        />,
      );

      expect(
        screen.queryByText(/rendre la machine quand même/),
      ).not.toBeInTheDocument();
    },
  );

  it('confirme avec la date de sortie du jour par défaut, au format AAAA-MM-JJ', () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(
      <HandoverDialog
        open
        onOpenChange={() => {}}
        state="Terminé"
        loading={false}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Confirmer la remise' }),
    );

    expect(onConfirm).toHaveBeenCalledWith(dayjs().format('YYYY-MM-DD'));
  });
});
