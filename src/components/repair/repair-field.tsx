'use client';

import { Input, Textarea, cn, noAutofillProps } from '@forestar-be/ui';
import type { ReactNode } from 'react';

interface RepairFieldProps {
  label: string;
  name: string;
  value: string;
  editable: boolean;
  isMultiline?: boolean;
  onChange: (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
  endAdornment?: ReactNode;
  className?: string;
  /**
   * R009-S02 — message affiché sous le champ en édition (409 `client_conflict`
   * d'un champ unique, AC-05). Sans effet en lecture.
   */
  error?: ReactNode;
}

/**
 * Champ éditable/lecture de la fiche réparation, porté de
 * `components/repair/RepairField.tsx`.
 */
export function RepairField({
  label,
  name,
  value,
  editable,
  isMultiline = false,
  onChange,
  endAdornment,
  className,
  error,
}: RepairFieldProps) {
  if (editable) {
    return (
      <div className={cn('flex flex-col gap-1', className)}>
        <label htmlFor={name} className="text-sm font-medium text-foreground">
          {label}
        </label>
        {isMultiline ? (
          <Textarea
            id={name}
            name={name}
            value={value || ''}
            onChange={onChange}
            rows={4}
            className="w-full"
          />
        ) : (
          <Input
            {...noAutofillProps}
            id={name}
            name={name}
            value={value || ''}
            onChange={onChange}
            className="w-full"
          />
        )}
        {error && <div className="text-sm text-destructive">{error}</div>}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex gap-2',
        isMultiline ? 'flex-col' : 'flex-row items-baseline flex-wrap',
        className,
      )}
    >
      <span className="whitespace-nowrap text-sm font-medium text-muted-foreground">
        {label} :
      </span>
      <span className="break-words text-sm text-foreground">{value || ''}</span>
      {endAdornment}
    </div>
  );
}
