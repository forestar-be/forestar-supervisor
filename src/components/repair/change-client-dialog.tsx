'use client';

import { useRef, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import {
  ConfirmDialog,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  noAutofillProps,
} from '@forestar-be/ui';
import { isHttpError, searchClients } from '@/lib/api';
import { notifyError } from '@/lib/notifications';
import type { ClientSummary } from '@/lib/types';

const SEARCH_DEBOUNCE_MS = 300;

interface ChangeClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string;
  /** Écarté des résultats : rattacher au même client n'a pas de sens. */
  currentClientId: number;
  onConfirm: (clientId: number) => Promise<void>;
  loading: boolean;
}

/**
 * R009-S02 (AC-06) — « Changer de client » d'une fiche active : une recherche
 * de client existant, comme sur la tablette (`/operator/clients/search`), puis
 * confirmation par `ConfirmDialog` avant de rattacher la fiche.
 */
export function ChangeClientDialog({
  open,
  onOpenChange,
  token,
  currentClientId,
  onConfirm,
  loading,
}: ChangeClientDialogProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ClientSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const [pending, setPending] = useState<ClientSummary | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const handleSearch = (value: string) => {
    setQuery(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!value.trim()) {
      setResults([]);
      return;
    }
    searchTimeout.current = setTimeout(() => {
      setSearching(true);
      searchClients(token, value.trim())
        .then((data) =>
          setResults(data.filter((client) => client.id !== currentClientId)),
        )
        .catch((error: unknown) => {
          console.error('Error searching clients:', error);
          notifyError(
            isHttpError(error)
              ? error.message
              : "Une erreur s'est produite lors de la recherche",
          );
        })
        .finally(() => setSearching(false));
    }, SEARCH_DEBOUNCE_MS);
  };

  const handleClose = (next: boolean) => {
    if (loading) return;
    if (!next) {
      setQuery('');
      setResults([]);
      setPending(null);
    }
    onOpenChange(next);
  };

  return (
    <>
      <Dialog open={open && !pending} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Changer de client</DialogTitle>
            <DialogDescription>
              Rattache cette fiche à un autre client existant.
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            {searching ? (
              <Loader2 className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            ) : (
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            )}
            <Input
              {...noAutofillProps}
              type="search"
              value={query}
              onChange={(event) => handleSearch(event.target.value)}
              placeholder="Nom, téléphone ou email"
              autoFocus
              className="pl-8"
            />
          </div>
          {results.length > 0 && (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {results.map((client) => (
                <li key={client.id}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                    onClick={() => setPending(client)}
                  >
                    <p className="font-medium">
                      {client.firstName} {client.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {[
                        client.phone || 'sans téléphone',
                        `${client.repairCount} passage${client.repairCount > 1 ? 's' : ''}`,
                      ].join(' • ')}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {query.trim() && !searching && results.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucun client trouvé</p>
          )}
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={!!pending}
        title="Changer de client"
        message={
          pending
            ? `Rattacher cette fiche à ${pending.firstName} ${pending.lastName} ?`
            : ''
        }
        type="warning"
        confirmText="Changer"
        cancelText="Annuler"
        isLoading={loading}
        onConfirm={() => {
          if (!pending) return;
          const clientId = pending.id;
          void (async () => {
            await onConfirm(clientId);
            setPending(null);
            handleClose(false);
          })();
        }}
        onClose={() => setPending(null)}
      />
    </>
  );
}
