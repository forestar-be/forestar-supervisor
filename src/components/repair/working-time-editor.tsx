'use client';

import { Play, RotateCcw, Square } from 'lucide-react';
import { Button, Input } from '@forestar-be/ui';
import { getFormattedWorkingTime } from '@/lib/single-repair';
import type { ManualTimeField } from '@/lib/single-repair';

interface WorkingTimeEditorProps {
  workingTimeInSec: number;
  editable: boolean;
  isRunning: boolean;
  hours: number;
  days: number;
  minutes: number;
  seconds: number;
  onManualTimeChange: (field: ManualTimeField, value: string) => void;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
}

/**
 * Chronomètre de la fiche réparation, porté de `components/repair/TimePicker.tsx`
 * (renommé pour ne pas entrer en collision avec le `TimePicker` du design
 * system, qui sert à autre chose : une heure `HH:mm`).
 */
export function WorkingTimeEditor({
  workingTimeInSec,
  editable,
  isRunning,
  hours,
  days,
  minutes,
  seconds,
  onManualTimeChange,
  onStart,
  onStop,
  onReset,
}: WorkingTimeEditorProps) {
  return (
    <div className="mt-2 flex flex-row flex-wrap items-center gap-3">
      <span className="whitespace-nowrap text-sm font-medium text-muted-foreground">
        Temps passé :
      </span>
      {editable && !isRunning ? (
        <>
          <div className="flex flex-col gap-1">
            <label htmlFor="hour" className="text-xs text-muted-foreground">
              Heure
            </label>
            <Input
              id="hour"
              name="hour"
              className="w-20"
              value={Math.floor(workingTimeInSec / 3600)}
              onChange={(e) => onManualTimeChange('hour', e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="minute" className="text-xs text-muted-foreground">
              Minute
            </label>
            <Input
              id="minute"
              name="minute"
              className="w-20"
              value={Math.floor((workingTimeInSec % 3600) / 60)}
              onChange={(e) => onManualTimeChange('minute', e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="second" className="text-xs text-muted-foreground">
              Seconde
            </label>
            <Input
              id="second"
              name="second"
              className="w-20"
              value={workingTimeInSec % 60}
              onChange={(e) => onManualTimeChange('second', e.target.value)}
            />
          </div>
        </>
      ) : (
        <>
          <span className="w-28 text-sm font-medium">
            {isRunning ? (
              <>
                {hours + days * 24}h {minutes}m {seconds}s
              </>
            ) : (
              <>{getFormattedWorkingTime(workingTimeInSec, true)}</>
            )}
          </span>
          <Button
            type="button"
            size="sm"
            onClick={isRunning ? onStop : onStart}
          >
            {isRunning ? (
              <Square className="size-4" />
            ) : (
              <Play className="size-4" />
            )}
            {isRunning ? 'Arrêter' : 'Démarrer'}
          </Button>
          {!isRunning && (
            <Button type="button" size="sm" variant="secondary" onClick={onReset}>
              <RotateCcw className="size-4" />
              Réinitialiser
            </Button>
          )}
        </>
      )}
    </div>
  );
}
