import { Box, Tabs, Tab, SxProps } from '@mui/material';
import React from 'react';
import EditRepairedPart from '../components/settings/EditRepairedPart';
import EditUser from '../components/settings/EditUser';
import EditEntity from '../components/settings/EditEntity';
import {
  addBrand,
  addMachineType,
  addRepairer,
  deleteBrand,
  deleteMachineType,
  deleteRepairer,
  fetchBrands,
  fetchMachineType,
  fetchRepairers,
} from '../utils/api';
import EditConfig from '../components/settings/EditConfig';
import { useAuth } from '../hooks/AuthProvider';
import EditRobotType from '../components/settings/EditRobotType';
import InstallationPreparationTextEditor from '../components/InstallationPreparationTextEditor';
import InstallationPreparationTextPreview from '../components/InstallationPreparationTextPreview';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
  subTabPanelSx?: SxProps;
}

function a11yProps(index: number) {
  return {
    id: `tab-${index}`,
    'aria-controls': `tabpanel-${index}`,
  } as const;
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <Box
      height={'90%'}
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box
          height={'100%'}
          sx={props.subTabPanelSx || { pt: 2 }}
          id={`sub-tabpanel-${index}`}
        >
          {children}
        </Box>
      )}
    </Box>
  );
}
const Settings = (): JSX.Element => {
  const { isAdmin } = useAuth();
  const [value, setValue] = React.useState(0);
  const [installationTabValue, setInstallationTabValue] = React.useState(0);
  const { texts } = useSelector((state: RootState) => state.installationTexts);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  const handleInstallationTabChange = (
    event: React.SyntheticEvent,
    newValue: number,
  ) => {
    setInstallationTabValue(newValue);
  };

  return (
    <Box sx={{ px: 4, py: 1, height: '100%', position: 'relative' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={value}
          onChange={handleChange}
          aria-label="Onglets des paramètres"
        >
          <Tab label="Pièces à remplacer" {...a11yProps(0)} />
          <Tab label="Réparateur" {...a11yProps(1)} />
          <Tab label="Marques" {...a11yProps(2)} />
          <Tab label="Type de machine" {...a11yProps(3)} />
          <Tab label="Types de robot" {...a11yProps(4)} />
          <Tab label="Textes d'installation" {...a11yProps(5)} />
          <Tab label="Autre" {...a11yProps(6)} />
          {isAdmin && <Tab label="Utilisateurs" {...a11yProps(7)} />}
        </Tabs>
      </Box>
      <CustomTabPanel value={value} index={0}>
        <EditRepairedPart />
      </CustomTabPanel>
      <CustomTabPanel value={value} index={1}>
        <EditEntity
          entityName="Réparateur"
          fetchEntities={fetchRepairers}
          addEntity={addRepairer}
          deleteEntity={deleteRepairer}
        />
      </CustomTabPanel>
      <CustomTabPanel value={value} index={2}>
        <EditEntity
          entityName="Marque"
          fetchEntities={fetchBrands}
          addEntity={addBrand}
          deleteEntity={deleteBrand}
        />
      </CustomTabPanel>
      <CustomTabPanel value={value} index={3}>
        <EditEntity
          entityName="Type de machine"
          fetchEntities={fetchMachineType}
          addEntity={addMachineType}
          deleteEntity={deleteMachineType}
        />
      </CustomTabPanel>
      <CustomTabPanel value={value} index={4}>
        <EditRobotType />
      </CustomTabPanel>
      <CustomTabPanel value={value} index={5} subTabPanelSx={{ pt: 1 }}>
        <Box
          sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}
          id="installation-preparation-text-editor"
        >
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs
              value={installationTabValue}
              onChange={handleInstallationTabChange}
              aria-label="Installation preparation text tabs"
            >
              <Tab label="Éditer" {...a11yProps(0)} />
              <Tab label="Prévisualiser" {...a11yProps(1)} />
            </Tabs>
          </Box>
          {installationTabValue === 0 ? (
            <InstallationPreparationTextEditor />
          ) : (
            <InstallationPreparationTextPreview texts={texts} />
          )}
        </Box>
      </CustomTabPanel>
      <CustomTabPanel value={value} index={6}>
        <EditConfig />
      </CustomTabPanel>
      {isAdmin && (
        <CustomTabPanel value={value} index={7}>
          <EditUser />
        </CustomTabPanel>
      )}
    </Box>
  );
};

export default Settings;
