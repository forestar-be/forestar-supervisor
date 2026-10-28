import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
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
beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});
async function selectRackType(name: string, type: 'Atelier' | 'Hivernage') {
  fireEvent.click(screen.getByRole('combobox', { name }));
  const option = await screen.findByRole('option', { name: type });
  fireEvent.pointerDown(option, { pointerType: 'mouse' });
  fireEvent.click(option);
}
it('review: ne renvoie pas la clé interne id reçue par GET storage', async () => {
  const data = {
    settings: { id: 1, enabled: false, allowOverflow: true, maxRacks: null },
    machineTypes: [{ name: 'Robot', isRobot: true }],
    racks: [],
    unlocated: [],
  };
  api.updateStorageSettings.mockResolvedValue({});
  render(<StorageSettings data={data} token="test" onSaved={async () => {}} />);
  fireEvent.click(
    screen.getByRole('switch', {
      name: /Activer le rangement/,
    }),
  );
  fireEvent.click(
    screen.getByRole('switch', {
      name: /Dépôts sans emplacement/,
    }),
  );
  fireEvent.click(screen.getByRole('checkbox', { name: 'Robot' }));
  fireEvent.click(screen.getByText('Enregistrer les paramètres'));
  await waitFor(() =>
    expect(api.updateStorageSettings).toHaveBeenCalledTimes(1),
  );
  expect(api.updateStorageSettings.mock.calls[0][1]).not.toHaveProperty('id');
  expect(api.updateStorageSettings.mock.calls[0][1]).toMatchObject({
    enabled: true,
    allowOverflow: false,
    machineTypes: [{ name: 'Robot', isRobot: false }],
  });
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
    screen.getByRole('combobox', { name: 'Type du rack 1' }),
  ).toBeDisabled();
  await selectRackType('Type du rack 2', 'Atelier');
  await waitFor(() =>
    expect(api.changeStorageRackCategory).toHaveBeenCalledWith(
      'test',
      2,
      'ATELIER',
    ),
  );
  await waitFor(() =>
    expect(
      screen.getByRole('combobox', { name: 'Type du nouveau rack' }),
    ).toBeEnabled(),
  );
  await selectRackType('Type du nouveau rack', 'Hivernage');
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
  ).toEqual(['Numéro', 'Type de rack', 'Statut', 'Action']);
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
  expect(screen.getByRole('table', { name: 'Racks' })).toHaveTextContent(
    'Désactivé',
  );
  api.activateStorageRack.mockImplementation(async () => {
    data = { ...data, racks: [{ ...data.racks[0], active: true }] };
  });
  fireEvent.click(activate);
  await screen.findByRole('button', { name: 'Désactiver le rack 2' });
  expect(api.activateStorageRack).toHaveBeenCalledWith('test', 2);
  expect(screen.getByRole('table', { name: 'Racks' })).toHaveTextContent(
    'Activé',
  );
});

const baseSettings = { enabled: true, allowOverflow: true, maxRacks: null };

it('règle la taille par modèle et n’envoie que les modèles modifiés', async () => {
  const data = {
    settings: baseSettings,
    machineTypes: [{ name: 'Robot', isRobot: true }],
    robotTypes: [
      { name: 'Automower 315', storageSize: 'STANDARD' as const },
      { name: 'Automower 450X', storageSize: 'STANDARD' as const },
      { name: 'Ambrogio L400', storageSize: 'LARGE' as const },
    ],
    racks: [],
    unlocated: [],
  };
  api.updateStorageSettings.mockResolvedValue({});
  render(<StorageSettings data={data} token="test" onSaved={async () => {}} />);
  const large = screen.getByRole('checkbox', {
    name: 'Ambrogio L400 Large (2 places)',
  });
  expect(large).toBeChecked();
  expect(
    screen.getByRole('checkbox', { name: 'Automower 315 Large (2 places)' }),
  ).not.toBeChecked();
  // Pas de champ de filtre pour une liste courte.
  expect(
    screen.queryByRole('searchbox', { name: 'Filtrer les modèles' }),
  ).toBeNull();
  fireEvent.click(
    screen.getByRole('checkbox', { name: 'Automower 450X Large (2 places)' }),
  );
  fireEvent.click(large);
  fireEvent.click(screen.getByText('Enregistrer les paramètres'));
  await waitFor(() =>
    expect(api.updateStorageSettings).toHaveBeenCalledTimes(1),
  );
  expect(api.updateStorageSettings.mock.calls[0][1].robotTypes).toEqual([
    { name: 'Automower 450X', storageSize: 'LARGE' },
    { name: 'Ambrogio L400', storageSize: 'STANDARD' },
  ]);
});

it('n’envoie pas robotTypes quand aucun modèle n’a changé', async () => {
  const data = {
    settings: baseSettings,
    machineTypes: [{ name: 'Robot', isRobot: true }],
    robotTypes: [{ name: 'Automower 315', storageSize: 'STANDARD' as const }],
    racks: [],
    unlocated: [],
  };
  api.updateStorageSettings.mockResolvedValue({});
  render(<StorageSettings data={data} token="test" onSaved={async () => {}} />);
  fireEvent.click(screen.getByText('Enregistrer les paramètres'));
  await waitFor(() =>
    expect(api.updateStorageSettings).toHaveBeenCalledTimes(1),
  );
  expect(api.updateStorageSettings.mock.calls[0][1]).not.toHaveProperty(
    'robotTypes',
  );
});

it('filtre une longue liste de modèles sans perdre les réglages hors filtre', async () => {
  const names = Array.from({ length: 12 }, (_, i) => `Modèle ${i + 1}`);
  names[11] = 'Husqvarna Ténor';
  const data = {
    settings: baseSettings,
    machineTypes: [{ name: 'Robot', isRobot: true }],
    robotTypes: names.map((name) => ({
      name,
      storageSize: 'STANDARD' as const,
    })),
    racks: [],
    unlocated: [],
  };
  api.updateStorageSettings.mockResolvedValue({});
  render(<StorageSettings data={data} token="test" onSaved={async () => {}} />);
  fireEvent.click(
    screen.getByRole('checkbox', { name: 'Modèle 3 Large (2 places)' }),
  );
  const filter = screen.getByRole('searchbox', { name: 'Filtrer les modèles' });
  fireEvent.change(filter, { target: { value: 'tenor' } });
  expect(
    screen.getByRole('checkbox', {
      name: 'Husqvarna Ténor Large (2 places)',
    }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole('checkbox', { name: 'Modèle 3 Large (2 places)' }),
  ).toBeNull();
  fireEvent.change(filter, { target: { value: 'zzz' } });
  expect(
    screen.getByText('Aucun modèle ne correspond au filtre.'),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByText('Enregistrer les paramètres'));
  await waitFor(() =>
    expect(api.updateStorageSettings).toHaveBeenCalledTimes(1),
  );
  expect(api.updateStorageSettings.mock.calls[0][1].robotTypes).toEqual([
    { name: 'Modèle 3', storageSize: 'LARGE' },
  ]);
});
