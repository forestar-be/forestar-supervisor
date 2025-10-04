import { Box, styled } from '@mui/material';

// Styled component for the AG Grid with modern design
export const StyledAgGridWrapper = styled(Box)(({ theme }) => ({
  height: '100%',
  width: '100%',
  overflow: 'hidden',
  borderRadius: '8px',
  
  // Modern root styling
  '& .ag-root-wrapper': {
    borderRadius: '8px',
    overflow: 'hidden',
    border: theme.palette.mode === 'dark'
      ? '1px solid rgba(255, 255, 255, 0.1)'
      : '1px solid rgba(0, 0, 0, 0.08)',
  },

  // Header with gradient and glassmorphism effect
  '& .ag-header': {
    background: theme.palette.mode === 'dark'
      ? `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`
      : `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`,
    borderBottom: theme.palette.mode === 'dark'
      ? '2px solid rgba(255, 255, 255, 0.15)'
      : '2px solid rgba(0, 0, 0, 0.1)',
    backdropFilter: 'blur(10px)',
    fontWeight: 600,
    fontSize: '0.9rem',
  },

  '& .ag-header-viewport': {
    background: 'transparent',
  },

  '& .ag-header-cell': {
    backgroundColor: 'transparent',
    color: theme.palette.primary.contrastText,
    fontWeight: 600,
    fontSize: '0.875rem',
    padding: '12px 16px',
    transition: 'all 0.2s ease',
    borderRight: theme.palette.mode === 'dark'
      ? '1px solid rgba(255, 255, 255, 0.08)'
      : '1px solid rgba(255, 255, 255, 0.2)',
    
    '&:hover': {
      backgroundColor: theme.palette.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.08) !important'
        : 'rgba(255, 255, 255, 0.15) !important',
    },
  },

  '& .ag-header-cell-label': {
    fontWeight: 600,
    letterSpacing: '0.02em',
  },

  // Icons in header
  '& .ag-header-cell-menu-button, & .ag-header-icon': {
    color: theme.palette.primary.contrastText,
    opacity: 0.9,
    transition: 'opacity 0.2s ease',
    
    '&:hover': {
      opacity: 1,
    },
  },

  '& .ag-header-cell-label .ag-icon': {
    color: `${theme.palette.primary.contrastText} !important`,
  },

  '& .ag-header-icon.ag-header-cell-menu-button .ag-icon': {
    color: `${theme.palette.primary.contrastText} !important`,
  },

  '& .ag-header-cell .ag-icon-filter': {
    color: `${theme.palette.primary.contrastText} !important`,
  },

  '& .ag-header-cell .ag-icon-menu': {
    color: `${theme.palette.primary.contrastText} !important`,
  },

  '& .ag-header-cell .ag-icon-asc, & .ag-header-cell .ag-icon-desc, & .ag-header-cell .ag-icon-none': {
    color: `${theme.palette.primary.contrastText} !important`,
  },

  // Column resize handle
  '& .ag-header-cell-resize::after': {
    backgroundColor: theme.palette.primary.contrastText,
    opacity: 0.4,
    width: '2px',
  },

  // Active/focused header cells
  '& .ag-header-cell:active, & .ag-header-cell:focus': {
    backgroundColor: 'rgba(255, 255, 255, 0.1) !important',
  },

  '& .ag-header-cell.ag-header-active .ag-header-icon': {
    color: `${theme.palette.primary.contrastText} !important`,
  },

  '& .ag-header-column-menu .ag-icon': {
    color: `${theme.palette.primary.contrastText} !important`,
  },

  // Modern row styling with hover effects
  '& .ag-row': {
    borderBottom: theme.palette.mode === 'dark'
      ? '1px solid rgba(255, 255, 255, 0.05)'
      : '1px solid rgba(0, 0, 0, 0.05)',
    transition: 'all 0.2s ease',
    
    '&:hover': {
      backgroundColor: theme.palette.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.03)'
        : 'rgba(0, 0, 0, 0.02)',
      transform: 'translateX(2px)',
      boxShadow: theme.palette.mode === 'dark'
        ? '0 2px 8px rgba(0, 0, 0, 0.3)'
        : '0 2px 8px rgba(0, 0, 0, 0.08)',
    },
  },

  // Alternate row colors for better readability
  '& .ag-row-even': {
    backgroundColor: theme.palette.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.02)'
      : 'rgba(0, 0, 0, 0.01)',
  },

  // Cell styling
  '& .ag-cell': {
    padding: '12px 16px',
    fontSize: '0.875rem',
    lineHeight: 1.5,
    display: 'flex',
    alignItems: 'center',
    borderRight: theme.palette.mode === 'dark'
      ? '1px solid rgba(255, 255, 255, 0.03)'
      : '1px solid rgba(0, 0, 0, 0.03)',
  },

  // Selected rows with modern highlight
  '& .ag-row-selected': {
    backgroundColor: theme.palette.mode === 'dark'
      ? 'rgba(6, 182, 212, 0.15) !important'
      : 'rgba(14, 165, 233, 0.1) !important',
    borderLeft: `3px solid ${theme.palette.primary.main}`,
    
    '&:hover': {
      backgroundColor: theme.palette.mode === 'dark'
        ? 'rgba(6, 182, 212, 0.2) !important'
        : 'rgba(14, 165, 233, 0.15) !important',
    },
  },

  // Editing cell with modern focus ring
  '& .ag-cell-inline-editing': {
    boxShadow: `0 0 0 2px ${theme.palette.primary.main}`,
    backgroundColor: theme.palette.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.05)'
      : 'rgba(255, 255, 255, 0.8)',
    borderRadius: '4px',
  },

  // Remove outline from cells with focus (checkboxes)
  '& .ag-cell.no-focus-outline:focus': {
    outline: 'none',
  },

  // Modern pagination styling
  '& .ag-paging-panel': {
    height: 'auto',
    minHeight: '40px',
    padding: '4px 12px',
    borderTop: theme.palette.mode === 'dark'
      ? '1px solid rgba(255, 255, 255, 0.1)'
      : '1px solid rgba(0, 0, 0, 0.08)',
    backgroundColor: theme.palette.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.02)'
      : 'rgba(0, 0, 0, 0.01)',
    fontWeight: 500,
    fontSize: '0.875rem',
    
    [theme.breakpoints.down('sm')]: {
      '& .ag-picker-field .ag-label': {
        display: 'none',
      },
      '& .ag-paging-row-summary-panel': {
        display: 'none',
      },
    },
  },

  // Pagination buttons
  '& .ag-paging-button': {
    borderRadius: '6px',
    transition: 'all 0.2s ease',
    
    '&:hover': {
      backgroundColor: theme.palette.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.08)'
        : 'rgba(0, 0, 0, 0.05)',
    },
  },

  // Page size selector
  '& .ag-picker-field-wrapper': {
    borderRadius: '6px',
    border: theme.palette.mode === 'dark'
      ? '1px solid rgba(255, 255, 255, 0.1)'
      : '1px solid rgba(0, 0, 0, 0.12)',
    transition: 'all 0.2s ease',
    
    '&:hover': {
      borderColor: theme.palette.primary.main,
    },
  },

  // Loading overlay
  '& .ag-overlay-loading-wrapper': {
    backdropFilter: 'blur(4px)',
    backgroundColor: theme.palette.mode === 'dark'
      ? 'rgba(0, 0, 0, 0.5)'
      : 'rgba(255, 255, 255, 0.7)',
  },

  // Filter icons and menus
  '& .ag-filter-icon': {
    color: theme.palette.primary.main,
  },

  // Popup menus with glassmorphism
  '& .ag-popup': {
    borderRadius: '8px',
    boxShadow: theme.palette.mode === 'dark'
      ? '0px 8px 32px rgba(0, 0, 0, 0.4)'
      : '0px 8px 32px rgba(0, 0, 0, 0.12)',
    backdropFilter: 'blur(10px)',
    border: theme.palette.mode === 'dark'
      ? '1px solid rgba(255, 255, 255, 0.1)'
      : '1px solid rgba(0, 0, 0, 0.08)',
  },

  // Scrollbars
  '& .ag-body-horizontal-scroll': {
    '&::-webkit-scrollbar': {
      height: '8px',
    },
    '&::-webkit-scrollbar-track': {
      background: theme.palette.mode === 'dark' ? '#1a1a1a' : '#f5f5f5',
    },
    '&::-webkit-scrollbar-thumb': {
      background: theme.palette.mode === 'dark' ? '#555' : '#ccc',
      borderRadius: '4px',
      
      '&:hover': {
        background: theme.palette.mode === 'dark' ? '#666' : '#999',
      },
    },
  },

  '& .ag-body-vertical-scroll': {
    '&::-webkit-scrollbar': {
      width: '8px',
    },
    '&::-webkit-scrollbar-track': {
      background: theme.palette.mode === 'dark' ? '#1a1a1a' : '#f5f5f5',
    },
    '&::-webkit-scrollbar-thumb': {
      background: theme.palette.mode === 'dark' ? '#555' : '#ccc',
      borderRadius: '4px',
      
      '&:hover': {
        background: theme.palette.mode === 'dark' ? '#666' : '#999',
      },
    },
  },
}));
