import React, { useContext, useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import EmailIcon from '@mui/icons-material/Email';
import Popover from '@mui/material/Popover';
import Paper from '@mui/material/Paper';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import PhoneIcon from '@mui/icons-material/Phone';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import headerData from '../config/header.json';
import contactData from '../config/contact.json';
import { Logo } from '../components/Logo';
import useMediaQuery from '@mui/material/useMediaQuery';
import { Divider } from '@mui/material';
import ColorModeContext from '../utils/ColorModeContext';

export interface HeaderProps {
  title: string;
  clientTitle: string;
}

interface Props {
  onSidebarOpen?: () => void;
}

const HeaderClient = ({ onSidebarOpen }: Props = {}): JSX.Element => {
  const theme = useTheme();
  const [header] = useState<HeaderProps>(headerData);
  const isBelowTitleSizeBreakpoint = useMediaQuery('(max-width:500px)');
  const isBelowTitleBreakpoint = useMediaQuery('(max-width:300px)');
  const colorMode = useContext(ColorModeContext);

  // Contact popup state
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const handleEmailClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handlePopoverClose = () => {
    setAnchorEl(null);
  };
  const open = Boolean(anchorEl);
  const popoverId = open ? 'contact-popover' : undefined;

  // Contact information from config
  const contactInfo = contactData;

  return (
    <AppBar
      color="transparent"
      position="sticky"
      sx={{
        border: 0,
        top: 'auto',
        boxShadow:
          '0 4px 18px 0px rgba(0, 0, 0, 0.12), 0 7px 10px -5px rgba(0, 0, 0, 0.15)',
      }}
    >
      <Toolbar sx={{ minHeight: 70 }}>
        <IconButton size="large" disabled>
          <Logo isDark={theme.palette.mode === 'dark'} />
          <Box
            sx={{
              display: isBelowTitleBreakpoint ? 'none' : 'flex',
            }}
          >
            <Typography
              variant={isBelowTitleSizeBreakpoint ? 'body1' : 'h6'}
              sx={{
                flexGrow: 1,
                color: theme.palette.text.primary,
                fontWeight: 'bold',
                textTransform: 'uppercase',
                textDecoration: 'none',
                marginLeft: '10px',
                fontSize: isBelowTitleSizeBreakpoint ? '0.9rem' : undefined,
              }}
            >
              {header.clientTitle}
            </Typography>
          </Box>
        </IconButton>
        <Box sx={{ flexGrow: 1 }} />
        <Box>
          <IconButton
            onClick={handleEmailClick}
            aria-label="Contact"
            color={theme.palette.mode === 'dark' ? 'warning' : 'inherit'}
            aria-describedby={popoverId}
          >
            <Tooltip title="Nous contacter">
              <EmailIcon fontSize="medium" />
            </Tooltip>
          </IconButton>
          <Popover
            id={popoverId}
            open={open}
            anchorEl={anchorEl}
            onClose={handlePopoverClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'center',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'center',
            }}
          >
            <Paper sx={{ p: 2, maxWidth: 320 }}>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Contactez-nous
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <EmailIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Email"
                    secondary={
                      <Link
                        href={`mailto:${contactInfo.email}`}
                        sx={{ color: theme.palette.primary.main }}
                      >
                        {contactInfo.email}
                      </Link>
                    }
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <PhoneIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Téléphone"
                    secondary={
                      <Link
                        href={`tel:${contactInfo.phone.replace(/\s/g, '')}`}
                        sx={{ color: theme.palette.primary.main }}
                      >
                        {contactInfo.phone}
                      </Link>
                    }
                  />
                </ListItem>
              </List>
            </Paper>
          </Popover>
        </Box>
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
  );
};

export default HeaderClient;
