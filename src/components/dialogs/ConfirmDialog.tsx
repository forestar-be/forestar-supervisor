import React from 'react';
import {
  Box,
  Button,
  Card,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Fade,
  Typography,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import DeleteIcon from '@mui/icons-material/Delete';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import DescriptionIcon from '@mui/icons-material/Description';
import ReceiptIcon from '@mui/icons-material/Receipt';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import HandymanIcon from '@mui/icons-material/Handyman';

export type ConfirmDialogType =
  | 'delete'
  | 'warning'
  | 'info'
  | 'success'
  | 'devis'
  | 'bon'
  | 'appointment'
  | 'installation'
  | 'invoice';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
  isLoading: boolean;
  type?: ConfirmDialogType;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  onConfirm,
  onClose,
  isLoading,
  type = 'info',
}) => {
  // Get dialog icon based on type
  const getDialogIcon = (type: ConfirmDialogType) => {
    switch (type) {
      case 'delete':
        return <DeleteIcon sx={{ fontSize: 60, color: 'error.main' }} />;
      case 'warning':
        return (
          <WarningAmberIcon sx={{ fontSize: 60, color: 'warning.main' }} />
        );
      case 'success':
        return (
          <CheckCircleOutlineIcon
            sx={{ fontSize: 60, color: 'success.main' }}
          />
        );
      case 'devis':
        return <DescriptionIcon sx={{ fontSize: 60, color: 'info.main' }} />;
      case 'bon':
        return <ReceiptIcon sx={{ fontSize: 60, color: 'success.main' }} />;
      case 'appointment':
        return (
          <EventAvailableIcon sx={{ fontSize: 60, color: 'primary.main' }} />
        );
      case 'installation':
        return <HandymanIcon sx={{ fontSize: 60, color: 'secondary.main' }} />;
      case 'invoice':
        return <ReceiptIcon sx={{ fontSize: 60, color: 'info.dark' }} />;
      case 'info':
      default:
        return <HelpOutlineIcon sx={{ fontSize: 60, color: 'info.main' }} />;
    }
  };

  // Get button color based on dialog type
  const getDialogActionColor = (type: ConfirmDialogType) => {
    switch (type) {
      case 'delete':
        return 'error';
      case 'warning':
        return 'warning';
      case 'devis':
        return 'info';
      case 'bon':
        return 'success';
      case 'appointment':
      case 'installation':
      case 'invoice':
        return 'primary';
      case 'success':
      case 'info':
      default:
        return 'primary';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
      disableEscapeKeyDown={isLoading}
      maxWidth="sm"
      TransitionComponent={Fade}
      TransitionProps={{ timeout: 300 }}
    >
      <DialogTitle
        id="alert-dialog-title"
        sx={{
          textAlign: 'center',
          fontWeight: 'bold',
          pt: 3,
          pb: 1,
        }}
      >
        {title}
      </DialogTitle>
      <DialogContent sx={{ px: 4, py: 2 }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            mb: 2,
          }}
        >
          <Fade in={true} timeout={500}>
            <Box sx={{ mb: 3, mt: 1 }}>{getDialogIcon(type)}</Box>
          </Fade>

          <Card
            elevation={0}
            sx={{
              width: '100%',
              backgroundColor: 'background.paper',
              p: 2,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
            }}
          >
            <Typography
              variant="body1"
              align="center"
              sx={{
                px: 2,
                fontWeight: 'medium',
              }}
            >
              {message}
            </Typography>
          </Card>
        </Box>

        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <CircularProgress size={32} />
          </Box>
        )}
      </DialogContent>
      <DialogActions
        sx={{
          justifyContent: 'center',
          gap: 2,
          pb: 3,
          pt: 1,
        }}
      >
        <Button
          onClick={onClose}
          variant="outlined"
          color="inherit"
          disabled={isLoading}
          startIcon={<CancelOutlinedIcon />}
          sx={{
            minWidth: 120,
            transition: 'all 0.2s ease',
            '&:hover': {
              transform: 'scale(1.05)',
            },
          }}
        >
          Annuler
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color={getDialogActionColor(type)}
          disabled={isLoading}
          startIcon={
            isLoading ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <CheckCircleOutlineIcon />
            )
          }
          sx={{
            minWidth: 120,
            transition: 'all 0.2s ease',
            '&:hover': {
              transform: 'scale(1.05)',
            },
          }}
        >
          {isLoading ? 'Traitement...' : 'Confirmer'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDialog;
