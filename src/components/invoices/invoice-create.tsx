'use client';

import { useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { createServiceInvoice, isHttpError, searchRepairsForInvoice } from '@/lib/api';
import { notifyError, notifySuccess } from '@/lib/notifications';
import type { RepairForInvoice } from '@/lib/types';
import InvoiceForm, { type InvoiceFormData } from './invoice-form';
import {
  Button,
  PageHeader,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@forestar-be/ui';
import { ArrowLeft, Loader2, Search } from 'lucide-react';

/**
 * Création d'une facture de réparation, portée depuis
 * `ServiceInvoiceCreate.tsx` : soit un nouveau client saisi à la main, soit
 * un import depuis une réparation existante (recherche puis pré-remplissage).
 */
export default function InvoiceCreate() {
  const router = useRouter();
  const { token } = useAuth();
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'new' | 'import'>('new');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<RepairForInvoice[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedRepair, setSelectedRepair] = useState<RepairForInvoice | null>(
    null,
  );
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const handleSearch = useCallback(
    (q: string) => {
      setSearchQuery(q);
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
      if (!q.trim() || !token) {
        setSearchResults([]);
        return;
      }
      searchTimeout.current = setTimeout(async () => {
        setSearching(true);
        try {
          const results = await searchRepairsForInvoice(token, q.trim());
          setSearchResults(results);
        } catch {
          setSearchResults([]);
        } finally {
          setSearching(false);
        }
      }, 400);
    },
    [token],
  );

  const handleSelectRepair = (repair: RepairForInvoice) => {
    setSelectedRepair(repair);
    setSearchResults([]);
    setSearchQuery('');
  };

  const getInitialData = (): Partial<InvoiceFormData> | undefined => {
    if (!selectedRepair) return undefined;
    return {
      clientFirstName: selectedRepair.first_name,
      clientLastName: selectedRepair.last_name,
      clientPhone: selectedRepair.phone,
      clientEmail: selectedRepair.email,
      clientAddress: selectedRepair.address || '',
      clientCity: selectedRepair.city || '',
      clientPostalCode: selectedRepair.postal_code || '',
      machineRepairId: selectedRepair.id,
    };
  };

  const handleSubmit = async (data: InvoiceFormData) => {
    setSaving(true);
    try {
      const result = await createServiceInvoice(token, {
        ...data,
        type: 'REPAIR',
      });
      notifySuccess('Facture créée');
      router.push(`/factures/${result.id}`);
    } catch (err) {
      notifyError(
        isHttpError(err) ? err.message : 'Erreur lors de la création',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <Button
        variant="ghost"
        size="sm"
        render={<Link href="/factures" />}
        nativeButton={false}
      >
        <ArrowLeft />
        Retour aux factures
      </Button>

      <PageHeader title="Nouvelle facture de réparation" />

      <Tabs
        value={tab}
        onValueChange={(v) => {
          if (!v) return;
          setTab(v as 'new' | 'import');
          setSelectedRepair(null);
        }}
      >
        <TabsList>
          <TabsTrigger value="new">Nouveau client</TabsTrigger>
          <TabsTrigger value="import">Import depuis réparation</TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="space-y-3">
          {!selectedRepair && (
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="mb-2 text-sm font-medium text-muted-foreground">
                Rechercher une réparation
              </p>
              <div className="relative">
                {searching ? (
                  <Loader2 className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                ) : (
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                )}
                <input
                  className="h-9 w-full rounded-xl border border-input bg-transparent pl-8 pr-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                  placeholder="Nom, téléphone, email..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
              {searchResults.length > 0 && (
                <ul className="mt-2 divide-y divide-border rounded-lg border border-border">
                  {searchResults.map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                        onClick={() => handleSelectRepair(r)}
                      >
                        <p className="font-medium">
                          #{r.id} — {r.first_name} {r.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {[
                            r.phone,
                            r.repair_or_maintenance,
                            r.brand_name,
                            r.robot_type_name,
                          ]
                            .filter(Boolean)
                            .join(' • ')}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {searchQuery.trim() && !searching && searchResults.length === 0 && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Aucune réparation trouvée
                </p>
              )}
            </div>
          )}

          {selectedRepair && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm dark:border-blue-900 dark:bg-blue-950/40">
              <p className="text-blue-800 dark:text-blue-300">
                Import depuis la réparation #{selectedRepair.id} —{' '}
                {selectedRepair.first_name} {selectedRepair.last_name}
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedRepair(null)}
              >
                Changer
              </Button>
            </div>
          )}

          {selectedRepair && (
            <InvoiceForm
              key={selectedRepair.id}
              initialData={getInitialData()}
              onSubmit={handleSubmit}
              submitLabel="Créer la facture"
              saving={saving}
            />
          )}
        </TabsContent>

        <TabsContent value="new">
          <InvoiceForm
            key="new"
            onSubmit={handleSubmit}
            submitLabel="Créer la facture"
            saving={saving}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
