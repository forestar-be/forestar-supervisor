'use client';

import { useMemo } from 'react';
import { COMPLETED_STATES } from '@/lib/repairer-work';
import type { MachineRepairListItem } from '@/lib/types';
import KanbanColumn from './KanbanColumn';

/** Ordre métier des états courants ; les autres suivent, par ordre alphabétique. */
const STATE_ORDER: Record<string, number> = {
  'Non commencé': 1,
  'En cours': 2,
  'En attente pièces': 3,
  'À rappeler': 4,
  'En attente client': 5,
  'Devis à faire': 6,
  'Devis en attente': 7,
};

interface KanbanBoardProps {
  repairs: MachineRepairListItem[];
  colorByState: Record<string, string>;
}

/** Tableau Kanban : une colonne par état présent parmi les réparations (hors états terminés). */
export default function KanbanBoard({
  repairs,
  colorByState,
}: KanbanBoardProps) {
  const columns = useMemo(() => {
    const statesInRepairs = new Set<string>();
    repairs.forEach((repair) => {
      statesInRepairs.add(repair.state || 'Non commencé');
    });

    const states = Array.from(statesInRepairs)
      .filter((state) => !COMPLETED_STATES.includes(state))
      .sort((a, b) => {
        const orderA = STATE_ORDER[a] ?? 999;
        const orderB = STATE_ORDER[b] ?? 999;
        return orderA !== orderB ? orderA - orderB : a.localeCompare(b);
      });

    return states.map((state) => ({
      state,
      color: colorByState[state] || '#E0E0E0',
      repairs: repairs.filter(
        (repair) => (repair.state || 'Non commencé') === state,
      ),
    }));
  }, [repairs, colorByState]);

  return (
    <div className="flex min-h-0 flex-1 gap-4 overflow-x-auto pb-2">
      {columns.map((column) => (
        <KanbanColumn
          key={column.state}
          title={column.state}
          repairs={column.repairs}
          color={column.color}
          colorByState={colorByState}
        />
      ))}
    </div>
  );
}
