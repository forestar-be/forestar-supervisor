import React from 'react';
import { Box, Paper, Typography, Badge } from '@mui/material';
import { MachineRepair } from '../../utils/types';
import RepairWorkCard from './RepairWorkCard';

interface KanbanColumnProps {
  title: string;
  repairs: MachineRepair[];
  color: string;
  maxHeight?: string;
  colorByState: Record<string, string>;
}

/**
 * Colonne Kanban pour afficher un groupe de réparations
 */
const KanbanColumn: React.FC<KanbanColumnProps> = ({
  title,
  repairs,
  color,
  maxHeight = 'calc(100vh - 300px)',
  colorByState,
}) => {
  return (
    <Paper
      elevation={2}
      sx={{
        width: 350,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      {/* En-tête de colonne */}
      <Box
        sx={{
          p: 2,
          borderBottom: '2px solid',
          borderColor: color,
          backgroundColor: `${color}15`,
          position: 'sticky',
          top: 0,
          zIndex: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography
            component="h6"
            title={title}
            sx={{
              flexGrow: 1,
              fontWeight: 600,
              fontSize: '1.1rem!important',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {title}
          </Typography>
          <Badge
            badgeContent={repairs.length}
            color="primary"
            sx={{
              '& .MuiBadge-badge': {
                backgroundColor: color,
                color: '#fff',
                fontWeight: 'bold',
              },
            }}
          />
        </Box>
      </Box>

      {/* Liste des réparations avec scroll */}
      <Box
        sx={{
          p: 2,
          flexGrow: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          maxHeight,
          height: maxHeight,
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: '#f1f1f1',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: color,
            borderRadius: '4px',
            '&:hover': {
              backgroundColor: `${color}cc`,
            },
          },
        }}
      >
        {repairs.length === 0 ? (
          <Box
            sx={{
              textAlign: 'center',
              py: 4,
              color: 'text.secondary',
            }}
          >
            <Typography variant="body2">Aucune réparation</Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {repairs.map((repair) => (
              <RepairWorkCard
                key={repair.id}
                repair={repair}
                colorByState={colorByState}
              />
            ))}
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default KanbanColumn;
