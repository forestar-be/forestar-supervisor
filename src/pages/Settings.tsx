import { Box, Tabs, Tab } from '@mui/material';
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

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function a11yProps(index: number) {
  return {
    id: `tab-${index}`,
    'aria-controls': `tabpanel-${index}`,
  };
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
        <Box height={'100%'} sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </Box>
  );
}
const Settings = (): JSX.Element => {
  const { isAdmin } = useAuth();
  const [value, setValue] = React.useState(0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <Box sx={{ padding: 4, height: '100%', position: 'relative' }}>
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
          <Tab label="Autre" {...a11yProps(4)} />
          {isAdmin && <Tab label="Utilisateurs" {...a11yProps(5)} />}
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
        <EditConfig />
      </CustomTabPanel>
      {isAdmin && (
        <CustomTabPanel value={value} index={5}>
          <EditUser />
        </CustomTabPanel>
      )}
    </Box>
  );
};

export default Settings;
