'use client';

import { useRef, useState } from 'react';
import imageCompression from 'browser-image-compression';
import { Camera } from 'lucide-react';
import { Button, ImageLightbox, Spinner } from '@forestar-be/ui';
import { notifyError } from '@/lib/notifications';

const MAX_SIZE_MB = 0.05;
const MAX_WIDTH_OR_HEIGHT = 1024;
const MAX_PHOTOS = 5;

interface PhotosSectionProps {
  imageUrls: string[];
  onAdd: (file: File) => Promise<void>;
  onDelete: (imageUrl: string) => Promise<void>;
  /** Fiche archivée (R001, D-18) : ni ajout ni retrait de photo. */
  readOnly?: boolean;
}

/**
 * Photos de la fiche réparation, portées de `components/repair/RightGrid.tsx`
 * (partie photos). Compression en webp avant envoi, visionneuse et
 * suppression confirmée via `ImageLightbox` (`ConfirmDialog` intégré : plus
 * de `window.confirm`).
 */
export function PhotosSection({
  imageUrls,
  onAdd,
  onDelete,
  readOnly = false,
}: PhotosSectionProps) {
  const [loadingImage, setLoadingImage] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setLoadingImage(true);
    try {
      const compressedFile = await imageCompression(file, {
        maxSizeMB: MAX_SIZE_MB,
        maxWidthOrHeight: MAX_WIDTH_OR_HEIGHT,
        useWebWorker: true,
        fileType: 'image/webp',
      });
      const compressedBlob = new Blob([compressedFile], {
        type: 'image/webp',
      });
      const compressedFileObj = new File(
        [compressedBlob],
        `${file.name}.webp`,
        { type: 'image/webp' },
      );
      await onAdd(compressedFileObj);
    } catch (error) {
      console.error('Error compressing the image:', error);
      notifyError("Une erreur s'est produite lors de l'ajout de l'image");
    } finally {
      setLoadingImage(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Photos</h3>
        <Button
          type="button"
          size="sm"
          disabled={readOnly || loadingImage || imageUrls.length >= MAX_PHOTOS}
          onClick={() => inputRef.current?.click()}
        >
          {loadingImage ? (
            <Spinner size="sm" />
          ) : (
            <>
              <Camera className="size-4" />
              Ajouter
            </>
          )}
        </Button>
        <input
          ref={inputRef}
          type="file"
          hidden
          accept="image/*"
          capture="environment"
          name="add-photo"
          onChange={handleFileChange}
        />
      </div>
      <ImageLightbox
        images={imageUrls.map((url) => ({ src: url, alt: 'Photo réparation' }))}
        onDelete={
          readOnly
            ? undefined
            : (index) => {
                const url = imageUrls[index];
                if (url) void onDelete(url);
              }
        }
        emptyMessage="Pas de photo disponible"
        className="grid-cols-2"
      />
    </div>
  );
}
