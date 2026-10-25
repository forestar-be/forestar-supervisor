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
  fetchRepairById: vi.fn(),
  updateRepair: vi.fn(),
  previewRepairStorageTransition: vi.fn(),
  isHttpError: (error: { status?: number }) => Boolean(error.status),
}));
vi.mock('@/lib/api', () => api);
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ token: 'test' }) }));
vi.mock('next/navigation', () => ({
  useParams: () => ({ id: '1' }),
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock('@/store/hooks', () => ({
  useAppSelector: () => ({
    brands: [],
    repairerNames: [],
    replacedParts: [],
    machineType: [],
    robotType: [],
    config: {
      États: JSON.stringify({
        Terminé: 'green',
        'Terminé et en hivernage': 'purple',
        'En cours': 'blue',
      }),
    },
  }),
}));
vi.mock('./repair-header', () => ({ RepairHeader: () => null }));
vi.mock('@/components/storage/repair-storage-panel', () => ({
  RepairStoragePanel: () => null,
}));
vi.mock('./repair-select', () => ({
  RepairSelect: ({
    label,
    options,
    value,
    onChange,
    editable,
  }: {
    label: string;
    options: string[];
    value: string;
    onChange: (value: string) => void;
    editable: boolean;
  }) =>
    editable ? (
      <label>
        {label}
        <select value={value} onChange={(e) => onChange(e.target.value)}>
          {options.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </label>
    ) : (
      <span>{value}</span>
    ),
}));
vi.mock('./repair-dates-section', () => ({ RepairDatesSection: () => null }));
vi.mock('./related-repairs-dialog', () => ({
  RelatedRepairsButton: () => null,
}));
vi.mock('./working-time-editor', () => ({ WorkingTimeEditor: () => null }));
vi.mock('./replaced-parts-section', () => ({
  ReplacedPartsSection: () => null,
}));
vi.mock('./photos-section', () => ({ PhotosSection: () => null }));
vi.mock('./call-history-dialog', () => ({ CallHistoryDialog: () => null }));
vi.mock('./calendar-event-dialog', () => ({ CalendarEventDialog: () => null }));
vi.mock('./change-client-dialog', () => ({ ChangeClientDialog: () => null }));
vi.mock('./counter-print-failed-dialog', () => ({
  CounterPrintFailedDialog: () => null,
}));
vi.mock('./handover-dialog', () => ({ HandoverDialog: () => null }));
import { RepairPageClient } from './repair-page';
const fixture = {
  id: 1,
  state: 'Terminé',
  hivernage: true,
  client: {
    id: 1,
    firstName: 'Jean',
    lastName: 'Test',
    phone: '',
    email: '',
    address: '',
  },
  client_repair_count: 1,
  client_call_times: [],
  replaced_part_list: [],
  imageUrls: [],
  image_path_list: [],
  working_time_in_sec: 0,
  start_timer: null,
  entry_date: '2026-10-24',
  exit_date: null,
  machine_type_name: 'Robot',
  repair_or_maintenance: 'Entretien',
  brand_name: '',
  robot_type_name: '',
  fault_description: '',
  archived_at: null,
  devis: false,
};
const preview = {
  movement: true,
  fromCode: 'R1/1/A',
  toCode: 'R2/1/A',
  category: 'HIVERNAGE',
  token: 'preview-token',
};
beforeEach(() => {
  vi.clearAllMocks();
  api.fetchRepairById.mockResolvedValue(fixture);
  api.previewRepairStorageTransition.mockResolvedValue(preview);
  api.updateRepair.mockResolvedValue({
    ...fixture,
    state: 'Terminé et en hivernage',
  });
});
afterEach(cleanup);
it.each([false, true])(
  'reloads the complete repair after saving hivernage=%s with a scalar PATCH response',
  async (hivernage) => {
    const initial = { ...fixture, hivernage: !hivernage };
    const saved = {
      ...fixture,
      hivernage,
      replaced_part_list: [
        { quantity: 2, replacedPart: { name: 'Lame', price: 10 } },
      ],
    };
    api.fetchRepairById.mockResolvedValueOnce(initial).mockResolvedValue(saved);
    api.previewRepairStorageTransition.mockResolvedValue({ movement: false });
    api.updateRepair.mockResolvedValue({
      id: fixture.id,
      state: fixture.state,
      hivernage,
      client_call_times: [],
      working_time_in_sec: 0,
    });
    render(<RepairPageClient />);
    const card = (await screen.findByText('Détails')).closest(
      '[data-slot="card"]',
    ) as HTMLElement;
    fireEvent.click(within(card).getByRole('button', { name: 'Modifier' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Hivernage' }));
    fireEvent.click(within(card).getByRole('button', { name: 'Enregistrer' }));
    await waitFor(() => expect(api.fetchRepairById).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(
        within(card).getByRole('button', { name: 'Modifier' }),
      ).toBeInTheDocument(),
    );
    expect(api.updateRepair).toHaveBeenCalledWith('test', '1', { hivernage });
    expect(screen.getAllByText('20,00€').length).toBeGreaterThan(0);
  },
);
async function edit() {
  api.fetchRepairById.mockResolvedValueOnce({ ...fixture, hivernage: false });
  render(<RepairPageClient />);
  const title = await screen.findByText('Détails');
  const card = title.closest('[data-slot="card"]') as HTMLElement;
  fireEvent.click(within(card).getByRole('button', { name: 'Modifier' }));
  fireEvent.click(screen.getByRole('checkbox', { name: 'Hivernage' }));
  fireEvent.click(within(card).getByRole('button', { name: 'Enregistrer' }));
  await screen.findByRole('button', { name: 'Confirmer le déplacement' });
}
it('cancels without PATCH and restores the persisted state', async () => {
  await edit();
  expect(api.updateRepair).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
  await waitFor(() =>
    expect(
      screen.queryByText('Déplacement physique du robot'),
    ).not.toBeInTheDocument(),
  );
  expect(api.updateRepair).not.toHaveBeenCalled();
});
it('confirms the frozen payload and shows a physical reminder after success', async () => {
  await edit();
  api.fetchRepairById.mockResolvedValue({
    ...fixture,
    state: 'Terminé et en hivernage',
  });
  fireEvent.click(
    screen.getByRole('button', { name: 'Confirmer le déplacement' }),
  );
  await screen.findByText('Robot à déplacer');
  expect(api.updateRepair).toHaveBeenCalledWith('test', '1', {
    hivernage: true,
    storageTransition: {
      commandId: expect.any(String),
      token: 'preview-token',
    },
  });
  expect(
    screen.getByText(
      /Déplacez physiquement le robot de R1\/1\/A vers R2\/1\/A/,
    ),
  ).toBeInTheDocument();
});
it('retries the exact command after a lost response', async () => {
  api.updateRepair
    .mockRejectedValueOnce(new Error('network'))
    .mockResolvedValueOnce({ ...fixture, state: 'Terminé et en hivernage' });
  await edit();
  fireEvent.click(
    screen.getByRole('button', { name: 'Confirmer le déplacement' }),
  );
  await waitFor(() => expect(api.updateRepair).toHaveBeenCalledOnce());
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Confirmer le déplacement' }),
    ).not.toBeDisabled(),
  );
  fireEvent.click(
    screen.getByRole('button', { name: 'Confirmer le déplacement' }),
  );
  await screen.findByText('Robot à déplacer');
  expect(api.updateRepair.mock.calls[1]).toEqual(
    api.updateRepair.mock.calls[0],
  );
});

it.each([false, true])(
  'restores the completed winter status, selectable only when hivernage=%s',
  async (hivernage) => {
    api.fetchRepairById.mockResolvedValue({ ...fixture, hivernage });
    api.previewRepairStorageTransition.mockResolvedValue({ movement: false });
    render(<RepairPageClient />);
    const card = (await screen.findByText('Informations techniques')).closest(
      '[data-slot="card"]',
    ) as HTMLElement;
    fireEvent.click(within(card).getByRole('button', { name: 'Modifier' }));
    const select = screen.getByLabelText('État');
    expect(
      within(select).queryByRole('option', { name: 'Hivernage' }),
    ).not.toBeInTheDocument();
    const winter = within(select).queryByRole('option', {
      name: 'Terminé et en hivernage',
    });
    if (!hivernage) {
      expect(winter).not.toBeInTheDocument();
      return;
    }
    expect(winter).toBeInTheDocument();
    fireEvent.change(select, { target: { value: 'Terminé et en hivernage' } });
    fireEvent.click(within(card).getByRole('button', { name: 'Enregistrer' }));
    await waitFor(() =>
      expect(api.updateRepair).toHaveBeenCalledWith('test', '1', {
        state: 'Terminé et en hivernage',
      }),
    );
    expect(
      screen.queryByRole('button', { name: 'Confirmer le déplacement' }),
    ).not.toBeInTheDocument();
  },
);
