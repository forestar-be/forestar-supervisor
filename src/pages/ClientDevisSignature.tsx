import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Typography,
  Grid,
  Divider,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import PurchaseOrderSignature from './PurchaseOrderSignature';
import { toast } from 'react-toastify';
import { getClientDevisPdf } from '../utils/api';
import footerData from '../config/footer-client-devis.json';
// Nouveaux imports d'icônes
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import LockIcon from '@mui/icons-material/Lock';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import LinkOffIcon from '@mui/icons-material/LinkOff';

// Définition des types d'erreur
type ErrorType = 'not_found' | 'unauthorized' | 'general' | null;

interface FooterProps {
  copyright: string;
  TVA: string;
  entreprise: string;
  adresse: string;
  email: string;
  telephone: string;
  signature_electronique: {
    certification: string;
    confidentialite: string;
    securite: string;
  };
  mentions_legales: string[];
}

// Composant Footer pour la page de signature du devis client
const LegalFooter: React.FC = () => {
  const [footer] = useState<FooterProps>(footerData as FooterProps);

  return (
    <Box
      component="footer"
      sx={{
        pb: 2,
        pt: 2,
        borderTop: '1px solid #e0e0e0',
        fontSize: '0.8rem',
        color: 'text.secondary',
      }}
    >
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Box sx={{ my: 1 }}>
            <Typography variant="body2" align="center" gutterBottom>
              {footer.signature_electronique.certification}
            </Typography>
            <Typography variant="body2" align="center" gutterBottom>
              {footer.signature_electronique.confidentialite}
            </Typography>
            <Typography variant="body2" align="center" gutterBottom>
              {footer.signature_electronique.securite}
            </Typography>
          </Box>
          <Divider sx={{ my: 1 }} />
          <Typography variant="body2" align="center" gutterBottom>
            {footer.entreprise} - {footer.adresse}
          </Typography>
          <Typography variant="body2" align="center" gutterBottom>
            {footer.email} - {footer.telephone}
          </Typography>
          <Typography variant="body2" align="center" gutterBottom>
            TVA: {footer.TVA}
          </Typography>
          <Divider sx={{ my: 1 }} />
          <Box sx={{ my: 1 }}>
            <Typography
              variant="body2"
              align="center"
              fontWeight="bold"
              gutterBottom
            >
              Mentions légales
            </Typography>
            {footer.mentions_legales.map((mention, index) => (
              <Typography
                key={index}
                variant="body2"
                align="center"
                gutterBottom
              >
                {mention}
              </Typography>
            ))}
          </Box>

          <Typography variant="body2" align="center" sx={{ mt: 2 }}>
            Copyright &copy; {new Date().getFullYear()} {footer.copyright}. Tous
            droits réservés.
          </Typography>
        </Grid>
      </Grid>
    </Box>
  );
};

interface ClientDevisSignatureProps {}

const ClientDevisSignature: React.FC<ClientDevisSignatureProps> = () => {
  const location = useLocation();
  const [token, setToken] = useState<string | null>(null);
  const [id, setId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [errorLoading, setErrorLoading] = useState(false);
  const [errorType, setErrorType] = useState<ErrorType>(null);

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const urlToken = queryParams.get('mot_de_passe');
    const urlId = queryParams.get('id');

    if (!urlToken || !urlId) {
      console.error(
        'Lien invalide. Veuillez utiliser le lien reçu par email.',
        urlToken,
        urlId,
        queryParams,
      );
    } else {
      setToken(urlToken);
      setId(urlId);
    }
    setLoading(false);
  }, [location.search]);

  // Fonction de téléchargement du PDF après signature réussie
  const handleDownloadPdf = useCallback(async () => {
    if (!token || !id) return;

    try {
      // Utiliser le endpoint client pour télécharger le PDF via la fonction API
      const pdfBlob = await getClientDevisPdf(token, id);
      const url = URL.createObjectURL(pdfBlob);

      // Créer un lien temporaire pour télécharger le fichier
      const a = document.createElement('a');
      a.href = url;
      a.download = `bon-de-commande-${id}.pdf`;
      document.body.appendChild(a);
      a.click();

      // Nettoyer
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur téléchargement PDF:', error);
      toast.error('Erreur lors du téléchargement du PDF');
    }
  }, [token, id]);

  const handleSignatureSuccess = useCallback(() => {
    setSuccess(true);
  }, []);

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
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (errorLoading) {
    let errorTitle = 'Erreur de chargement';
    let errorMessage =
      'Une erreur est survenue lors du chargement des données. Veuillez réessayer ou contacter Forestar Shop pour assistance.';
    let ErrorIcon = ReportProblemIcon;

    if (errorType === 'not_found') {
      errorTitle = 'Devis introuvable';
      errorMessage =
        'Le devis que vous cherchez est introuvable. Veuillez vérifier le lien ou contacter Forestar Shop pour assistance.';
      ErrorIcon = ErrorOutlineIcon;
    } else if (errorType === 'unauthorized') {
      errorTitle = 'Accès non autorisé';
      errorMessage =
        "Vous n'êtes pas autorisé à accéder à ce devis. Veuillez vérifier le lien ou contacter Forestar Shop pour assistance.";
      ErrorIcon = LockIcon;
    }

    return (
      <Paper
        sx={{
          p: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          maxWidth: 600,
          mx: 'auto',
          mt: 4,
        }}
      >
        <ErrorIcon color="error" sx={{ fontSize: 60, mb: 2 }} />
        <Typography variant="h5" component="h1" gutterBottom>
          {errorTitle}
        </Typography>
        <Typography variant="body1" paragraph align="center">
          {errorMessage}
        </Typography>
      </Paper>
    );
  }

  if (!token) {
    return (
      <Paper
        sx={{
          p: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          maxWidth: 600,
          mx: 'auto',
          mt: 4,
        }}
      >
        <LinkOffIcon color="warning" sx={{ fontSize: 60, mb: 2 }} />
        <Typography variant="h5" component="h1" gutterBottom>
          Erreur d'accès
        </Typography>
        <Typography variant="body1" paragraph align="center">
          Lien invalide. Veuillez utiliser le lien exact reçu par email ou
          contacter Forestar Shop pour assistance.
        </Typography>
      </Paper>
    );
  }

  if (success) {
    return (
      <Paper
        sx={{
          p: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          maxWidth: 600,
          mx: 'auto',
          mt: 4,
        }}
      >
        <CheckCircleIcon color="success" sx={{ fontSize: 60, mb: 2 }} />
        <Typography
          variant="h5"
          component="h1"
          color="success.main"
          gutterBottom
        >
          Signature enregistrée avec succès !
        </Typography>
        <Typography variant="body1" paragraph align="center">
          Merci d'avoir validé votre devis. Votre bon de commande a été généré
          et nous vous contacterons prochainement pour la suite des opérations.
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<DownloadIcon />}
          onClick={handleDownloadPdf}
          sx={{ mt: 2 }}
        >
          Télécharger votre bon de commande
        </Button>
      </Paper>
    );
  }

  return (
    <>
      <PurchaseOrderSignature
        isClientMode={true}
        clientToken={token}
        idClientMode={id}
        onSignatureSuccess={handleSignatureSuccess}
        setErrorLoading={setErrorLoading}
        setErrorType={setErrorType}
      />
      <LegalFooter />
    </>
  );
};

export default ClientDevisSignature;
