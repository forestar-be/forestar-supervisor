import { Box, CircularProgress } from '@mui/material';
import React from 'react';

export const RepairLoading = () => (
  <Box
    sx={{
      position: 'fixed',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      // backgroundColor: 'rgba(255, 255, 255, 0.4)',
      background: 'transparent',
      zIndex: 100,
      width: '100vw',
      top: 0,
      right: 0,
    }}
  >
    <CircularProgress size={'4rem'} />
  </Box>
);
