'use client';

import Link from 'next/link';
import { AlertTriangle, Clock, Phone, User, Wrench } from 'lucide-react';
import { Badge, Card, CardContent } from '@forestar-be/ui';
import {
  formatWorkTime,
  getDaysSinceCreation,
  isDelayed,
  needsAttention,
} from '@/lib/repairer-work';
import type { MachineRepairListItem } from '@/lib/types';

interface RepairWorkCardProps {
  repair: MachineRepairListItem;
  colorByState: Record<string, string>;
}

/** Carte compacte d'une réparation, pour la vue Kanban et la vue liste de l'ouvrier. */
export default function RepairWorkCard({
  repair,
  colorByState,
}: RepairWorkCardProps) {
  const state = repair.state || 'Non commencé';
  const stateColor = colorByState[state] || '#e0e0e0';
  const daysSince = getDaysSinceCreation(repair.createdAt);
  const delayed = isDelayed(repair);
  const attention = needsAttention(repair);

  return (
    <Link
      href={`/reparation/${repair.id}`}
      className="block rounded-xl outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <Card
        size="sm"
        className="border-l-4"
        style={{ borderLeftColor: stateColor }}
      >
        <CardContent className="flex flex-col gap-2">
          <p className="truncate text-sm font-semibold">
            #{repair.id} - {repair.machine_type_name}
          </p>

          <span
            className="inline-flex w-fit items-center rounded-md px-2 py-0.5 text-xs font-medium text-black"
            style={{ backgroundColor: stateColor }}
          >
            {state}
          </span>

          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <User className="size-3.5 shrink-0" />
            <span className="truncate">
              {repair.first_name} {repair.last_name}
            </span>
          </div>

          {repair.phone && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Phone className="size-3.5 shrink-0" />
              <span className="truncate">{repair.phone}</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Wrench className="size-3.5 shrink-0" />
            <span className="truncate">
              {repair.brand_name}
              {repair.robot_type_name && ` - ${repair.robot_type_name}`}
            </span>
          </div>

          {repair.fault_description && (
            <p className="line-clamp-2 text-sm text-muted-foreground italic">
              {repair.fault_description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {repair.working_time_in_sec > 0 && (
              <Badge variant="outline" className="gap-1">
                <Clock className="size-3" />
                {formatWorkTime(repair.working_time_in_sec)}
              </Badge>
            )}
            <Badge variant="outline">
              {daysSince} jour{daysSince > 1 ? 's' : ''}
            </Badge>
            {delayed && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="size-3" />
                En retard
              </Badge>
            )}
            {!delayed && attention && (
              <Badge className="gap-1 bg-warning text-warning-foreground">
                <AlertTriangle className="size-3" />
                Attention
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
