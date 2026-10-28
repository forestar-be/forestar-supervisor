import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
const api = vi.hoisted(() => ({
  getRepairStorage: vi.fn(),
  getStorage: vi.fn(),
  commandRepairStorage: vi.fn(),
  previewRepairStorageResize: vi.fn(),
}));
vi.mock('@/lib/api', () => ({
  ...api,
  isHttpError: (e: { status?: number }) => !!e.status,
}));
import { RepairStoragePanel } from './repair-storage-panel';
const props = {
  id: 12,
  token: 'test',
  machineType: 'Robot',
  exited: false,
  onPrint: vi.fn(),
  printing: false,
};
beforeEach(() => {
  api.getStorage.mockResolvedValue({
    settings: { enabled: true },
    machineTypes: [{ name: 'Robot', isRobot: true }],
  });
  api.getRepairStorage.mockResolvedValue({
    depositedAt: null,
    location: null,
    history: [],
  });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
it('demande une confirmation de saturation puis propose la réimpression sans imprimer', async () => {
  api.commandRepairStorage
    .mockRejectedValueOnce(
      Object.assign(new Error('Complet'), {
        status: 409,
        data: { code: 'storage_full_confirmation_required' },
      }),
    )
    .mockResolvedValueOnce({
      depositedAt: '2026-10-16',
      location: null,
      history: [],
    });
  render(<RepairStoragePanel {...props} />);
  fireEvent.click(
    await screen.findByRole('button', { name: 'Détails du rangement' }),
  );
  fireEvent.click(
    await screen.findByRole('button', {
      name: 'Enregistrer le dépôt à l’atelier',
    }),
  );
  fireEvent.click(
    await screen.findByRole('button', { name: 'Confirmer sans emplacement' }),
  );
  await waitFor(() =>
    expect(api.commandRepairStorage).toHaveBeenCalledTimes(2),
  );
  expect(api.commandRepairStorage.mock.calls[1][2]).toMatchObject({
    action: 'deposit',
    confirmOverflow: true,
  });
  expect(
    await screen.findByText('Robot déposé sans emplacement'),
  ).toBeInTheDocument();
  expect(props.onPrint).not.toHaveBeenCalled();
  fireEvent.click(
    screen.getByRole('button', { name: 'Réimprimer les tickets' }),
  );
  expect(props.onPrint).toHaveBeenCalledTimes(1);
});
it('ne propose aucun dépôt pour un autre type de machine', async () => {
  const { container } = render(
    <RepairStoragePanel {...props} machineType="Tronçonneuse" />,
  );
  await waitFor(() => expect(api.getStorage).toHaveBeenCalled());
  expect(container).toBeEmptyDOMElement();
});
it('garde l’historique après libération et ne propose pas un nouveau dépôt', async () => {
  api.getRepairStorage.mockResolvedValue({
    depositedAt: null,
    location: null,
    history: [
      {
        id: 1,
        action: 'release',
        fromCode: 'R1/1/A',
        toCode: null,
        actor: 'Employé',
        createdAt: '2026-10-16T09:00:00Z',
      },
    ],
  });
  render(<RepairStoragePanel {...props} exited machineType="Tronçonneuse" />);
  fireEvent.click(
    await screen.findByRole('button', { name: 'Historique du rangement' }),
  );
  expect(
    await screen.findByText(/Historique des emplacements/),
  ).toBeInTheDocument();
  expect(screen.getByText('Robot rendu au client')).toBeInTheDocument();
  expect(screen.getByText(/Libération de la place/)).toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: 'Attribuer une place libre' }),
  ).not.toBeInTheDocument();
});

