import React from 'react';
import { toast } from 'react-toastify';
import { sendDriveApi, sendEmailApi, updateRepair } from './api';
import ReactPDF from '@react-pdf/renderer';
import { getKeys } from './common.utils';
import { MachineRepair } from './types';

export const replacedPartToString = (
  replacedPart: MachineRepair['replaced_part_list'][0],
) => {
  return `${replacedPart.quantity}x ${replacedPart.replacedPart.name} (${replacedPart.replacedPart.price}€)`;
};
export const possibleReplacedPartToString = (replacedPart: {
  name: string;
  price: number;
}) => {
  return `${replacedPart.name} - ${replacedPart.price}€`;
};
const getHoursMinutesAndSeconds = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return { hours, minutes, remainingSeconds };
};
export const getFormattedWorkingTime = (
  seconds: number,
  withSeconds = false,
) => {
  const { hours, minutes, remainingSeconds } =
    getHoursMinutesAndSeconds(seconds);
  return `${hours}h ${minutes}m ${withSeconds ? `${remainingSeconds}s` : ''}`;
};

function formatPrice(value: number) {
  return `${value.toFixed(2).replace('.', ',')}€`;
}

export function getWorkingTimePrice(repair: MachineRepair, hourlyRate: number) {
  const price = repair.working_time_in_sec * (hourlyRate / 3600);
  return formatPrice(price);
}

export function getTotalPriceParts(repair: MachineRepair) {
  const total = repair.replaced_part_list.reduce(
    (acc, replacedPart) =>
      acc + replacedPart.replacedPart.price * replacedPart.quantity,
    0,
  );
  return formatPrice(total);
}

export function getTotalPrice(
  repair: MachineRepair,
  hourlyRate: number,
  priceHivernage: number,
) {
  const partsTotal = repair.replaced_part_list.reduce(
    (acc, replacedPart) =>
      acc + replacedPart.replacedPart.price * replacedPart.quantity,
    0,
  );
  const workingTimePrice = repair.working_time_in_sec * (hourlyRate / 3600);
  return formatPrice(
    partsTotal + workingTimePrice + (repair.hivernage ? priceHivernage : 0),
  );
}

export function getSuffixPrice(showPrice: boolean, priceDevis: number) {
  return showPrice ? ` +${String(priceDevis).replace('.', ',')}€` : '';
}

export const onClickCall = async (
  repair: MachineRepair | null,
  setRepair: React.Dispatch<React.SetStateAction<MachineRepair | null>>,
  initialRepair: MachineRepair | null,
  setIsLoadingSaveCall: (arg0: boolean) => void,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  auth: { token: string },
  id: string | undefined,
  setInitialRepair: React.Dispatch<React.SetStateAction<MachineRepair | null>>,
  closeAllEditableSections: () => void,
) => {
  try {
    if (!repair || !initialRepair) {
      throw new Error('No repair found');
    }
    setIsLoadingSaveCall(true);
    const currentDateTime = new Date();
    const newRepair: MachineRepair = {
      ...repair,
      client_call_times: [...repair.client_call_times, currentDateTime],
    };
    setRepair(newRepair);
    await handleUpdate(
      newRepair,
      initialRepair,
      setLoading,
      auth,
      id,
      setInitialRepair,
      closeAllEditableSections,
    );
  } catch (e) {
    console.error('Error save call:', e);
    toast.error(
      "Une erreur s'est produite lors de de l'enregistrement de l'appel",
    );
  } finally {
    setIsLoadingSaveCall(false);
  }
};

export const onRemoveCall = async (
  repair: MachineRepair | null,
  setRepair: React.Dispatch<React.SetStateAction<MachineRepair | null>>,
  initialRepair: MachineRepair | null,
  setIsLoadingRemoveCall: (arg0: boolean) => void,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  auth: { token: string },
  id: string | undefined,
  setInitialRepair: React.Dispatch<React.SetStateAction<MachineRepair | null>>,
  closeAllEditableSections: () => void,
  index: number,
) => {
  try {
    if (!repair || !initialRepair) {
      throw new Error('No repair found');
    }
    setIsLoadingRemoveCall(true);
    const newRepair: MachineRepair = {
      ...repair,
      client_call_times: repair.client_call_times.filter((_, i) => i !== index),
    };
    setRepair(newRepair);
    await handleUpdate(
      newRepair,
      initialRepair,
      setLoading,
      auth,
      id,
      setInitialRepair,
      closeAllEditableSections,
    );
  } catch (e) {
    console.error('Error remove call:', e);
    toast.error(
      "Une erreur s'est produite lors de de la suppression de l'appel",
    );
  } finally {
    setIsLoadingRemoveCall(false);
  }
};

