import '@testing-library/jest-dom/vitest';
import { afterEach, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
const api = vi.hoisted(() => ({
  updateStorageSettings: vi.fn(),
  addStorageRack: vi.fn(),
  deactivateStorageRack: vi.fn(),
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
