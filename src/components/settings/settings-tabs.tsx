'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useAppSelector } from '@/store/hooks';
import {
  addBrand,
  addMachineType,
  addRepairer,
  deleteBrand,
  deleteMachineType,
  deleteRepairer,
  fetchBrands,
  fetchMachineType,
  fetchRepairers,
} from '@/lib/api';
import EditRepairedPart from './edit-repaired-part';
import EditEntity from './edit-entity';
import EditRobotType from './edit-robot-type';
import EditConfig from './edit-config';
import EditUser from './edit-user';
import InvoiceSettings from './invoice-settings';
import InstallationPreparationTextEditor from './installation-preparation-text-editor';
import InstallationPreparationTextPreview from './installation-preparation-text-preview';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@forestar-be/ui';

/**
 * Paramètres de l'atelier — 9 onglets (8 + Utilisateurs pour les admins),
 * portés depuis `Settings.tsx`. Chaque onglet garde ses règles propres ; ce
 * composant n'assemble que la navigation.
 *
 * `TabsList` a une hauteur fixe et ne gère pas le retour à la ligne : à 390 px,
 * neuf onglets ne tiennent pas sur une rangée. En dessous de `md`, la
 * navigation passe donc par un `Select`, comme le fait déjà `forestar-robot`.
 */
export default function SettingsTabs() {
  const { isAdmin } = useAuth();
  const texts = useAppSelector((state) => state.installationTexts.texts);
  const [tab, setTab] = useState('parts');
  const [installationTab, setInstallationTab] = useState('edit');

  const tabs = [
    { value: 'parts', label: 'Pièces à remplacer' },
    { value: 'repairers', label: 'Réparateur' },
    { value: 'brands', label: 'Marques' },
    { value: 'machineTypes', label: 'Type de machine' },
    { value: 'robotTypes', label: 'Types de robot' },
    { value: 'installationTexts', label: "Textes d'installation" },
    { value: 'invoiceSettings', label: 'Facturation' },
    { value: 'config', label: 'Autre' },
    ...(isAdmin ? [{ value: 'users', label: 'Utilisateurs' }] : []),
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <Tabs
        value={tab}
        onValueChange={(v) => v && setTab(v)}
        className="flex min-h-0 flex-1 flex-col"
      >
        {/* Titre et onglets partagent la ligne tant qu'il y a la place. */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <h1 className="text-2xl">Paramètres</h1>
          <div className="w-full md:hidden">
            <Select value={tab} onValueChange={(v) => v && setTab(v)}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(v: string) => tabs.find((t) => t.value === v)?.label ?? v}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {tabs.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <TabsList className="hidden md:flex">
            {tabs.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent
          value="parts"
          className="mt-4 min-h-0 flex-1 overflow-auto"
        >
          <EditRepairedPart />
        </TabsContent>

        <TabsContent
          value="repairers"
          className="mt-4 min-h-0 flex-1 overflow-auto"
        >
          <EditEntity
            entityName="Réparateur"
            fetchEntities={fetchRepairers}
            addEntity={addRepairer}
            deleteEntity={deleteRepairer}
          />
        </TabsContent>

        <TabsContent
          value="brands"
          className="mt-4 min-h-0 flex-1 overflow-auto"
        >
          <EditEntity
            entityName="Marque"
            fetchEntities={fetchBrands}
            addEntity={addBrand}
            deleteEntity={deleteBrand}
          />
        </TabsContent>

        <TabsContent
          value="machineTypes"
          className="mt-4 min-h-0 flex-1 overflow-auto"
        >
          <EditEntity
            entityName="Type de machine"
            fetchEntities={fetchMachineType}
            addEntity={addMachineType}
            deleteEntity={deleteMachineType}
          />
        </TabsContent>

        <TabsContent
          value="robotTypes"
          className="mt-4 min-h-0 flex-1 overflow-auto"
        >
          <EditRobotType />
        </TabsContent>

        <TabsContent
          value="installationTexts"
          className="mt-4 min-h-0 flex-1 overflow-auto"
        >
          <Tabs
            value={installationTab}
            onValueChange={(v) => v && setInstallationTab(v)}
          >
            <TabsList>
              <TabsTrigger value="edit">Éditer</TabsTrigger>
              <TabsTrigger value="preview">Prévisualiser</TabsTrigger>
            </TabsList>
            <TabsContent value="edit" className="mt-4">
              <InstallationPreparationTextEditor />
            </TabsContent>
            <TabsContent value="preview" className="mt-4">
              <InstallationPreparationTextPreview texts={texts} />
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent
          value="invoiceSettings"
          className="mt-4 min-h-0 flex-1 overflow-auto"
        >
          <InvoiceSettings />
        </TabsContent>

        <TabsContent
          value="config"
          className="mt-4 min-h-0 flex-1 overflow-auto"
        >
          <EditConfig />
        </TabsContent>

        {isAdmin && (
          <TabsContent
            value="users"
            className="mt-4 min-h-0 flex-1 overflow-auto"
          >
            <EditUser />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
