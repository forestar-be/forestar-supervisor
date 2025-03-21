import { styled } from '@mui/material/styles';

// Styled component for the AG Grid with primary color headers
export const StyledAgGridWrapper = styled('div')(({ theme }) => ({
  height: '100%',
  width: '100%',
  '& .ag-header-viewport': {
    backgroundColor: theme.palette.primary.main,
  },
  '& .ag-header-cell': {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
  },
  '& .ag-header-cell:hover': {
    backgroundColor: `${theme.palette.primary.main} !important`,
  },
  '& .ag-header-cell-menu-button, & .ag-header-icon': {
    color: theme.palette.primary.contrastText,
  },
  // Specifically target filter and sort icons
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
  '& .ag-header-cell .ag-icon-asc, & .ag-header-cell .ag-icon-desc, & .ag-header-cell .ag-icon-none':
    {
      color: `${theme.palette.primary.contrastText} !important`,
    },
  '& .ag-header-cell-resize::after': {
    backgroundColor: theme.palette.primary.contrastText,
    opacity: 0.3,
  },
  // Handle active/pressed state
  '& .ag-header-cell:active, & .ag-header-cell:focus': {
    backgroundColor: `${theme.palette.primary.main} !important`,
  },
  // Ensure sort icons keep the correct color when active
  '& .ag-header-cell.ag-header-active .ag-header-icon': {
    color: `${theme.palette.primary.contrastText} !important`,
  },
  // Make sure the column menu popup also uses consistent colors for icons
  '& .ag-header-column-menu .ag-icon': {
    color: `${theme.palette.primary.contrastText} !important`,
  },
}));
