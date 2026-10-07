'use client';

import { Printer, RotateCcw } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@forestar-be/ui';

interface CounterPrintFailedDialogProps {
  /** Message du refus ; `null` ferme la modale. */
  message: string | null;
  onClose: () => void;
  onRetry: () => void;
  onPrintHere: () => void;
}

/**
 * Impression au comptoir — secours (retour du PO, 7 oct. 2026) : les tickets
 * passent uniquement par le relais ; si le comptoir refuse ou ne répond pas,
 * cette modale dit pourquoi et propose l'impression sur ce poste.
 */
export function CounterPrintFailedDialog({
  message,
  onClose,
  onRetry,
  onPrintHere,
}: CounterPrintFailedDialogProps) {
  return (
    <Dialog open={message !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Impression au comptoir impossible</DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onRetry}>
            <RotateCcw />
            Réessayer
          </Button>
          <Button type="button" onClick={onPrintHere}>
            <Printer />
            Imprimer sur ce poste
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
