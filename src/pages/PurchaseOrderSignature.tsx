import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  Grid,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ClearIcon from '@mui/icons-material/Clear';
import SaveIcon from '@mui/icons-material/Save';
import SignatureCanvas from 'react-signature-canvas';
import { useAuth } from '../hooks/AuthProvider';
import { toast } from 'react-toastify';
import {
  fetchPurchaseOrderById,
  getPurchaseOrderPdf,
  updatePurchaseOrderStatus,
  fetchClientDevis,
  getClientDevisPdf,
  updateClientDevisStatus,
  isHttpError,
} from '../utils/api';
import { InstallationPreparationText, PurchaseOrder } from '../utils/types';
import { pdf } from '@react-pdf/renderer';
import { PurchaseOrderPdfDocument } from '../components/PurchaseOrderPdf';
import { connect } from 'react-redux';
import { RootState } from '../store';

// Styles pour le canvas de signature
const signatureCanvasStyles = `
  .signature-canvas {
    touch-action: none;
  }
`;

interface PurchaseOrderSignatureProps {
  isClientMode?: boolean;
  clientToken?: string;
  onSignatureSuccess?: () => void;
  setErrorLoading?: (err: boolean) => void;
  setErrorType?: (
    type: 'not_found' | 'unauthorized' | 'general' | null,
  ) => void;
  idClientMode?: string | null;
  // Add props from Redux (will be empty if not connected)
  reduxInstallationTexts?: InstallationPreparationText[];
}