it('résume le rangement en ligne et ouvre ses détails à la demande', async () => {
  api.getRepairStorage.mockResolvedValue({
    depositedAt: '2026-10-16T09:00:00Z',
    location: { code: 'R1/1/A' },
    history: [],
  });
  render(<RepairStoragePanel {...props} />);
  expect(await screen.findByText('R1/1/A')).toBeInTheDocument();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Détails du rangement' }));
  expect(
    (await screen.findByText('Voir et déplacer dans le rack')).closest('a'),
  ).toHaveAttribute('href', '/rangement?fiche=12');
});

describe('Taille du robot (rangement)', () => {
  const stored = (size: 'STANDARD' | 'LARGE', code: string) => ({
    depositedAt: '2026-10-16T09:00:00Z',
    size,
    location: {
      slotId: 120,
      secondSlotId: size === 'LARGE' ? 121 : null,
      size,
      code,
    },
    history: [],
  });
  async function openDetails() {
    fireEvent.click(
      await screen.findByRole('button', { name: 'Détails du rangement' }),
    );
    return screen.findByRole('group', { name: 'Taille du robot' });
  }

  it('affiche la taille et le code double', async () => {
    api.getRepairStorage.mockResolvedValue(stored('LARGE', 'R1/2/A-B'));
    render(<RepairStoragePanel {...props} />);
    expect(await screen.findByText('R1/2/A-B')).toBeInTheDocument();
    expect(screen.getByText('Large · 2 places')).toBeInTheDocument();
    const group = await openDetails();
    expect(group).toHaveTextContent('Taille : Large (2 places)');
    expect(
      within(group).getByRole('button', { name: 'Large (2 places)' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      within(group).getByRole('button', { name: 'Standard' }),
    ).toHaveAttribute('aria-pressed', 'false');
  });

  it('montre l’aperçu d’une extension sur place, confirme avec expectedToCode puis propose la réimpression', async () => {
    api.getRepairStorage.mockResolvedValue(stored('STANDARD', 'R1/2/A'));
    api.previewRepairStorageResize.mockResolvedValue({
      size: 'LARGE',
      kind: 'extend',
      feasible: true,
      fromCode: 'R1/2/A',
      toCode: 'R1/2/A-B',
    });
    api.commandRepairStorage.mockResolvedValue(stored('LARGE', 'R1/2/A-B'));
    render(<RepairStoragePanel {...props} />);
    const group = await openDetails();
    fireEvent.click(
      within(group).getByRole('button', { name: 'Large (2 places)' }),
    );
    expect(
      await screen.findByText(/Extension sur place : R1\/2\/A → R1\/2\/A-B/),
    ).toBeInTheDocument();
    expect(api.previewRepairStorageResize).toHaveBeenCalledWith(
      'test',
      12,
      'LARGE',
    );
    expect(api.commandRepairStorage).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole('button', { name: 'Confirmer R1/2/A → R1/2/A-B' }),
    );
    await waitFor(() =>
      expect(api.commandRepairStorage).toHaveBeenCalledWith('test', 12, {
        commandId: expect.any(String),
        action: 'resize',
        size: 'LARGE',
        expectedSlotId: 120,
        expectedToCode: 'R1/2/A-B',
      }),
    );
    expect(await screen.findAllByText('R1/2/A-B')).toHaveLength(2);
    expect(props.onPrint).not.toHaveBeenCalled();
    fireEvent.click(
      await screen.findByRole('button', { name: 'Réimprimer les tickets' }),
    );
    expect(props.onPrint).toHaveBeenCalledTimes(1);
  });

  it('annonce un déplacement vers une autre paire', async () => {
    api.getRepairStorage.mockResolvedValue(stored('STANDARD', 'R1/2/A'));
    api.previewRepairStorageResize.mockResolvedValue({
      size: 'LARGE',
      kind: 'move',
      feasible: true,
      fromCode: 'R1/2/A',
      toCode: 'R1/3/A-B',
    });
    render(<RepairStoragePanel {...props} />);
    const group = await openDetails();
    fireEvent.click(
      within(group).getByRole('button', { name: 'Large (2 places)' }),
    );
    expect(
      await screen.findByText(/Déplacement vers R1\/3\/A-B/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Confirmer R1/2/A → R1/3/A-B' }),
    ).toBeInTheDocument();
  });

  it('annonce la réduction qui libère la seconde place', async () => {
    api.getRepairStorage.mockResolvedValue(stored('LARGE', 'R1/2/A-B'));
    api.previewRepairStorageResize.mockResolvedValue({
      size: 'STANDARD',
      kind: 'reduce',
      feasible: true,
      fromCode: 'R1/2/A-B',
      toCode: 'R1/2/A',
    });
    render(<RepairStoragePanel {...props} />);
    const group = await openDetails();
    fireEvent.click(within(group).getByRole('button', { name: 'Standard' }));
    expect(
      await screen.findByText(/La seconde place est libérée/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Confirmer R1/2/A-B → R1/2/A' }),
    ).toBeInTheDocument();
  });

  it('refuse sans bouton de confirmation quand aucune paire n’est libre', async () => {
    api.getRepairStorage.mockResolvedValue(stored('STANDARD', 'R1/2/A'));
    api.previewRepairStorageResize.mockResolvedValue({
      size: 'LARGE',
      kind: 'refused',
      feasible: false,
      fromCode: 'R1/2/A',
      toCode: null,
    });
    render(<RepairStoragePanel {...props} />);
    const group = await openDetails();
    fireEvent.click(
      within(group).getByRole('button', { name: 'Large (2 places)' }),
    );
    expect(
      await screen.findByText(
        /Refusé : aucune paire libre, place et taille conservées/,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Confirmer/ })).toBeNull();
    expect(api.commandRepairStorage).not.toHaveBeenCalled();
  });

  it('change directement la taille d’une fiche sans place, sans aperçu', async () => {
    api.getRepairStorage.mockResolvedValue({
      depositedAt: '2026-10-16T09:00:00Z',
      size: 'STANDARD',
      location: null,
      history: [],
    });
    api.commandRepairStorage.mockResolvedValue({
      depositedAt: '2026-10-16T09:00:00Z',
      size: 'LARGE',
      location: null,
      history: [],
    });
    render(<RepairStoragePanel {...props} />);
    const group = await openDetails();
    fireEvent.click(
      within(group).getByRole('button', { name: 'Large (2 places)' }),
    );
    await waitFor(() =>
      expect(api.commandRepairStorage).toHaveBeenCalledWith('test', 12, {
        commandId: expect.any(String),
        action: 'resize',
        size: 'LARGE',
      }),
    );
    expect(api.previewRepairStorageResize).not.toHaveBeenCalled();
    expect(await screen.findByText('Large · 2 places')).toBeInTheDocument();
    expect(
      await screen.findByRole('button', { name: 'Réimprimer les tickets' }),
    ).toBeInTheDocument();
  });

  it('relit le rangement et affiche l’erreur si la situation a changé avant la confirmation', async () => {
    api.getRepairStorage.mockResolvedValue(stored('STANDARD', 'R1/2/A'));
    api.previewRepairStorageResize.mockResolvedValue({
      size: 'LARGE',
      kind: 'extend',
      feasible: true,
      fromCode: 'R1/2/A',
      toCode: 'R1/2/A-B',
    });
    api.commandRepairStorage.mockRejectedValue(
      Object.assign(new Error('La place voisine vient d’être prise'), {
        status: 409,
        data: { code: 'storage_conflict' },
      }),
    );
    render(<RepairStoragePanel {...props} />);
    const group = await openDetails();
    fireEvent.click(
      within(group).getByRole('button', { name: 'Large (2 places)' }),
    );
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Confirmer R1/2/A → R1/2/A-B',
      }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La place voisine vient d’être prise',
    );
    await waitFor(() => expect(api.getRepairStorage).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole('button', { name: /^Confirmer/ })).toBeNull();
  });
});
