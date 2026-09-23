'use client';

import type { MachineRepairListItem } from '@/lib/types';
import RepairWorkCard from './RepairWorkCard';

interface KanbanColumnProps {
  title: string;
  repairs: MachineRepairListItem[];
  color: string;
  colorByState: Record<string, string>;
}

/** Colonne Kanban : un état, ses réparations, un compteur coloré. */
export default function KanbanColumn({
  title,
  repairs,
  color,
  colorByState,
}: KanbanColumnProps) {
  return (
    <div className="flex w-[320px] shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-card">
      <div
        className="sticky top-0 z-10 flex items-center gap-2 border-b-2 px-4 py-3"
        style={{ borderColor: color, backgroundColor: `${color}15` }}
      >
        <h3 className="flex-1 truncate text-base font-semibold" title={title}>
          {title}
        </h3>
        <span
          className="inline-flex min-w-[1.5rem] items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-bold text-white"
          style={{ backgroundColor: color }}
        >
          {repairs.length}
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
        {repairs.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Aucune réparation
          </p>
        ) : (
          repairs.map((repair) => (
            <RepairWorkCard
              key={repair.id}
              repair={repair}
              colorByState={colorByState}
            />
          ))
        )}
      </div>
    </div>
  );
}
