'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';
import { useStopwatch } from 'react-timer-hook';
import type { UsePDFInstance } from '@react-pdf/renderer';
import { CheckCircle2, Pencil, Save, SearchX } from 'lucide-react';
import {
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
import { useAuth } from '@/lib/auth';
import {
  addImage,
  createRepairCalendarEvent,
  deleteImage,
  deleteRepair,
  fetchRepairById,
  getRepairTicketHtml,
  isHttpError,
  sendDriveApi,
  sendEmailApi,
  updateRepair,
} from '@/lib/api';
import { notifyError, notifySuccess, notifyWarning } from '@/lib/notifications';
import { printHtml } from '@/lib/print-html';
import { useAppSelector } from '@/store/hooks';
import type { MachineRepair, MachineRepairFromApi } from '@/lib/types';
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
import { WorkingTimeEditor } from './working-time-editor';
import { ReplacedPartsSection } from './replaced-parts-section';
import { PhotosSection } from './photos-section';
import { CallHistoryDialog } from './call-history-dialog';
import {
  CalendarEventDialog,
  type CalendarEventData,
} from './calendar-event-dialog';

const RepairPdfSection = dynamic(() => import('./repair-pdf-section'), {
  ssr: false,
});

type EditableSection = 'repairDetails' | 'technicalInfo' | 'clientInfo';

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
  const [isLoadingAddDrive, setIsLoadingAddDrive] = useState(false);
  const [isLoadingSaveCall, setIsLoadingSaveCall] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  // R004-S04 — réimpression des tickets 80 mm depuis la fiche.
  const [isPrintingTickets, setIsPrintingTickets] = useState(false);
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
  const conditions = config['Conditions générales de réparation'] || '';
  const adresse = config['Adresse'] || '';
  const telephone = config['Téléphone'] || '';
  const emailConfig = config['Email'] || '';
  const siteWeb = config['Site web'] || '';
  const titreBonPdf = config['Titre bon pdf'] || '';
  const colorByState = useMemo(() => {
    try {
      return JSON.parse(config['États'] || '{}') as Record<string, string>;
    } catch {
      return {} as Record<string, string>;
    }
  }, [config]);

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
        const repairDataWithDate: MachineRepair = {
          ...repairData,
          start_timer: repairData.start_timer
            ? new Date(repairData.start_timer)
            : null,
          client_call_times: repairData.client_call_times.map(
            (time) => new Date(time),
          ),
        };
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
      notifyError(
        "Une erreur s'est produite lors de la mise à jour de la réparation",
      );
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
      notifyError("Une erreur s'est produite lors de l'ajout de l'image");
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
      notifyError(
        "Une erreur s'est produite lors de la suppression de l'image",
      );
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

  const handleSendEmail = async (instance: UsePDFInstance) => {
    if (isRunning) {
      notifyWarning("Arrêtez le chronomètre avant d'envoyer l'email");
      return;
    }
    if (!instance.blob || !id) {
      notifyError("Une erreur s'est produite lors de la création du PDF");
      return;
    }
    setIsLoadingSendEmail(true);
    try {
      const formData = new FormData();
      formData.append(
        'attachment',
        instance.blob,
        `fiche_reparation_${id}.pdf`,
      );
      await sendEmailApi(auth.token, id, formData);
      notifySuccess('Email envoyé avec succès');
    } catch (error) {
      console.error('Error sending email:', error);
      notifyError("Une erreur s'est produite lors de l'envoi de l'email");
    } finally {
      setIsLoadingSendEmail(false);
    }
  };

  const handleSendDrive = async (instance: UsePDFInstance) => {
    if (isRunning) {
      notifyWarning(
        "Arrêtez le chronomètre avant d'ajouter le PDF à Google Drive",
      );
      return;
    }
    if (!instance.blob || !id) {
      notifyError("Une erreur s'est produite lors de la création du PDF");
      return;
    }
    setIsLoadingAddDrive(true);
    try {
      const formData = new FormData();
      formData.append(
        'attachment',
        instance.blob,
        `fiche_reparation_${id}.pdf`,
      );
      await sendDriveApi(auth.token, id, formData);
      notifySuccess('PDF ajouté au Google Drive avec succès');
    } catch (error) {
      console.error('Error sending to drive:', error);
      notifyError(
        "Une erreur s'est produite lors de l'ajout du PDF à Google Drive",
      );
    } finally {
      setIsLoadingAddDrive(false);
    }
  };

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
      className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
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
  const clientEditable = !!editableSections.clientInfo;
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

      <RepairPdfSection
        repair={repair}
        hourlyRate={hourlyRate}
        priceDevis={priceDevis}
        priceHivernage={priceHivernage}
        conditions={conditions}
        address={adresse}
        phone={telephone}
        email={emailConfig}
        website={siteWeb}
        pdfTitle={titreBonPdf}
      >
        {(instance) => (
          <RepairHeader
            id={id}
            isRunning={isRunning}
            onDelete={handleDelete}
            isDeleting={isDeleting}
            onSendDrive={() => handleSendDrive(instance)}
            isLoadingDrive={isLoadingAddDrive}
            onSendEmail={() => handleSendEmail(instance)}
            isLoadingEmail={isLoadingSendEmail}
            instance={instance}
            onCall={handleCall}
            loadingCall={isLoadingSaveCall}
            onOpenCallHistory={() => setIsCallTimesModalOpen(true)}
            hasCalendarEvent={!!repair?.eventId}
            onCalendarEventCreate={handleCalendarEventCreate}
            onCalendarEventView={handleCalendarEventView}
            loadingCalendarEvent={isLoadingCalendarEvent}
            onPrintTickets={handlePrintTickets}
            isPrintingTickets={isPrintingTickets}
          />
        )}
      </RepairPdfSection>

      <CallHistoryDialog
        open={isCallTimesModalOpen}
        onOpenChange={setIsCallTimesModalOpen}
        callTimes={repair?.client_call_times ?? []}
        onRemove={(index) => void handleRemoveCall(index)}
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
                {renderSectionToggle('clientInfo')}
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className={fieldsGridClass(clientEditable)}>
                  <RepairField
                    label="Prénom"
                    name="first_name"
                    value={repair.first_name}
                    editable={clientEditable}
                    onChange={handleChange}
                    className={fieldClass(clientEditable)}
                  />
                  <RepairField
                    label="Nom"
                    name="last_name"
                    value={repair.last_name}
                    editable={clientEditable}
                    onChange={handleChange}
                    className={fieldClass(clientEditable)}
                  />
                  <RepairField
                    label="Adresse"
                    name="address"
                    value={repair.address}
                    editable={clientEditable}
                    onChange={handleChange}
                    className={wideFieldClass(clientEditable)}
                  />
                  <RepairField
                    label="Code postal"
                    name="postal_code"
                    value={repair.postal_code ?? ''}
                    editable={clientEditable}
                    onChange={handleChange}
                    className={fieldClass(clientEditable)}
                  />
                  <RepairField
                    label="Ville"
                    name="city"
                    value={repair.city ?? ''}
                    editable={clientEditable}
                    onChange={handleChange}
                    className={fieldClass(clientEditable)}
                  />
                  <RepairField
                    label="Téléphone"
                    name="phone"
                    value={repair.phone}
                    editable={clientEditable}
                    onChange={handleChange}
                    className={fieldClass(clientEditable)}
                  />
                  <RepairField
                    label="Email"
                    name="email"
                    value={repair.email}
                    editable={clientEditable}
                    onChange={handleChange}
                    className={wideFieldClass(clientEditable)}
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
