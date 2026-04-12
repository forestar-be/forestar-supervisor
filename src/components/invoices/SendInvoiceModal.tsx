import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Alert,
  Box,
  CircularProgress,
  Radio,
  RadioGroup,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { useAuth } from '../../hooks/AuthProvider';
import { sendServiceInvoice, isHttpError, HttpError } from '../../utils/api';

interface ThirdpartyData {
  name: string;
  email: string;
  phone: string;
  address: string;
  zip: string;
  town: string;
}

interface ThirdpartyDifference {
  field: string;
  invoice: string;
  dolibarr: string;
}

interface DolibarrClientMatch {
  id: number;
  name: string;
  email: string;
  differences: ThirdpartyDifference[];
}

interface ThirdpartyConfirmation {
  confirmationType: 'create-client' | 'resolve-conflict' | 'select-client';
  invoiceClient: ThirdpartyData;
  dolibarrClient?: ThirdpartyData & { id: number };
  differences?: ThirdpartyDifference[];
  matches?: DolibarrClientMatch[];
}

type ThirdpartyAction = 'create' | 'update' | 'use-existing' | 'select';

interface SendInvoiceModalProps {
  invoiceId: number;
  clientEmail: string;
  onClose: () => void;
  onSent: () => void;
}

type ModalStep =
  | { type: 'initial' }
  | { type: 'create-client'; invoiceClient: ThirdpartyData }
  | {
      type: 'select-client';
      invoiceClient: ThirdpartyData;
      matches: DolibarrClientMatch[];
    }
  | {
      type: 'resolve-conflict';
      invoiceClient: ThirdpartyData;
      dolibarrClient: ThirdpartyData & { id: number };
      differences: ThirdpartyDifference[];
    };

