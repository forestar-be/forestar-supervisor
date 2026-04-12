import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Fab from '@mui/material/Fab';
import NoSsr from '@mui/material/NoSsr';
import Zoom from '@mui/material/Zoom';
import '../styles/Layout.css';
import useScrollTrigger from '@mui/material/useScrollTrigger';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { useTheme } from '@mui/material/styles';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import HomeIcon from '@mui/icons-material/Home';
import CallIcon from '@mui/icons-material/Call';
import SettingsIcon from '@mui/icons-material/Settings';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { useNavigate } from 'react-router-dom';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import Header from './Header';

interface Props {
  children: React.ReactNode;
}

const Layout = ({ children }: Props): JSX.Element => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const trigger = useScrollTrigger({
    disableHysteresis: true,
    threshold: 100,
  });

  const scrollTo = (id: string): void => {
    setTimeout(() => {
      const element = document.querySelector(`#${id}`) as HTMLElement;
      if (!element) {
        return;
      }
      window.scrollTo({ left: 0, top: element.offsetTop, behavior: 'smooth' });
    });
  };

  // Mobile navigation menu items
  const menuItems = [
    { text: 'Accueil', icon: <HomeIcon />, path: '/' },
    { text: 'Gestion des appels', icon: <CallIcon />, path: '/appels' },
    {
      text: 'Calendrier',
      icon: <CalendarMonthIcon />,
      path: '/calendrier',
    },
    {
      text: 'Robots',
      icon: <SmartToyIcon />,
      path: null,
      href: process.env.REACT_APP_ROBOT_URL,
    },
    { text: 'Paramètres', icon: <SettingsIcon />, path: '/parametres' },
  ];

  const handleMenuItemClick = (path: string | null, href?: string) => {
    if (href) {
      window.open(href, '_blank', 'noopener,noreferrer');
      setSidebarOpen(false);
      return;
    }
    navigate(path!);
    setSidebarOpen(false);
  };

  return (
    <Box
      id="page-top"
      sx={{
        backgroundColor: theme.palette.background.default,
        height: '100%',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Header onSidebarOpen={() => setSidebarOpen(true)} />

      {/* Mobile Sidebar Drawer */}
      <Drawer
        anchor="left"
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      >
        <Box sx={{ width: 250 }} role="presentation">
          <List>
            {menuItems.map((item, index) => (
              <ListItem key={index} disablePadding>
                <ListItemButton onClick={() => handleMenuItemClick(item.path, item.href)}>
                  <ListItemIcon
                    sx={{
                      color:
                        theme.palette.mode === 'dark'
                          ? theme.palette.warning.main
                          : theme.palette.primary.main,
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      <Box width={1} margin="0 auto" height={'100%'} position={'relative'}>
        {children}
      </Box>
      <NoSsr>
        <Zoom in={trigger}>
          <Box
            onClick={() => scrollTo('page-top')}
            role="presentation"
            sx={{ position: 'fixed', bottom: 24, right: 32 }}
          >
            <Fab
              color="primary"
              size="small"
              aria-label="scroll back to top"
              sx={{
                color:
                  theme.palette.mode === 'dark'
                    ? theme.palette.common.black
                    : theme.palette.common.white,
                '&:hover': {
                  backgroundColor: 'transparent',
                  color:
                    theme.palette.mode === 'dark'
                      ? theme.palette.primary.main
                      : theme.palette.success.dark,
                  border:
                    '2px solid ' + theme.palette.mode === 'dark'
                      ? theme.palette.primary.main
                      : theme.palette.success.dark,
                },
              }}
            >
              <KeyboardArrowUpIcon />
            </Fab>
          </Box>
        </Zoom>
      </NoSsr>
    </Box>
  );
};

export default Layout;
