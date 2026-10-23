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
import type { StorageOverview, StorageRack } from '@/lib/storage';
const api = vi.hoisted(() => ({
  getStorage: vi.fn(),
  commandRepairStorage: vi.fn(),
  getRepairStorage: vi.fn(),
  fetchRepairById: vi.fn(),
  searchStorageRepairs: vi.fn(),
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
    category: 'ATELIER',
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
    settings: { enabled: true, allowOverflow: true, maxRacks: null },
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
  api.fetchRepairById.mockResolvedValue({
    repair_or_maintenance: 'Entretien',
    repairer_name: 'Alex',
    fault_description: 'Contrôler la charge',
    entry_date: '2026-10-19',
    hivernage: true,
    warranty: false,
    devis: true,
  });
  api.getRepairStorage.mockResolvedValue({
    depositedAt: '2026-10-16T09:00:00Z',
    location: null,
    history: [],
  });
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
it('review: Le retour sur la fenêtre remplace aussi le détail du robot déplacé par un collègue', async () => {
  await open();
  fireEvent.click(
    screen.getByRole('button', { name: 'R1/1/A, #10 · Jean Dupont' }),
  );
  const changed = fixture();
  const robot = changed.racks[0].slots[0].repair;
  changed.racks[0].slots[0].repair = null;
  changed.racks[1].slots[1].repair = robot;
  api.getStorage.mockResolvedValue(changed);
  fireEvent(window, new Event('focus'));
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
    screen.getByText('Atelier · Rack 2 · 11 libres', { selector: 'button' }),
  );
}
describe('Rangement visuel', () => {
  it('affiche toutes les fiches du même client et garde les exceptions avant le rack', async () => {
    await open();
    fireEvent.keyDown(
      screen.getByRole('combobox', { name: 'Retrouver un robot' }),
      { key: 'ArrowDown' },
    );
    fireEvent.change(
      screen.getByRole('combobox', { name: 'Retrouver un robot' }),
      {
        target: { value: 'Dupont' },
      },
    );
    expect(
      await screen.findByRole('option', { name: '#10 · Jean Dupont · R1/1/A' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('option', { name: '#20 · Jean Dupont · R2/1/A' }),
    ).toBeInTheDocument();
    fireEvent.click(
      await screen.findByRole('option', { name: '#20 · Jean Dupont · R2/1/A' }),
    );
    await waitFor(() =>
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument(),
    );
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

it('Le retour sur la fenêtre retire le détail d’un robot sorti et annule son déplacement préparé', async () => {
  await open();
  fireEvent.click(
    screen.getByRole('button', { name: 'R1/1/A, #10 · Jean Dupont' }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Déplacer le robot' }));
  fireEvent.click(screen.getByRole('button', { name: 'R1/1/B, libre' }));
  const changed = fixture();
  changed.racks[0].slots[0].repair = null;
  api.getStorage.mockResolvedValue(changed);
  fireEvent(window, new Event('focus'));
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

it('Le retour sur la fenêtre annule la destination préparée même si l’origine reste identique', async () => {
  await open();
  fireEvent.click(
    screen.getByRole('button', { name: 'R1/1/A, #10 · Jean Dupont' }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Déplacer le robot' }));
  fireEvent.click(screen.getByRole('button', { name: 'R1/1/B, libre' }));
  fireEvent(window, new Event('focus'));
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

it('masque les exceptions vides et propose d’ajouter un robot sur une place libre', async () => {
  const data = fixture();
  data.unlocated = [];
  api.getStorage.mockResolvedValue(data);
  await open();
  expect(
    screen.queryByLabelText('Robots sans emplacement'),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: 'Actualiser' }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: 'R1/1/B, libre, ajouter un robot' }),
  ).toBeEnabled();
  expect(screen.getByLabelText('Colonnes du rack')).toHaveTextContent('ABC');
  expect(
    within(screen.getByLabelText('Rack de face')).queryByText('R1/1/A'),
  ).not.toBeInTheDocument();
});
it('désélectionne au clic extérieur et annule le déplacement sans mutation', async () => {
  await open();
  fireEvent.click(
    screen.getByRole('button', { name: 'R1/1/A, #10 · Jean Dupont' }),
  );
  await screen.findByText(/Déposé le/);
  fireEvent.click(
    screen.getByRole('button', { name: 'R1/1/A, #10 · Jean Dupont' }),
  );
  expect(screen.getByText(/Déposé le/)).toBeInTheDocument();
  fireEvent.pointerDown(
    screen.getByRole('heading', { name: 'Rangement des robots' }),
  );
  expect(screen.getByLabelText('Robot sélectionné')).not.toHaveTextContent(
    '#10',
  );
  fireEvent.click(
    screen.getByRole('button', { name: 'R1/1/A, #10 · Jean Dupont' }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Déplacer le robot' }));
  fireEvent.pointerDown(document.body);
  expect(screen.getByLabelText('Robot sélectionné')).not.toHaveTextContent(
    '#10',
  );
  expect(
    screen.getByRole('button', { name: 'R1/1/B, libre, ajouter un robot' }),
  ).toBeEnabled();
  expect(api.commandRepairStorage).not.toHaveBeenCalled();
});

it('ne propose aucun robot sans saisie et ferme les résultats après sélection', async () => {
  await open();
  const search = screen.getByRole('combobox', { name: 'Retrouver un robot' });
  fireEvent.focus(search);
  fireEvent.keyDown(search, { key: 'ArrowDown' });
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  fireEvent.change(search, { target: { value: 'Jean' } });
  expect(screen.getAllByRole('option')).toHaveLength(2);
  fireEvent.keyDown(search, { key: 'ArrowDown' });
  fireEvent.keyDown(search, { key: 'Enter' });
  expect(search).toHaveValue('');
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Robot sélectionné')).toHaveTextContent('#10');
  expect(await screen.findByText('Contrôler la charge')).toBeInTheDocument();
  expect(screen.getByLabelText('Robot sélectionné')).toHaveTextContent('Alex');
  expect(screen.getByLabelText('Robot sélectionné')).toHaveTextContent(
    'Hivernage · Devis demandé',
  );
});
it('affiche la marque seule si le modèle manque, sans répéter la fiche', async () => {
  const data = fixture();
  data.racks[0].slots[0].repair!.brand_name = 'Husqvarna';
  api.getStorage.mockResolvedValue(data);
  await open();
  const card = screen.getByRole('button', {
    name: 'R1/1/A, #10 · Jean Dupont',
  });
  expect(card).toHaveTextContent('Husqvarna');
  expect(card).not.toHaveTextContent('Fiche #10');
  fireEvent.click(card);
  expect(screen.getByLabelText('Robot sélectionné')).toHaveTextContent(
    'Husqvarna',
  );
});

it('déplace un robot par glisser-déposer et fait clignoter la case source', async () => {
  api.commandRepairStorage.mockResolvedValue({ location: { code: 'R1/1/B' } });
  await open();
  const source = screen.getByRole('button', {
    name: 'R1/1/A, #10 · Jean Dupont',
  });
  const dataTransfer = { setData: vi.fn(), effectAllowed: '', dropEffect: '' };
  fireEvent.dragStart(source, { dataTransfer });
  await waitFor(() =>
    expect(screen.getByLabelText('Robot sélectionné')).toHaveTextContent(
      'Déplacement en cours',
    ),
  );
  expect(source.className).toContain('storage-moving-blink');
  const target = screen.getByRole('button', { name: 'R1/1/B, libre' });
  fireEvent.dragOver(target, { dataTransfer });
  fireEvent.drop(target, { dataTransfer });
  fireEvent.dragEnd(source, { dataTransfer });
  expect(api.commandRepairStorage).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Robot sélectionné').className).toContain(
    'storage-moving-blink',
  );
  fireEvent.click(
    await screen.findByRole('button', { name: 'Confirmer R1/1/A → R1/1/B' }),
  );
  await waitFor(() =>
    expect(api.commandRepairStorage).toHaveBeenCalledWith(
      'test',
      10,
      expect.objectContaining({
        action: 'move',
        slotId: 111,
        expectedSlotId: 110,
      }),
    ),
  );
});

it('un glisser-déposer annulé dans la modale quitte le mode déplacement', async () => {
  await open();
  const source = screen.getByRole('button', {
    name: 'R1/1/A, #10 · Jean Dupont',
  });
  const dataTransfer = { setData: vi.fn(), effectAllowed: '', dropEffect: '' };
  fireEvent.dragStart(source, { dataTransfer });
  await waitFor(() =>
    expect(screen.getByLabelText('Robot sélectionné')).toHaveTextContent(
      'Déplacement en cours',
    ),
  );
  const target = screen.getByRole('button', { name: 'R1/1/B, libre' });
  fireEvent.dragOver(target, { dataTransfer });
  fireEvent.drop(target, { dataTransfer });
  fireEvent.dragEnd(source, { dataTransfer });
  fireEvent.click(await screen.findByRole('button', { name: 'Annuler' }));
  await waitFor(() =>
    expect(screen.getByLabelText('Robot sélectionné')).toHaveTextContent(
      'Robot sélectionné',
    ),
  );
  expect(screen.getByLabelText('Robot sélectionné')).toHaveTextContent('#10');
  expect(api.commandRepairStorage).not.toHaveBeenCalled();
});

describe('Ajout depuis une place libre', () => {
  it('ne montre rien avant la saisie, puis cherche au serveur rangés puis à ranger', async () => {
    api.searchStorageRepairs.mockResolvedValue({
      truncated: false,
      items: [
        {
          repair: { id: 20, client: { firstName: 'Paul', lastName: 'Dupont' } },
          depositedAt: '2026-10-01T00:00:00Z',
          slot: { id: 210, code: 'R2/1/A' },
        },
        {
          repair: {
            id: 30,
            client: { firstName: 'Marie', lastName: 'Dupont' },
          },
          depositedAt: '2026-10-01T00:00:00Z',
          slot: null,
        },
        {
          repair: {
            id: 1712,
            client: { firstName: 'Luc', lastName: 'Dupont' },
          },
          depositedAt: null,
          slot: null,
        },
      ],
    });
    await open();
    fireEvent.click(
      screen.getByRole('button', { name: 'R1/1/B, libre, ajouter un robot' }),
    );
    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByRole('heading', {
        name: 'Ajouter un robot en R1/1/B',
      }),
    ).toBeInTheDocument();
    const create = within(dialog).getByRole('link', {
      name: 'Créer une fiche',
    });
    expect(create).toHaveAttribute('href', 'https://operateur.forestar.be');
    expect(create).toHaveAttribute('target', '_blank');
    expect(within(dialog).queryAllByRole('listitem')).toHaveLength(0);
    expect(api.searchStorageRepairs).not.toHaveBeenCalled();
    fireEvent.change(within(dialog).getByLabelText('Rechercher un robot'), {
      target: { value: 'dupont' },
    });
    const stored = await within(dialog).findByLabelText('Robots déjà rangés');
    expect(api.searchStorageRepairs).toHaveBeenCalledTimes(1);
    const [, q, since] = api.searchStorageRepairs.mock.calls[0];
    expect(q).toBe('dupont');
    // 6 derniers mois par défaut.
    const expected = new Date();
    expected.setMonth(expected.getMonth() - 6);
    expect(since).toBe(expected.toISOString().slice(0, 10));
    expect(
      within(stored).getByRole('button', { name: /#20/ }),
    ).toHaveTextContent('R2/1/A');
    const toStore = within(dialog).getByLabelText('Robots à ranger');
    const rows = within(toStore).getAllByRole('button');
    expect(rows.map((b) => b.textContent)).toEqual([
      expect.stringMatching(/#30.*Sans emplacement/),
      expect.stringMatching(/#1712.*Non déposé/),
    ]);
    // Les rangés passent avant les robots à ranger.
    expect(
      stored.compareDocumentPosition(toStore) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
  it('dépose sur la case cliquée une fiche jamais déposée', async () => {
    api.searchStorageRepairs.mockResolvedValue({
      truncated: false,
      items: [
        {
          repair: {
            id: 1712,
            client: { firstName: 'Luc', lastName: 'Dupont' },
          },
          depositedAt: null,
          slot: null,
        },
      ],
    });
    api.commandRepairStorage.mockResolvedValue({
      location: { code: 'R1/1/B' },
    });
    await open();
    fireEvent.click(
      screen.getByRole('button', { name: 'R1/1/B, libre, ajouter un robot' }),
    );
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Rechercher un robot'), {
      target: { value: '1712' },
    });
    fireEvent.click(
      await within(dialog).findByRole('button', { name: /#1712/ }),
    );
    fireEvent.click(
      within(dialog).getByRole('button', {
        name: 'Placer #1712 : non déposé → R1/1/B',
      }),
    );
    await waitFor(() =>
      expect(api.commandRepairStorage).toHaveBeenCalledWith(
        'test',
        1712,
        expect.objectContaining({ action: 'deposit', slotId: 111 }),
      ),
    );
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  });
  it('place un robot déposé sans emplacement sur la case cliquée', async () => {
    api.searchStorageRepairs.mockResolvedValue({
      truncated: false,
      items: [
        {
          repair: {
            id: 30,
            client: { firstName: 'Marie', lastName: 'Martin' },
          },
          depositedAt: '2026-10-01T00:00:00Z',
          slot: null,
        },
      ],
    });
    api.commandRepairStorage.mockResolvedValue({
      location: { code: 'R1/1/B' },
    });
    await open();
    fireEvent.click(
      screen.getByRole('button', { name: 'R1/1/B, libre, ajouter un robot' }),
    );
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Rechercher un robot'), {
      target: { value: 'martin' },
    });
    fireEvent.click(await within(dialog).findByRole('button', { name: /#30/ }));
    fireEvent.click(
      within(dialog).getByRole('button', {
        name: 'Placer #30 : sans emplacement → R1/1/B',
      }),
    );
    await waitFor(() =>
      expect(api.commandRepairStorage).toHaveBeenCalledWith(
        'test',
        30,
        expect.objectContaining({ action: 'assign', slotId: 111 }),
      ),
    );
  });
  it('déplace ici un robot déjà rangé dans un autre rack', async () => {
    api.searchStorageRepairs.mockResolvedValue({
      truncated: false,
      items: [
        {
          repair: { id: 20, client: { firstName: 'Jean', lastName: 'Dupont' } },
          depositedAt: '2026-10-01T00:00:00Z',
          slot: { id: 210, code: 'R2/1/A' },
        },
      ],
    });
    api.commandRepairStorage.mockResolvedValue({
      location: { code: 'R1/1/B' },
    });
    await open();
    fireEvent.click(
      screen.getByRole('button', { name: 'R1/1/B, libre, ajouter un robot' }),
    );
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Rechercher un robot'), {
      target: { value: 'R2/1/A' },
    });
    const stored = await within(dialog).findByLabelText('Robots déjà rangés');
    fireEvent.click(within(stored).getByRole('button', { name: /#20/ }));
    fireEvent.click(
      within(dialog).getByRole('button', {
        name: 'Déplacer #20 : R2/1/A → R1/1/B',
      }),
    );
    await waitFor(() =>
      expect(api.commandRepairStorage).toHaveBeenCalledWith(
        'test',
        20,
        expect.objectContaining({
          action: 'move',
          slotId: 111,
          expectedSlotId: 210,
        }),
      ),
    );
  });
  it('ne présélectionne pas le robot sélectionné sur la page', async () => {
    await open();
    fireEvent.click(
      screen.getByRole('button', { name: 'R1/1/A, #10 · Jean Dupont' }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'R1/1/B, libre, ajouter un robot' }),
    );
    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByRole('button', { name: 'Choisir un robot' }),
    ).toBeDisabled();
    expect(
      within(dialog).queryByRole('button', { pressed: true }),
    ).not.toBeInTheDocument();
  });
  it('laisse les places libres inertes quand le rangement est désactivé', async () => {
    const data = fixture();
    data.settings.enabled = false;
    api.getStorage.mockResolvedValue(data);
    await open();
    expect(
      screen.getByRole('button', { name: 'R1/1/B, libre' }),
    ).toBeDisabled();
  });
});
