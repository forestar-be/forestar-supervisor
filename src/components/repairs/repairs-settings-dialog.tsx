'use client';

import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Separator,
} from '@forestar-be/ui';
import { REPAIRS_COLUMN_CHOICES } from './repairs-columns';

interface RepairsSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Visibilité effective des colonnes : absente ou `true` = affichée. */
  columnVisibility: Record<string, boolean>;
  onColumnVisibilityChange: (id: string, visible: boolean) => void;
  onReset: () => void;
}

/**
 * « Paramètres » de la liste des fiches : choix des colonnes, appliqué tout
 * de suite, et remise à zéro du tableau. La fenêtre remplace les boutons
 * « Colonnes » et « Réinitialiser » de la barre d'outils, et prend la place
 * d'expliquer ce que fait chacun.
 */
export function RepairsSettingsDialog({
  open,
  onOpenChange,
  columnVisibility,
  onColumnVisibilityChange,
  onReset,
}: RepairsSettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(92vw,44rem)]">
        <DialogHeader>
          <DialogTitle>Paramètres du tableau</DialogTitle>
          <DialogDescription>
            Ces réglages ne valent que pour cet ordinateur : ils sont gardés
            dans ce navigateur, et chaque poste de l&apos;atelier a les siens.
          </DialogDescription>
        </DialogHeader>

        <section
          className="flex flex-col gap-3"
          aria-labelledby="settings-columns"
        >
          <div className="flex flex-col gap-1">
            <h3 id="settings-columns" className="font-semibold">
              Colonnes affichées
            </h3>
            <p className="text-muted-foreground">
              Cochez les colonnes à afficher : le tableau change tout de suite.
              Sur un écran étroit, certaines colonnes sont masquées
              d&apos;office pour que le tableau reste lisible ; les cocher ici
              les ré-affiche.
            </p>
          </div>
          <ul className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            {REPAIRS_COLUMN_CHOICES.map((choice) => (
              <li key={choice.id}>
                <label className="flex cursor-pointer items-start gap-2.5">
                  <Checkbox
                    className="mt-0.5"
                    checked={columnVisibility[choice.id] !== false}
                    onCheckedChange={(checked) =>
                      onColumnVisibilityChange(choice.id, checked === true)
                    }
                  />
                  <span className="flex flex-col">
                    <span className="font-medium">{choice.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {choice.description}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </section>

        <Separator />

        <section
          className="flex flex-col gap-3"
          aria-labelledby="settings-reset"
        >
          <div className="flex flex-col gap-1">
            <h3 id="settings-reset" className="font-semibold">
              Réinitialiser le tableau
            </h3>
            <p className="text-muted-foreground">
              Remet le tableau comme au premier jour : colonnes par défaut, tri
              par date d&apos;entrée (la plus récente en haut) et 20 fiches par
              page. Efface aussi les filtres d&apos;état et de réparateur et la
              recherche en cours. Le choix entre fiches actives et archivées, et
              les fiches elles-mêmes, ne changent pas.
            </p>
          </div>
          <div>
            <Button type="button" variant="outline" onClick={onReset}>
              Réinitialiser le tableau
            </Button>
          </div>
        </section>
      </DialogContent>
    </Dialog>
  );
}
