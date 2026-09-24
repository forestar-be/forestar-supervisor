'use client';

import { useState, type ReactNode } from 'react';
import {
  Archive,
  ArchiveRestore,
  CalendarCheck,
  CalendarPlus,
  Download,
  Ellipsis,
  HardDriveUpload,
  History,
  Mail,
  PackageCheck,
  Phone,
  Printer,
  Tag,
  Trash2,
} from 'lucide-react';
import {
  Button,
  ConfirmDialog,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Spinner,
  StatusBadge,
} from '@forestar-be/ui';
import dayjs from '@/lib/dayjs';

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
  callCount: number;
  onOpenCallHistory: () => void;
  hasCalendarEvent: boolean;
  onCalendarEventCreate: () => void;
  onCalendarEventView: () => void;
  loadingCalendarEvent: boolean;
  onPrintTickets: () => Promise<void>;
  isPrintingTickets: boolean;
  /** Fiche archivée (R001, D-18) : lecture seule. Désarchiver et Supprimer restent actifs. */
  readOnly: boolean;
  /** ISO de l'archivage, pour le badge à côté du titre ; `null` si active. */
  archivedAt: string | null;
  onUnarchive: () => Promise<void>;
  isArchiving: boolean;
  // R003-S05 — remise au client et archivage sans sortie, disponibles sur une
  // fiche active dans tout état (D-18) : jamais proposés sur une fiche déjà
  // archivée (le bouton Désarchiver les remplace).
  onHandoverOpen: () => void;
  onArchiveWithoutExit: () => Promise<void>;
  /** Début de la deuxième ligne : dates de la fiche et état du PDF sur Dropbox. */
  details?: ReactNode;
}

/**
 * En-tête de la fiche réparation, sur deux lignes :
 * - le titre et les actions du parcours (appel, remise ou désarchivage) ;
 * - les dates et l'état du PDF, puis les actions sur le PDF.
 *
 * Tout ce qui sert rarement, ce qui est désactivé sur une fiche archivée et la
 * suppression vont dans « Plus », pour ne pas les mettre en avant.
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
  callCount,
  onOpenCallHistory,
  hasCalendarEvent,
  onCalendarEventCreate,
  onCalendarEventView,
  loadingCalendarEvent,
  onPrintTickets,
  isPrintingTickets,
  readOnly,
  archivedAt,
  onUnarchive,
  isArchiving,
  onHandoverOpen,
  onArchiveWithoutExit,
  details,
}: RepairHeaderProps) {
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  // Le menu se ferme au clic : c'est le bouton « Plus » qui montre qu'une de
  // ses actions tourne encore.
  const menuBusy =
    isLoadingEmail ||
    isLoadingDropbox ||
    isPrintingTickets ||
    loadingCalendarEvent ||
    (!readOnly && isArchiving);

  return (
    <div className="flex flex-col gap-3 pb-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">Fiche n°{id}</h1>
          {archivedAt && (
            <StatusBadge tone="neutral">
              Archivée le{' '}
              {dayjs(archivedAt).tz('Europe/Brussels').format('DD/MM/YYYY')}
            </StatusBadge>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {readOnly ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => void onUnarchive()}
              disabled={isArchiving}
            >
              {isArchiving ? <Spinner size="sm" /> : <ArchiveRestore />}
              Désarchiver
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => void onCall()}
                disabled={loadingCall}
              >
                {loadingCall ? <Spinner size="sm" /> : <Phone />}
                Appel client
              </Button>
              <Button
                type="button"
                onClick={onHandoverOpen}
                disabled={isArchiving}
              >
                <PackageCheck />
                Machine rendue au client
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {details}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => void onDownloadPdf()}
            disabled={isLoadingDownload}
          >
            {isLoadingDownload ? <Spinner size="sm" /> : <Download />}
            Télécharger
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void onPrintPdf()}
            disabled={isLoadingPrint}
          >
            {isLoadingPrint ? <Spinner size="sm" /> : <Printer />}
            Imprimer
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button type="button" variant="outline" />}
            >
              {menuBusy ? <Spinner size="sm" /> : <Ellipsis />}
              Plus
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onClick={() => void onSendEmail()}
                  disabled={isLoadingEmail}
                >
                  <Mail />
                  Envoyer le PDF au client
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => void onSendDropbox()}
                  disabled={isLoadingDropbox}
                >
                  <HardDriveUpload />
                  Renvoyer le PDF sur Dropbox
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => void onPrintTickets()}
                  disabled={isPrintingTickets}
                >
                  <Tag />
                  Imprimer les tickets
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                {readOnly && (
                  <DropdownMenuItem disabled>
                    <Phone />
                    Appel client
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={onOpenCallHistory}>
                  <History />
                  Historique des appels
                  {callCount > 0 && ' '}
                  {callCount > 0 && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      {callCount}
                    </span>
                  )}
                </DropdownMenuItem>
                {hasCalendarEvent ? (
                  <DropdownMenuItem
                    onClick={onCalendarEventView}
                    disabled={readOnly || loadingCalendarEvent}
                  >
                    <CalendarCheck />
                    Voir l&apos;événement d&apos;agenda
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onClick={onCalendarEventCreate}
                    disabled={readOnly || loadingCalendarEvent}
                  >
                    <CalendarPlus />
                    Ajouter à l&apos;agenda
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                {!readOnly && (
                  <DropdownMenuItem
                    onClick={() => void onArchiveWithoutExit()}
                    disabled={isArchiving}
                  >
                    <Archive />
                    Archiver sans sortie
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setConfirmDeleteOpen(true)}
                >
                  <Trash2 />
                  Supprimer la fiche
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Supprimer la fiche"
        message={
          <>
            Cette action est irréversible : les photos et la signature de cette
            fiche seront effacées du disque. Le PDF déjà envoyé sur Dropbox
            n&apos;est pas supprimé.
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
