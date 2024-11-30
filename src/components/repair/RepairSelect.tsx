import {
  Box,
  FormControl,
  Grid,
  InputLabel,
  OutlinedInput,
  Select,
  SxProps,
  Theme,
  Typography,
} from '@mui/material';
import { SelectChangeEvent } from '@mui/material/Select/SelectInput';
import React from 'react';

export const RepairSelect = (props: {
  xs: 6 | 12;
  editableFields: { [p: string]: boolean };
  name: string;
  sx: SxProps<Theme>;
  label: string;
  value: string;
  onChange: (event: SelectChangeEvent<String>) => void;
  strings: string[];
  callbackfn: (val: any) => React.JSX.Element;
  colorByValue: { [p: string]: string };
}) => (
  <Grid item xs={props.xs}>
    {props.editableFields[props.name] ? (
      <FormControl sx={props.sx}>
        <InputLabel id={`multiple-chip-label-${props.name}`}>
          {props.label}
        </InputLabel>
        <Select
          labelId={`multiple-chip-label-${props.name}`}
          id={`multiple-chip-${props.name}`}
          value={props.value}
          name={props.name}
          onChange={props.onChange}
          input={
            <OutlinedInput
              id={`select-multiple-chip-${props.name}`}
              label={props.label}
            />
          }
          // sx={{ backgroundColor: colorByValue[value] }}
        >
          {props.strings.map(props.callbackfn)}
        </Select>
      </FormControl>
    ) : (
      <Box display={'flex'} gap={'10px'} margin={'5px 0'}>
        <Typography variant="subtitle1">{props.label} :</Typography>
        <Typography
          variant="subtitle1"
          sx={{
            backgroundColor: props.colorByValue[props.value],
            color: props.colorByValue[props.value] && 'black',
            paddingLeft: props.colorByValue[props.value] && 2,
            paddingRight: props.colorByValue[props.value] && 2,
          }}
        >
          {props.value}
        </Typography>
      </Box>
    )}
  </Grid>
);
