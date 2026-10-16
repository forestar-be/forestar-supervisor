import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
const api = vi.hoisted(() => ({
  getRepairStorage: vi.fn(),
  getStorage: vi.fn(),
  commandRepairStorage: vi.fn(),
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
    depositedAt: '2026-10-15',
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
  render(<RepairStoragePanel {...props} exited />);
  expect(
    await screen.findByText(/Historique des emplacements/),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: 'Attribuer une place libre' }),
  ).not.toBeInTheDocument();
});
