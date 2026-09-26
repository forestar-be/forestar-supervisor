'use client';

import { Trash2 } from 'lucide-react';
import { Button, MultiCombobox, QuantityStepper } from '@forestar-be/ui';
import type { MachineRepair, ReplacedPart } from '@/lib/types';
import { possibleReplacedPartToString } from '@/lib/single-repair';

interface ReplacedPartsSectionProps {
  values: MachineRepair['replaced_part_list'];
  possibleValues: ReplacedPart[];
  /** Section « Informations techniques » en édition : montre le sélecteur d'ajout. */
  editable: boolean;
  onSelectionChange: (names: string[]) => void;
  onQuantityChange: (
    replacedPart: MachineRepair['replaced_part_list'][number],
    quantity: number,
  ) => void;
  onDelete: (replacedPartName: string) => void;
  /**
   * Fiche archivée (R001, D-18) : la quantité et la suppression restent
   * rendues même hors édition de section — `editable` ne suffit pas.
   */
  readOnly?: boolean;
}

const MAX_QUANTITY = 10;

/**
 * Pièces remplacées de la fiche réparation, portées de
 * `components/repair/ReplacedPartSelect.tsx`.
 *
 * L'ancien code ne restreignait la sélection qu'aux pièces répertoriées
 * (pas de saisie libre) : `MultiCombobox` sans `allowCustomValue`. La liste
 * ci-dessous (quantité, suppression) reste modifiable même hors du mode
 * édition de la section « Informations techniques », comme avant.
 */
export function ReplacedPartsSection({
  values,
  possibleValues,
  editable,
  onSelectionChange,
  onQuantityChange,
  onDelete,
  readOnly = false,
}: ReplacedPartsSectionProps) {
  const options = possibleValues.map((part) => ({
    value: part.name,
    label: possibleReplacedPartToString(part),
  }));

  return (
    <div className="my-4 flex flex-col gap-2">
      <span className="text-sm font-medium text-muted-foreground">
        Pièces remplacées :
      </span>
      {editable && (
        <MultiCombobox
          options={options}
          value={values.map((v) => v.replacedPart.name)}
          onChange={onSelectionChange}
          placeholder="Sélectionner des pièces"
          searchPlaceholder="Rechercher une pièce…"
          emptyMessage="Aucune pièce trouvée"
          className="w-full max-w-md"
        />
      )}
      {values.length === 0 ? (
        <span className="text-sm text-muted-foreground">Aucune</span>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border">
          {values.map((replacedPart) => (
            <li
              key={replacedPart.replacedPart.name}
              className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Supprimer ${replacedPart.replacedPart.name}`}
                  disabled={readOnly}
                  onClick={() => onDelete(replacedPart.replacedPart.name)}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
                <span className="text-sm">
                  {replacedPart.replacedPart.name} —{' '}
                  {replacedPart.replacedPart.price}€
                </span>
              </div>
              <QuantityStepper
                value={replacedPart.quantity}
                min={1}
                max={MAX_QUANTITY}
                disabled={readOnly}
                label={`Quantité de ${replacedPart.replacedPart.name}`}
                onChange={(quantity) => onQuantityChange(replacedPart, quantity)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
