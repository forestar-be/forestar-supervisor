import { Theme, responsiveFontSizes } from '@mui/material';
import { createTheme } from '@mui/material/styles';
import { light, dark } from './palette';

const getTheme = (mode: string): Theme =>
  responsiveFontSizes(
    createTheme({
      palette: mode === 'light' ? light : dark,
      typography: {
        fontFamily:
          '"Inter", "Poppins", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        h1: {
          fontWeight: 800,
          letterSpacing: '-0.02em',
          lineHeight: 1.2,
        },
        h2: {
          fontWeight: 700,
          letterSpacing: '-0.01em',
          lineHeight: 1.3,
        },
        h3: {
          fontWeight: 700,
          letterSpacing: '-0.01em',
          lineHeight: 1.3,
        },
        h4: {
          fontWeight: 600,
          letterSpacing: '-0.005em',
          lineHeight: 1.4,
        },
        h5: {
          fontWeight: 600,
          lineHeight: 1.4,
        },
        h6: {
          fontWeight: 600,
          lineHeight: 1.4,
        },
        body1: {
          fontSize: '1rem',
          lineHeight: 1.6,
          letterSpacing: '0.01em',
        },
        body2: {
          fontSize: '0.875rem',
          lineHeight: 1.6,
          letterSpacing: '0.01em',
        },
        button: {
          fontWeight: 600,
          letterSpacing: '0.02em',
          textTransform: 'none',
        },
      },
      shape: {
        borderRadius: 12,
      },
      shadows: [
        'none',
        '0px 2px 4px rgba(0, 0, 0, 0.04)',
        '0px 4px 8px rgba(0, 0, 0, 0.06)',
        '0px 8px 16px rgba(0, 0, 0, 0.08)',
        '0px 12px 24px rgba(0, 0, 0, 0.1)',
        '0px 16px 32px rgba(0, 0, 0, 0.12)',
        '0px 20px 40px rgba(0, 0, 0, 0.14)',
        '0px 24px 48px rgba(0, 0, 0, 0.16)',
        // Glassmorphism shadows
        '0px 8px 32px rgba(0, 0, 0, 0.08), 0px 4px 16px rgba(0, 0, 0, 0.04)',
        '0px 12px 40px rgba(0, 0, 0, 0.1), 0px 6px 20px rgba(0, 0, 0, 0.06)',
        '0px 16px 48px rgba(0, 0, 0, 0.12), 0px 8px 24px rgba(0, 0, 0, 0.08)',
        '0px 20px 56px rgba(0, 0, 0, 0.14), 0px 10px 28px rgba(0, 0, 0, 0.1)',
        '0px 24px 64px rgba(0, 0, 0, 0.16), 0px 12px 32px rgba(0, 0, 0, 0.12)',
        '0px 28px 72px rgba(0, 0, 0, 0.18), 0px 14px 36px rgba(0, 0, 0, 0.14)',
        '0px 32px 80px rgba(0, 0, 0, 0.2), 0px 16px 40px rgba(0, 0, 0, 0.16)',
        '0px 36px 88px rgba(0, 0, 0, 0.22), 0px 18px 44px rgba(0, 0, 0, 0.18)',
        '0px 40px 96px rgba(0, 0, 0, 0.24), 0px 20px 48px rgba(0, 0, 0, 0.2)',
        '0px 44px 104px rgba(0, 0, 0, 0.26), 0px 22px 52px rgba(0, 0, 0, 0.22)',
        '0px 48px 112px rgba(0, 0, 0, 0.28), 0px 24px 56px rgba(0, 0, 0, 0.24)',
        '0px 52px 120px rgba(0, 0, 0, 0.3), 0px 26px 60px rgba(0, 0, 0, 0.26)',
        '0px 56px 128px rgba(0, 0, 0, 0.32), 0px 28px 64px rgba(0, 0, 0, 0.28)',
        '0px 60px 136px rgba(0, 0, 0, 0.34), 0px 30px 68px rgba(0, 0, 0, 0.3)',
        '0px 64px 144px rgba(0, 0, 0, 0.36), 0px 32px 72px rgba(0, 0, 0, 0.32)',
        '0px 68px 152px rgba(0, 0, 0, 0.38), 0px 34px 76px rgba(0, 0, 0, 0.34)',
        '0px 72px 160px rgba(0, 0, 0, 0.4), 0px 36px 80px rgba(0, 0, 0, 0.36)',
      ],
      components: {
        MuiCssBaseline: {
          styleOverrides: {
            '*': {
              scrollbarWidth: 'thin',
              scrollbarColor: mode === 'dark' ? '#555 #1a1a1a' : '#ccc #f5f5f5',
            },
            '*::-webkit-scrollbar': {
              width: '8px',
              height: '8px',
            },
            '*::-webkit-scrollbar-track': {
              background: mode === 'dark' ? '#1a1a1a' : '#f5f5f5',
            },
            '*::-webkit-scrollbar-thumb': {
              background: mode === 'dark' ? '#555' : '#ccc',
              borderRadius: '4px',
            },
            '*::-webkit-scrollbar-thumb:hover': {
              background: mode === 'dark' ? '#666' : '#999',
            },
          },
        },
        MuiButton: {
          styleOverrides: {
            root: {
              borderRadius: 10,
              fontWeight: 600,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow:
                  mode === 'dark'
                    ? '0px 8px 24px rgba(0, 0, 0, 0.4)'
                    : '0px 8px 24px rgba(0, 0, 0, 0.15)',
              },
            },
            contained: {
              boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
            },
          },
        },
        MuiCard: {
          styleOverrides: {
            root: {
              borderRadius: 16,
              boxShadow:
                mode === 'dark'
                  ? '0px 8px 32px rgba(0, 0, 0, 0.3)'
                  : '0px 4px 20px rgba(0, 0, 0, 0.08)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              backdropFilter: mode === 'dark' ? 'blur(10px)' : 'none',
              backgroundColor:
                mode === 'dark'
                  ? 'rgba(25, 25, 25, 0.8)'
                  : 'rgba(255, 255, 255, 0.95)',
              border:
                mode === 'dark'
                  ? '1px solid rgba(255, 255, 255, 0.1)'
                  : '1px solid rgba(0, 0, 0, 0.05)',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow:
                  mode === 'dark'
                    ? '0px 12px 40px rgba(0, 0, 0, 0.4)'
                    : '0px 8px 32px rgba(0, 0, 0, 0.12)',
              },
            },
          },
        },
        MuiPaper: {
          styleOverrides: {
            root: {
              borderRadius: 12,
              backgroundImage: 'none',
            },
            elevation1: {
              boxShadow:
                mode === 'dark'
                  ? '0px 4px 16px rgba(0, 0, 0, 0.3)'
                  : '0px 2px 8px rgba(0, 0, 0, 0.06)',
            },
            elevation2: {
              boxShadow:
                mode === 'dark'
                  ? '0px 6px 20px rgba(0, 0, 0, 0.35)'
                  : '0px 4px 12px rgba(0, 0, 0, 0.08)',
            },
            elevation3: {
              boxShadow:
                mode === 'dark'
                  ? '0px 8px 24px rgba(0, 0, 0, 0.4)'
                  : '0px 6px 16px rgba(0, 0, 0, 0.1)',
            },
          },
        },
        MuiTextField: {
          styleOverrides: {
            root: {
              '& .MuiOutlinedInput-root': {
                borderRadius: 10,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderWidth: '2px',
                  },
                },
                '&.Mui-focused': {
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderWidth: '2px',
                  },
                },
              },
            },
          },
        },
        MuiChip: {
          styleOverrides: {
            root: {
              borderRadius: 8,
              fontWeight: 500,
            },
          },
        },
        MuiAppBar: {
          styleOverrides: {
            root: {
              boxShadow:
                mode === 'dark'
                  ? '0px 4px 20px rgba(0, 0, 0, 0.4)'
                  : '0px 2px 12px rgba(0, 0, 0, 0.08)',
              backdropFilter: 'blur(20px)',
              backgroundColor:
                mode === 'dark'
                  ? 'rgba(15, 15, 15, 0.8)'
                  : 'rgba(255, 255, 255, 0.8)',
            },
          },
        },
        MuiTooltip: {
          styleOverrides: {
            tooltip: {
              borderRadius: 6,
              fontSize: '0.75rem',
              padding: '4px 8px',
              backdropFilter: 'blur(10px)',
              backgroundColor:
                mode === 'dark'
                  ? 'rgba(50, 50, 50, 0.95)'
                  : 'rgba(50, 50, 50, 0.92)',
            },
          },
        },
        MuiDialog: {
          styleOverrides: {
            paper: {
              borderRadius: 20,
              boxShadow: '0px 24px 64px rgba(0, 0, 0, 0.2)',
            },
          },
        },
        MuiDrawer: {
          styleOverrides: {
            paper: {
              borderRadius: '0 16px 16px 0',
              backdropFilter: 'blur(20px)',
              backgroundColor:
                mode === 'dark'
                  ? 'rgba(20, 20, 20, 0.9)'
                  : 'rgba(255, 255, 255, 0.9)',
              borderRight:
                mode === 'dark'
                  ? '1px solid rgba(255, 255, 255, 0.1)'
                  : '1px solid rgba(0, 0, 0, 0.05)',
            },
          },
        },
      },
    }),
  );

export default getTheme;
