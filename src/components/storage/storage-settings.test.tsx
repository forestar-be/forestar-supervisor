import '@testing-library/jest-dom/vitest';
import { afterEach, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
const api = vi.hoisted(() => ({
  updateStorageSettings: vi.fn(),
  addStorageRack: vi.fn(),
  deactivateStorageRack: vi.fn(),
  activateStorageRack: vi.fn(),
  changeStorageRackCategory: vi.fn(),
}));
vi.mock('@/lib/api', () => api);
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ token: 'test' }) }));
import { StorageSettings } from './storage-settings';
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
it('review: ne renvoie pas la clé interne id reçue par GET storage', async () => {
  const data = {
    settings: { id: 1, enabled: false, allowOverflow: true, maxRacks: null },
    machineTypes: [{ name: 'Robot', isRobot: true }],
    racks: [],
    unlocated: [],
  };
  api.updateStorageSettings.mockResolvedValue({});
  render(<StorageSettings data={data} token="test" onSaved={async () => {}} />);
  fireEvent.click(screen.getByText('Paramètres du rangement'));
  fireEvent.click(screen.getByText('Enregistrer les paramètres'));
  await waitFor(() =>
    expect(api.updateStorageSettings).toHaveBeenCalledTimes(1),
  );
  expect(api.updateStorageSettings.mock.calls[0][1]).not.toHaveProperty('id');
});

it('envoie le maximum de racks saisi, et null quand le champ est vide', async () => {
  const data = {
    settings: { enabled: true, allowOverflow: true, maxRacks: 3 },
    machineTypes: [{ name: 'Robot', isRobot: true }],
    racks: [],
    unlocated: [],
  };
  api.updateStorageSettings.mockResolvedValue({});
  render(<StorageSettings data={data} token="test" onSaved={async () => {}} />);
  const field = screen.getByLabelText('Nombre maximum de racks');
  expect(field).toHaveValue(3);
  fireEvent.change(field, { target: { value: '5' } });
  fireEvent.click(screen.getByText('Enregistrer les paramètres'));
  await waitFor(() =>
    expect(api.updateStorageSettings).toHaveBeenCalledTimes(1),
  );
  expect(api.updateStorageSettings.mock.calls[0][1].maxRacks).toBe(5);
  fireEvent.change(field, { target: { value: '' } });
  fireEvent.click(screen.getByText('Enregistrer les paramètres'));
  await waitFor(() =>
    expect(api.updateStorageSettings).toHaveBeenCalledTimes(2),
  );
  expect(api.updateStorageSettings.mock.calls[1][1].maxRacks).toBeNull();
});

it('creates racks in the selected category and locks conversion for occupied racks', async () => {
  const data = {
    settings: { enabled: true, allowOverflow: true, maxRacks: null },
    machineTypes: [],
    unlocated: [],
    racks: [
      {
        id: 1,
        number: 1,
        active: true,
        category: 'ATELIER' as const,
        slots: [
          {
            id: 1,
            level: 1,
            position: 'A',
            code: 'R1/1/A',
            repair: {
              id: 10,
              client: { firstName: 'Jean', lastName: 'Dupont' },
            },
          },
        ],
      },
      {
        id: 2,
        number: 2,
        active: true,
        category: 'HIVERNAGE' as const,
        slots: [],
      },
    ],
  };
  api.addStorageRack.mockResolvedValue({});
  api.changeStorageRackCategory.mockResolvedValue({});
  render(<StorageSettings data={data} token="test" onSaved={async () => {}} />);
  expect(
    screen.getByRole('checkbox', { name: 'Hivernage du rack 1' }),
  ).toHaveAttribute('aria-disabled', 'true');
  fireEvent.click(
    screen.getByRole('checkbox', { name: 'Hivernage du rack 2' }),
  );
  await waitFor(() =>
    expect(api.changeStorageRackCategory).toHaveBeenCalledWith(
      'test',
      2,
      'ATELIER',
    ),
  );
  await waitFor(() =>
    expect(
      screen.getByRole('checkbox', { name: 'Hivernage' }),
    ).not.toHaveAttribute('aria-disabled', 'true'),
  );
  fireEvent.click(
    screen.getByRole('checkbox', { name: 'Hivernage' }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Ajouter un rack' }));
  await waitFor(() =>
    expect(api.addStorageRack).toHaveBeenCalledWith('test', 'HIVERNAGE'),
  );
});

it('shows compact columns and reactivates a disabled rack after a confirmed deactivation', async () => {
  let data = {
    settings: { enabled: true, allowOverflow: true, maxRacks: null },
    machineTypes: [],
    unlocated: [],
    racks: [
      {
        id: 2,
        number: 2,
        active: true,
        category: 'ATELIER' as const,
        slots: [],
      },
    ],
  };
  const refresh = vi.fn(async () => {
    view.rerender(
      <StorageSettings data={data} token="test" onSaved={refresh} />,
    );
  });
  const view = render(
    <StorageSettings data={data} token="test" onSaved={refresh} />,
  );
  expect(
    within(screen.getByRole('table', { name: 'Racks' }))
      .getAllByRole('columnheader')
      .map((cell) => cell.textContent),
  ).toEqual(['Numéro', 'Hivernage', 'Statut', 'Action']);
  expect(screen.queryByText(/Catégorie du rack/)).not.toBeInTheDocument();
  api.deactivateStorageRack.mockImplementation(async () => {
    data = { ...data, racks: [{ ...data.racks[0], active: false }] };
  });
  fireEvent.click(screen.getByRole('button', { name: 'Désactiver le rack 2' }));
  expect(api.deactivateStorageRack).not.toHaveBeenCalled();
  fireEvent.click(
    within(screen.getByRole('dialog')).getByRole('button', {
      name: 'Désactiver',
    }),
  );
  const activate = await screen.findByRole('button', {
    name: 'Activer le rack 2',
  });
  expect(screen.getByText('Désactivé')).toBeInTheDocument();
  api.activateStorageRack.mockImplementation(async () => {
    data = { ...data, racks: [{ ...data.racks[0], active: true }] };
  });
  fireEvent.click(activate);
  await screen.findByRole('button', { name: 'Désactiver le rack 2' });
  expect(api.activateStorageRack).toHaveBeenCalledWith('test', 2);
  expect(screen.getByText('Activé')).toBeInTheDocument();
});
