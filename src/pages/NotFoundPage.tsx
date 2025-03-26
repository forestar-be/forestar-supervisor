import React from 'react';
import { Box, Typography, Button, Container } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

const NotFoundPage = (): JSX.Element => {
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <Container
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        minHeight: '100%',
        minWidth: '100%',
        bgcolor: 'background.paper',
        color: 'text.primary',
      }}
    >
      <Box>
        <ErrorOutlineIcon
          sx={{
            fontSize: 120, // Adjust the size of the icon.
            color: 'error.main', // Theme-based color (red).
            mb: 2,
          }}
        />
        <Typography variant="h5" gutterBottom>
          Oups ! La page que vous recherchez n'existe pas.
        </Typography>
        <Typography variant="body1" color="text.secondary" mb={4}>
          Il semble que vous soyez perdu. Revenez à la page d’accueil pour
          continuer à explorer.
        </Typography>
        <Button variant="contained" color="primary" onClick={handleGoHome}>
          Retour à l’accueil
        </Button>
      </Box>
    </Container>
  );
};

export default NotFoundPage;
