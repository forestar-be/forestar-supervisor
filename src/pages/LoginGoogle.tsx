import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  Paper,
  Typography,
  CircularProgress,
  useTheme,
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import { isAuthenticatedGg, getAuthUrlGg } from '../utils/api';
import { useAuth } from '../hooks/AuthProvider';

const LoginGoogle = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [authUrl, setAuthUrl] = useState<string>('');

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { isAuthenticated } = await isAuthenticatedGg(token);
        if (isAuthenticated) {
          const redirect = searchParams.get('redirect') || '/';
          navigate(redirect);
        } else {
          const currentUrl = window.location.href;
          const { email, url } = await getAuthUrlGg(
            token,
            encodeURIComponent(currentUrl),
          );
          setEmail(email);
          setAuthUrl(url);
        }
      } catch (err) {
        setError(
          "Une erreur est survenue lors de la vérification de l'authentification",
        );
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [token, navigate, searchParams]);

  const handleGoogleLogin = () => {
    if (authUrl) {
      window.location.href = authUrl;
    } else {
      setError("URL d'authentification non disponible");
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
            textAlign: 'center',
          }}
        >
          <GoogleIcon
            sx={{
              fontSize: 60,
              color: theme.palette.primary.main,
              mb: 2,
            }}
          />
          <Typography variant="h4" component="h1" gutterBottom>
            Authentification à Google nécessaire
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            L'application a besoin de se reconnecter au compte Google de{' '}
            <strong>{email}</strong> pour pouvoir continuer à mettre à jour le
            Google Agenda.
          </Typography>
          {error && (
            <Typography color="error" sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}
          <Button
            variant="contained"
            size="large"
            startIcon={<GoogleIcon />}
            onClick={handleGoogleLogin}
            sx={{
              mt: 2,
              px: 4,
              py: 1.5,
              borderRadius: 2,
              textTransform: 'none',
              fontSize: '1.1rem',
            }}
          >
            Se connecter avec Google
          </Button>
        </Paper>
      </Box>
    </Container>
  );
};

export default LoginGoogle;
