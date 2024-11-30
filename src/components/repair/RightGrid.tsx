import React from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Grid,
  IconButton,
  ImageList,
  Typography,
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  CameraAlt as CameraAltIcon,
} from '@mui/icons-material';
import Divider from '@mui/material/Divider';
import imageCompression from 'browser-image-compression';
import { MachineRepair } from '../../utils/types';

const maxSizeMB = 0.05;
const maxWidthOrHeight = 1024;

export const RightGrid = function (props: {
  onClick: () => void;
  editableSections: { [p: string]: boolean };
  element: React.JSX.Element;
  element1: React.JSX.Element;
  element2: React.JSX.Element;
  element3: React.JSX.Element;
  element4: React.JSX.Element;
  element5: React.JSX.Element;
  element6: React.JSX.Element;
  repair: MachineRepair;
  callbackfn: (url: string) => React.JSX.Element;
  addImage: (file: File) => Promise<void>;
}) {
  const [loadingImage, setLoadingImage] = React.useState(false);

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const { files } = event.target;
    const file = files?.[0];

    if (file) {
      setLoadingImage(true); // Start loadingImage

      try {
        const options = {
          maxSizeMB: maxSizeMB,
          maxWidthOrHeight: maxWidthOrHeight,
          useWebWorker: true,
          fileType: 'image/webp',
        };

        const compressedFile = await imageCompression(file, options);
        const compressedBlob = new Blob([compressedFile], {
          type: 'image/webp',
        });
        const compressedFileObj = new File(
          [compressedBlob],
          `${file.name}.webp`,
          {
            type: 'image/webp',
          },
        );
        await props.addImage(compressedFileObj);
      } catch (error) {
        console.error('Error compressing the image:', error);
      } finally {
        setLoadingImage(false); // Stop loadingImage
      }
    }
  };

  return (
    <Grid item xs={6}>
      <Grid item xs={12}>
        <Box display="flex" alignItems="center">
          <Typography variant="h6">Coordonnées du client</Typography>
          <IconButton onClick={props.onClick}>
            {props.editableSections['clientInfo'] ? <SaveIcon /> : <EditIcon />}
          </IconButton>
        </Box>
      </Grid>
      <Grid item xs={12} display={'flex'} gap={'10px'}>
        {props.element}
        {props.element1}
      </Grid>
      <Grid item xs={12} display={'flex'} gap={'10px'}>
        {props.element2}
      </Grid>
      <Grid item xs={12} display={'flex'} gap={'10px'}>
        {props.element3}
        {props.element4}
      </Grid>
      <Grid item xs={12} display={'flex'} gap={'10px'}>
        {props.element5}
        {props.element6}
      </Grid>
      <Grid item xs={12} display={'flex'} flexDirection={'column'}>
        <img
          src={props.repair.signatureUrl}
          srcSet={props.repair.signatureUrl}
          alt={'Signature client'}
          loading="lazy"
          width={150}
          style={{ backgroundColor: 'white' }}
        />
        <Typography variant="caption" gutterBottom>
          Signature client
        </Typography>
      </Grid>
      <Grid item xs={12} padding={'20px 0'}>
        <Divider />
      </Grid>
      <Box
        display={'flex'}
        justifyContent={'space-between'}
        alignItems={'center'}
      >
        <Typography variant="h6" gutterBottom>
          Photos
        </Typography>
        <Button
          variant="contained"
          component="label"
          disabled={loadingImage || props.repair.imageUrls?.length >= 5}
          startIcon={<CameraAltIcon />}
        >
          {loadingImage ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            'Ajouter'
          )}
          <input
            type="file"
            hidden
            accept="image/*"
            capture="environment"
            name={'add-photo'}
            onChange={handleFileChange}
          />
        </Button>
      </Box>
      {props.repair.imageUrls?.length > 0 ? (
        <ImageList variant="masonry" cols={2} gap={8}>
          {props.repair.imageUrls.map(props.callbackfn)}
        </ImageList>
      ) : (
        <Typography>Pas de photo disponible</Typography>
      )}
    </Grid>
  );
};