const SendInvoiceModal: React.FC<SendInvoiceModalProps> = ({
  invoiceId,
  clientEmail,
  onClose,
  onSent,
}) => {
  const auth = useAuth();
  const [step, setStep] = useState<ModalStep>({ type: 'initial' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMatchId, setSelectedMatchId] = useState<
    number | 'new' | null
  >(null);
  const [conflictChoice, setConflictChoice] = useState<
    'update' | 'use-existing' | 'create' | null
  >(null);

  const doSend = async (
    action?: ThirdpartyAction,
    thirdpartyId?: number,
  ) => {
    setLoading(true);
    setError(null);
    try {
      const body = action
        ? { thirdpartyAction: action, thirdpartyId }
        : undefined;
      await sendServiceInvoice(auth.token, invoiceId, body);
      onSent();
    } catch (err) {
      if (err instanceof HttpError && err.status === 409) {
        const data = (err as any).data as ThirdpartyConfirmation | undefined;
        // Try to parse the error message as JSON if data is not available
        let confirmation = data;
        if (!confirmation && err.message) {
          try {
            confirmation = JSON.parse(err.message);
          } catch {
            // not JSON
          }
        }
        if (confirmation?.confirmationType === 'create-client') {
          setStep({
            type: 'create-client',
            invoiceClient: confirmation.invoiceClient,
          });
        } else if (
          confirmation?.confirmationType === 'resolve-conflict' &&
          confirmation.dolibarrClient &&
          confirmation.differences
        ) {
          setConflictChoice(null);
          setStep({
            type: 'resolve-conflict',
            invoiceClient: confirmation.invoiceClient,
            dolibarrClient: confirmation.dolibarrClient,
            differences: confirmation.differences,
          });
        } else if (
          confirmation?.confirmationType === 'select-client' &&
          confirmation.matches
        ) {
          setSelectedMatchId(null);
          setStep({
            type: 'select-client',
            invoiceClient: confirmation.invoiceClient,
            matches: confirmation.matches,
          });
        } else {
          setError('Réponse inattendue du serveur');
        }
      } else if (isHttpError(err)) {
        setError((err as any).message);
      } else {
        setError("Une erreur s'est produite");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInitialSend = () => doSend();
  const handleCreate = () => doSend('create');

  const handleSelectConfirm = () => {
    if (selectedMatchId === 'new') {
      handleCreate();
    } else if (typeof selectedMatchId === 'number') {
      doSend('select', selectedMatchId);
    }
  };

  const handleConflictConfirm = (dolibarrId: number) => {
    if (conflictChoice === 'update') doSend('update', dolibarrId);
    else if (conflictChoice === 'use-existing')
      doSend('use-existing', dolibarrId);
    else if (conflictChoice === 'create') handleCreate();
  };

  const renderClientCard = (client: ThirdpartyData, label: string) => (
    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
        {label}
      </Typography>
      {client.name && (
        <Typography variant="body2">
          <strong>Nom :</strong> {client.name}
        </Typography>
      )}
      {client.email && (
        <Typography variant="body2">
          <strong>Email :</strong> {client.email}
        </Typography>
      )}
      {client.phone && (
        <Typography variant="body2">
          <strong>Tél. :</strong> {client.phone}
        </Typography>
      )}
      {client.address && (
        <Typography variant="body2">
          <strong>Adresse :</strong> {client.address}
        </Typography>
      )}
      {(client.zip || client.town) && (
        <Typography variant="body2">
          <strong>Ville :</strong>{' '}
          {[client.zip, client.town].filter(Boolean).join(' ')}
        </Typography>
      )}
    </Paper>
  );

  const renderDiffTable = (differences: ThirdpartyDifference[]) => (
    <Table size="small" sx={{ mb: 2 }}>
      <TableHead>
        <TableRow>
          <TableCell>Champ</TableCell>
          <TableCell>Facture</TableCell>
          <TableCell>Dolibarr</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {differences.map((d) => (
          <TableRow key={d.field}>
            <TableCell sx={{ fontWeight: 600 }}>{d.field}</TableCell>
            <TableCell sx={{ color: 'primary.main' }}>
              {d.invoice || <em style={{ color: '#999' }}>vide</em>}
            </TableCell>
            <TableCell sx={{ color: 'info.main' }}>
              {d.dolibarr || <em style={{ color: '#999' }}>vide</em>}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const getTitle = () => {
    switch (step.type) {
      case 'initial':
        return 'Valider et envoyer la facture';
      case 'create-client':
        return 'Nouveau client Dolibarr';
      case 'select-client':
        return 'Sélectionner un client';
      case 'resolve-conflict':
        return 'Conflit de données client';
      default:
        return 'Envoyer la facture';
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{getTitle()}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Initial step */}
        {step.type === 'initial' && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight={600}>
              Action irréversible
            </Typography>
            <Typography variant="body2">
              Un numéro de facture définitif sera attribué et la facture sera
              envoyée par email à <strong>{clientEmail}</strong>. Le brouillon
              ne pourra plus être modifié.
            </Typography>
          </Alert>
        )}

        {/* Create client step */}
        {step.type === 'create-client' && (
          <>
            <Alert severity="info" sx={{ mb: 2 }} icon={<PersonAddIcon />}>
              Aucun client correspondant n'a été trouvé dans Dolibarr. Un
              nouveau client va être créé.
            </Alert>
            {renderClientCard(step.invoiceClient, 'Client à créer')}
          </>
        )}

        {/* Select client step */}
        {step.type === 'select-client' && (
          <>
            <Alert severity="info" sx={{ mb: 2 }}>
              Plusieurs clients correspondent dans Dolibarr. Sélectionnez celui
              à utiliser.
            </Alert>
            {renderClientCard(step.invoiceClient, 'Client de la facture')}
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mb: 1, display: 'block' }}
            >
              CLIENTS DOLIBARR
            </Typography>
            <RadioGroup
              value={selectedMatchId?.toString() ?? ''}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedMatchId(
                  val === 'new' ? 'new' : parseInt(val),
                );
              }}
            >
              {step.matches.map((match) => (
                <Paper
                  key={match.id}
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    mb: 1,
                    cursor: 'pointer',
                    borderColor:
                      selectedMatchId === match.id
                        ? 'primary.main'
                        : undefined,
                  }}
                  onClick={() => setSelectedMatchId(match.id)}
                >
                  <FormControlLabel
                    value={match.id.toString()}
                    control={<Radio size="small" />}
                    label={
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          {match.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {match.email}
                        </Typography>
                        {match.differences.length > 0 && (
                          <Typography
                            variant="caption"
                            color="warning.main"
                            display="block"
                          >
                            {match.differences.length} différence
                            {match.differences.length > 1 ? 's' : ''}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                </Paper>
              ))}
              <Paper
                variant="outlined"
                sx={{
                  p: 1.5,
                  cursor: 'pointer',
                  borderColor:
                    selectedMatchId === 'new' ? 'primary.main' : undefined,
                }}
                onClick={() => setSelectedMatchId('new')}
              >
                <FormControlLabel
                  value="new"
                  control={<Radio size="small" />}
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        Créer un nouveau client
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Un nouveau client séparé sera créé dans Dolibarr
                      </Typography>
                    </Box>
                  }
                />
              </Paper>
            </RadioGroup>
          </>
        )}

        {/* Resolve conflict step */}
        {step.type === 'resolve-conflict' && (
          <>
            <Alert severity="warning" sx={{ mb: 2 }}>
              Le client dans la facture et le client Dolibarr ont des
              informations différentes.
            </Alert>
            {renderDiffTable(step.differences)}
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mb: 1, display: 'block' }}
            >
              QUE SOUHAITEZ-VOUS FAIRE ?
            </Typography>
            <RadioGroup
              value={conflictChoice ?? ''}
              onChange={(e) =>
                setConflictChoice(
                  e.target.value as 'update' | 'use-existing' | 'create',
                )
              }
            >
              <Paper variant="outlined" sx={{ p: 1.5, mb: 1 }}>
                <FormControlLabel
                  value="update"
                  control={<Radio size="small" />}
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        Mettre à jour Dolibarr
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Le client Dolibarr sera mis à jour avec les données de
                        la facture
                      </Typography>
                    </Box>
                  }
                />
              </Paper>
              <Paper variant="outlined" sx={{ p: 1.5, mb: 1 }}>
                <FormControlLabel
                  value="use-existing"
                  control={<Radio size="small" />}
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        Utiliser le client Dolibarr
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        La facture sera mise à jour avec les coordonnées de
                        Dolibarr
                      </Typography>
                    </Box>
                  }
                />
              </Paper>
              <Paper variant="outlined" sx={{ p: 1.5 }}>
                <FormControlLabel
                  value="create"
                  control={<Radio size="small" />}
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        Créer un nouveau client
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Un nouveau client séparé sera créé dans Dolibarr
                      </Typography>
                    </Box>
                  }
                />
              </Paper>
            </RadioGroup>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Annuler
        </Button>
        {step.type === 'initial' && (
          <Button
            variant="contained"
            startIcon={
              loading ? <CircularProgress size={18} color="inherit" /> : <SendIcon />
            }
            disabled={loading}
            onClick={handleInitialSend}
          >
            Confirmer l'envoi
          </Button>
        )}
        {step.type === 'create-client' && (
          <Button
            variant="contained"
            startIcon={
              loading ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                <PersonAddIcon />
              )
            }
            disabled={loading}
            onClick={handleCreate}
          >
            Créer le client et envoyer
          </Button>
        )}
        {step.type === 'select-client' && (
          <Button
            variant="contained"
            startIcon={
              loading ? <CircularProgress size={18} color="inherit" /> : <SendIcon />
            }
            disabled={loading || selectedMatchId === null}
            onClick={handleSelectConfirm}
          >
            Valider et envoyer
          </Button>
        )}
        {step.type === 'resolve-conflict' && (
          <Button
            variant="contained"
            startIcon={
              loading ? <CircularProgress size={18} color="inherit" /> : <SendIcon />
            }
            disabled={loading || conflictChoice === null}
            onClick={() =>
              handleConflictConfirm(step.dolibarrClient.id)
            }
          >
            Valider et envoyer
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default SendInvoiceModal;
