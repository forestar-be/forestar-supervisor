import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import type { StorageOverview, StorageRack } from '@/lib/storage';
const api = vi.hoisted(() => ({
  getStorage: vi.fn(),
  commandRepairStorage: vi.fn(),
}));
vi.mock('@/lib/api', () => ({
  ...api,
  isHttpError: (e: { status?: number }) => e.status === 409,
}));
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ token: 'test' }) }));
vi.mock('./storage-settings', () => ({ StorageSettings: () => null }));
import { StoragePage } from './storage-page';
function rack(id: number): StorageRack {
  return {
    id,
    number: id,
    active: true,
    slots: [1, 2, 3, 4].flatMap((level) =>
      ['A', 'B', 'C'].map((position, i) => ({
        id: id * 100 + level * 10 + i,
        level,
        position,
        code: `R${id}/${level}/${position}`,
        repair:
          level === 1 && i === 0
            ? { id: id * 10, client: { firstName: 'Jean', lastName: 'Dupont' } }
            : null,
      })),
    ),
  };
}
function fixture(): StorageOverview {
  return {
    settings: { enabled: true, allowOverflow: true },
    machineTypes: [],
    racks: [rack(1), rack(2)],
    unlocated: [{ id: 30, client: { firstName: 'Marie', lastName: 'Martin' } }],
  };
}
beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
  window.history.replaceState(null, '', '/rangement');
  api.getStorage.mockResolvedValue(fixture());
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});
async function open() {
  render(<StoragePage />);
  await screen.findByLabelText('Rack de face');
}
it('review: Actualiser remplace aussi le détail du robot déplacé par un collègue', async () => {
  await open();
  fireEvent.click(
    screen.getByRole('button', { name: 'R1/1/A, #10 · Jean Dupont' }),
  );
  const changed = fixture();
  const robot = changed.racks[0].slots[0].repair;
  changed.racks[0].slots[0].repair = null;
  changed.racks[1].slots[1].repair = robot;
  api.getStorage.mockResolvedValue(changed);
  fireEvent.click(screen.getByRole('button', { name: 'Actualiser' }));
  await waitFor(() => expect(api.getStorage).toHaveBeenCalledTimes(2));
  await waitFor(() =>
    expect(screen.getByLabelText('Robot sélectionné')).toHaveTextContent(
      'R2/1/B',
    ),
  );
});
// jsdom has no layout, so the desktop tabs are hidden from accessibility but clickable for navigation assertions.
function changeRack() {
  fireEvent.click(
    screen.getByText('Rack 2 · 11 libres', { selector: 'button' }),
  );
}
describe('Rangement visuel', () => {
  it('affiche toutes les fiches du même client et garde les exceptions avant le rack', async () => {
    await open();
    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: 'Dupont' },
    });
    expect(
      screen.getByRole('button', { name: '#10 · Jean Dupont · R1/1/A' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '#20 · Jean Dupont · R2/1/A' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Voir et affecter' }));
    expect(
      screen.getByRole('button', { name: '#30 · Marie Martin' }),
    ).toBeInTheDocument();
  });
  it('conserve la source entre racks, interdit les destinations occupées et confirme avant la mutation', async () => {
    await open();
    fireEvent.click(
      screen.getByRole('button', { name: 'R1/1/A, #10 · Jean Dupont' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Déplacer le robot' }));
    changeRack();
    expect(
      screen.getByRole('button', { name: 'R2/1/A, #20 · Jean Dupont' }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'R2/1/B, libre' }));
    expect(api.commandRepairStorage).not.toHaveBeenCalled();
    api.commandRepairStorage.mockResolvedValue({
      location: { code: 'R2/1/B' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Confirmer R1/1/A → R2/1/B' }),
    );
    await waitFor(() =>
      expect(api.commandRepairStorage).toHaveBeenCalledWith(
        'test',
        10,
        expect.objectContaining({
          action: 'move',
          expectedSlotId: 110,
          slotId: 211,
          commandId: expect.any(String),
        }),
      ),
    );
  });
  it('recharge un conflit concurrent et permet de choisir une autre destination', async () => {
    await open();
    fireEvent.click(
      screen.getByRole('button', { name: 'R1/1/A, #10 · Jean Dupont' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Déplacer le robot' }));
    fireEvent.click(screen.getByRole('button', { name: 'R1/1/B, libre' }));
    api.commandRepairStorage.mockRejectedValue(
      Object.assign(new Error('Place occupée entre-temps'), {
        status: 409,
        data: { code: 'storage_conflict' },
      }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Confirmer R1/1/A → R1/1/B' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Place occupée entre-temps',
    );
    await waitFor(() => expect(api.getStorage).toHaveBeenCalledTimes(2));
    expect(
      screen.queryByRole('button', { name: 'Confirmer R1/1/A → R1/1/B' }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'R1/1/C, libre' }));
    expect(
      screen.getByRole('button', { name: 'Confirmer R1/1/A → R1/1/C' }),
    ).toBeInTheDocument();
  });
  it('rejoue la même commande après une coupure et évite la double soumission', async () => {
    await open();
    fireEvent.click(screen.getByRole('button', { name: 'Voir et affecter' }));
    fireEvent.click(screen.getByRole('button', { name: '#30 · Marie Martin' }));
    api.commandRepairStorage.mockRejectedValue(new Error('Connexion perdue'));
    fireEvent.click(
      screen.getByRole('button', { name: 'Attribuer une place libre' }),
    );
    await screen.findByText('Connexion perdue');
    const first = api.commandRepairStorage.mock.calls.at(-1)?.[2];
    fireEvent.click(
      screen.getByRole('button', { name: 'Attribuer une place libre' }),
    );
    await waitFor(() =>
      expect(api.commandRepairStorage).toHaveBeenCalledTimes(2),
    );
    expect(api.commandRepairStorage.mock.calls.at(-1)?.[2]).toEqual(first);
  });
  it('ouvre le rack lié depuis une fiche', async () => {
    window.history.replaceState(null, '', '/rangement?fiche=20');
    render(<StoragePage />);
    await screen.findByRole('button', { name: 'R2/1/A, #20 · Jean Dupont' });
    expect(
      screen.getByRole('button', { name: 'R2/1/A, #20 · Jean Dupont' }),
    ).toHaveAttribute('aria-pressed', 'true');
  });
});

it('Actualiser retire le détail d’un robot sorti et annule son déplacement préparé', async () => {
  await open();
  fireEvent.click(
    screen.getByRole('button', { name: 'R1/1/A, #10 · Jean Dupont' }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Déplacer le robot' }));
  fireEvent.click(screen.getByRole('button', { name: 'R1/1/B, libre' }));
  const changed = fixture();
  changed.racks[0].slots[0].repair = null;
  api.getStorage.mockResolvedValue(changed);
  fireEvent.click(screen.getByRole('button', { name: 'Actualiser' }));
  await waitFor(() =>
    expect(screen.getByLabelText('Robot sélectionné')).not.toHaveTextContent(
      '#10',
    ),
  );
  expect(
    screen.queryByRole('button', { name: /Confirmer R1/ }),
  ).not.toBeInTheDocument();
  expect(api.commandRepairStorage).not.toHaveBeenCalled();
});

it('Actualiser annule la destination préparée même si l’origine reste identique', async () => {
  await open();
  fireEvent.click(
    screen.getByRole('button', { name: 'R1/1/A, #10 · Jean Dupont' }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Déplacer le robot' }));
  fireEvent.click(screen.getByRole('button', { name: 'R1/1/B, libre' }));
  fireEvent.click(screen.getByRole('button', { name: 'Actualiser' }));
  await waitFor(() =>
    expect(
      screen.queryByRole('button', { name: /Confirmer R1/ }),
    ).not.toBeInTheDocument(),
  );
  expect(screen.getByLabelText('Robot sélectionné')).toHaveTextContent(
    'R1/1/A',
  );
  expect(
    screen.getByRole('button', { name: 'Déplacer le robot' }),
  ).toBeEnabled();
  expect(api.commandRepairStorage).not.toHaveBeenCalled();
});
