export const getKeys = <T extends object>(obj: T) =>
  Object.keys(obj) as Array<keyof T>;

export const formatPriceNumberToFrenchFormatStr = (number: number) => {
  return number.toLocaleString('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  });
};

export const convertWebpToJpeg = (imageBlob: Blob): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // Create canvas and draw image
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // Draw image to canvas
      ctx.drawImage(img, 0, 0);

      // Convert to jpeg blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to convert to JPEG'));
          }
        },
        'image/jpeg',
        0.9, // Quality
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(imageBlob);
  });
};