import { Theme, responsiveFontSizes } from '@mui/material';
import { createTheme } from '@mui/material/styles';
import { light, dark } from './palette';

const getTheme = (mode: string): Theme =>
  responsiveFontSizes(
    createTheme({
      palette: mode === 'light' ? light : dark,
      typography: {
        fontFamily: '"Poppins", sans-serif',
      },
    }),
  );

export default getTheme;
