'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from '@forestar-be/ui';

interface RepairSelectProps {
  label: string;
  name: string;
  value: string;
  options: string[];
  editable: boolean;
  onChange: (value: string) => void;
  colorByValue?: Record<string, string>;
  className?: string;
}

/**
 * Sélecteur éditable/lecture de la fiche réparation, porté de
 * `components/repair/RepairSelect.tsx`. Les couleurs d'état viennent de la
 * configuration (`config['États']`) : ce sont des données, appliquées en
 * `style` inline plutôt qu'en classes Tailwind.
 */
export function RepairSelect({
  label,
  name,
  value,
  options,
  editable,
  onChange,
  colorByValue = {},
  className,
}: RepairSelectProps) {
  if (editable) {
    return (
      <div className={cn('flex flex-col gap-1', className)}>
        <label htmlFor={name} className="text-sm font-medium text-foreground">
          {label}
        </label>
        <Select value={value} onValueChange={(next) => onChange(String(next))}>
          <SelectTrigger id={name} className="w-full">
            <SelectValue placeholder={label} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  const color = colorByValue[value];

  return (
    <div className={cn('flex flex-row items-baseline gap-2', className)}>
      <span className="whitespace-nowrap text-sm font-medium text-muted-foreground">
        {label} :
      </span>
      <span
        className="rounded px-2 py-0.5 text-sm text-foreground"
        style={color ? { backgroundColor: color, color: '#000' } : undefined}
      >
        {value}
      </span>
    </div>
  );
}
