import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Checkbox,
  FormControlLabel,
  Grid,
  IconButton,
  ImageListItem,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Modal,
  SxProps,
  Theme,
  Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import {
  addImage,
  deleteImage,
  deleteRepair,
  fetchAllConfig,
  fetchRepairById,
} from '../utils/api';
import { useAuth } from '../hooks/AuthProvider';
import '../styles/SingleRepair.css';
import { SelectChangeEvent } from '@mui/material/Select/SelectInput';
import { useTheme } from '@mui/material/styles';
import { toast } from 'react-toastify';
import RepairField from '../components/repair/RepairField';
import ReactPDF from '@react-pdf/renderer';
import { useStopwatch } from 'react-timer-hook';
import {
  getSuffixPrice,
  handleManualTimeChange,
  handleUpdate,
  onClickCall,
  onRemoveCall,
  resetTimer,
  sendDrive,
  sendEmail,
  startTimer,
  stopTimer,
} from '../utils/singleRepair.utils';
import { LeftGrid } from '../components/repair/LeftGrid';
import { RightGrid } from '../components/repair/RightGrid';
import { ImageModal } from '../components/repair/ImageModal';
import { RepairHeader } from '../components/repair/RepairHeader';
import { RepairLoading } from '../components/repair/RepairLoading';
import { RepairSelect } from '../components/repair/RepairSelect';
import DeleteIcon from '@mui/icons-material/Delete';
import { SingleRepairDocument } from '../components/repair/SingleRepairDocument';
import { MachineRepair, MachineRepairFromApi } from '../utils/types';

export type ReplacedPart = { name: string; price: number };

const CallTimesModal = ({
  open,
  onClose,
  callTimes,
  repair,
  setRepair,
  initialRepair,
  setIsLoadingSaveCall,
  setLoading,
  auth,
  id,
  setInitialRepair,
  closeAllEditableSections,
}: {
  open: boolean;
  onClose: () => void;
  callTimes: Date[];
  repair: MachineRepair;
  setRepair: React.Dispatch<React.SetStateAction<MachineRepair | null>>;
  initialRepair: MachineRepair;
  setIsLoadingSaveCall: (arg0: boolean) => void;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  auth: { token: string };
  id: string | undefined;
  setInitialRepair: React.Dispatch<React.SetStateAction<MachineRepair | null>>;
  closeAllEditableSections: () => void;
}) => {
  const theme = useTheme();

  return (
    <Modal open={open} onClose={onClose}>
      <Box
        sx={{
          padding: 4,
          margin: 'auto',
          marginTop: '10%',
          width: '50%',
          backgroundColor: theme.palette.background.default,
          border: '2px solid white',
          borderRadius: '5px',
        }}
      >
        <Typography variant="h6" gutterBottom>
          Historique des appels au client
        </Typography>
        <List>
          {callTimes.map((time, index) => (
            <ListItem key={index}>
              <ListItemIcon>
                <IconButton
                  edge="end"
                  aria-label="delete"
                  onClick={() =>
                    onRemoveCall(
                      repair,
                      setRepair,
                      initialRepair,
                      setIsLoadingSaveCall,
                      setLoading,
                      auth,
                      id,
                      setInitialRepair,
                      closeAllEditableSections,
                      index,
                    )
                  }
                >
                  <DeleteIcon />
                </IconButton>
              </ListItemIcon>
              <ListItemText primary={time.toLocaleString('FR-fr')} />
            </ListItem>
          ))}
        </List>
      </Box>
    </Modal>
  );
};

