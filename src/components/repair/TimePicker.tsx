import React from 'react';
import { Box, Button, Grid, TextField, Typography } from '@mui/material';
import {
  PlayArrow as PlayArrowIcon,
  Replay as ReplayIcon,
  Stop as StopIcon,
} from '@mui/icons-material';

interface TimePickerProps {
  repair: any;
  editableFields: { [key: string]: boolean };
  isRunning: boolean;
  hours: number;
  days: number;
  minutes: number;
  seconds: number;
  handleManualTimeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  startTimer: () => void;
  stopTimer: () => void;
  resetTimer: () => void;
  getFormattedWorkingTime: (seconds: number, withSeconds: boolean) => string;
}

const TimePicker: React.FC<TimePickerProps> = ({
  repair,
  editableFields,
  isRunning,
  hours,
  days,
  minutes,
  seconds,
  handleManualTimeChange,
  startTimer,
  stopTimer,
  resetTimer,
  getFormattedWorkingTime,
}) => {
  if (!repair) {
    return null;
  }

  return (
    <Grid item xs={12}>
      <Box
        display={'flex'}
        flexDirection={'row'}
        alignItems={'center'}
        gap={'10px'}
        marginTop={'10px'}
      >
        <Typography variant="subtitle1" noWrap>
          Temps passé :
        </Typography>
        {editableFields['working_time'] && !isRunning ? (
          <>
            <TextField
              label={'Heure'}
              name={'hour'}
              value={Math.floor(repair.working_time_in_sec / 3600)}
              onChange={handleManualTimeChange}
            />
            <TextField
              label={'Minute'}
              name={'minute'}
              value={Math.floor((repair.working_time_in_sec % 3600) / 60)}
              onChange={handleManualTimeChange}
            />
            <TextField
              label={'Second'}
              name={'second'}
              value={repair.working_time_in_sec % 60}
              onChange={handleManualTimeChange}
            />
          </>
        ) : (
          <>
            <Typography variant="subtitle1" noWrap width={100}>
              {isRunning ? (
                <>
                  {hours + days * 24}h {minutes}m {seconds}s
                </>
              ) : (
                <>{getFormattedWorkingTime(repair.working_time_in_sec, true)}</>
              )}
            </Typography>
            <Button
              size={'small'}
              variant="contained"
              color="primary"
              startIcon={isRunning ? <StopIcon /> : <PlayArrowIcon />}
              onClick={isRunning ? stopTimer : startTimer}
            >
              {isRunning ? 'Arrêter' : 'Démarrer'}
            </Button>
            {!isRunning && (
              <Button
                size={'small'}
                variant="contained"
                color="secondary"
                startIcon={<ReplayIcon />}
                onClick={resetTimer}
              >
                Réinitialiser
              </Button>
            )}
          </>
        )}
      </Box>
    </Grid>
  );
};

export default TimePicker;
