import React, { useMemo } from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  OutlinedInput,
  Chip,
  Box,
  SelectChangeEvent,
} from '@mui/material';

interface MultiSelectDropdownProps {
  label: string;
  options: string[];
  selectedValues: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  size?: 'small' | 'medium';
  minWidth?: number | string;
  maxWidth?: number | string;
  disabled?: boolean;
  renderValue?: (selected: string[]) => React.ReactNode;
  /** Mapping optionnel des options vers leurs couleurs (ex: { "En cours": "#ff0000" }) */
  colorByOption?: Record<string, string>;
}

const ITEM_HEIGHT = 36;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 6 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

/**
 * Composant de dropdown multi-select réutilisable
 * Permet de sélectionner plusieurs valeurs dans une liste
 */
const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  label,
  options,
  selectedValues,
  onChange,
  placeholder = 'Sélectionner...',
  size = 'small',
  minWidth = 200,
  maxWidth,
  disabled = false,
  renderValue,
  colorByOption,
}) => {
  // Générer un ID unique pour le composant
  const labelId = useMemo(
    () => `multi-select-${label.toLowerCase().replace(/\s+/g, '-')}`,
    [label],
  );

  // Gérer le changement de sélection
  const handleChange = (event: SelectChangeEvent<string[]>) => {
    const {
      target: { value },
    } = event;
    // On typeof string when value is from autofill.
    onChange(typeof value === 'string' ? value.split(',') : value);
  };

  // Fonction par défaut pour le rendu de la valeur sélectionnée
  const defaultRenderValue = (selected: string[]) => {
    console.log('🔍 MultiSelectDropdown renderValue called:', {
      label,
      selected,
      selectedLength: selected.length,
      placeholder,
    });

    if (selected.length === 0) {
      console.log('✅ Returning placeholder:', placeholder);
      return (
        <Box component="span" sx={{ color: 'text.secondary' }}>
          {placeholder}
        </Box>
      );
    }

    if (selected.length <= 1) {
      console.log('✅ Returning chips for:', selected);
      return (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {selected.map((value) => (
            <Chip
              key={value}
              label={value}
              size="small"
              sx={
                colorByOption?.[value]
                  ? {
                      backgroundColor: colorByOption[value],
                      color: 'black',
                      '& .MuiChip-label': {
                        fontWeight: 500,
                      },
                    }
                  : {}
              }
            />
          ))}
        </Box>
      );
    }

    // Sinon, afficher le nombre d'éléments sélectionnés
    const countText = `${selected.length} sélectionné${selected.length > 1 ? 's' : ''}`;
    console.log('✅ Returning count:', countText);
    return countText;
  };

  return (
    <FormControl
      sx={{
        minWidth,
        maxWidth: maxWidth || minWidth,
        width: '100%',
      }}
      size={size}
      disabled={disabled}
    >
      {selectedValues.length > 0 && (
        <InputLabel id={labelId}>{label}</InputLabel>
      )}
      <Select
        labelId={labelId}
        id={`${labelId}-select`}
        multiple
        displayEmpty
        value={selectedValues}
        onChange={handleChange}
        input={
          <OutlinedInput
            label={selectedValues.length > 0 ? label : ''}
            notched={selectedValues.length > 0}
          />
        }
        renderValue={renderValue || defaultRenderValue}
        MenuProps={MenuProps}
      >
        {options.length === 0 ? (
          <MenuItem disabled value="">
            <em>Aucune option disponible</em>
          </MenuItem>
        ) : (
          options.map((option) => (
            <MenuItem
              key={option}
              value={option}
              sx={{
                py: 0.5,
                minHeight: 'auto',
                ...(colorByOption?.[option]
                  ? {
                      backgroundColor: colorByOption[option],
                      '&:hover': {
                        backgroundColor: colorByOption[option],
                        filter: 'brightness(0.95)',
                      },
                      '&.Mui-selected': {
                        backgroundColor: colorByOption[option],
                        '&:hover': {
                          backgroundColor: colorByOption[option],
                          filter: 'brightness(0.9)',
                        },
                      },
                    }
                  : {}),
              }}
            >
              <Checkbox
                checked={selectedValues.includes(option)}
                sx={{
                  py: 0.25,
                  '&.MuiCheckbox-root': {
                    padding: '4px',
                  },
                }}
              />
              <ListItemText
                primary={option}
                sx={{
                  my: 0,
                  '& .MuiTypography-root': {
                    fontSize: '0.875rem',
                    fontWeight: colorByOption?.[option] ? 500 : 400,
                    color: colorByOption?.[option] ? 'black' : 'inherit',
                  },
                }}
              />
            </MenuItem>
          ))
        )}
      </Select>
    </FormControl>
  );
};

export default MultiSelectDropdown;
