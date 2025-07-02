import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Collapse,
  Card,
  useTheme,
  alpha,
  Fade,
} from '@mui/material';
import {
  Error as ErrorIcon,
  Warning as WarningIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  ContentCopy as CopyIcon,
  Close as CloseIcon,
} from '@mui/icons-material';

interface ErrorDialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  details?: string;
  severity?: 'error' | 'warning';
}

const ErrorDialog: React.FC<ErrorDialogProps> = ({
  open,
  onClose,
  title = 'Une erreur est survenue',
  message,
  details,
  severity = 'error',
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);
  const theme = useTheme();

  const handleCopyDetails = async () => {
    if (details) {
      try {
        await navigator.clipboard.writeText(details);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy details:', err);
      }
    }
  };

  const handleToggleDetails = () => {
    setShowDetails(!showDetails);
  };

  const handleClose = () => {
    setShowDetails(false);
    setCopied(false);
    onClose();
  };

  // Get dialog icon based on severity
  const getDialogIcon = () => {
    if (severity === 'warning') {
      return <WarningIcon sx={{ fontSize: 60, color: 'warning.main' }} />;
    }
    return <ErrorIcon sx={{ fontSize: 60, color: 'error.main' }} />;
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      aria-labelledby="error-dialog-title"
      aria-describedby="error-dialog-description"
      maxWidth="sm"
      fullWidth
      TransitionComponent={Fade}
      TransitionProps={{ timeout: 300 }}
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: theme.shadows[24],
        },
      }}
    >
      <DialogTitle
        id="error-dialog-title"
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
            <Box sx={{ mb: 3, mt: 1 }}>{getDialogIcon()}</Box>
          </Fade>

          <Card
            elevation={0}
            sx={{
              width: '100%',
              p: 2,
              border: '1px solid',
              borderColor:
                severity === 'error' ? 'error.light' : 'warning.light',
              borderRadius: 2,
              backgroundColor: alpha(
                severity === 'error'
                  ? theme.palette.error.main
                  : theme.palette.warning.main,
                0.05,
              ),
            }}
          >
            <Typography
              variant="body1"
              align="center"
              sx={{
                px: 2,
                fontWeight: 'medium',
                color: severity === 'error' ? 'error.dark' : 'warning.dark',
              }}
            >
              {message}
            </Typography>
          </Card>
        </Box>

        {details && (
          <Box sx={{ mt: 3 }}>
            <Button
              onClick={handleToggleDetails}
              startIcon={showDetails ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              variant="text"
              color="primary"
              sx={{
                mb: 2,
                textTransform: 'none',
                fontSize: '0.9rem',
                fontWeight: 500,
                transition: 'all 0.2s ease',
                '&:hover': {
                  transform: 'scale(1.02)',
                },
              }}
            >
              {showDetails ? 'Masquer les détails' : 'Afficher les détails'}
            </Button>

            <Collapse in={showDetails}>
              <Card
                elevation={1}
                sx={{
                  position: 'relative',
                  backgroundColor: alpha(theme.palette.grey[50], 0.8),
                  border: `1px solid ${alpha(theme.palette.grey[400], 0.3)}`,
                  borderRadius: 2,
                  overflow: 'hidden',
                }}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    zIndex: 2,
                  }}
                >
                  <Button
                    onClick={handleCopyDetails}
                    size="small"
                    variant="outlined"
                    startIcon={<CopyIcon />}
                    sx={{
                      backgroundColor: copied
                        ? alpha(theme.palette.success.main, 0.1)
                        : alpha(theme.palette.background.paper, 0.9),
                      color: copied
                        ? theme.palette.success.main
                        : theme.palette.grey[600],
                      borderColor: copied
                        ? theme.palette.success.main
                        : alpha(theme.palette.grey[400], 0.5),
                      fontSize: '0.75rem',
                      minWidth: 'auto',
                      px: 1.5,
                      py: 0.5,
                      '&:hover': {
                        backgroundColor: copied
                          ? alpha(theme.palette.success.main, 0.2)
                          : alpha(theme.palette.grey[100], 0.9),
                        transform: 'scale(1.05)',
                        borderColor: copied
                          ? theme.palette.success.main
                          : theme.palette.grey[500],
                      },
                      transition: 'all 0.2s ease-in-out',
                      boxShadow: theme.shadows[2],
                      textTransform: 'none',
                      fontWeight: 500,
                    }}
                  >
                    {copied ? 'Copié !' : 'Copier'}
                  </Button>
                </Box>

                <Box
                  sx={{
                    p: 2,
                    pr: 6, // Make room for copy button
                    fontFamily: 'monospace',
                    fontSize: '0.85rem',
                    lineHeight: 1.5,
                    color: theme.palette.text.secondary,
                    maxHeight: '200px',
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    cursor: 'text',
                    userSelect: 'text',
                    scrollbarWidth: 'thin',
                    '&::-webkit-scrollbar': {
                      width: '8px',
                    },
                    '&::-webkit-scrollbar-track': {
                      backgroundColor: alpha(theme.palette.grey[300], 0.3),
                      borderRadius: '4px',
                    },
                    '&::-webkit-scrollbar-thumb': {
                      backgroundColor: alpha(theme.palette.grey[500], 0.5),
                      borderRadius: '4px',
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.grey[600], 0.7),
                      },
                    },
                  }}
                >
                  {details}
                </Box>
              </Card>

              {copied && (
                <Fade in={copied} timeout={300}>
                  <Typography
                    variant="caption"
                    color="success.main"
                    sx={{
                      display: 'block',
                      mt: 1,
                      fontWeight: 600,
                      textAlign: 'center',
                      backgroundColor: alpha(theme.palette.success.main, 0.1),
                      padding: '4px 8px',
                      borderRadius: 1,
                      border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
                    }}
                  >
                    ✓ Détails copiés dans le presse-papiers !
                  </Typography>
                </Fade>
              )}
            </Collapse>
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
          onClick={handleClose}
          variant="contained"
          color={severity === 'error' ? 'error' : 'warning'}
          startIcon={<CloseIcon />}
          sx={{
            minWidth: 120,
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: 2,
            transition: 'all 0.2s ease',
            '&:hover': {
              transform: 'scale(1.05)',
            },
          }}
        >
          Fermer
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ErrorDialog;
