import React from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Chip,
  SelectChangeEvent,
} from '@mui/material';
import { useAppSelector } from '../../store/hooks';
import { RootState } from '../../store/index';
import { getWorkloadColor } from '../../utils/repairerWorkUtils';

interface RepairerSelectorProps {
  selectedRepairer: string | null;
  onSelect: (repairerName: string | null) => void;
  workloadCounts?: Record<string, number>;
  showAllOption?: boolean;
  disabled?: boolean;
}

/**
 * Composant de sélection de réparateur avec affichage de la charge de travail
 */
const RepairerSelector: React.FC<RepairerSelectorProps> = ({
  selectedRepairer,
  onSelect,
  workloadCounts = {},
  showAllOption = false,
  disabled = false,
}) => {
  const { repairerNames } = useAppSelector((state: RootState) => state.config);

  const handleChange = (event: SelectChangeEvent<string>) => {
    const value = event.target.value;
    onSelect(value === 'all' ? null : value);
  };

  return (
    <FormControl fullWidth disabled={disabled}>
      {/* <InputLabel id="repairer-selector-label">Réparateur</InputLabel> */}
      <Select
        // labelId="repairer-selector-label"
        id="repairer-selector"
        value={selectedRepairer || (showAllOption ? 'all' : '')}
        // label="Réparateur"
        onChange={handleChange}
      >
        {showAllOption && (
          <MenuItem value="all">
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                width: '100%',
                alignItems: 'center',
              }}
            >
              <Typography>Tous les réparateurs</Typography>
            </Box>
          </MenuItem>
        )}

        {repairerNames.map((repairerName) => {
          const count = workloadCounts[repairerName] || 0;
          const color = getWorkloadColor(count);

          return (
            <MenuItem key={repairerName} value={repairerName}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  width: '100%',
                  alignItems: 'center',
                }}
              >
                <Typography>{repairerName}</Typography>
                {count > 0 && (
                  <Chip
                    label={count}
                    size="small"
                    color={color}
                    sx={{ ml: 2 }}
                  />
                )}
              </Box>
            </MenuItem>
          );
        })}

        {repairerNames.length === 0 && (
          <MenuItem disabled>
            <Typography color="text.secondary">
              Aucun réparateur configuré
            </Typography>
          </MenuItem>
        )}
      </Select>
    </FormControl>
  );
};

export default RepairerSelector;
