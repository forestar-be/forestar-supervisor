import React from 'react';
import { SelectChangeEvent } from '@mui/material/Select/SelectInput';
import { Box, Grid, IconButton, Typography } from '@mui/material';
import { Edit as EditIcon, Save as SaveIcon } from '@mui/icons-material';
import Divider from '@mui/material/Divider';
import TimePicker from './TimePicker';
import {
  getFormattedWorkingTime,
  getTotalPrice,
  getTotalPriceParts,
  getWorkingTimePrice,
  possibleReplacedPartToString,
} from '../../utils/singleRepair.utils';
import ReplacedPartSelect from './ReplacedPartSelect';
import { ReplacedPart } from '../../pages/SingleRepair';
import { MachineRepair } from '../../utils/types';

export const LeftGrid = (props: {
  onClick: () => void;
  editableSections: { [p: string]: boolean };
  element: React.JSX.Element;
  element1: React.JSX.Element;
  element2: React.JSX.Element;
  element3: React.JSX.Element;
  element4: React.JSX.Element;
  element5: React.JSX.Element;
  element51: React.JSX.Element;
  element6: React.JSX.Element;
  onClick1: () => void;
  element7: React.JSX.Element;
  element8: React.JSX.Element;
  element9: React.JSX.Element;
  element10: React.JSX.Element;
  repair: MachineRepair;
  editableFields: { [p: string]: boolean };
  running: boolean;
  hours: number;
  days: number;
  minutes: number;
  seconds: number;
  handleManualTimeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  startTimer: () => void;
  stopTimer: () => void;
  resetTimer: () => void;
  hourlyRate: number;
  possibleValues: ReplacedPart[];
  handleReplacedPartSelectChange: (event: SelectChangeEvent<String[]>) => void;
  updateQuantityOfReplacedPart: (
    e: SelectChangeEvent<unknown>,
    replacedPart: MachineRepair['replaced_part_list'][0],
  ) => void;
  handleDeleteReplacedPart: (replacedPartName: string) => void;
  priceHivernage: number;
}) => (
  <Grid item xs={6}>
    <Grid item xs={12}>
      <Box display="flex" alignItems="center">
        <Typography variant="h6">Détails</Typography>
        <IconButton onClick={props.onClick}>
          {props.editableSections['repairDetails'] ? (
            <SaveIcon />
          ) : (
            <EditIcon />
          )}
        </IconButton>
      </Box>
    </Grid>
    <Grid item xs={12} display={'flex'} gap={'10px'}>
      {props.element}
      {props.element1}
    </Grid>
    <Grid item xs={12} display={'flex'} gap={'10px'}>
      {props.element2}
      {props.element3}
    </Grid>
    <Grid item xs={12} display={'flex'} gap={'10px'}>
      {props.element4}
      {props.element5}
    </Grid>
    <Grid item xs={12} display={'flex'} gap={'10px'}>
      {props.element51}
    </Grid>
    <Grid item xs={12} display={'flex'}>
      {props.element6}
    </Grid>
    <Grid item xs={12} padding={'20px 0'}>
      <Divider />
    </Grid>
    <Grid item xs={12}>
      <Box display="flex" alignItems="center">
        <Typography variant="h6">Informations techniques</Typography>
        <IconButton onClick={props.onClick1}>
          {props.editableSections['technicalInfo'] ? (
            <SaveIcon />
          ) : (
            <EditIcon />
          )}
        </IconButton>
      </Box>
    </Grid>
    {props.element7}
    {props.element8}
    {props.element9}
    <Box width={'80%'}>{props.element10}</Box>
    <TimePicker
      repair={props.repair}
      editableFields={props.editableFields}
      isRunning={props.running}
      hours={props.hours}
      days={props.days}
      minutes={props.minutes}
      seconds={props.seconds}
      handleManualTimeChange={props.handleManualTimeChange}
      startTimer={props.startTimer}
      stopTimer={props.stopTimer}
      resetTimer={props.resetTimer}
      getFormattedWorkingTime={getFormattedWorkingTime}
    />
    <Box display={'flex'} gap={'10px'} marginBottom={'20px'}>
      <Typography variant="subtitle1">Total temps:</Typography>
      <Typography variant="subtitle1" fontWeight="bold">
        {getWorkingTimePrice(props.repair, props.hourlyRate)}
      </Typography>
    </Box>
    <Box margin={'20px 0'}>
      <ReplacedPartSelect
        label="Pièces remplacées"
        name="replaced_part_list"
        values={props.repair.replaced_part_list}
        possibleValues={props.possibleValues}
        editableFields={props.editableFields}
        handleReplacedPartSelectChange={props.handleReplacedPartSelectChange}
        updateQuantityOfReplacedPart={props.updateQuantityOfReplacedPart}
        handleDeleteReplacedPart={props.handleDeleteReplacedPart}
        possibleReplacedPartToString={possibleReplacedPartToString}
      />
      <Box display={'flex'} gap={'10px'} margin={'5px 0'}>
        <Typography variant="subtitle1">Total pièces :</Typography>
        <Typography variant="subtitle1" fontWeight="bold">
          {getTotalPriceParts(props.repair)}
        </Typography>
      </Box>
    </Box>
    <Box display={'flex'} gap={'10px'} margin={'5px 0'}>
      <Typography variant="subtitle1" fontWeight="bold">
        Total :
      </Typography>
      <Typography variant="subtitle1" fontWeight="bold">
        {getTotalPrice(props.repair, props.hourlyRate, props.priceHivernage)}
      </Typography>
    </Box>
  </Grid>
);
