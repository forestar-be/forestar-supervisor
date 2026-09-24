'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useStopwatch } from 'react-timer-hook';
import { CheckCircle2, Pencil, Save, SearchX } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  Button,
  Checkbox,
  EmptyState,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  cn,
  Spinner,
  StatusBadge,
  toast,
} from '@forestar-be/ui';
import dayjs from '@/lib/dayjs';
import { useAuth } from '@/lib/auth';
import {
  addImage,
  archiveRepair,
  createRepairCalendarEvent,
  deleteImage,
  deleteRepair,
  fetchRepairById,
  getRepairPdf,
  getRepairTicketHtml,
  handOverRepair,
  isHttpError,
  sendRepairEmail,
  sendRepairToDropbox,
  unarchiveRepair,
  updateRepair,
} from '@/lib/api';
import { notifyError, notifySuccess, notifyWarning } from '@/lib/notifications';
import { printHtml } from '@/lib/print-html';
import { useAppSelector } from '@/store/hooks';
import type {
  MachineRepair,
  MachineRepairFromApi,
  MachineRepairHandoverResult,
} from '@/lib/types';
import {
  computeManualWorkingTime,
  diffRepairFields,
  getSuffixPrice,
  getTotalPrice,
  getTotalPriceParts,
  getWorkingTimePrice,
  type ManualTimeField,
} from '@/lib/single-repair';
import { RepairHeader } from './repair-header';
import { RepairField } from './repair-field';
import { RepairSelect } from './repair-select';
import { RepairDatesSection } from './repair-dates-section';
import { RelatedRepairsButton } from './related-repairs-dialog';
import { HandoverDialog } from './handover-dialog';
import { WorkingTimeEditor } from './working-time-editor';
import { ReplacedPartsSection } from './replaced-parts-section';
import { PhotosSection } from './photos-section';
import { CallHistoryDialog } from './call-history-dialog';
import {
  CalendarEventDialog,
  type CalendarEventData,
} from './calendar-event-dialog';

type EditableSection = 'repairDetails' | 'technicalInfo';

const INVOICE_STATUS_LABEL: Record<string, string> = {
  PAID: 'Payée',
  SENT: 'Envoyée',
  DRAFT: 'Brouillon',
};

const INVOICE_STATUS_TONE: Record<string, 'success' | 'warning' | 'info'> = {
  PAID: 'success',
  SENT: 'warning',
  DRAFT: 'info',
};

/**
 * Message serveur d'un 409 `repair_archived` (fiche archivée entre-temps
 * dans un autre onglet), ou `null` pour toute autre erreur — laquelle garde
 * son message générique habituel.
 */
function archivedConflictMessage(error: unknown): string | null {
  if (!isHttpError(error)) return null;
  const data = error.data as { code?: string } | undefined;
  return data?.code === 'repair_archived' ? error.message : null;
}

/** Date les champs `Date` que le serveur renvoie en texte. */
function mapRepairFromApi(data: MachineRepairFromApi): MachineRepair {
  return {
    ...data,
    start_timer: data.start_timer ? new Date(data.start_timer) : null,
    client_call_times: data.client_call_times.map((time) => new Date(time)),
  };
}

/**
 * Fiche réparation, portée de `src/pages/SingleRepair.tsx` (CRA + MUI) vers
 * Next 16 + `@forestar-be/ui`. Chaque section (« Détails », « Informations
 * techniques », « Coordonnées du client ») garde un unique bouton
 * édition/sauvegarde, comme l'ancien code : tous les champs d'une section
 * partagent son état éditable.
 */
