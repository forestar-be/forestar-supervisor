'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@forestar-be/ui';
import { groupByState } from '@/lib/repairer-work';
import type { MachineRepairListItem } from '@/lib/types';
import RepairWorkCard from './RepairWorkCard';

interface GroupedRepairListProps {
  repairs: MachineRepairListItem[];
  colorByState: Record<string, string>;
}

/** Vue accordéon (mobile, et vue « Liste » du desktop) : une section par état, dépliée par défaut. */
export default function GroupedRepairList({
  repairs,
  colorByState,
}: GroupedRepairListProps) {
  const grouped = groupByState(repairs);
  const states = Object.keys(grouped);

  return (
    <Accordion multiple defaultValue={states}>
      {states.map((state) => (
        <AccordionItem key={state} value={state}>
          <AccordionTrigger>
            {state} ({grouped[state].length})
          </AccordionTrigger>
          <AccordionContent>
            <div className="flex flex-col gap-3 pb-2">
              {grouped[state].map((repair) => (
                <RepairWorkCard
                  key={repair.id}
                  repair={repair}
                  colorByState={colorByState}
                />
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
