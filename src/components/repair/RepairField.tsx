import React from 'react';
import { Grid, TextField, Box, Typography } from '@mui/material';

interface RenderFieldProps {
  label: string;
  name: string;
  value: string;
  isMultiline?: boolean;
  editableFields: { [key: string]: boolean };
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  xs?: 6 | 12 | 3;
  endAdornment?: React.ReactNode;
}

const RepairField: React.FC<RenderFieldProps> = ({
  label,
  name,
  value,
  isMultiline = false,
  editableFields,
  handleChange,
  xs,
  endAdornment,
}) => (
  <Grid item xs={(xs ?? isMultiline) ? 12 : 6}>
    {editableFields[name] ? (
      <TextField
        sx={{ margin: '5px 0' }}
        fullWidth
        label={label}
        name={name}
        value={value || ''}
        onChange={handleChange}
        multiline={isMultiline}
        rows={isMultiline ? 4 : 1}
      />
    ) : (
      <Box
        display={'flex'}
        flexDirection={isMultiline ? 'column' : 'row'}
        gap={isMultiline ? '0' : '10px'}
        margin={'5px 0'}
      >
        <Typography variant="subtitle1" noWrap>
          {label} :
        </Typography>
        <Typography variant="subtitle1" sx={{ overflowWrap: 'break-word' }}>
          {value || ''}
        </Typography>
        {endAdornment}
      </Box>
    )}
  </Grid>
);

export default RepairField;
