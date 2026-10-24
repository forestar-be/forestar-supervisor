import { Snowflake, Wrench } from 'lucide-react';
import type { StorageRackCategory } from '@/lib/storage';

/** Repères communs au rangement et à la configuration des racks. */
export function rackCategoryAppearance(category?: StorageRackCategory) {
  return category === 'HIVERNAGE'
    ? {
        Icon: Snowflake,
        foreground: 'text-sky-800 dark:text-sky-200',
        header:
          'border-t-sky-700 bg-sky-50 dark:border-t-sky-300 dark:bg-sky-950/60',
        axis: 'bg-sky-50 dark:bg-sky-950/60',
        progress: 'bg-sky-700 dark:bg-sky-300',
      }
    : {
        Icon: Wrench,
        foreground: 'text-emerald-800 dark:text-emerald-200',
        header:
          'border-t-emerald-700 bg-emerald-50 dark:border-t-emerald-300 dark:bg-emerald-950/60',
        axis: 'bg-emerald-50 dark:bg-emerald-950/60',
        progress: 'bg-emerald-700 dark:bg-emerald-300',
      };
}
