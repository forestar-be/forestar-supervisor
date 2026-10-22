'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Bot } from 'lucide-react';

/** Vignette de la première photo ; aucune requête de fiche par case. */
export function StorageRobotPhoto({ src }: { src?: string | null }) {
  const [failed, setFailed] = useState<string | null>(null);
  return (
    <span
      className="relative flex h-12 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-background/70 sm:h-16 sm:w-20"
      aria-hidden
    >
      {src && failed !== src ? (
        <Image
          src={src}
          alt=""
          fill
          sizes="(min-width: 640px) 80px, 56px"
          quality={65}
          loading="lazy"
          decoding="async"
          className="object-contain"
          onError={() => setFailed(src)}
        />
      ) : (
        <Bot className="size-7 text-muted-foreground" />
      )}
    </span>
  );
}