const SingleRepair = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const auth = useAuth();
  const { id } = useParams<{ id: string }>();
  const [repair, setRepair] = useState<null | MachineRepair>(null);
  const [initialRepair, setInitialRepair] = useState<null | MachineRepair>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [isLoadingSendEmail, setIsLoadingSendEmail] = useState(false);
  const [isLoadingAddDrive, setIsLoadingAddDrive] = useState(false);
  const [isLoadingSaveCall, setIsLoadingSaveCall] = useState(false);
  const [editableFields, setEditableFields] = useState<{
    [key: string]: boolean;
  }>({});
  const [editableSections, setEditableSections] = useState<{
    [key: string]: boolean;
  }>({});
  const [openModal, setOpenModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [possibleReplacedParts, setPossibleReplacedParts] = useState<
    ReplacedPart[]
  >([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [repairers, setRepairers] = useState<string[]>([]);
  const [instance, updateInstance] = ReactPDF.usePDF({
    document: undefined,
  });
  const [hourlyRate, setHourlyRate] = useState(0);
  const [priceDevis, setPriceDevis] = useState(0);
  const [priceHivernage, setPriceHivernage] = useState(0);
  const [machineTypes, setMachineTypes] = useState<string[]>([]);
  const [conditions, setConditions] = useState<string>('');
  const [adresse, setAdresse] = useState<string>('');
  const [telephone, setTelephone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [siteWeb, setSiteWeb] = useState<string>('');
  const [titreBonPdf, setTitreBonPdf] = useState<string>('');
  const [isCallTimesModalOpen, setIsCallTimesModalOpen] = useState(false);
  const [colorByState, setColorByState] = useState<{ [key: string]: string }>(
    {},
  );

  const {
    totalSeconds,
    seconds,
    minutes,
    hours,
    days,
    isRunning,
    pause,
    reset,
  } = useStopwatch({ autoStart: false });

  useEffect(() => {
    const fetchAllConfigData = async () => {
      try {
        const {
          brands,
          repairerNames,
          replacedParts,
          config: {
            'Taux horaire': hourlyRate,
            'Prix devis': priceDevis,
            'Conditions générales de réparation': conditions,
            Adresse: address,
            Téléphone: phone,
            Email: email,
            'Site web': website,
            'Titre bon pdf': pdfTitle,
            'Prix hivernage': priceHivernage,
            États: stateColorsStr,
          },
          machineType,
        } = await fetchAllConfig(auth.token);
        setBrands(brands);
        setRepairers(repairerNames);
        setPossibleReplacedParts(replacedParts);
        setHourlyRate(Number(hourlyRate));
        setPriceDevis(Number(priceDevis));
        setPriceHivernage(Number(priceHivernage));
        setMachineTypes(machineType);
        setConditions(conditions);
        setAdresse(address);
        setTelephone(phone);
        setEmail(email);
        setSiteWeb(website);
        setTitreBonPdf(pdfTitle);
        setColorByState(JSON.parse(stateColorsStr));
      } catch (error) {
        console.error('Error fetching config:', error);
        alert(
          `Une erreur s'est produite lors de la récupération des données ${error}`,
        );
      }
    };

    fetchAllConfigData();
  }, []);

  useEffect(() => {
    if (!id) {
      alert('ID invalide');
      return;
    }
    const fetchData = async () => {
      try {
        const repairData: MachineRepairFromApi = await fetchRepairById(
          id,
          auth.token,
        );
        const repairDataWithDate: MachineRepair = {
          ...repairData,
          start_timer: repairData.start_timer
            ? new Date(repairData.start_timer)
            : null,
          client_call_times: repairData.client_call_times.map(
            (client_call_time: string) => new Date(client_call_time),
          ),
        };
        setInitialRepair(repairDataWithDate);
        setRepair(repairDataWithDate);
      } catch (error) {
        console.error('Error fetching repair:', error);
        alert(
          `Une erreur s'est produite lors de la récupération des données ${error}`,
        );
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, auth.token]);

  useEffect(() => {
    if (repair) {
      updateInstance(
        SingleRepairDocument(
          repair,
          hourlyRate,
          priceDevis,
          priceHivernage,
          conditions,
          adresse,
          telephone,
          email,
          siteWeb,
          titreBonPdf,
        ),
      );
    }
  }, [repair]);

  useEffect(() => {
    if (!repair || !initialRepair) {
      return;
    }

    if (repair.start_timer) {
      const currentOffset = repair.working_time_in_sec * 1000;
      const startTime = repair.start_timer.getTime();
      console.log('Restarting timer', {
        currentOffset,
        startTime,
      });

      const currentTime = new Date().getTime();
      const offsetTimestamp = new Date(
        currentTime + (currentTime - startTime + currentOffset),
      );
      console.log('Offset timestamp', offsetTimestamp);
      reset(offsetTimestamp, true);
    } else {
      console.log('Pausing timer');
      pause();
    }

    if (repair.start_timer !== initialRepair.start_timer) {
      handleUpdate(
        repair,
        initialRepair,
        setLoading,
        auth,
        id,
        setInitialRepair,
        closeAllEditableSections,
      ); // update the start_timer field in the backend
    }
  }, [repair?.start_timer]);

  const handleImageClick = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setSelectedImage(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRepair({ ...repair, [e.target.name]: e.target.value } as MachineRepair);
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRepair({
      ...repair,
      [e.target.name]: e.target.checked,
    } as MachineRepair);
  };

  const handleAddImage = useCallback(
    async (file: File) => {
      try {
        const { imageUrls } = await addImage(auth.token, id!, file);
        setInitialRepair({ ...initialRepair, imageUrls } as MachineRepair);
        setRepair({ ...repair, imageUrls } as MachineRepair);
        toast.success('Image ajoutée avec succès');
      } catch (error) {
        console.error('Error adding image:', error);
        toast.error("Une erreur s'est produite lors de l'ajout de l'image");
      }
    },
    [auth.token, id, repair, setRepair],
  );

  const handleDeleteImage = useCallback(
    async (
      e: React.MouseEvent<HTMLButtonElement, MouseEvent>,
      imageUrl: string,
    ) => {
      const choice = window.confirm(
        'Êtes-vous sûr de vouloir supprimer cette image ? Cette action est irréversible',
      );
      if (!choice) {
        return;
      }

      try {
        setLoading(true);
        const imageIndex = repair?.imageUrls.findIndex(
          (url) => url === imageUrl,
        );
        if (imageIndex === -1) {
          throw new Error('Image not found');
        }

        const { imageUrls } = await deleteImage(auth.token, id!, imageIndex!);
        setInitialRepair({ ...initialRepair, imageUrls } as MachineRepair);
        setRepair({ ...repair, imageUrls } as MachineRepair);
        toast.success('Image supprimée avec succès');
      } catch (error) {
        console.error('Error deleting image:', error);
        toast.error(
          "Une erreur s'est produite lors de la suppression de l'image",
        );
      } finally {
        setLoading(false);
      }
    },
    [auth.token, id, repair, initialRepair],
  );

  const handleReplacedPartSelectChange = (
    event: SelectChangeEvent<String[]>,
  ) => {
    const newReplacedParts = Array.isArray(event.target.value)
      ? event.target.value.map((partName) => {
          const part = possibleReplacedParts.find((p) => p.name === partName);
          if (!part) {
            toast.error(`Pièce ${partName} non trouvée`);
            throw new Error(`Pièce ${partName} non trouvée`);
          }
          return {
            quantity:
              repair?.replaced_part_list.find(
                (p) => p.replacedPart.name === partName,
              )?.quantity || 1,
            replacedPart: part,
          };
        })
      : [];

    setRepair({
      ...repair,
      [event.target.name]: newReplacedParts,
    } as MachineRepair);
  };

  const handleSelectChange = (event: SelectChangeEvent<String>) => {
    setRepair({
      ...repair,
      [event.target.name]: event.target.value,
    } as MachineRepair);
  };

  const handleDeleteReplacedPart = useCallback(
    (replacedPartName: string) => {
      if (!repair || !initialRepair) {
        console.error('No repair data found');
        return;
      }
      const newReplacedPartList = repair.replaced_part_list.filter(
        (part) => part.replacedPart.name !== replacedPartName,
      );
      const newRepair = {
        ...repair,
        replaced_part_list: newReplacedPartList,
      };
      setRepair(newRepair);
      handleUpdate(
        newRepair,
        initialRepair,
        setLoading,
        auth,
        id,
        setInitialRepair,
        closeAllEditableSections,
      );
    },
    [repair, initialRepair],
  );

  const updateQuantityOfReplacedPart = useCallback(
    (
      e: SelectChangeEvent<unknown>,
      replacedPart: MachineRepair['replaced_part_list'][0],
    ) => {
      if (!repair || !initialRepair) {
        console.error('No repair data found');
        return;
      }
      const newReplacedPartList = repair.replaced_part_list.map((part) => {
        if (part.replacedPart.name === replacedPart.replacedPart.name) {
          return {
            ...part,
            quantity: Number(e.target.value),
          };
        }
        return part;
      });
      const newRepair = {
        ...repair,
        replaced_part_list: newReplacedPartList,
      };
      setRepair(newRepair);
      handleUpdate(
        newRepair,
        initialRepair,
        setLoading,
        auth,
        id,
        setInitialRepair,
        closeAllEditableSections,
      );
    },
    [repair, initialRepair],
  );

  useEffect(() => {
    if (repair && initialRepair) {
      if (
        !isRunning &&
        !editableSections['technicalInfo'] && // only update if not in edit mode and timer is not running
        repair.working_time_in_sec !== initialRepair.working_time_in_sec &&
        repair.start_timer === initialRepair.start_timer // skip when start_timer is updated as update already triggered by useEffect of start_timer
      ) {
        console.log('Updating repair working time', {
          repair,
          initialRepair,
        });
        handleUpdate(
          repair,
          initialRepair,
          setLoading,
          auth,
          id,
          setInitialRepair,
          closeAllEditableSections,
        );
      }
    }
  }, [repair?.working_time_in_sec]);

  const toggleEditableSection = (section: string, fields: string[]) => {
    const isSectionEditable = !editableSections[section];
    setEditableSections({ ...editableSections, [section]: isSectionEditable });
    fields.forEach((field) => {
      setEditableFields((prev) => ({ ...prev, [field]: isSectionEditable }));
    });
    const hasChanges = JSON.stringify(repair) !== JSON.stringify(initialRepair);
    if (hasChanges && !isSectionEditable) {
      console.log('Changes detected, updating repair', {
        repair,
        initialRepair,
      });
      // save action
      handleUpdate(
        repair!,
        initialRepair!,
        setLoading,
        auth,
        id,
        setInitialRepair,
        closeAllEditableSections,
      );
    }
  };

  const closeAllEditableSections = () => {
    setEditableSections({});
    setEditableFields({});
  };

  const handleDelete = async () => {
    if (!repair || !id) {
      console.error('No repair data or id found');
      return;
    }

    const confirmDelete = window.confirm(
      'Êtes-vous sûr de vouloir supprimer cette fiche ? Cette action est irréversible',
    );

    if (!confirmDelete) {
      return;
    }

    setLoading(true);

    try {
      await deleteRepair(auth.token, id);
      // redirect to home
      navigate('/');
    } catch (error) {
      console.error('Error deleting repair:', error);
      toast.error(
        "Une erreur s'est produite lors de la suppression de la réparation",
      );
    } finally {
      setLoading(false);
    }
  };

  const renderCheckbox = (
    label: string,
    name: string,
    value: boolean,
    suffix = '',
  ) => (
    <Grid item xs={6}>
      {editableFields[name] ? (
        <FormControlLabel
          label={label}
          control={
            <Checkbox
              name={name}
              onChange={handleCheckboxChange}
              checked={value}
            />
          }
        />
      ) : (
        <Box display={'flex'} gap={'10px'}>
          <Typography variant="subtitle1">{label} :</Typography>
          <Typography variant="subtitle1">
            {value ? 'Oui' : 'Non'}
            {suffix}
          </Typography>
        </Box>
      )}
    </Grid>
  );

  const renderField = (
    label: string,
    name: string,
    value: string,
    isMultiline: boolean = false,
    xs?: 6 | 12 | 3,
    endAdornment?: React.ReactNode,
  ) => (
    <RepairField
      label={label}
      name={name}
      value={value}
      isMultiline={isMultiline}
      editableFields={editableFields}
      handleChange={handleChange}
      xs={xs}
      endAdornment={endAdornment}
    />
  );

  const renderSelect = (
    label: string,
    name: string,
    value: string,
    possibleValues: string[],
    sxFormControl: SxProps<Theme>,
    gridSize: 6 | 12,
    colorByValue: { [p: string]: string } = {},
  ) => {
    return (
      <RepairSelect
        xs={gridSize}
        editableFields={editableFields}
        name={name}
        sx={sxFormControl}
        label={label}
        value={value}
        onChange={handleSelectChange}
        strings={possibleValues}
        callbackfn={(val) => (
          <MenuItem key={val} value={val}>
            {val}
          </MenuItem>
        )}
        colorByValue={colorByValue}
      />
    );
  };

  return (
    <Box sx={{ padding: 4, paddingTop: 2 }}>
      {loading && <RepairLoading />}
      <RepairHeader
        id={id}
        onClick={handleDelete}
        onClick1={() =>
          sendDrive(isRunning, setIsLoadingAddDrive, id!, instance, auth)
        }
        disabled={isLoadingAddDrive}
        onClick2={() =>
          sendEmail(isRunning, setIsLoadingSendEmail, id!, instance, auth)
        }
        onClickCall={async () => {
          await onClickCall(
            repair,
            setRepair,
            initialRepair,
            setIsLoadingSaveCall,
            setLoading,
            auth,
            id,
            setInitialRepair,
            closeAllEditableSections,
          );
        }}
        loadingCall={isLoadingSaveCall}
        disabled1={isLoadingSendEmail}
        setIsCallTimesModalOpen={setIsCallTimesModalOpen}
        instance={instance}
        onClick3={(e: React.MouseEvent<HTMLAnchorElement>) => {
          if (isRunning) {
            e.preventDefault();
            toast.warn('Arrêtez le chronomètre avant de télécharger le PDF');
          }
        }}
      />
      <CallTimesModal
        open={isCallTimesModalOpen}
        onClose={() => setIsCallTimesModalOpen(false)}
        callTimes={repair?.client_call_times || []}
        repair={repair!}
        setRepair={setRepair}
        initialRepair={initialRepair!}
        setIsLoadingSaveCall={setIsLoadingSaveCall}
        setLoading={setLoading}
        auth={auth}
        id={id}
        setInitialRepair={setInitialRepair}
        closeAllEditableSections={closeAllEditableSections}
      />
      {repair && (
        <Grid container spacing={2}>
          <LeftGrid
            onClick={() =>
              toggleEditableSection('repairDetails', [
                'machine_type_name',
                'repair_or_maintenance',
                'fault_description',
                'robot_code',
                'brand_name',
                'warranty',
                'devis',
                'hivernage',
              ])
            }
            editableSections={editableSections}
            element={renderSelect(
              'Type de machine',
              'machine_type_name',
              repair.machine_type_name,
              machineTypes,
              { width: '100%', margin: '5px 0' },
              6,
            )}
            element1={renderField(
              'Type',
              'repair_or_maintenance',
              repair.repair_or_maintenance,
            )}
            element2={renderSelect(
              'Marque',
              'brand_name',
              repair.brand_name,
              brands,
              { width: '100%', margin: '5px 0' },
              6,
            )}
            element3={renderField(
              'Code du robot',
              'robot_code',
              repair.robot_code || '',
            )}
            element4={renderCheckbox(
              'Garantie',
              'warranty',
              repair.warranty ?? false,
            )}
            element5={renderCheckbox(
              'Devis',
              'devis',
              repair.devis,
              getSuffixPrice(repair.devis, priceDevis),
            )}
            element51={renderCheckbox(
              `Hivernage`,
              'hivernage',
              repair.hivernage,
              getSuffixPrice(repair.hivernage, priceHivernage),
            )}
            element6={renderField(
              'Description',
              'fault_description',
              repair.fault_description,
              true,
            )}
            onClick1={() =>
              toggleEditableSection('technicalInfo', [
                'file_url',
                'bucket_name',
                'working_time',
                'replaced_part_list',
                'repairer_name',
                'state',
                'remark',
              ])
            }
            element7={renderSelect(
              'État',
              'state',
              repair.state || 'Non commencé',
              Object.keys(colorByState),
              { marginTop: 2, marginBottom: 1, width: '80%' },
              12,
              colorByState,
            )}
            element8={renderField(
              'Dernier appel au client',
              'last_client_call_time',
              repair.client_call_times.length
                ? repair.client_call_times[
                    repair.client_call_times.length - 1
                  ].toLocaleString('FR-fr')
                : 'Aucun appel',
              false,
              undefined,
              repair.client_call_times.length ? (
                <CheckCircleIcon color={'success'} />
              ) : undefined,
            )}
            element9={renderSelect(
              'Réparateur',
              'repairer_name',
              repair.repairer_name || 'Non attribué',
              repairers,
              { marginTop: 2, marginBottom: 1, width: '80%' },
              12,
            )}
            element10={renderField(
              'Remarques atelier',
              'remark',
              repair.remark ?? '',
              true,
            )}
            repair={repair}
            editableFields={editableFields}
            running={isRunning}
            hours={hours}
            days={days}
            minutes={minutes}
            seconds={seconds}
            handleManualTimeChange={(e) =>
              handleManualTimeChange(e, repair, setRepair)
            }
            startTimer={() => startTimer(repair, setRepair)}
            stopTimer={() => stopTimer(repair, setRepair, totalSeconds)}
            resetTimer={() => resetTimer(repair, setRepair)}
            hourlyRate={hourlyRate}
            priceHivernage={priceHivernage}
            possibleValues={possibleReplacedParts}
            handleReplacedPartSelectChange={handleReplacedPartSelectChange}
            updateQuantityOfReplacedPart={updateQuantityOfReplacedPart}
            handleDeleteReplacedPart={handleDeleteReplacedPart}
          />
          <RightGrid
            addImage={handleAddImage}
            onClick={() =>
              toggleEditableSection('clientInfo', [
                'first_name',
                'last_name',
                'address',
                'phone',
                'email',
                'city',
                'postal_code',
              ])
            }
            editableSections={editableSections}
            element={renderField('Prénom', 'first_name', repair.first_name)}
            element1={renderField('Nom', 'last_name', repair.last_name)}
            element2={renderField(
              'Adresse',
              'address',
              repair.address,
              false,
              12,
            )}
            element3={renderField(
              'Code postal',
              'postal_code',
              repair.postal_code ?? '',
            )}
            element4={renderField('Ville', 'city', repair.city ?? '')}
            element5={renderField('Email', 'email', repair.email)}
            element6={renderField('Téléphone', 'phone', repair.phone)}
            repair={repair}
            callbackfn={(url: string) => (
              <ImageListItem
                key={url}
                sx={{ cursor: 'zoom-in', position: 'relative' }}
              >
                <img
                  src={`${url}`}
                  srcSet={`${url}`}
                  alt={'Repair Image'}
                  loading="lazy"
                  onClick={() => handleImageClick(url)}
                />
                <IconButton
                  onClick={(e) => handleDeleteImage(e, url)}
                  color={'error'}
                  sx={{
                    position: 'absolute',
                    bottom: 5,
                    right: 5,
                    backgroundColor: 'rgba(255, 255, 255, 0.7)',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 1)',
                    },
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              </ImageListItem>
            )}
          />
          <ImageModal
            open={openModal}
            onClose={handleCloseModal}
            selectedImage={selectedImage}
          />
        </Grid>
      )}
    </Box>
  );
};

export default SingleRepair;
