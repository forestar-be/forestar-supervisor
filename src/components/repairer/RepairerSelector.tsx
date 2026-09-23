'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatusBadge,
} from '@forestar-be/ui';
import { getWorkloadColor } from '@/lib/repairer-work';

const TONE_BY_WORKLOAD_COLOR = {
  success: 'success',
  warning: 'warning',
  error: 'danger',
  info: 'info',
} as const;

interface RepairerSelectorProps {
  repairerNames: string[];
  selectedRepairer: string | null;
  onSelect: (repairerName: string) => void;
  workloadCounts?: Record<string, number>;
  disabled?: boolean;
}

/** Sélecteur de réparateur, avec le nombre de réparations actives de chacun. */
export default function RepairerSelector({
  repairerNames,
  selectedRepairer,
  onSelect,
  workloadCounts = {},
  disabled = false,
}: RepairerSelectorProps) {
  return (
    <Select
      value={selectedRepairer ?? undefined}
      onValueChange={(value) => {
        if (value) onSelect(value);
      }}
      disabled={disabled || repairerNames.length === 0}
    >
      <SelectTrigger className="w-full sm:w-64">
        <SelectValue placeholder="Aucun réparateur configuré" />
      </SelectTrigger>
      <SelectContent>
        {repairerNames.map((name) => {
          const count = workloadCounts[name] ?? 0;
          return (
            <SelectItem key={name} value={name}>
              <span className="flex w-full items-center justify-between gap-3">
                <span>{name}</span>
                {count > 0 && (
                  <StatusBadge tone={TONE_BY_WORKLOAD_COLOR[getWorkloadColor(count)]}>
                    {count}
                  </StatusBadge>
                )}
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
