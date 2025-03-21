import React from 'react';
import { Container, Typography, Box, Paper } from '@mui/material';
import { Helmet } from 'react-helmet-async';

const PrivacyPolicy = () => {
  return (
    <>
      <Helmet>
        <title>Politique de confidentialité</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <Container maxWidth="md">
        <Paper sx={{ p: 4, my: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Politique de confidentialité
          </Typography>
          <Box mt={3}>
            <Typography variant="h5" component="h2" gutterBottom>
              1. Introduction
            </Typography>
            <Typography paragraph>
              Bienvenue sur Forestar Shop Atelier. Nous accordons une grande
              importance à la confidentialité et à la sécurité des données de
              nos utilisateurs. Cette politique de confidentialité explique
              comment notre application utilise l'API Google Agenda pour offrir
              une gestion efficace des réparations et locations de matériel.
            </Typography>
            <Typography paragraph>
              En utilisant notre application, vous acceptez les pratiques
              décrites dans cette politique de confidentialité.
            </Typography>
          </Box>

          <Box mt={3}>
            <Typography variant="h5" component="h2" gutterBottom>
              2. Données collectées et utilisation
            </Typography>
            <Typography paragraph>
              Notre application accède uniquement aux événements du Google
              Agenda de l'utilisateur pour ajouter, modifier, partager ou
              supprimer des événements en fonction des actions effectuées dans
              l'application.
            </Typography>
            <Typography variant="h6" component="h3" gutterBottom>
              Données collectées via Google Agenda
            </Typography>
            <Typography paragraph>
              Événements créés : Nous enregistrons uniquement l'identifiant
              unique (event ID) des événements que notre application ajoute au
              calendrier de l'utilisateur.
            </Typography>
            <Typography paragraph>
              Données non collectées : Nous ne stockons aucune autre donnée du
              compte Google de l'utilisateur, y compris le titre des événements,
              leurs descriptions, les participants ou tout autre contenu
              personnel.
            </Typography>
            <Typography variant="h6" component="h3" gutterBottom>
              Finalité de l'utilisation des données
            </Typography>
            <Typography paragraph>
              Les données sont utilisées uniquement pour permettre à
              l'utilisateur de gérer ses événements en lien avec les réparations
              et locations de matériel via notre application.
            </Typography>
          </Box>

          <Box mt={3}>
            <Typography variant="h5" component="h2" gutterBottom>
              3. Partage des données
            </Typography>
            <Typography paragraph>
              Les données ne sont pas partagées avec des tiers.
            </Typography>
            <Typography paragraph>
              Aucune information utilisateur n'est vendue ou utilisée à des fins
              publicitaires.
            </Typography>
          </Box>

          <Box mt={3}>
            <Typography variant="h5" component="h2" gutterBottom>
              4. Authentification et sécurité
            </Typography>
            <Typography paragraph>
              Nous utilisons OAuth 2.0 pour sécuriser l'accès à Google Agenda.
            </Typography>
            <Typography paragraph>
              L'application demande uniquement les autorisations strictement
              nécessaires à son fonctionnement.
            </Typography>
            <Typography paragraph>
              Les accès aux données sont limités aux événements ajoutés/modifiés
              par l'application.
            </Typography>
          </Box>

          <Box mt={3}>
            <Typography variant="h5" component="h2" gutterBottom>
              5. Droits des utilisateurs
            </Typography>
            <Typography variant="h6" component="h3" gutterBottom>
              Révocation de l'accès
            </Typography>
            <Typography paragraph>
              Les utilisateurs peuvent révoquer à tout moment l'accès de
              l'application à leur Google Agenda via les paramètres de sécurité
              de Google :
              <br />
              🔗{' '}
              <a
                href="https://myaccount.google.com/permissions"
                target="_blank"
                rel="noopener noreferrer"
              >
                Google Security Settings
              </a>
            </Typography>
            <Typography variant="h6" component="h3" gutterBottom>
              Suppression des données
            </Typography>
            <Typography paragraph>
              Les utilisateurs peuvent demander la suppression de leurs données
              en nous contactant par e-mail.
            </Typography>
          </Box>

          <Box mt={3}>
            <Typography variant="h5" component="h2" gutterBottom>
              6. Contact
            </Typography>
            <Typography paragraph>
              Si vous avez des questions concernant cette politique de
              confidentialité ou la gestion de vos données, vous pouvez nous
              contacter à :
            </Typography>
            <Typography paragraph>
              📍 Forestar
              <br />
              Chaussée d'Écaussinnes 160, 7090 Braine-le-Comte
              <br />
              📞 +32 67 83 07 06
              <br />
              📧 info@forestar.be
            </Typography>
          </Box>
        </Paper>
      </Container>
    </>
  );
};

export default PrivacyPolicy;
