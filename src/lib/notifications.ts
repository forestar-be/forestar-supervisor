import { toast } from '@forestar-be/ui';
import type { ReactNode } from 'react';

/**
 * Notifications de l'atelier, sur le `toast` (sonner) du design system.
 *
 * L'API reprend celle de l'ancienne version react-toastify, pour que les
 * écrans portés l'appellent sans changer d'habitude. Les durées sont en
 * millisecondes.
 */
const DEFAULT_TIMEOUT = 10000;

export type NotificationId = string | number;

export const notifyInfo = (
  message: string,
  timeout: number = DEFAULT_TIMEOUT,
): NotificationId => toast.info(message, { duration: timeout });

export const notifyError = (
  message: string,
  timeout: number = DEFAULT_TIMEOUT * 3,
): NotificationId => toast.error(message, { duration: timeout });

export const notifySuccess = (
  message: string,
  timeout: number = DEFAULT_TIMEOUT,
): NotificationId => toast.success(message, { duration: timeout });

/** `false` : la notification reste jusqu'à sa fermeture. */
export const notifyWarning = (
  message: string,
  timeout: number | false = DEFAULT_TIMEOUT,
): NotificationId =>
  toast.warning(message, {
    duration: timeout === false ? Number.POSITIVE_INFINITY : timeout,
  });

export const notify = (
  message: string,
  timeout: number = DEFAULT_TIMEOUT,
): NotificationId => toast(message, { duration: timeout });

export const notifyPromise = <T>(
  promise: Promise<T>,
  successMessage: string,
  errorMessage: string,
  loadingMessage: string,
): Promise<T> => {
  toast.promise(promise, {
    loading: loadingMessage,
    success: successMessage,
    error: errorMessage,
  });
  return promise;
};

/** Notification de chargement qui se transforme en succès, erreur ou alerte. */
export class NotifyLoading {
  private readonly id: NotificationId;

  constructor(
    loadingMessage: string,
    private readonly successMessage?: ReactNode,
    private readonly errorMessage?: ReactNode,
  ) {
    this.id = toast.loading(loadingMessage);
  }

  success(message?: ReactNode) {
    toast.success(message ?? this.successMessage, {
      id: this.id,
      duration: DEFAULT_TIMEOUT,
    });
  }

  error(message?: ReactNode) {
    toast.error(message ?? this.errorMessage, {
      id: this.id,
      duration: DEFAULT_TIMEOUT * 3,
    });
  }

  warning(message?: ReactNode) {
    toast.warning(message, { id: this.id, duration: DEFAULT_TIMEOUT });
  }

  end() {
    toast.dismiss(this.id);
  }
}

export const notifyLoading = (
  loadingMessage: string,
  successMessage?: ReactNode,
  errorMessage?: ReactNode,
): NotifyLoading =>
  new NotifyLoading(loadingMessage, successMessage, errorMessage);

export const dismissNotification = (id: NotificationId) => {
  toast.dismiss(id);
};
