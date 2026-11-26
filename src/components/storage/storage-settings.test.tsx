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
  addStorageRackLevel: vi.fn(),
  removeStorageRackLevel: vi.fn(),
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
  ).toEqual(['Rack', 'Type de rack', 'Étages', 'Statut', 'Action']);
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

function levelsRack(
  levels: number,
  occupied?: { level: number; position: string; covered?: boolean },
) {
  return {
    id: 3,
    number: 3,
    active: true,
    category: 'ATELIER' as const,
    slots: Array.from({ length: levels }, (_, i) => i + 1).flatMap((level) =>
      ['A', 'B', 'C'].map((position, i) => {
        const hit = occupied?.level === level && occupied.position === position;
        return {
          id: level * 10 + i,
          level,
          position,
          code: `R3/${level}/${position}`,
          repair:
            hit && !occupied?.covered
              ? { id: 99, client: { firstName: 'Jean', lastName: 'Dupont' } }
              : null,
          coveredBy:
            hit && occupied?.covered
              ? { repairId: 99, anchorSlotId: level * 10 }
              : null,
        };
      }),
    ),
  };
}
function renderRack(rack: ReturnType<typeof levelsRack>) {
  const data = {
    settings: { enabled: true, allowOverflow: true, maxRacks: null },
    machineTypes: [],
    unlocated: [],
    racks: [rack],
  };
  render(<StorageSettings data={data} token="test" onSaved={async () => {}} />);
}

it('FORESTAR-244 : ajoute un étage en visant le haut + 1, et retire le haut après confirmation', async () => {
  api.addStorageRackLevel.mockResolvedValue({});
  api.removeStorageRackLevel.mockResolvedValue({});
  renderRack(levelsRack(5));
  expect(screen.getByLabelText('5 étages')).toHaveTextContent('5');
  fireEvent.click(
    screen.getByRole('button', { name: 'Ajouter un étage au rack 3' }),
  );
  await waitFor(() =>
    expect(api.addStorageRackLevel).toHaveBeenCalledWith('test', 3, 6),
  );
  const remove = await screen.findByRole('button', {
    name: 'Retirer l’étage 5 du rack 3',
  });
  await waitFor(() => expect(remove).toBeEnabled());
  fireEvent.click(remove);
  expect(api.removeStorageRackLevel).not.toHaveBeenCalled();
  const dialog = screen.getByRole('dialog');
  expect(dialog).toHaveTextContent('Retirer l’étage 5 du rack 3 ?');
  fireEvent.click(
    within(dialog).getByRole('button', { name: 'Retirer l’étage' }),
  );
  await waitFor(() =>
    expect(api.removeStorageRackLevel).toHaveBeenCalledWith('test', 3, 5),
  );
});

it.each([
  ['une ancre', { level: 5, position: 'B' }],
  ['la seconde place d’un large', { level: 5, position: 'C', covered: true }],
])(
  'FORESTAR-244 : bloque le retrait quand l’étage du haut porte %s',
  (_label, occupied) => {
    renderRack(levelsRack(5, occupied));
    const remove = screen.getByRole('button', {
      name: 'Retirer l’étage 5 du rack 3',
    });
    expect(remove).toBeDisabled();
    expect(remove).toHaveAttribute(
      'title',
      'Videz l’étage 5 avant de le retirer.',
    );
  },
);

it('FORESTAR-244 : un étage occupé plus bas ne bloque pas le retrait du haut ; bornes 1 et 8', () => {
  renderRack(levelsRack(5, { level: 4, position: 'A' }));
  expect(
    screen.getByRole('button', { name: 'Retirer l’étage 5 du rack 3' }),
  ).toBeEnabled();
  cleanup();
  renderRack(levelsRack(1));
  expect(
    screen.getByRole('button', { name: 'Retirer l’étage 1 du rack 3' }),
  ).toBeDisabled();
  cleanup();
  renderRack(levelsRack(8));
  expect(
    screen.getByRole('button', { name: 'Ajouter un étage au rack 3' }),
  ).toBeDisabled();
});
