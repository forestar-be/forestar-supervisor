'use client';

import { Trash2 } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@forestar-be/ui';

interface CallHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  callTimes: Date[];
  onRemove: (index: number) => void;
}

/**
 * Historique des appels au client, porté de `SingleRepair.tsx` (`CallTimesModal`).
 */
export function CallHistoryDialog({
  open,
  onOpenChange,
  callTimes,
  onRemove,
}: CallHistoryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Historique des appels au client</DialogTitle>
        </DialogHeader>
        {callTimes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun appel</p>
        ) : (
          <ul className="divide-y divide-border">
            {callTimes.map((time, index) => (
              <li
                key={index}
                className="flex items-center justify-between gap-2 py-2"
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Supprimer cet appel"
                  onClick={() => onRemove(index)}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
                <span className="text-sm">{time.toLocaleString('fr-FR')}</span>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
