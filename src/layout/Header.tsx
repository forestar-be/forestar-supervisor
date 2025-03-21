import React, { useContext, useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { useTheme } from '@mui/material/styles';
import LogoutIcon from '@mui/icons-material/Logout';
import SettingsIcon from '@mui/icons-material/Settings';
import ColorModeContext from '../utils/ColorModeContext';
import headerData from '../config/header.json';
import { Logo } from '../components/Logo';
import { useAuth } from '../hooks/AuthProvider';
import { useNavigate } from 'react-router-dom';
import Button from '@mui/material/Button';
import CallIcon from '@mui/icons-material/Call';
import HomeIcon from '@mui/icons-material/Home';
import InventoryIcon from '@mui/icons-material/Inventory';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';

interface Props {
  onSidebarOpen: () => void;
}

export interface HeaderProps {
  title: string;
}

const Header = ({ onSidebarOpen }: Props): JSX.Element => {
  const theme = useTheme();
  const auth = useAuth();
  const colorMode = useContext(ColorModeContext);
  const [header] = useState<HeaderProps>(headerData);
  const navigate = useNavigate();

  return (
    <>
      <AppBar
        color="transparent"
        position="sticky"
        sx={{
          border: 0,
          // padding: '10px 0',
          top: 'auto',
          boxShadow:
            '0 4px 18px 0px rgba(0, 0, 0, 0.12), 0 7px 10px -5px rgba(0, 0, 0, 0.15)',
        }}
      >
        <Toolbar sx={{ minHeight: 70 }}>
          <Link
            href="/"
            sx={{ textDecoration: 'none' }}
            onClick={(e) => {
              e.preventDefault();
              navigate('/');
            }}
          >
            <IconButton size="large" disabled>
              <Logo isDark={theme.palette.mode === 'dark'} />
              <Box sx={{ display: { md: 'inline', xs: 'none' } }}>
                <Typography
                  variant="h6"
                  sx={{
                    flexGrow: 1,
                    color: theme.palette.text.primary,
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    textDecoration: 'none',
                    marginLeft: '10px',
                  }}
                >
                  {header.title}
                </Typography>
              </Box>
            </IconButton>
          </Link>
          <Box sx={{ flexGrow: 1 }} />
          <Box
            sx={{
              alignItems: 'center',
              display: { lg: 'flex', md: 'none', xs: 'none' },
            }}
          ></Box>
          {auth.token && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                component="a"
                href={`/`}
                onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                  e.preventDefault();
                  navigate(`/`);
                }}
                aria-label="Accueil"
                color={theme.palette.mode === 'dark' ? 'warning' : 'inherit'}
                startIcon={<HomeIcon fontSize="medium" />}
                variant="contained"
              >
                Accueil
              </Button>
              <Button
                component="a"
                href={`/appels`}
                onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                  e.preventDefault();
                  navigate(`/appels`);
                }}
                aria-label="Gestion des appels"
                color={theme.palette.mode === 'dark' ? 'warning' : 'inherit'}
                startIcon={<CallIcon fontSize="medium" />}
                variant="contained"
              >
                Gestion des appels
              </Button>
              <Button
                component="a"
                href={`/inventaire-robots`}
                onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                  e.preventDefault();
                  navigate(`/inventaire-robots`);
                }}
                aria-label="Inventaire des robots"
                color={theme.palette.mode === 'dark' ? 'warning' : 'inherit'}
                startIcon={<InventoryIcon fontSize="medium" />}
                variant="contained"
              >
                Inventaire robots
              </Button>
              <Button
                component="a"
                href={`/purchase-orders`}
                onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                  e.preventDefault();
                  navigate(`/purchase-orders`);
                }}
                aria-label="Bons de commande"
                color={theme.palette.mode === 'dark' ? 'warning' : 'inherit'}
                startIcon={<ShoppingCartIcon fontSize="medium" />}
                variant="contained"
              >
                Bons de commande
              </Button>
              <IconButton
                component="a"
                href={`/parametres`}
                onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                  e.preventDefault();
                  navigate(`/parametres`);
                }}
                aria-label="Paramètres"
                color={theme.palette.mode === 'dark' ? 'warning' : 'inherit'}
              >
                <Tooltip title="Paramètres">
                  <SettingsIcon fontSize="medium" />
                </Tooltip>
              </IconButton>
              <IconButton
                onClick={auth.logOut}
                aria-label="Déconnexion"
                color={theme.palette.mode === 'dark' ? 'warning' : 'inherit'}
              >
                <Tooltip title="Déconnexion">
                  <LogoutIcon fontSize="medium" />
                </Tooltip>
              </IconButton>
            </Box>
          )}
          <Divider
            orientation="vertical"
            sx={{
              height: 32,
              marginX: 2,
              display: { lg: 'flex', md: 'none', xs: 'none' },
            }}
          />
          <Box sx={{ display: 'flex' }}>
            <IconButton
              onClick={colorMode.toggleColorMode}
              aria-label="Theme Mode"
              color={theme.palette.mode === 'dark' ? 'warning' : 'inherit'}
            >
              {theme.palette.mode === 'dark' ? (
                <Tooltip title="Passer en mode clair">
                  <LightModeIcon fontSize="medium" />
                </Tooltip>
              ) : (
                <Tooltip title="Passer en mode sombre">
                  <DarkModeIcon fontSize="medium" />
                </Tooltip>
              )}
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>
    </>
  );
};

export default Header;