const PurchaseOrderSignature: React.FC<PurchaseOrderSignatureProps> = ({
  isClientMode = false,
  clientToken = null,
  onSignatureSuccess,
  idClientMode = null,
  setErrorLoading = () => {},
  setErrorType = () => {},
  reduxInstallationTexts = [],
}) => {
  const { id: idNonClientMode } = useParams<{ id: string }>();
  const authContext = useAuth();
  const token = isClientMode ? clientToken : authContext.token;
  const navigate = useNavigate();
  const signatureCanvasRef = useRef<SignatureCanvas>(null);

  // États
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [clientInstallationTexts, setClientInstallationTexts] = useState<
    InstallationPreparationText[]
  >([]);

  const id = useMemo(() => {
    return isClientMode ? idClientMode : idNonClientMode;
  }, [isClientMode, idClientMode, idNonClientMode]);

  // Récupérer les données de la commande et le PDF
  useEffect(() => {
    let currentPdfUrl: string | null = null;
    const fetchOrderData = async () => {
      setErrorLoading(false);
      setErrorType(null);
      if (!token || !id) {
        if (!isClientMode) {
          navigate('/bons-commande');
        }
        console.error('Token ou ID manquant');
        setErrorType('unauthorized');
        setErrorLoading(true);
        return;
      }

      try {
        setLoading(true);
        // Récupérer les données de la commande
        const orderData = await (isClientMode
          ? (async () => {
              const { installationPreparationTexts, purchaseOrder } =
                await fetchClientDevis(token, id);
              // Store installation texts from client API
              setClientInstallationTexts(installationPreparationTexts);
              return purchaseOrder;
            })()
          : fetchPurchaseOrderById(token, parseInt(id)));

        if (!orderData) {
          toast.error('Commande introuvable');
          if (!isClientMode) {
            navigate('/bons-commande');
          }
          setLoading(false);
          return;
        }

        if (!orderData.devis) {
          if (!isClientMode) {
            toast.error("Cette commande n'est pas un devis");
            navigate('/bons-commande');
          } else {
            if (
              onSignatureSuccess &&
              orderData.signatureTimestamp &&
              orderData.clientSignature
            ) {
              onSignatureSuccess();
            }
          }
          setLoading(false);
          return;
        }

        setOrder(orderData);

        // Récupérer le PDF
        let pdfBlob;

        if (isClientMode) {
          // Utiliser l'API client pour récupérer le PDF
          pdfBlob = await getClientDevisPdf(token, id);
        } else {
          // Utiliser l'API standard
          pdfBlob = await getPurchaseOrderPdf(token, parseInt(id));
        }

        currentPdfUrl = URL.createObjectURL(pdfBlob);
        setPdfUrl(currentPdfUrl);
      } catch (error) {
        console.error('Error fetching order data:', error);
        if (!isClientMode) {
          toast.error('Erreur lors du chargement des données de la commande');
          navigate('/bons-commande');
        } else {
          if (isHttpError(error)) {
            if (error.status === 404) {
              setErrorType('not_found');
            } else if (error.status === 401) {
              setErrorType('unauthorized');
            } else {
              setErrorType('general');
            }
          } else {
            setErrorType('general');
          }
        }

        // Activer l'état d'erreur après avoir défini le type
        if (setErrorLoading) {
          setErrorLoading(true);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchOrderData();

    // Nettoyage à la désinscription
    return () => {
      if (currentPdfUrl) {
        URL.revokeObjectURL(currentPdfUrl);
      }
    };
  }, [token, id, isClientMode]);

  // Effacer la signature
  const clearSignature = useCallback(() => {
    if (signatureCanvasRef.current) {
      signatureCanvasRef.current.clear();
    }
  }, []);

  // Retour à la page des bons de commande
  const handleBack = useCallback(() => {
    navigate('/devis');
  }, [navigate]);

  // Générer le PDF
  const generatePDF = useCallback(
    async (updatedOrder: PurchaseOrder) => {
      try {
        // Use client installation texts when in client mode, otherwise use Redux texts
        const installationTexts = isClientMode
          ? clientInstallationTexts
          : reduxInstallationTexts;

        // Créer le document PDF
        const pdfBlob = await pdf(
          <PurchaseOrderPdfDocument
            purchaseOrder={updatedOrder}
            installationTexts={installationTexts}
          />,
        ).toBlob();

        return pdfBlob;
      } catch (error) {
        console.error('Error generating PDF:', error);
        throw error;
      }
    },
    [reduxInstallationTexts, clientInstallationTexts, isClientMode],
  );

  // Soumettre la signature
  const handleSubmit = useCallback(async () => {
    if (!signatureCanvasRef.current || !token || !order || !id) {
      toast.error('Une erreur est survenue: références manquantes');
      return;
    }

    // Vérifier si le pad de signature est vide
    if (signatureCanvasRef.current.isEmpty()) {
      toast.error('Veuillez signer avant de continuer');
      return;
    }

    try {
      setSubmitting(true);

      // Obtenir la signature en tant qu'image base64
      const signatureDataURL =
        signatureCanvasRef.current.toDataURL('image/png');

      // Mettre à jour les données de commande avec la signature
      const updatedOrder = {
        ...order,
        devis: false,
        clientSignature: signatureDataURL,
        signatureTimestamp: new Date().toISOString(),
      };

      // Générer un nouveau PDF avec la signature
      console.log('Génération du PDF avec signature...');
      const pdfBlob = await generatePDF(updatedOrder);
      console.log('PDF généré avec succès');

      // Envoyer la mise à jour au serveur
      console.log('Envoi de la mise à jour au serveur...');

      if (isClientMode) {
        // Utiliser l'API client
        await updateClientDevisStatus(
          token,
          id,
          {
            devis: false,
            clientSignature: signatureDataURL,
          },
          pdfBlob,
        );
      } else {
        // Utiliser l'API standard
        await updatePurchaseOrderStatus(
          token,
          parseInt(id),
          {
            devis: false,
            clientSignature: signatureDataURL,
          },
          pdfBlob,
        );
        toast.success('Bon de commande validé avec signature');
      }

      console.log('Mise à jour envoyée au serveur avec succès');

      // Gérer le succès selon le mode
      if (isClientMode && onSignatureSuccess) {
        onSignatureSuccess();
      } else {
        // Rediriger vers la liste des bons de commande
        navigate('/bons-commande');
      }
    } catch (error) {
      console.error('Error submitting signature:', error);
      toast.error('Erreur lors de la validation de la signature');
    } finally {
      setSubmitting(false);
    }
  }, [
    token,
    order,
    id,
    generatePDF,
    navigate,
    isClientMode,
    onSignatureSuccess,
  ]);

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          p: 4,
        }}
      >
        <CircularProgress size={100} />
      </Box>
    );
  }

  return (
    <Paper
      sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 2 }}
    >
      {/* Ajouter les styles globaux pour le canvas de signature */}
      <style>{signatureCanvasStyles}</style>

      {!isClientMode && (
        <>
          <Box
            sx={{
              mb: 2,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={handleBack}
              sx={{ mb: 1 }}
            >
              Retour
            </Button>
            <Typography
              variant="h5"
              component="h1"
              sx={{ textAlign: 'center', flex: 1 }}
            >
              Validation du Devis
            </Typography>
            {!isClientMode && <Box sx={{ width: 100 }} />}{' '}
            {/* Espace pour équilibrer l'en-tête */}
          </Box>
          <Divider sx={{ mb: 2 }} />
        </>
      )}

      <Grid container spacing={2} sx={{ flex: 1, mb: 2 }}>
        {/* Colonne gauche: Visualisation du PDF */}
        <Grid item xs={12} md={8} sx={{ height: '100%' }}>
          <Paper
            elevation={3}
            sx={{
              p: 2,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <Typography
              variant="subtitle1"
              gutterBottom
              sx={{ fontWeight: 'bold' }}
            >
              {!isClientMode ? 'Aperçu du document' : 'Devis à signer'}
            </Typography>

            <Box
              sx={{
                flex: 1,
                overflow: 'hidden',
                textAlign: 'center',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {pdfUrl ? (
                <iframe
                  src={`${pdfUrl}#toolbar=1`}
                  width="100%"
                  height="100%"
                  style={{ border: 'none' }}
                  title="Bon de commande"
                />
              ) : (
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100%',
                  }}
                >
                  <CircularProgress />
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Colonne droite: Pad de signature */}
        <Grid item xs={12} md={4} sx={{ height: '100%' }}>
          <Paper
            elevation={3}
            sx={{
              p: 2,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Typography
              variant="subtitle1"
              gutterBottom
              sx={{ fontWeight: 'bold' }}
            >
              Signature du client
            </Typography>

            <Typography variant="body2" sx={{ mb: 2 }}>
              Pour finaliser ce bon de commande, veuillez signer dans l'espace
              ci-dessous:
            </Typography>

            <Box
              sx={{
                flex: 1,
                border: '1px solid',
                borderColor: 'divider',
                p: 1,
                mb: 2,
                bgcolor: 'background.paper',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '300px',
                maxHeight: '300px',
              }}
            >
              <SignatureCanvas
                ref={signatureCanvasRef}
                penColor="black"
                canvasProps={{
                  className: 'signature-canvas',
                  style: {
                    width: '100%',
                    height: '100%',
                    border: '1px solid #eee',
                    backgroundColor: 'white',
                    cursor: 'crosshair',
                  },
                }}
              />
            </Box>

            <Stack spacing={2}>
              <Button
                variant="outlined"
                color="secondary"
                onClick={clearSignature}
                startIcon={<ClearIcon />}
                disabled={submitting}
              >
                Effacer la signature
              </Button>

              <Button
                variant="contained"
                color="success"
                onClick={handleSubmit}
                startIcon={
                  submitting ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <SaveIcon />
                  )
                }
                disabled={submitting}
                sx={{
                  py: 1.5,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    transform: 'scale(1.02)',
                  },
                }}
              >
                {submitting ? 'Enregistrement...' : 'Valider avec signature'}
              </Button>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Paper>
  );
};

// Two different exports:
// 1. A connected component for Supervisor mode
// 2. The pure component for Client mode

// mapStateToProps function to extract installationTexts from Redux state
const mapStateToProps = (state: RootState) => ({
  reduxInstallationTexts: state.installationTexts.texts,
});

// Connected component with Redux for Supervisor mode
const ConnectedPurchaseOrderSignature = connect(mapStateToProps)(
  PurchaseOrderSignature,
);

// Export the appropriate component based on the isClientMode prop
const PurchaseOrderSignatureExport = (props: PurchaseOrderSignatureProps) => {
  if (props.isClientMode) {
    // Use the pure component without Redux connection in client mode
    return <PurchaseOrderSignature {...props} />;
  } else {
    // Use the Redux-connected component in supervisor mode
    return <ConnectedPurchaseOrderSignature {...props} />;
  }
};

export default PurchaseOrderSignatureExport;
