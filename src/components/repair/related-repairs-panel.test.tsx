/**
 * R003-S05 — panneau « Passages précédents de ce client » (AC-06, AC-07) :
 * rendu vide (aucun passage) et rendu avec plusieurs passages et leurs
 * motifs de lien, en clair.
 */
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import type { RelatedRepair } from '@/lib/types';

const getRelatedRepairs = vi.fn();

vi.mock('@/lib/api', () => ({
  getRelatedRepairs: (...args: unknown[]) => getRelatedRepairs(...args),
  isHttpError: () => false,
}));

afterEach(() => {
  vi.clearAllMocks();
});

async function renderPanel(id: string) {
  const { RelatedRepairsPanel } = await import('./related-repairs-panel');
  render(<RelatedRepairsPanel id={id} token="jeton" />);
}

describe('RelatedRepairsPanel', () => {
  it("affiche une ligne discrète quand la fiche n'a aucun passage lié", async () => {
    getRelatedRepairs.mockResolvedValue([]);

    await renderPanel('41');

    expect(
      await screen.findByText(
        'Aucun autre passage trouvé pour ce client.',
      ),
    ).toBeInTheDocument();
    expect(getRelatedRepairs).toHaveBeenCalledWith('jeton', '41');
  });

  it('affiche les passages avec leur motif de lien en clair', async () => {
    const related: RelatedRepair[] = [
      {
        id: 36,
        phone: '+32 470 11 22 33',
        first_name: 'Jean',
        last_name: 'RECETTE Dupont',
        robot_code: null,
        entry_date: '2025-04-10T07:15:00.000Z',
        exit_date: '2025-04-18T14:30:00.000Z',
        machine_type_name: 'Tondeuse',
        brand_name: 'Husqvarna',
        repair_or_maintenance: 'Réparation',
        state: 'Terminé',
        archived_at: '2025-04-18T14:30:00.000Z',
        match: ['phone', 'name'],
      },
      {
        id: 37,
        phone: '0470112233',
        first_name: 'Jean',
        last_name: 'RECETTE Dupont',
        robot_code: null,
        entry_date: '2025-10-02T08:00:00.000Z',
        exit_date: '2025-10-09T09:45:00.000Z',
        machine_type_name: 'Tondeuse',
        brand_name: 'Husqvarna',
        repair_or_maintenance: 'Réparation',
        state: 'Terminé',
        archived_at: '2025-10-09T09:45:00.000Z',
        match: ['phone', 'name'],
      },
      {
        id: 40,
        phone: '0472 33 44 55',
        first_name: 'Sophie',
        last_name: 'RECETTE Lambert',
        robot_code: 'RB-RECETTE-001',
        entry_date: '2024-11-05T13:00:00.000Z',
        exit_date: '2025-03-20T09:00:00.000Z',
        machine_type_name: 'Robot tondeuse',
        brand_name: 'Husqvarna',
        repair_or_maintenance: 'Entretien',
        state: 'Terminé et en hivernage',
        archived_at: '2025-03-20T09:00:00.000Z',
        match: ['robot_code'],
      },
    ];
    getRelatedRepairs.mockResolvedValue(related);

    await renderPanel('39');

    expect(await screen.findByText('Fiche n°36')).toBeInTheDocument();
    expect(screen.getByText('Fiche n°37')).toBeInTheDocument();
    expect(screen.getByText('Fiche n°40')).toBeInTheDocument();
    expect(screen.getAllByText('Archivée')).toHaveLength(3);
    expect(
      screen.getAllByText('Lien : même téléphone, même nom')[0],
    ).toBeInTheDocument();
    expect(screen.getByText('Lien : même code robot')).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.queryByText('Aucun autre passage trouvé pour ce client.'),
      ).not.toBeInTheDocument(),
    );
  });
});
