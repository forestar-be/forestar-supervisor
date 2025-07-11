import type {UsePDFInstance} from '@react-pdf/renderer';
import React from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Grid,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  AddToDrive as AddToDriveIcon,
  AttachEmail as AttachEmailIcon,
  Delete as DeleteIcon,
  FileDownload as FileDownloadIcon,
  Call as CallIcon,
  Info as InfoIcon,
  Event as EventIcon,
  Edit as EditIcon,
} from '@mui/icons-material';

interface RepairHeaderProps {
  id: string | undefined;
  onClick: () => Promise<void>;
  onClick1: () => Promise<void>;
  disabled: boolean;
  onClick2: () => Promise<void>;
  onClickCall: () => Promise<void>;
  disabled1: boolean;
  instance: UsePDFInstance;
  onClick3: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  loadingCall: boolean;
  setIsCallTimesModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  // Calendar event props
  hasCalendarEvent: boolean;
  onCalendarEventCreate: () => void;
  onCalendarEventView: () => void;
  onCalendarEventEdit: () => void;
  loadingCalendarEvent?: boolean;
}

export const RepairHeader = (props: RepairHeaderProps) => (
  <Grid container display={'flex'} justifyContent="space-between">
    <Grid item>
      <Typography variant="h4" gutterBottom paddingTop={1}>
        Fiche n°{props.id}
      </Typography>
    </Grid>
    <Grid
      item
      display={'flex'}
      flexDirection={'row-reverse'}
      flexWrap={'wrap'}
      gap={2}
    >
      <Tooltip title="Supprimer la fiche" arrow>
        <Button
          color="error"
          startIcon={<DeleteIcon />}
          onClick={props.onClick}
        >
          Supprimer
        </Button>
      </Tooltip>
      <Tooltip title="Sauvegarder dans le Google Drive" arrow>
        <Button
          color="secondary"
          startIcon={<AddToDriveIcon />}
          onClick={props.onClick1}
          disabled={
            props.disabled || props.instance.loading || !props.instance.blob
          }
        >
          {props.disabled ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            'Sauvegarder dans le Google Drive'
          )}
        </Button>
      </Tooltip>
      <Tooltip title="Envoyer par email au client" arrow>
        <Button
          color="secondary"
          startIcon={<AttachEmailIcon />}
          onClick={props.onClick2}
          disabled={
            props.disabled1 || props.instance.loading || !props.instance.blob
          }
        >
          {props.disabled1 ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            'Envoyer par email au client'
          )}
        </Button>
      </Tooltip>{' '}
      <Tooltip title="Télécharger le PDF" arrow>
        <Button
          color="primary"
          startIcon={<FileDownloadIcon />}
          component="a"
          href={props.instance.url ?? undefined}
          download={`fiche_reparation_${props.id}.pdf`}
          onClick={props.onClick3}
          disabled={props.instance.loading || !props.instance.url}
        >
          Télécharger
        </Button>
      </Tooltip>
      {/* Calendar Event Button */}
      {props.hasCalendarEvent ? (
        <Box display="flex" gap={1}>
          <Tooltip title="Voir l'événement dans l'agenda" arrow>
            <Button
              color="info"
              startIcon={<EventIcon />}
              onClick={props.onCalendarEventView}
              disabled={props.loadingCalendarEvent}
            >
              {props.loadingCalendarEvent ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                "Voir l'événement"
              )}
            </Button>
          </Tooltip>
          {/* <Tooltip title="Modifier l'événement" arrow>
            <IconButton
              color="info"
              onClick={props.onCalendarEventEdit}
              disabled={props.loadingCalendarEvent}
            >
              <EditIcon />
            </IconButton>
          </Tooltip> */}
        </Box>
      ) : (
        <Tooltip title="Ajouter à l'agenda" arrow>
          <Button
            color="success"
            startIcon={<EventIcon />}
            onClick={props.onCalendarEventCreate}
            disabled={props.loadingCalendarEvent}
          >
            {props.loadingCalendarEvent ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              "Ajouter à l'agenda"
            )}
          </Button>
        </Tooltip>
      )}
      <Box
        display="flex"
        justifyContent="center"
        flexDirection="row"
        flexWrap="nowrap"
      >
        <Tooltip arrow title="Enregistrer un appel effectué">
          <Button
            color="primary"
            startIcon={<CallIcon />}
            onClick={props.onClickCall}
          >
            {props.loadingCall ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              'Appel client effectué'
            )}
          </Button>
        </Tooltip>

        <Tooltip arrow title="Historique des appels">
          <IconButton
            color={'primary'}
            onClick={() => props.setIsCallTimesModalOpen(true)}
          >
            <InfoIcon />
          </IconButton>
        </Tooltip>
      </Box>
    </Grid>
  </Grid>
);
