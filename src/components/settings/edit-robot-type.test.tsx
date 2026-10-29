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
  fetchRobotTypes: vi.fn(),
  addRobotType: vi.fn(),
  deleteRobotType: vi.fn(),
  getStorage: vi.fn(),
  updateStorageSettings: vi.fn(),
}));
const notify = vi.hoisted(() => ({
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
}));
vi.mock('@/lib/api', () => api);
vi.mock('@/lib/notifications', () => notify);
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ token: 'test' }) }));
import EditRobotType from './edit-robot-type';

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  api.fetchRobotTypes.mockResolvedValue(['Automower 315', 'Ambrogio L400']);
  api.getStorage.mockResolvedValue({
    robotTypes: [
      { name: 'Automower 315', storageSize: 'STANDARD' },
      { name: 'Ambrogio L400', storageSize: 'LARGE' },
    ],
  });
  api.updateStorageSettings.mockResolvedValue({});
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

it('affiche la taille de rangement de chaque type dans une colonne', async () => {
  render(<EditRobotType />);
  expect(await screen.findByText('Taille rangement')).toBeInTheDocument();
  await waitFor(() =>
    expect(
      screen.getByRole('combobox', {
        name: 'Taille de rangement de Ambrogio L400',
      }),
    ).toHaveTextContent('2 places'),
  );
  expect(
    screen.getByRole('combobox', {
      name: 'Taille de rangement de Automower 315',
    }),
  ).toHaveTextContent('1 place');
});

it('enregistre aussitôt la taille choisie pour ce seul type', async () => {
  render(<EditRobotType />);
  const select = await screen.findByRole('combobox', {
    name: 'Taille de rangement de Automower 315',
  });
  fireEvent.click(select);
  const option = await screen.findByRole('option', { name: '2 places' });
  fireEvent.pointerDown(option, { pointerType: 'mouse' });
  fireEvent.click(option);
  await waitFor(() =>
    expect(api.updateStorageSettings).toHaveBeenCalledWith('test', {
      robotTypes: [{ name: 'Automower 315', storageSize: 'LARGE' }],
    }),
  );
  await waitFor(() =>
    expect(
      screen.getByRole('combobox', {
        name: 'Taille de rangement de Automower 315',
      }),
    ).toHaveTextContent('2 places'),
  );
  expect(notify.notifySuccess).toHaveBeenCalled();
});

it('garde l’ancienne taille et prévient quand l’enregistrement échoue', async () => {
  api.updateStorageSettings.mockRejectedValue(new Error('boom'));
  render(<EditRobotType />);
  fireEvent.click(
    await screen.findByRole('combobox', {
      name: 'Taille de rangement de Automower 315',
    }),
  );
  const option = await screen.findByRole('option', { name: '2 places' });
  fireEvent.pointerDown(option, { pointerType: 'mouse' });
  fireEvent.click(option);
  await waitFor(() => expect(notify.notifyError).toHaveBeenCalled());
  expect(
    screen.getByRole('combobox', {
      name: 'Taille de rangement de Automower 315',
    }),
  ).toHaveTextContent('1 place');
});
