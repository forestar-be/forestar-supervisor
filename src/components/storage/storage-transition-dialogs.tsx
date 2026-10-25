'use client';

import { ConfirmDialog } from '@forestar-be/ui';
import type { StorageTransitionPreview } from '@/lib/storage';

/** Physical instructions are explicit; acknowledging them never claims the robot was moved. */
export function StorageTransitionDialogs({
  preview,
  reminder,
  busy,
  onCancel,
  onConfirm,
  onAcknowledge,
}: {
  preview: StorageTransitionPreview | null;
  reminder: string | null;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  onAcknowledge: () => void;
}) {
  return (
    <>
      <ConfirmDialog
        open={preview !== null}
        title="Déplacement physique du robot"
        message={`La modification de la case Hivernage affectera le robot de ${preview?.fromCode ?? 'sa position actuelle'} vers ${preview?.toCode ?? ''}. Vous devrez déplacer physiquement le robot vers cette place. Confirmer ce trajet ?`}
        confirmText="Confirmer le déplacement"
        isLoading={busy}
        onClose={() => {
          if (!busy) onCancel();
        }}
        onConfirm={onConfirm}
      />
      <ConfirmDialog
        open={reminder !== null}
        title="Robot à déplacer"
        message={reminder ?? ''}
        confirmText="J’ai compris"
        onClose={onAcknowledge}
        onConfirm={onAcknowledge}
      />
    </>
  );
}
