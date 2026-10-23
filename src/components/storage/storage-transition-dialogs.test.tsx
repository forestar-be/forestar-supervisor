import '@testing-library/jest-dom/vitest';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { StorageTransitionDialogs } from './storage-transition-dialogs';

afterEach(cleanup);
const preview = {
  movement: true,
  fromCode: 'R2/1/A',
  toCode: 'R5/2/B',
  category: 'HIVERNAGE' as const,
  token: 'preview',
};
it('shows the exact physical journey and does nothing until explicit confirmation', () => {
  const cancel = vi.fn();
  const confirm = vi.fn();
  render(
    <StorageTransitionDialogs
      preview={preview}
      reminder={null}
      busy={false}
      onCancel={cancel}
      onConfirm={confirm}
      onAcknowledge={vi.fn()}
    />,
  );
  expect(screen.getByText(/de R2\/1\/A vers R5\/2\/B/)).toHaveTextContent(
    'déplacer physiquement',
  );
  expect(confirm).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
  expect(cancel).toHaveBeenCalledOnce();
  expect(confirm).not.toHaveBeenCalled();
});
it('confirms once and exposes a separate reminder after the server succeeds', () => {
  const confirm = vi.fn();
  const acknowledge = vi.fn();
  const { rerender } = render(
    <StorageTransitionDialogs
      preview={preview}
      reminder={null}
      busy={false}
      onCancel={vi.fn()}
      onConfirm={confirm}
      onAcknowledge={acknowledge}
    />,
  );
  fireEvent.click(
    screen.getByRole('button', { name: 'Confirmer le déplacement' }),
  );
  expect(confirm).toHaveBeenCalledOnce();
  rerender(
    <StorageTransitionDialogs
      preview={null}
      reminder="Déplacez physiquement le robot de R2/1/A vers R5/2/B."
      busy={false}
      onCancel={vi.fn()}
      onConfirm={confirm}
      onAcknowledge={acknowledge}
    />,
  );
  expect(screen.getByText('Robot à déplacer')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'J’ai compris' }));
  expect(acknowledge).toHaveBeenCalledOnce();
});
it('prevents cancellation and resubmission while saving', () => {
  const confirm = vi.fn();
  render(
    <StorageTransitionDialogs
      preview={preview}
      reminder={null}
      busy
      onCancel={vi.fn()}
      onConfirm={confirm}
      onAcknowledge={vi.fn()}
    />,
  );
  expect(screen.getByRole('button', { name: /Confirmer/ })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Annuler' })).toBeDisabled();
});