export function RepairPageClient() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const auth = useAuth();

  const [repair, setRepair] = useState<MachineRepair | null>(null);
  const [initialRepair, setInitialRepair] = useState<MachineRepair | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isLoadingSendEmail, setIsLoadingSendEmail] = useState(false);
  const [isLoadingDropbox, setIsLoadingDropbox] = useState(false);
  const [isLoadingDownload, setIsLoadingDownload] = useState(false);
  const [isLoadingPrint, setIsLoadingPrint] = useState(false);
  const [isLoadingSaveCall, setIsLoadingSaveCall] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  // R004-S04 — réimpression des tickets 80 mm depuis la fiche.
  const [isPrintingTickets, setIsPrintingTickets] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  // R003-S05 — « Machine rendue au client » : boîte de dialogue avec la date
  // de sortie, séparée de `isArchiving` (« Archiver sans sortie ») pour ne
  // pas désactiver le bouton d'un archivage en cours d'une autre fiche.
  const [isHandoverOpen, setIsHandoverOpen] = useState(false);
  const [isHandingOver, setIsHandingOver] = useState(false);
  const [editableSections, setEditableSections] = useState<
    Partial<Record<EditableSection, boolean>>
  >({});
  const [isCallTimesModalOpen, setIsCallTimesModalOpen] = useState(false);
  const [isCalendarEventModalOpen, setIsCalendarEventModalOpen] =
    useState(false);
  const [isLoadingCalendarEvent, setIsLoadingCalendarEvent] = useState(false);
  const [calendarEventError, setCalendarEventError] = useState<string | null>(
    null,
  );

  const {
    brands,
    repairerNames,
    replacedParts,
    machineType,
    robotType,
    config,
  } = useAppSelector((state) => state.config);

  const hourlyRate = Number(config['Taux horaire'] || '0');
  const priceDevis = Number(config['Prix devis'] || '0');
  const priceHivernage = Number(config['Prix hivernage'] || '0');
  const colorByState = useMemo(() => {
    try {
      return JSON.parse(config['États'] || '{}') as Record<string, string>;
    } catch {
      return {} as Record<string, string>;
    }
  }, [config]);

  // Fiche archivée (R001, D-18) : lecture seule tant qu'elle n'est pas
  // désarchivée. Dérivé de `archived_at`, jamais d'un état local séparé.
  const readOnly = Boolean(repair?.archived_at);

  const {
    totalSeconds,
    seconds,
    minutes,
    hours,
    days,
    isRunning,
    pause,
    reset,
  } = useStopwatch({ autoStart: false });

  // Chargement de la fiche. `id` est garanti non vide par le segment
  // dynamique `[id]` : pas de branche « identifiant manquant » à porter ici.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const repairData = (await fetchRepairById(
          id,
          auth.token,
        )) as MachineRepairFromApi;
        if (cancelled) return;
        const repairDataWithDate = mapRepairFromApi(repairData);
        setInitialRepair(repairDataWithDate);
        setRepair(repairDataWithDate);
      } catch (error) {
        if (cancelled) return;
        console.error('Error fetching repair:', error);
        if (isHttpError(error) && error.status === 404) {
          setNotFound(true);
        } else {
          notifyError(
            `Une erreur s'est produite lors de la récupération des données ${error}`,
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, auth.token]);

  const closeAllEditableSections = () => setEditableSections({});

  /**
   * Un 409 `repair_archived` veut dire que la fiche a été archivée ailleurs
   * (un autre onglet, par exemple) pendant qu'elle était affichée ici. Le
   * message du serveur est déjà notifié par l'appelant ; cette fonction
   * relit la fiche pour remplacer la valeur refusée par la valeur réelle et
   * repasser la page en lecture seule (`readOnly` se dérive d'`archived_at`),
   * plutôt que de laisser un champ modifiable qui ne s'enregistrera plus.
   */
  const reloadRepairAfterConflict = async () => {
    try {
      const repairData = (await fetchRepairById(
        id,
        auth.token,
      )) as MachineRepairFromApi;
      const repairDataWithDate = mapRepairFromApi(repairData);
      setInitialRepair(repairDataWithDate);
      setRepair(repairDataWithDate);
    } catch (error) {
      console.error('Error reloading repair after conflict:', error);
    } finally {
      closeAllEditableSections();
    }
  };

  async function handleUpdate(
    repairData: MachineRepair,
    initialRepairData: MachineRepair,
  ) {
    setLoading(true);
    const updatedData = diffRepairFields(
      repairData as unknown as Record<string, unknown>,
      initialRepairData as unknown as Record<string, unknown>,
    );
    try {
      await updateRepair(auth.token, id, updatedData);
      // Même identifiant de notification que l'ancienne version : les
      // sauvegardes rapprochées (temps de travail) mettent à jour un seul
      // toast au lieu de les empiler.
      toast.success('Fiche mise à jour avec succès', {
        id: 'successUpdateSingleRepair',
      });
      setInitialRepair(repairData);
    } catch (error) {
      console.error('Error updating repair:', error);
      const archivedMessage = archivedConflictMessage(error);
      notifyError(
        archivedMessage ??
          "Une erreur s'est produite lors de la mise à jour de la réparation",
      );
      // Fiche archivée ailleurs entre-temps (409) : la valeur refusée reste
      // affichée et modifiable tant qu'on ne relit pas la fiche réelle.
      if (archivedMessage) void reloadRepairAfterConflict();
    } finally {
      setLoading(false);
      closeAllEditableSections();
    }
  }

  // Redémarre / met en pause le chronomètre visuel selon `start_timer` —
  // synchronisation avec `react-timer-hook`, un système externe : pas d'état
  // local posé ici. La sauvegarde du démarrage/arrêt part directement des
  // gestionnaires (`handleStartTimer`/`handleStopTimer`/`handleResetTimer`),
  // seuls points qui modifient `start_timer`, plutôt que d'un effet qui la
  // regarderait changer — ce que cet effet faisait dans l'ancien code, au
  // prix d'un rendu en cascade que la nouvelle règle de lint interdit.
  useEffect(() => {
    if (!repair) return;
    if (repair.start_timer) {
      const currentOffset = repair.working_time_in_sec * 1000;
      const startTime = repair.start_timer.getTime();
      const currentTime = new Date().getTime();
      const offsetTimestamp = new Date(
        currentTime + (currentTime - startTime + currentOffset),
      );
      reset(offsetTimestamp, true);
    } else {
      pause();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repair?.start_timer]);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    if (!repair) return;
    setRepair({ ...repair, [event.target.name]: event.target.value });
  };

  const handleCheckboxField = (name: string, checked: boolean) => {
    if (!repair) return;
    setRepair({ ...repair, [name]: checked });
  };

  const handleSelectField = (name: string, value: string) => {
    if (!repair) return;
    setRepair({ ...repair, [name]: value });
  };

  const toggleEditableSection = (section: EditableSection) => {
    if (readOnly) return;
    const isSectionEditable = !editableSections[section];
    setEditableSections((prev) => ({ ...prev, [section]: isSectionEditable }));
    if (!isSectionEditable && repair && initialRepair) {
      const changed = diffRepairFields(
        repair as unknown as Record<string, unknown>,
        initialRepair as unknown as Record<string, unknown>,
      );
      if (Object.keys(changed).length > 0) {
        void handleUpdate(repair, initialRepair);
      }
    }
  };

  const handleAddImage = async (file: File) => {
    if (!repair || !id) return;
    try {
      const { imageUrls } = (await addImage(auth.token, id, file)) as {
        imageUrls: string[];
      };
      setInitialRepair((prev) => (prev ? { ...prev, imageUrls } : prev));
      setRepair((prev) => (prev ? { ...prev, imageUrls } : prev));
      notifySuccess('Image ajoutée avec succès');
    } catch (error) {
      console.error('Error adding image:', error);
      const archivedMessage = archivedConflictMessage(error);
      notifyError(
        archivedMessage ?? "Une erreur s'est produite lors de l'ajout de l'image",
      );
      if (archivedMessage) void reloadRepairAfterConflict();
    }
  };

  const handleDeleteImage = async (imageUrl: string) => {
    if (!repair || !id) return;
    const imageIndex = repair.imageUrls.findIndex((url) => url === imageUrl);
    if (imageIndex === -1) return;
    setLoading(true);
    try {
      const { imageUrls } = (await deleteImage(auth.token, id, imageIndex)) as {
        imageUrls: string[];
      };
      setInitialRepair((prev) => (prev ? { ...prev, imageUrls } : prev));
      setRepair((prev) => (prev ? { ...prev, imageUrls } : prev));
      notifySuccess('Image supprimée avec succès');
    } catch (error) {
      console.error('Error deleting image:', error);
      const archivedMessage = archivedConflictMessage(error);
      notifyError(
        archivedMessage ??
          "Une erreur s'est produite lors de la suppression de l'image",
      );
      if (archivedMessage) void reloadRepairAfterConflict();
    } finally {
      setLoading(false);
    }
  };

  const handleReplacedPartsSelectionChange = (names: string[]) => {
    if (!repair) return;
    try {
      const newList = names.map((name) => {
        const part = replacedParts.find((p) => p.name === name);
        if (!part) {
          throw new Error(`Pièce ${name} non trouvée`);
        }
        return {
          quantity:
            repair.replaced_part_list.find((p) => p.replacedPart.name === name)
              ?.quantity || 1,
          replacedPart: part,
        };
      });
      setRepair({ ...repair, replaced_part_list: newList });
    } catch (error) {
      console.error(error);
      notifyError((error as Error).message);
    }
  };

  const handleDeleteReplacedPart = (name: string) => {
    if (!repair || !initialRepair) return;
    const newList = repair.replaced_part_list.filter(
      (part) => part.replacedPart.name !== name,
    );
    const newRepair = { ...repair, replaced_part_list: newList };
    setRepair(newRepair);
    void handleUpdate(newRepair, initialRepair);
  };

  const handleUpdateReplacedPartQuantity = (
    part: MachineRepair['replaced_part_list'][number],
    quantity: number,
  ) => {
    if (!repair || !initialRepair) return;
    const newList = repair.replaced_part_list.map((p) =>
      p.replacedPart.name === part.replacedPart.name ? { ...p, quantity } : p,
    );
    const newRepair = { ...repair, replaced_part_list: newList };
    setRepair(newRepair);
    void handleUpdate(newRepair, initialRepair);
  };

  const handleManualTimeChange = (field: ManualTimeField, value: string) => {
    if (!repair) return;
    setRepair({
      ...repair,
      working_time_in_sec: computeManualWorkingTime(
        repair.working_time_in_sec,
        field,
        value,
      ),
    });
  };
  const handleStartTimer = () => {
    if (!repair || !initialRepair) return;
    const newRepair = { ...repair, start_timer: new Date() };
    setRepair(newRepair);
    void handleUpdate(newRepair, initialRepair);
  };
  const handleStopTimer = () => {
    if (!repair || !initialRepair) return;
    const newRepair = {
      ...repair,
      working_time_in_sec: totalSeconds,
      start_timer: null,
    };
    setRepair(newRepair);
    void handleUpdate(newRepair, initialRepair);
  };
  const handleResetTimer = () => {
    if (!repair || !initialRepair) return;
    const newRepair = { ...repair, working_time_in_sec: 0, start_timer: null };
    setRepair(newRepair);
    void handleUpdate(newRepair, initialRepair);
  };

  const handleDelete = async () => {
    if (!repair || !id) return;
    setIsDeleting(true);
    try {
      await deleteRepair(auth.token, id);
      router.push('/');
    } catch (error) {
      console.error('Error deleting repair:', error);
      notifyError(
        "Une erreur s'est produite lors de la suppression de la réparation",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  // Archiver (« Archiver sans sortie ») ou remettre (« Machine rendue au
  // client ») met à jour la fiche affichée sans rechargement complet
  // (R001-S05, R003-S05) : la réponse porte les colonnes de la fiche à jour
  // et le résultat de l'envoi du PDF (D-02, D-03), jamais bloquant — un échec
  // se traduit par `dropbox_pdf_pending`, qui affiche le bandeau Réessayer.
  const applyHandoverResult = (result: MachineRepairHandoverResult) => {
    const patch: Partial<MachineRepair> = {
      archived_at: result.archived_at,
      entry_date: result.entry_date,
      exit_date: result.exit_date,
      dropbox_pdf_path: result.dropbox_pdf_path,
      dropbox_pdf_uploaded_at: result.dropbox_pdf_uploaded_at,
      dropbox_pdf_pending: !result.pdf.uploaded,
    };
    setRepair((prev) => (prev ? { ...prev, ...patch } : prev));
    setInitialRepair((prev) => (prev ? { ...prev, ...patch } : prev));
    if (result.pdf.uploaded) {
      notifySuccess('Fiche archivée avec succès');
    } else {
      notifyWarning(
        `Fiche archivée, mais le PDF n'a pas été envoyé sur Dropbox : ${result.pdf.error}`,
      );
    }
  };

  const handleArchiveWithoutExit = async () => {
    if (!repair || !id) return;
    setIsArchiving(true);
    try {
      applyHandoverResult(await archiveRepair(auth.token, id));
    } catch (error) {
      console.error('Error archiving repair:', error);
      notifyError(
        isHttpError(error)
          ? error.message
          : "Une erreur s'est produite lors de l'archivage de la fiche",
      );
    } finally {
      setIsArchiving(false);
    }
  };

  const handleHandoverConfirm = async (exitDate: string) => {
    if (!repair || !id) return;
    setIsHandingOver(true);
    try {
      applyHandoverResult(await handOverRepair(auth.token, id, exitDate));
      setIsHandoverOpen(false);
    } catch (error) {
      console.error('Error handing over repair:', error);
      const archivedMessage = archivedConflictMessage(error);
      notifyError(
        archivedMessage ??
          (isHttpError(error)
            ? error.message
            : "Une erreur s'est produite lors de la remise de la machine au client"),
      );
      // Fiche déjà archivée entre-temps (409) : on ne garde pas la boîte de
      // dialogue ouverte sur une remise devenue impossible.
      if (archivedMessage) {
        setIsHandoverOpen(false);
        void reloadRepairAfterConflict();
      }
    } finally {
      setIsHandingOver(false);
    }
  };

  const handleUnarchive = async () => {
    if (!repair || !id) return;
    setIsArchiving(true);
    try {
      const { archived_at } = await unarchiveRepair(auth.token, id);
      setRepair((prev) => (prev ? { ...prev, archived_at } : prev));
      setInitialRepair((prev) => (prev ? { ...prev, archived_at } : prev));
      notifySuccess('Fiche désarchivée avec succès');
    } catch (error) {
      console.error('Error unarchiving repair:', error);
      notifyError(
        "Une erreur s'est produite lors du désarchivage de la fiche",
      );
    } finally {
      setIsArchiving(false);
    }
  };

  const handleCall = async () => {
    if (!repair || !initialRepair) return;
    setIsLoadingSaveCall(true);
    try {
      const newRepair = {
        ...repair,
        client_call_times: [...repair.client_call_times, new Date()],
      };
      setRepair(newRepair);
      await handleUpdate(newRepair, initialRepair);
    } catch (error) {
      console.error('Error save call:', error);
      notifyError(
        "Une erreur s'est produite lors de l'enregistrement de l'appel",
      );
    } finally {
      setIsLoadingSaveCall(false);
    }
  };

  const handleRemoveCall = async (index: number) => {
    if (!repair || !initialRepair) return;
    setIsLoadingSaveCall(true);
    try {
      const newRepair = {
        ...repair,
        client_call_times: repair.client_call_times.filter(
          (_, i) => i !== index,
        ),
      };
      setRepair(newRepair);
      await handleUpdate(newRepair, initialRepair);
    } catch (error) {
      console.error('Error remove call:', error);
      notifyError(
        "Une erreur s'est produite lors de la suppression de l'appel",
      );
    } finally {
      setIsLoadingSaveCall(false);
    }
  };

  /**
   * R002-S05 — les quatre actions PDF (télécharger, imprimer, email, Dropbox)
   * lisent `working_time_in_sec` en base : le temps en cours, tant que le
   * chronomètre tourne, n'y est pas encore enregistré (il ne l'est qu'à
   * l'arrêt). Même garde que l'ancien code, étendue à Imprimer et Dropbox.
   */
  const ensureTimerStopped = (action: string): boolean => {
    if (isRunning) {
      notifyWarning(`Arrêtez le chronomètre avant ${action}`);
      return false;
    }
    return true;
  };

  const handleDownloadPdf = async () => {
    if (!repair || !id) return;
    if (!ensureTimerStopped('de télécharger le PDF')) return;
    setIsLoadingDownload(true);
    try {
      // Le nom D-05 est relu avec le PDF : celui de l'état local date du
      // chargement de la fiche, et un nom, un téléphone ou une date d'entrée
      // modifiés depuis l'auraient rendu faux.
      const [blob, fresh] = await Promise.all([
        getRepairPdf(auth.token, id),
        fetchRepairById(id, auth.token) as Promise<MachineRepairFromApi>,
      ]);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fresh.pdf_file_name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      notifyError(
        isHttpError(error)
          ? error.message
          : "Une erreur s'est produite lors du téléchargement du PDF",
      );
    } finally {
      setIsLoadingDownload(false);
    }
  };

  /**
   * R002-S05 — Imprimer ouvre le PDF du serveur dans un nouvel onglet.
   *
   * `window.open('', '_blank')` est appelé de façon synchrone dans le
   * gestionnaire de clic, **avant** tout `await` — c'est ce geste-là, dans le
   * droit fil du clic, que les navigateurs autorisent. Le PDF est ensuite
   * récupéré en `Blob` (il faut l'en-tête `Authorization`, qu'une simple
   * navigation ne porte pas en mode `legacy`).
   *
   * **Mesuré, pas supposé** : poser l'URL du blob sur `printWindow.location`
   * une fois reçue échoue silencieusement — Chromium bloque la navigation
   * d'un onglet devenu inactif si elle n'est plus synchrone avec le clic
   * (`printWindow.location.href = url` ne fait rien, ni `.replace()`, ni un
   * `focus()` préalable ; reproduit hors app avec un simple
   * `window.open('', '_blank')` + `location.href` différé). Écrire le
   * document de l'onglet déjà ouvert (`document.write`, sans navigation) n'a
   * pas ce problème : la méthode retenue est donc un `<embed>` plein cadre
   * posé par `document.write` plutôt qu'une navigation de `location`.
   */
  const handlePrintPdf = async () => {
    if (!id) return;
    if (!ensureTimerStopped("d'imprimer le PDF")) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      notifyError(
        "Le navigateur a bloqué l'ouverture de l'onglet d'impression. Autorisez les fenêtres pop-up pour ce site.",
      );
      return;
    }
    setIsLoadingPrint(true);
    try {
      const blob = await getRepairPdf(auth.token, id);
      const url = URL.createObjectURL(blob);
      const title = repair?.pdf_file_name ?? `Fiche ${id}`;
      const escapedTitle = title
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      printWindow.document.write(
        `<!doctype html><html><head><title>${escapedTitle}</title>` +
          '<style>html,body{margin:0;height:100%}embed{position:absolute;inset:0;width:100%;height:100%;border:0}</style>' +
          `</head><body><embed src="${url}" type="application/pdf" /></body></html>`,
      );
      printWindow.document.close();
    } catch (error) {
      console.error('Error printing PDF:', error);
      printWindow.close();
      notifyError(
        isHttpError(error)
          ? error.message
          : "Une erreur s'est produite lors de l'ouverture du PDF pour impression",
      );
    } finally {
      setIsLoadingPrint(false);
    }
  };

  const handleSendEmail = async () => {
    if (!id) return;
    if (!ensureTimerStopped("d'envoyer l'email")) return;
    setIsLoadingSendEmail(true);
    try {
      const { message } = await sendRepairEmail(auth.token, id);
      notifySuccess(message || 'Email envoyé avec succès');
    } catch (error) {
      console.error('Error sending email:', error);
      notifyError(
        isHttpError(error)
          ? error.message
          : "Une erreur s'est produite lors de l'envoi de l'email",
      );
    } finally {
      setIsLoadingSendEmail(false);
    }
  };

  // R002-S05 — « Envoyer sur Dropbox » (ex-« Sauvegarder Google Drive »),
  // aussi utilisé par le bandeau « PDF non envoyé — Réessayer » (R003-S05,
  // AC-05) : même route, même mise à jour locale des colonnes Dropbox.
  const handleSendDropbox = async () => {
    if (!repair || !id) return;
    if (!ensureTimerStopped("d'envoyer le PDF sur Dropbox")) return;
    setIsLoadingDropbox(true);
    try {
      const { dropbox_pdf_path, dropbox_pdf_uploaded_at } =
        await sendRepairToDropbox(auth.token, id);
      const patch = {
        dropbox_pdf_path,
        dropbox_pdf_uploaded_at,
        dropbox_pdf_pending: false,
      };
      setRepair((prev) => (prev ? { ...prev, ...patch } : prev));
      setInitialRepair((prev) => (prev ? { ...prev, ...patch } : prev));
      notifySuccess('Envoyé sur Dropbox avec succès');
    } catch (error) {
      console.error('Error sending to Dropbox:', error);
      notifyError(
        isHttpError(error)
          ? error.message
          : "Une erreur s'est produite lors de l'envoi sur Dropbox",
      );
    } finally {
      setIsLoadingDropbox(false);
    }
  };

  // R003-S05 — dates d'entrée et de sortie : enregistrement immédiat par
  // `PATCH`, comme le chronomètre ou l'historique d'appels. `null` efface la
  // sortie. Un 400 (sortie avant l'entrée) ou un 409 (fiche archivée entre
  // deux onglets) revient à la valeur précédente, message du serveur affiché
  // tel quel.
  const handleDateFieldChange = async (
    field: 'entry_date' | 'exit_date',
    isoDay: string | null,
  ) => {
    if (!repair || !id) return;
    const previous = repair[field];
    setRepair((prev) => (prev ? { ...prev, [field]: isoDay } : prev));
    setInitialRepair((prev) => (prev ? { ...prev, [field]: isoDay } : prev));
    try {
      await updateRepair(auth.token, id, { [field]: isoDay });
      notifySuccess('Fiche mise à jour avec succès');
    } catch (error) {
      console.error(`Error updating ${field}:`, error);
      setRepair((prev) => (prev ? { ...prev, [field]: previous } : prev));
      setInitialRepair((prev) =>
        prev ? { ...prev, [field]: previous } : prev,
      );
      const archivedMessage = archivedConflictMessage(error);
      notifyError(
        archivedMessage ??
          (isHttpError(error)
            ? error.message
            : "Une erreur s'est produite lors de la mise à jour de la date"),
      );
      if (archivedMessage) void reloadRepairAfterConflict();
    }
  };

  const handleEntryDateChange = (date: Date) =>
    void handleDateFieldChange('entry_date', dayjs(date).format('YYYY-MM-DD'));

  const handleExitDateChange = (date: Date | undefined) =>
    void handleDateFieldChange(
      'exit_date',
      date ? dayjs(date).format('YYYY-MM-DD') : null,
    );

  // R004-S04 — réimprime les tickets 80 mm (D-11). Disponible sur une fiche
  // active comme archivée (D-18) : pas de garde d'état ici.
  const handlePrintTickets = async () => {
    if (!id) return;
    setIsPrintingTickets(true);
    try {
      const html = await getRepairTicketHtml(auth.token, id);
      await printHtml(html);
    } catch (error) {
      console.error('Error printing tickets:', error);
      notifyError(
        isHttpError(error)
          ? error.message
          : "Impossible de charger les tickets. Réessayez.",
      );
    } finally {
      setIsPrintingTickets(false);
    }
  };

  const handleCalendarEventCreate = () => {
    setCalendarEventError(null);
    setIsCalendarEventModalOpen(true);
  };

  const handleCalendarEventConfirm = async (eventData: CalendarEventData) => {
    if (!repair || !id) return;
    setIsLoadingCalendarEvent(true);
    setCalendarEventError(null);
    try {
      const response = await createRepairCalendarEvent(auth.token, {
        repairId: parseInt(id, 10),
        title: eventData.title,
        description: eventData.description,
        startDate: eventData.startDate.toISOString(),
        endDate: eventData.endDate.toISOString(),
        isFullDay: eventData.isFullDay,
      });

      if (response.success && response.repair) {
        setRepair((prev) => (prev ? { ...prev, ...response.repair } : prev));
        setInitialRepair((prev) =>
          prev ? { ...prev, ...response.repair } : prev,
        );
        notifySuccess("Événement ajouté à l'agenda avec succès");
      }
    } catch (error) {
      console.error('Error creating calendar event:', error);
      setCalendarEventError(
        "Une erreur s'est produite lors de la création de l'événement",
      );
      notifyError(
        "Une erreur s'est produite lors de la création de l'événement",
      );
    } finally {
      setIsLoadingCalendarEvent(false);
    }
  };

  const handleCalendarEventView = () => {
    if (!repair?.eventId) return;
    const calendarIdCleaned = String(repair.calendarId).replace(
      'roup.calendar.google.com',
      '',
    );
    const rawId = `${repair.eventId} ${calendarIdCleaned}`;
    const idBase64 = btoa(rawId);
    window.open(
      `https://calendar.google.com/calendar/u/0/r/eventedit/${idBase64}`,
      '_blank',
    );
  };

  if (notFound) {
    return (
      <div>
        <EmptyState
          icon={SearchX}
          title="Réparation introuvable"
          description="Cette fiche n'existe pas ou a été supprimée."
        />
      </div>
    );
  }

  if (loading && !repair) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Spinner size="lg" label="Chargement de la fiche…" />
      </div>
    );
  }

  const renderSectionToggle = (section: EditableSection) => (
    <button
      type="button"
      className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
      disabled={readOnly}
      onClick={() => toggleEditableSection(section)}
      aria-label={editableSections[section] ? 'Enregistrer' : 'Modifier'}
    >
      {editableSections[section] ? (
        <Save className="size-4" />
      ) : (
        <Pencil className="size-4" />
      )}
    </button>
  );

  // Sections Détails et Coordonnées : en lecture, libellés et valeurs
  // s'alignent en colonnes (grille de quatre colonnes, chaque champ en occupe
  // deux par sous-grille, un champ large toute la ligne) ; en édition, les
  // champs empilés se rangent sur deux colonnes.
  const fieldsGridClass = (editable: boolean) =>
    editable
      ? 'grid grid-cols-1 items-end gap-3 sm:grid-cols-2'
      : 'grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-3 gap-y-2.5 sm:grid-cols-[auto_minmax(0,1fr)_auto_minmax(0,1fr)]';
  const fieldClass = (editable: boolean) =>
    editable ? undefined : 'col-span-2 grid grid-cols-subgrid items-baseline';
  const wideFieldClass = (editable: boolean) =>
    editable
      ? 'sm:col-span-2'
      : 'col-span-full grid grid-cols-subgrid items-baseline sm:[&>:last-child]:col-span-3';
  const detailsEditable = !!editableSections.repairDetails;
  const detailFieldClass = fieldClass(detailsEditable);

  const renderCheckboxField = (
    label: string,
    name: 'warranty' | 'devis' | 'hivernage',
    value: boolean,
    suffix = '',
  ) => {
    if (!repair) return null;
    if (editableSections.repairDetails) {
      return (
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={value}
            onCheckedChange={(checked) =>
              handleCheckboxField(name, checked === true)
            }
          />
          {label}
        </label>
      );
    }
    return (
      <div
        className={cn('flex items-baseline gap-2 text-sm', detailFieldClass)}
      >
        <span className="font-medium text-muted-foreground">{label} :</span>
        <span>
          {value ? 'Oui' : 'Non'}
          {suffix}
        </span>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {loading && repair && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-transparent">
          <Spinner size="lg" />
        </div>
      )}

      {id && (
        <RepairHeader
          id={id}
          onDelete={handleDelete}
          isDeleting={isDeleting}
          onDownloadPdf={handleDownloadPdf}
          isLoadingDownload={isLoadingDownload}
          onPrintPdf={handlePrintPdf}
          isLoadingPrint={isLoadingPrint}
          onSendEmail={handleSendEmail}
          isLoadingEmail={isLoadingSendEmail}
          onSendDropbox={handleSendDropbox}
          isLoadingDropbox={isLoadingDropbox}
          onCall={handleCall}
          loadingCall={isLoadingSaveCall}
          callCount={repair?.client_call_times.length ?? 0}
          onOpenCallHistory={() => setIsCallTimesModalOpen(true)}
          hasCalendarEvent={!!repair?.eventId}
          onCalendarEventCreate={handleCalendarEventCreate}
          onCalendarEventView={handleCalendarEventView}
          loadingCalendarEvent={isLoadingCalendarEvent}
          onPrintTickets={handlePrintTickets}
          isPrintingTickets={isPrintingTickets}
          readOnly={readOnly}
          archivedAt={repair?.archived_at ?? null}
          onUnarchive={handleUnarchive}
          isArchiving={isArchiving}
          onHandoverOpen={() => setIsHandoverOpen(true)}
          onArchiveWithoutExit={handleArchiveWithoutExit}
          details={
            repair && (
              <>
                <RepairDatesSection
                  entryDate={repair.entry_date ?? repair.createdAt}
                  exitDate={repair.exit_date}
                  disabled={readOnly}
                  onEntryDateChange={handleEntryDateChange}
                  onExitDateChange={handleExitDateChange}
                />
                {repair.dropbox_pdf_uploaded_at && (
                  <span className="text-sm text-muted-foreground">
                    PDF envoyé sur Dropbox le{' '}
                    {dayjs(repair.dropbox_pdf_uploaded_at)
                      .tz('Europe/Brussels')
                      .format('DD/MM/YYYY [à] HH:mm')}
                  </span>
                )}
              </>
            )
          }
        />
      )}

      {repair?.dropbox_pdf_pending && (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            <span>PDF non envoyé — le dernier envoi sur Dropbox a échoué</span>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={() => void handleSendDropbox()}
              disabled={isLoadingDropbox}
            >
              {isLoadingDropbox ? <Spinner size="sm" /> : 'Réessayer'}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <HandoverDialog
        open={isHandoverOpen}
        onOpenChange={setIsHandoverOpen}
        state={repair?.state ?? null}
        loading={isHandingOver}
        onConfirm={handleHandoverConfirm}
      />

      <CallHistoryDialog
        open={isCallTimesModalOpen}
        onOpenChange={setIsCallTimesModalOpen}
        callTimes={repair?.client_call_times ?? []}
        onRemove={(index) => void handleRemoveCall(index)}
        readOnly={readOnly}
      />

      {repair?.serviceInvoice && (
        <Link
          href={`/factures/${repair.serviceInvoice.id}`}
          className="flex items-center gap-2 rounded-md border border-border bg-card p-3 text-sm hover:bg-accent"
        >
          <span className="font-semibold">
            Facture {repair.serviceInvoice.invoiceNumber}
          </span>
          <StatusBadge
            tone={INVOICE_STATUS_TONE[repair.serviceInvoice.status] ?? 'info'}
          >
            {INVOICE_STATUS_LABEL[repair.serviceInvoice.status] ??
              repair.serviceInvoice.status}
          </StatusBadge>
        </Link>
      )}

      {repair && (
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
          {/* Colonne gauche : détails + informations techniques */}
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader className="flex items-center gap-2">
                <CardTitle className="text-lg font-semibold">Détails</CardTitle>
                {renderSectionToggle('repairDetails')}
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className={fieldsGridClass(detailsEditable)}>
                  <RepairSelect
                    label="Type de machine"
                    name="machine_type_name"
                    value={repair.machine_type_name}
                    options={machineType}
                    editable={!!editableSections.repairDetails}
                    onChange={(v) => handleSelectField('machine_type_name', v)}
                    className={detailFieldClass}
                  />
                  <RepairField
                    label="Type"
                    name="repair_or_maintenance"
                    value={repair.repair_or_maintenance}
                    editable={!!editableSections.repairDetails}
                    onChange={handleChange}
                    className={detailFieldClass}
                  />
                  <RepairSelect
                    label="Marque"
                    name="brand_name"
                    value={repair.brand_name}
                    options={brands}
                    editable={!!editableSections.repairDetails}
                    onChange={(v) => handleSelectField('brand_name', v)}
                    className={detailFieldClass}
                  />
                  <RepairField
                    label="Code du robot"
                    name="robot_code"
                    value={repair.robot_code || ''}
                    editable={!!editableSections.repairDetails}
                    onChange={handleChange}
                    className={detailFieldClass}
                  />
                  <RepairSelect
                    label="Type de robot"
                    name="robot_type_name"
                    value={repair.robot_type_name || ''}
                    options={robotType}
                    editable={!!editableSections.repairDetails}
                    onChange={(v) => handleSelectField('robot_type_name', v)}
                    className={detailFieldClass}
                  />
                  {renderCheckboxField(
                    'Garantie',
                    'warranty',
                    repair.warranty ?? false,
                  )}
                  {renderCheckboxField(
                    'Devis',
                    'devis',
                    repair.devis,
                    getSuffixPrice(repair.devis, priceDevis),
                  )}
                  {renderCheckboxField(
                    'Hivernage',
                    'hivernage',
                    repair.hivernage,
                    getSuffixPrice(repair.hivernage, priceHivernage),
                  )}
                </div>
                <RepairField
                  label="Description"
                  name="fault_description"
                  value={repair.fault_description}
                  editable={!!editableSections.repairDetails}
                  isMultiline
                  onChange={handleChange}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex items-center gap-2">
                <CardTitle className="text-lg font-semibold">
                  Informations techniques
                </CardTitle>
                {renderSectionToggle('technicalInfo')}
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <RepairSelect
                  label="État"
                  name="state"
                  value={repair.state || 'Non commencé'}
                  options={Object.keys(colorByState)}
                  editable={!!editableSections.technicalInfo}
                  onChange={(v) => handleSelectField('state', v)}
                  colorByValue={colorByState}
                  className="max-w-sm"
                />
                <RepairField
                  label="Dernier appel au client"
                  name="last_client_call_time"
                  value={
                    repair.client_call_times.length
                      ? repair.client_call_times[
                          repair.client_call_times.length - 1
                        ].toLocaleString('fr-FR')
                      : 'Aucun appel'
                  }
                  editable={false}
                  onChange={() => {}}
                  endAdornment={
                    repair.client_call_times.length ? (
                      <CheckCircle2 className="size-4 text-success" />
                    ) : undefined
                  }
                />
                <RepairSelect
                  label="Réparateur"
                  name="repairer_name"
                  value={repair.repairer_name || 'Non attribué'}
                  options={repairerNames}
                  editable={!!editableSections.technicalInfo}
                  onChange={(v) => handleSelectField('repairer_name', v)}
                  className="max-w-sm"
                />
                <RepairField
                  label="Remarques atelier"
                  name="remark"
                  value={repair.remark ?? ''}
                  editable={!!editableSections.technicalInfo}
                  isMultiline
                  onChange={handleChange}
                />

                <WorkingTimeEditor
                  workingTimeInSec={repair.working_time_in_sec}
                  editable={!!editableSections.technicalInfo}
                  isRunning={isRunning}
                  hours={hours}
                  days={days}
                  minutes={minutes}
                  seconds={seconds}
                  onManualTimeChange={handleManualTimeChange}
                  onStart={handleStartTimer}
                  onStop={handleStopTimer}
                  onReset={handleResetTimer}
                  readOnly={readOnly}
                />
                <div className="flex items-baseline gap-2 text-sm">
                  <span className="font-medium text-muted-foreground">
                    Total temps :
                  </span>
                  <span className="font-semibold">
                    {getWorkingTimePrice(repair, hourlyRate)}
                  </span>
                </div>

                <ReplacedPartsSection
                  values={repair.replaced_part_list}
                  possibleValues={replacedParts}
                  editable={!!editableSections.technicalInfo}
                  onSelectionChange={handleReplacedPartsSelectionChange}
                  onQuantityChange={handleUpdateReplacedPartQuantity}
                  onDelete={handleDeleteReplacedPart}
                  readOnly={readOnly}
                />
                <div className="flex items-baseline gap-2 text-sm">
                  <span className="font-medium text-muted-foreground">
                    Total pièces :
                  </span>
                  <span className="font-semibold">
                    {getTotalPriceParts(repair)}
                  </span>
                </div>
                <div className="flex items-baseline gap-2 text-sm">
                  <span className="font-medium text-muted-foreground">
                    Total :
                  </span>
                  <span className="font-semibold">
                    {getTotalPrice(repair, hourlyRate, priceHivernage)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Colonne droite : coordonnées client, signature, photos */}
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader className="flex items-center gap-2">
                <CardTitle className="text-lg font-semibold">
                  Coordonnées du client
                </CardTitle>
                {/* R007-S04 (D-19) — le client n'appartient plus à la fiche :
                    ces coordonnées se modifient depuis la fiche client
                    (R009-S02), pas encore câblé ici. */}
                {/* `key={id}` : remonte le bouton à chaque changement de
                    fiche, pour qu'il se recharge sans `setState` synchrone
                    dans son effet. */}
                {id && (
                  <RelatedRepairsButton key={id} id={id} token={auth.token} />
                )}
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className={fieldsGridClass(false)}>
                  <RepairField
                    label="Prénom"
                    name="client_first_name"
                    value={repair.client.firstName}
                    editable={false}
                    onChange={() => {}}
                    className={fieldClass(false)}
                  />
                  <RepairField
                    label="Nom"
                    name="client_last_name"
                    value={repair.client.lastName}
                    editable={false}
                    onChange={() => {}}
                    className={fieldClass(false)}
                  />
                  <RepairField
                    label="Adresse"
                    name="client_address"
                    value={repair.client.address}
                    editable={false}
                    onChange={() => {}}
                    className={wideFieldClass(false)}
                  />
                  <RepairField
                    label="Code postal"
                    name="client_postal_code"
                    value={repair.client.postalCode ?? ''}
                    editable={false}
                    onChange={() => {}}
                    className={fieldClass(false)}
                  />
                  <RepairField
                    label="Ville"
                    name="client_city"
                    value={repair.client.city ?? ''}
                    editable={false}
                    onChange={() => {}}
                    className={fieldClass(false)}
                  />
                  <RepairField
                    label="Téléphone"
                    name="client_phone"
                    value={repair.client.phone}
                    editable={false}
                    onChange={() => {}}
                    className={fieldClass(false)}
                  />
                  <RepairField
                    label="Email"
                    name="client_email"
                    value={repair.client.email}
                    editable={false}
                    onChange={() => {}}
                    className={wideFieldClass(false)}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  {repair.signatureUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={repair.signatureUrl}
                      alt="Signature client"
                      loading="lazy"
                      width={150}
                      className="bg-white"
                    />
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      Pas de signature disponible
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    Signature client
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <PhotosSection
                  imageUrls={repair.imageUrls}
                  onAdd={handleAddImage}
                  onDelete={handleDeleteImage}
                  readOnly={readOnly}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <CalendarEventDialog
        open={isCalendarEventModalOpen}
        onOpenChange={setIsCalendarEventModalOpen}
        onConfirm={handleCalendarEventConfirm}
        repair={repair}
        loading={isLoadingCalendarEvent}
        error={calendarEventError}
      />
    </div>
  );
}
