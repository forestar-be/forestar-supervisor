import React, { useMemo } from 'react';
import { Box } from '@mui/material';
import { MachineRepair } from '../../utils/types';
import KanbanColumn from './KanbanColumn';
import { COMPLETED_STATES } from '../../utils/repairerWorkUtils';

interface KanbanBoardProps {
  repairs: MachineRepair[];
  colorByState: Record<string, string>;
}

/**
 * Tableau Kanban pour afficher les réparations par colonnes d'état
 * Les colonnes sont créées dynamiquement à partir des états configurés
 */
const KanbanBoard: React.FC<KanbanBoardProps> = ({ repairs, colorByState }) => {
  // Crée dynamiquement les colonnes Kanban basées sur les états configurés
  const columnRepairs = useMemo(() => {
    // Récupère tous les états uniques présents dans les réparations
    const statesInRepairs = new Set<string>();
    repairs.forEach((repair) => {
      const state = repair.state || 'Non commencé';
      statesInRepairs.add(state);
    });

    // Crée une colonne pour chaque état présent (sauf les états terminés)
    const states = Array.from(statesInRepairs)
      .filter((state) => !COMPLETED_STATES.includes(state)) // Exclut les états terminés
      .sort((a, b) => {
        // Ordre personnalisé pour les états communs
        const order: Record<string, number> = {
          'Non commencé': 1,
          'En cours': 2,
          'En attente pièces': 3,
          'À rappeler': 4,
          'En attente client': 5,
          'Devis à faire': 6,
          'Devis en attente': 7,
        };

        const orderA = order[a] || 999;
        const orderB = order[b] || 999;

        if (orderA !== orderB) {
          return orderA - orderB;
        }

        // Ordre alphabétique pour les autres états
        return a.localeCompare(b);
      });

    // Groupe les réparations par état et crée les colonnes
    return states.map((state) => ({
      id: state,
      title: state,
      color: colorByState[state] || '#E0E0E0', // Couleur par défaut si non configurée
      state: state,
      repairs: repairs.filter((repair) => {
        const repairState = repair.state || 'Non commencé';
        return repairState === state;
      }),
    }));
  }, [repairs, colorByState]);

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 3,
        overflowX: 'auto',
        pb: 2,
        px: 1,
        '&::-webkit-scrollbar': {
          height: '10px',
        },
        '&::-webkit-scrollbar-track': {
          backgroundColor: '#f1f1f1',
          borderRadius: '5px',
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: '#888',
          borderRadius: '5px',
          '&:hover': {
            backgroundColor: '#555',
          },
        },
      }}
    >
      {columnRepairs.map((column) => (
        <KanbanColumn
          key={column.id}
          title={column.title}
          repairs={column.repairs}
          color={column.color}
          colorByState={colorByState}
        />
      ))}
    </Box>
  );
};

export default KanbanBoard;
