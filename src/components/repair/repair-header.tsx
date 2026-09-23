'use client';

import { useState } from 'react';
import type { UsePDFInstance } from '@react-pdf/renderer';
import {
  Archive,
  ArchiveRestore,
  CalendarCheck,
  CalendarPlus,
  Download,
  HardDriveUpload,
  Info,
  Mail,
  Phone,
  Printer,
  Trash2,
} from 'lucide-react';
import { Button, ConfirmDialog, Spinner } from '@forestar-be/ui';
import { notifyWarning } from '@/lib/notifications';

interface RepairHeaderProps {
  id: string;
  isRunning: boolean;
  onDelete: () => Promise<void>;
  isDeleting: boolean;
  onSendDrive: () => Promise<void>;
  isLoadingDrive: boolean;
  onSendEmail: () => Promise<void>;
  isLoadingEmail: boolean;
  instance: UsePDFInstance;
  onCall: () => Promise<void>;
  loadingCall: boolean;
  onOpenCallHistory: () => void;
  hasCalendarEvent: boolean;
  onCalendarEventCreate: () => void;
  onCalendarEventView: () => void;
  loadingCalendarEvent: boolean;
  onPrintTickets: () => Promise<void>;
  isPrintingTickets: boolean;
  /** Fiche archivée (R001, D-18) : lecture seule. Désarchiver et Supprimer restent actifs. */
  readOnly: boolean;
  onArchive: () => Promise<void>;
  onUnarchive: () => Promise<void>;
  isArchiving: boolean;
}

/**
 * En-tête de la fiche réparation, porté de `components/repair/RepairHeader.tsx`.
 */
export function RepairHeader({
  id,
  isRunning,
  onDelete,
  isDeleting,
  onSendDrive,
  isLoadingDrive,
  onSendEmail,
  isLoadingEmail,
  instance,
  onCall,
  loadingCall,
  onOpenCallHistory,
  hasCalendarEvent,
  onCalendarEventCreate,
  onCalendarEventView,
  loadingCalendarEvent,
  onPrintTickets,
  isPrintingTickets,
  readOnly,
  onArchive,
  onUnarchive,
  isArchiving,
}: RepairHeaderProps) {
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pb-2">
      <h1 className="text-2xl font-semibold">Fiche n°{id}</h1>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={() => setConfirmDeleteOpen(true)}
        >
          <Trash2 className="size-4" />
          Supprimer
        </Button>
        {readOnly ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => void onUnarchive()}
            disabled={isArchiving}
          >
            {isArchiving ? (
              <Spinner size="sm" />
            ) : (
              <>
                <ArchiveRestore className="size-4" />
                Désarchiver
              </>
            )}
          </Button>
        ) : (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => void onArchive()}
            disabled={isArchiving}
          >
            {isArchiving ? (
              <Spinner size="sm" />
            ) : (
              <>
                <Archive className="size-4" />
                Archiver
              </>
            )}
          </Button>
        )}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => void onSendDrive()}
          disabled={isLoadingDrive || instance.loading || !instance.blob}
        >
          {isLoadingDrive ? (
            <Spinner size="sm" />
          ) : (
            <>
              <HardDriveUpload className="size-4" />
              Sauvegarder Google Drive
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => void onSendEmail()}
          disabled={isLoadingEmail || instance.loading || !instance.blob}
        >
          {isLoadingEmail ? (
            <Spinner size="sm" />
          ) : (
            <>
              <Mail className="size-4" />
              Envoyer au client
            </>
          )}
        </Button>
        <Button
          type="button"
          size="sm"
          nativeButton={false}
          disabled={instance.loading || !instance.url}
          render={
            <a
              href={instance.url ?? undefined}
              download={`fiche_reparation_${id}.pdf`}
              onClick={(event) => {
                if (isRunning) {
                  event.preventDefault();
                  notifyWarning('Arrêtez le chronomètre avant de télécharger le PDF');
                }
              }}
            />
          }
        >
          <Download className="size-4" />
          Télécharger
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => void onPrintTickets()}
          disabled={isPrintingTickets}
        >
          {isPrintingTickets ? (
            <Spinner size="sm" />
          ) : (
            <>
              <Printer className="size-4" />
              Imprimer les tickets
            </>
          )}
        </Button>
        {hasCalendarEvent ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onCalendarEventView}
            disabled={readOnly || loadingCalendarEvent}
          >
            {loadingCalendarEvent ? (
              <Spinner size="sm" />
            ) : (
              <>
                <CalendarCheck className="size-4" />
                Voir l&apos;événement
              </>
            )}
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            onClick={onCalendarEventCreate}
            disabled={readOnly || loadingCalendarEvent}
          >
            {loadingCalendarEvent ? (
              <Spinner size="sm" />
            ) : (
              <>
                <CalendarPlus className="size-4" />
                Ajouter à l&apos;agenda
              </>
            )}
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          onClick={() => void onCall()}
          disabled={readOnly || loadingCall}
        >
          {loadingCall ? (
            <Spinner size="sm" />
          ) : (
            <>
              <Phone className="size-4" />
              Appel client
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Historique des appels"
          onClick={onOpenCallHistory}
        >
          <Info className="size-4" />
        </Button>
      </div>
      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Supprimer la fiche"
        message={
          <>
            Cette action est irréversible : les photos et la signature de
            cette fiche seront effacées du disque. Le PDF déjà envoyé sur
            Dropbox n&apos;est pas supprimé.
          </>
        }
        type="delete"
        isLoading={isDeleting}
        onConfirm={() => void onDelete()}
        onClose={() => setConfirmDeleteOpen(false)}
        requireTypedValue={`supprimer fiche ${id}`}
      />
    </div>
  );
}
