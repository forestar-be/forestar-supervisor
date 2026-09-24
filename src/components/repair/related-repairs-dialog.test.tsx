/**
 * R003-S05 — bouton « Passages précédents » et sa fenêtre (AC-06, AC-07) :
 * le nombre de passages sur le bouton, la liste vide, et plusieurs passages
 * avec leurs motifs de lien, en clair.
 */
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { RelatedRepair } from '@/lib/types';

const getRelatedRepairs = vi.fn();

vi.mock('@/lib/api', () => ({
  getRelatedRepairs: (...args: unknown[]) => getRelatedRepairs(...args),
  isHttpError: () => false,
}));

afterEach(() => {
  vi.clearAllMocks();
});

async function openDialog(id: string, count: number) {
  const { RelatedRepairsButton } = await import('./related-repairs-dialog');
  render(<RelatedRepairsButton id={id} token="jeton" />);
  const button = await screen.findByRole('button', {
    name: `Passages précédents (${count})`,
  });
  fireEvent.click(button);
  await screen.findByRole('dialog');
}

describe('RelatedRepairsButton', () => {
  it("affiche une ligne discrète quand la fiche n'a aucun passage lié", async () => {
    getRelatedRepairs.mockResolvedValue([]);

    await openDialog('41', 0);

    expect(
      await screen.findByText('Aucun autre passage trouvé pour ce client.'),
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
        entry_date: '2025-10-02T08:00:00.000Z',
        exit_date: '2025-10-09T09:45:00.000Z',
        machine_type_name: 'Tondeuse',
        brand_name: 'Husqvarna',
        repair_or_maintenance: 'Réparation',
        state: 'Terminé',
        archived_at: '2025-10-09T09:45:00.000Z',
        match: ['phone', 'name'],
      },
    ];
    getRelatedRepairs.mockResolvedValue(related);

    await openDialog('39', 2);

    expect(await screen.findByText('Fiche n°36')).toBeInTheDocument();
    expect(screen.getByText('Fiche n°37')).toBeInTheDocument();
    expect(screen.getAllByText('Archivée')).toHaveLength(2);
    expect(
      screen.getAllByText('Lien : même téléphone, même nom')[0],
    ).toBeInTheDocument();
  });
});