export const sendEmail = async (
  isRunning: boolean,
  setIsLoadingSendEmail: (arg0: boolean) => void,
  id: string | null,
  instance: any,
  auth: { token: string },
) => {
  if (isRunning) {
    toast.warn("Arrêtez le chronomètre avant d'envoyer l'email");
    return;
  }

  setIsLoadingSendEmail(true);
  try {
    // send pdf to email api
    const pdfBlob = instance.blob;
    if (!pdfBlob) {
      console.error('No pdf blob found', instance);
      toast.error("Une erreur s'est produite lors de la création du PDF");
      return;
    }
    const formData = new FormData();
    formData.append('attachment', pdfBlob, `fiche_reparation_${id}.pdf`);
    await sendEmailApi(auth.token, id!, formData);
    toast.success('Email envoyé avec succès');
  } catch (error) {
    console.error('Error sending email:', error);
    toast.error("Une erreur s'est produite lors de l'envoi de l'email");
  } finally {
    setIsLoadingSendEmail(false);
  }
};

export const sendDrive = async (
  isRunning: boolean,
  setIsLoadingAddDrive: (arg0: boolean) => void,
  id: string | null,
  instance: ReactPDF.UsePDFInstance,
  auth: { token: string },
) => {
  if (isRunning) {
    toast.warn("Arrêtez le chronomètre avant d'ajouter le PDF à Google Drive");
    return;
  }

  setIsLoadingAddDrive(true);
  try {
    // send pdf to email api
    const pdfBlob = instance.blob;
    if (!pdfBlob) {
      console.error('No pdf blob found');
      toast.error("Une erreur s'est produite lors de la création du PDF");
      return;
    }
    const formData = new FormData();
    formData.append('attachment', pdfBlob, `fiche_reparation_${id}.pdf`);
    await sendDriveApi(auth.token, id!, formData);
    toast.success('PDF ajouté au Google Drive avec succès');
  } catch (error) {
    console.error('Error sending email:', error);
    toast.error(
      "Une erreur s'est produite lors de l'ajout du PDF à Google Drive",
    );
  } finally {
    setIsLoadingAddDrive(false);
  }
};
export const handleManualTimeChange = (
  e: React.ChangeEvent<HTMLInputElement>,
  repair: MachineRepair,
  setRepair: (repair: MachineRepair) => void,
) => {
  const value = Number(String(e.target.value).replace(/\D/g, ''));
  if (!isNaN(value) && repair) {
    const name = e.target.name as 'hour' | 'minute' | 'second';
    let newTime = repair.working_time_in_sec;
    if (name === 'hour') {
      newTime = value * 3600 + (repair.working_time_in_sec % 3600);
    } else if (name === 'minute') {
      newTime =
        Math.floor(repair.working_time_in_sec / 3600) * 3600 +
        value * 60 +
        (repair.working_time_in_sec % 60);
    } else if (name === 'second') {
      newTime = Math.floor(repair.working_time_in_sec / 60) * 60 + value;
    }
    setRepair({
      ...repair,
      working_time_in_sec: newTime,
    });
  }
};
export const startTimer = (
  repair: MachineRepair,
  setRepair: (repair: MachineRepair) => void,
) => {
  if (repair) {
    setRepair({
      ...repair,
      start_timer: new Date(),
    });
  }
};
export const stopTimer = (
  repair: MachineRepair,
  setRepair: (repair: MachineRepair) => void,
  totalSeconds: number,
) => {
  if (repair) {
    console.log('stopping timer', totalSeconds);
    setRepair({
      ...repair,
      working_time_in_sec: totalSeconds,
      start_timer: null,
    });
  }
};
export const resetTimer = (
  repair: MachineRepair,
  setRepair: (repair: MachineRepair) => void,
) => {
  if (repair) {
    console.log('resetting timer');
    setRepair({
      ...repair,
      working_time_in_sec: 0,
      start_timer: null,
    });
  }
};
export const handleUpdate = async (
  repairData: MachineRepair,
  initialRepairData: MachineRepair,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  auth: { token: string },
  id: string | undefined,
  setInitialRepair: React.Dispatch<React.SetStateAction<MachineRepair | null>>,
  closeAllEditableSections: () => void,
) => {
  setLoading(true);

  const updatedData: Record<keyof MachineRepair, any> = getKeys(
    repairData,
  ).reduce((acc: any, key: keyof MachineRepair) => {
    if (repairData[key] !== initialRepairData[key]) {
      acc[key] = repairData[key];
    }
    return acc;
  }, {});

  try {
    await updateRepair(auth.token, id!, updatedData);
    toast.success('Fiche mise à jour avec succès', {
      toastId: 'successUpdateSingleRepair',
      updateId: 'successUpdateSingleRepair',
    });
    setInitialRepair(repairData);
  } catch (error) {
    console.error('Error updating repair:', error);
    toast.error(
      "Une erreur s'est produite lors de la mise à jour de la réparation",
    );
  } finally {
    setLoading(false);
    closeAllEditableSections();
  }
};
