'use client';

import { useState } from 'react';
import {
  ArchiveRestore,
  CalendarCheck,
  CalendarPlus,
  Download,
  HardDriveUpload,
  Info,
  Mail,
  PackageCheck,
  Phone,
  Printer,
  Trash2,
} from 'lucide-react';
import { Button, ConfirmDialog, Spinner } from '@forestar-be/ui';

interface RepairHeaderProps {
  id: string;
  onDelete: () => Promise<void>;
  isDeleting: boolean;

  // R002-S05 — PDF généré par le serveur : ces quatre actions restent
  // disponibles sur une fiche archivée (D-18), aucune ne dépend de `readOnly`.
  onDownloadPdf: () => Promise<void>;
  isLoadingDownload: boolean;
  onPrintPdf: () => Promise<void>;
  isLoadingPrint: boolean;
  onSendEmail: () => Promise<void>;
  isLoadingEmail: boolean;
  onSendDropbox: () => Promise<void>;
  isLoadingDropbox: boolean;

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
  onUnarchive: () => Promise<void>;
  isArchiving: boolean;
  // R003-S05 — remise au client et archivage sans sortie, disponibles sur une
  // fiche active dans tout état (D-18) : jamais proposés sur une fiche déjà
  // archivée (le bouton Désarchiver les remplace).
  onHandoverOpen: () => void;
  onArchiveWithoutExit: () => Promise<void>;
}

/**
 * En-tête de la fiche réparation, porté de `components/repair/RepairHeader.tsx`.
 */
export function RepairHeader({
  id,
  onDelete,
  isDeleting,
  onDownloadPdf,
  isLoadingDownload,
  onPrintPdf,
  isLoadingPrint,
  onSendEmail,
  isLoadingEmail,
  onSendDropbox,
  isLoadingDropbox,
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
  onUnarchive,
  isArchiving,
  onHandoverOpen,
  onArchiveWithoutExit,
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
          <>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onHandoverOpen}
              disabled={isArchiving}
            >
              <PackageCheck className="size-4" />
              Machine rendue au client
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void onArchiveWithoutExit()}
              disabled={isArchiving}
            >
              {isArchiving ? (
                <Spinner size="sm" />
              ) : (
                'Archiver sans sortie'
              )}
            </Button>
          </>
        )}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => void onSendDropbox()}
          disabled={isLoadingDropbox}
        >
          {isLoadingDropbox ? (
            <Spinner size="sm" />
          ) : (
            <>
              <HardDriveUpload className="size-4" />
              Envoyer sur Dropbox
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => void onSendEmail()}
          disabled={isLoadingEmail}
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
          onClick={() => void onDownloadPdf()}
          disabled={isLoadingDownload}
        >
          {isLoadingDownload ? (
            <Spinner size="sm" />
          ) : (
            <>
              <Download className="size-4" />
              Télécharger
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => void onPrintPdf()}
          disabled={isLoadingPrint}
        >
          {isLoadingPrint ? (
            <Spinner size="sm" />
          ) : (
            <>
              <Printer className="size-4" />
              Imprimer
            </>
          )}
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
