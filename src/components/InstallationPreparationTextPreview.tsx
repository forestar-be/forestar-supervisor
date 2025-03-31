import { Box, Typography } from '@mui/material';
import {
  InstallationPreparationText,
  InstallationTextType,
} from '../utils/types';

interface InstallationPreparationTextPreviewProps {
  texts: InstallationPreparationText[];
}

const InstallationPreparationTextPreview = ({
  texts,
}: InstallationPreparationTextPreviewProps) => {
  if (!texts || texts.length === 0) {
    return (
      <Box p={3} textAlign="center">
        <Typography color="text.secondary">
          Aucune instruction de préparation n'a été définie.
        </Typography>
      </Box>
    );
  }

  const renderText = (text: InstallationPreparationText) => {
    switch (text.type) {
      case InstallationTextType.TITLE:
        return (
          <Typography
            variant="h4"
            component="h1"
            gutterBottom
            sx={{ fontWeight: 'bold', mt: 3 }}
          >
            {text.content}
          </Typography>
        );
      case InstallationTextType.SUBTITLE:
        return (
          <Typography
            variant="h5"
            component="h2"
            gutterBottom
            sx={{ fontWeight: 'bold', mt: 2 }}
          >
            {text.content}
          </Typography>
        );
      case InstallationTextType.SUBTITLE2:
        return (
          <Typography
            variant="h6"
            component="h3"
            gutterBottom
            sx={{ fontWeight: 'bold', mt: 1.5 }}
          >
            {text.content}
          </Typography>
        );
      case InstallationTextType.PARAGRAPH:
      default:
        return (
          <Typography variant="body1" paragraph sx={{ whiteSpace: 'pre-wrap' }}>
            {text.content}
          </Typography>
        );
    }
  };

  return (
    <Box sx={{ maxWidth: '800px', mx: 'auto' }}>
      {texts.map((text) => (
        <Box key={text.id}>{renderText(text)}</Box>
      ))}
    </Box>
  );
};

export default InstallationPreparationTextPreview;
