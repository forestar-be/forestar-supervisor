import { Box, Modal } from '@mui/material';
import React from 'react';

export const ImageModal = (props: {
  open: boolean;
  onClose: () => void;
  selectedImage: string | null;
}) => (
  <Modal open={props.open} onClose={props.onClose}>
    <Box
      sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        bgcolor: 'background.paper',
        boxShadow: 24,
        p: 4,
      }}
    >
      {props.selectedImage && (
        <img
          src={props.selectedImage}
          alt="Selected Repair"
          style={{ width: '100%' }}
        />
      )}
    </Box>
  </Modal>
);
