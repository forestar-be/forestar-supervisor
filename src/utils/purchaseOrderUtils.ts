import { getPurchaseOrderPhoto } from './api';
import { convertWebpToJpeg } from './common.utils';
import { notifyError } from './notifications';
import { PurchaseOrder } from './types';

/**
 * Converts a blob to base64 string
 * @param blob The blob to convert
 * @returns A promise that resolves with the base64 string
 */
export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * Fetches all photos for a purchase order and converts them to base64 format
 * @param token Authentication token
 * @param purchaseOrder The purchase order object
 * @returns A promise that resolves with an array of base64 photo strings
 */
export const fetchPurchaseOrderPhotosAsBase64 = async (
  token: string,
  purchaseOrder: PurchaseOrder,
  isClientMode = false,
): Promise<string[]> => {
  if (!token || !purchaseOrder?.photosPaths?.length) {
    return [];
  }

  try {
    // Fetch all photos as blobs and convert to base64 in a single Promise.all
    const photoDataUrls = await Promise.all(
      purchaseOrder.photosPaths.map(async (_, i) => {
        let blob = await getPurchaseOrderPhoto(
          token,
          purchaseOrder.id,
          i,
          isClientMode,
        );
        if (blob.type === 'image/webp') {
          blob = await convertWebpToJpeg(blob);
        }
        return blobToBase64(blob);
      }),
    );

    return photoDataUrls;
  } catch (error) {
    notifyError(
      `Une erreur est survenue lors de la récupération des photos du bon de commande: ${error}`,
    );
    console.error('Error fetching photos for purchase order:', error);
    return [];
  }
};
