import {
  Bounce,
  Id,
  ToastContent,
  ToastOptions,
  UpdateOptions,
  toast,
} from 'react-toastify';

// Default timeout duration for toast notifications
const DEFAULT_TIMEOUT = 10000;

/**
 * Default configuration for the toast notifications.
 * @type {ToastOptions}
 */
const NOTIFICATION_DEFAULT_CONFIG: ToastOptions = {
  position: 'top-right',
  autoClose: DEFAULT_TIMEOUT,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  progress: undefined,
  theme: 'light',
  transition: Bounce,
};

/**
 * Display an informational toast notification.
 * @param {string} message - The message to display.
 * @param {number} [timeout=5000] - The duration the toast should stay visible.
 * @param {ToastOptions | null} [additionalOptions=null] - Additional options to apply to the toast.
 * @returns {Id} - The ID of the toast.
 */
export const notifyInfo = (
  message: string,
  timeout: number = DEFAULT_TIMEOUT,
  additionalOptions: ToastOptions | null = null,
): Id =>
  toast.info(message, {
    ...NOTIFICATION_DEFAULT_CONFIG,
    autoClose: timeout,
    ...additionalOptions,
  });

/**
 * Display an error toast notification.
 * @param {string} message - The message to display.
 * @param {number} [timeout=5000] - The duration the toast should stay visible.
 * @param {ToastOptions | null} [additionalOptions=null] - Additional options to apply to the toast.
 * @returns {Id} - The ID of the toast.
 */
export const notifyError = (
  message: string,
  timeout: number = DEFAULT_TIMEOUT,
  additionalOptions: ToastOptions | null = null,
): Id =>
  toast.error(message, {
    ...NOTIFICATION_DEFAULT_CONFIG,
    autoClose: timeout,
    ...additionalOptions,
  });

/**
 * Display a success toast notification.
 * @param {string} message - The message to display.
 * @param {number} [timeout=5000] - The duration the toast should stay visible.
 * @returns {Id} - The ID of the toast.
 */
export const notifySuccess = (
  message: string,
  timeout: number = DEFAULT_TIMEOUT,
): Id =>
  toast.success(message, {
    ...NOTIFICATION_DEFAULT_CONFIG,
    autoClose: timeout,
  });

/**
 * Display a warning toast notification.
 * @param {string} message - The message to display.
 * @param {number} [timeout=5000] - The duration the toast should stay visible.
 * @returns {Id} - The ID of the toast.
 */
export const notifyWarning = (
  message: string,
  timeout: number | false = DEFAULT_TIMEOUT,
): Id =>
  toast.warning(message, {
    ...NOTIFICATION_DEFAULT_CONFIG,
    autoClose: timeout,
  });

/**
 * Display a toast notification based on the state of a promise.
 * @template T
 * @param {Promise<T>} promise - The promise to track.
 * @param {string | UpdateOptions<T>} successMessage - The message to display if the promise is fulfilled.
 * @param {string | UpdateOptions<T>} errorMessage - The message to display if the promise is rejected.
 * @param {string | UpdateOptions<T>} loadingMessage - The message to display while the promise is pending.
 * @returns {Promise<T>} - The original promise.
 */
export const notifyPromise = <T>(
  promise: Promise<T>,
  successMessage: string | UpdateOptions<T>,
  errorMessage: string | UpdateOptions<T>,
  loadingMessage: string,
): Promise<T> =>
  toast.promise(promise, {
    pending: loadingMessage,
    success: successMessage,
    error: errorMessage,
  });

/**
 * Class to handle loading notifications.
 */
class NotifyLoading {
  private readonly loadingId: Id;

  private readonly successMessage?: ToastContent;

  private readonly errorMessage?: ToastContent;

  private readonly warningMessage?: ToastContent;

  /**
   * Constructor for NotifyLoading class.
   * @param {string} loadingMessage - The message to display while loading.
   * @param {string | UpdateOptions<any> | null} successMessage - The message to display on success.
   * @param {string | UpdateOptions<any> | null} errorMessage - The message to display on error.
   * @param {string | UpdateOptions<any> | null} warningMessage - The message to display on warning.
   */
  constructor(
    loadingMessage: string,
    successMessage?: ToastContent,
    errorMessage?: ToastContent,
    warningMessage?: ToastContent,
  ) {
    this.successMessage = successMessage;
    this.errorMessage = errorMessage;
    this.loadingId = toast.loading(loadingMessage);
    this.warningMessage = warningMessage;
  }

  /**
   * Update the loading notification to a success notification.
   * @param {string | UpdateOptions<any> | null} successMessage - The message to display on success.
   */
  success(successMessage: ToastContent) {
    toast.update(this.loadingId, {
      ...NOTIFICATION_DEFAULT_CONFIG,
      render: successMessage || this.successMessage,
      type: 'success',
      isLoading: false,
    });
  }

  /**
   * Update the loading notification to an error notification.
   * @param {string | UpdateOptions<any> | null} errorMessage - The message to display on error.
   */
  error(errorMessage: ToastContent) {
    toast.update(this.loadingId, {
      ...NOTIFICATION_DEFAULT_CONFIG,
      render: errorMessage || this.errorMessage,
      type: 'error',
      isLoading: false,
    });
  }

  /**
   * Update the loading notification to a warning notification.
   * @param {string | UpdateOptions<any> | null} warningMessage - The message to display on warning.
   */
  warning(warningMessage: ToastContent) {
    toast.update(this.loadingId, {
      ...NOTIFICATION_DEFAULT_CONFIG,
      render: warningMessage || this.warningMessage,
      type: 'warning',
      isLoading: false,
    });
  }

  /**
   * Close the loading notification.
   */
  end() {
    toast.dismiss(this.loadingId);
  }
}

/**
 * Create a new NotifyLoading instance.
 * @param {string} loadingMessage - The message to display while loading.
 * @param {string | UpdateOptions<any> | null} successMessage - The message to display on success.
 * @param {string | UpdateOptions<any> | null} errorMessage - The message to display on error.
 * @returns {NotifyLoading} - A new instance of NotifyLoading.
 */
export const notifyLoading = (
  loadingMessage: string,
  successMessage: ToastContent = null,
  errorMessage: ToastContent = null,
): NotifyLoading =>
  new NotifyLoading(loadingMessage, successMessage, errorMessage);

export const notify = (
  message: string,
  timeout: number = DEFAULT_TIMEOUT,
): Id =>
  toast(message, {
    ...NOTIFICATION_DEFAULT_CONFIG,
    theme: 'light',
    autoClose: timeout,
  });

export const dismissNotification = (id: Id) => {
  toast.dismiss(id);
};
