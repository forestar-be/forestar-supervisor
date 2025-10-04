import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
} from '@mui/material';
import { Helmet } from 'react-helmet-async';
import PrintIcon from '@mui/icons-material/Print';
import RefreshIcon from '@mui/icons-material/Refresh';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useAuth } from '../hooks/AuthProvider';
import { getAllMachineRepairs } from '../utils/api';
import { MachineRepair, MachineRepairFromApi } from '../utils/types';
import RepairerSelector from '../components/repairer/RepairerSelector';
import RepairWorkCard from '../components/repairer/RepairWorkCard';
import {
  getActiveRepairsForRepairer,
  sortByPriority,
  groupByState,
  calculateWorkload,
  getWorkloadColor,
} from '../utils/repairerWorkUtils';
import { notifyError } from '../utils/notifications';
import { PDFDownloadLink } from '@react-pdf/renderer';
import RepairerWorkPdf from '../components/pdf/RepairerWorkPdf';
import { useAppSelector } from '../store/hooks';
import { RootState } from '../store/index';

/**
 * Page de vue ouvrier - affiche les réparations assignées à un ouvrier spécifique
 */
const RepairerWorkView: React.FC = () => {
  const auth = useAuth();
  const { repairerNames, config } = useAppSelector(
    (state: RootState) => state.config,
  );
  const [selectedRepairer, setSelectedRepairer] = useState<string | null>(null);
  const [allRepairs, setAllRepairs] = useState<MachineRepair[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Parse config for company info
  const adresse = config['Adresse'] || '';
  const telephone = config['Téléphone'] || '';
  const email = config['Email'] || '';
  const siteWeb = config['Site web'] || '';

  // Fetch all repairs
  const fetchRepairs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data: MachineRepairFromApi[] = await getAllMachineRepairs(
        auth.token,
      );
      const repairsDataWithDate: MachineRepair[] = data.map(
        (repair: MachineRepairFromApi) => ({
          ...repair,
          start_timer: repair.start_timer ? new Date(repair.start_timer) : null,
          client_call_times: repair.client_call_times.map(
            (date) => new Date(date),
          ),
        }),
      );
      setAllRepairs(repairsDataWithDate);
    } catch (err) {
      console.error('Failed to fetch repairs:', err);
      notifyError(
        "Une erreur s'est produite lors de la récupération des données",
      );
      setError('Impossible de charger les réparations');
    } finally {
      setLoading(false);
    }
  }, [auth.token]);

  useEffect(() => {
    fetchRepairs();
  }, [fetchRepairs]);

  // Auto-select first repairer if none selected
  useEffect(() => {
    if (!selectedRepairer && repairerNames.length > 0) {
      setSelectedRepairer(repairerNames[0]);
    }
  }, [repairerNames, selectedRepairer]);

  // Calculate workload counts for selector
  const workloadCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    repairerNames.forEach((repairerName) => {
      const repairs = getActiveRepairsForRepairer(allRepairs, repairerName);
      counts[repairerName] = repairs.length;
    });
    return counts;
  }, [allRepairs, repairerNames]);

  // Get active repairs for selected repairer
  const activeRepairs = useMemo(() => {
    if (!selectedRepairer) return [];
    return getActiveRepairsForRepairer(allRepairs, selectedRepairer);
  }, [allRepairs, selectedRepairer]);

  // Sort repairs by priority
  const sortedRepairs = useMemo(() => {
    return sortByPriority(activeRepairs);
  }, [activeRepairs]);

  // Group repairs by state
  const groupedRepairs = useMemo(() => {
    return groupByState(sortedRepairs);
  }, [sortedRepairs]);

  // Calculate workload stats
  const workloadStats = useMemo(() => {
    return calculateWorkload(activeRepairs);
  }, [activeRepairs]);

  const handleRefresh = () => {
    fetchRepairs();
  };

  if (loading && allRepairs.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '400px',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Helmet>
        <title>Vue Ouvrier</title>
      </Helmet>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Vue Ouvrier
        </Typography>

        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <RepairerSelector
              selectedRepairer={selectedRepairer}
              onSelect={setSelectedRepairer}
              workloadCounts={workloadCounts}
              disabled={loading}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <Box
              sx={{
                display: 'flex',
                gap: 1,
                justifyContent: { xs: 'flex-start', md: 'flex-end' },
                flexWrap: 'wrap',
              }}
            >
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={handleRefresh}
                disabled={loading}
              >
                Rafraîchir
              </Button>

              {selectedRepairer && activeRepairs.length > 0 && (
                <PDFDownloadLink
                  document={
                    <RepairerWorkPdf
                      repairerName={selectedRepairer}
                      repairs={sortedRepairs}
                      date={new Date().toLocaleDateString('fr-FR')}
                      adresse={adresse}
                      telephone={telephone}
                      email={email}
                      siteWeb={siteWeb}
                    />
                  }
                  fileName={`Planning-${selectedRepairer}-${new Date().toISOString().split('T')[0]}.pdf`}
                  style={{ textDecoration: 'none' }}
                >
                  {({ loading: pdfLoading }) => (
                    <Button
                      variant="contained"
                      startIcon={<PrintIcon />}
                      disabled={pdfLoading}
                    >
                      {pdfLoading ? 'Génération...' : 'Imprimer PDF'}
                    </Button>
                  )}
                </PDFDownloadLink>
              )}
            </Box>
          </Grid>
        </Grid>

        {selectedRepairer && (
          <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Chip
              label={`Total: ${activeRepairs.length}`}
              color={getWorkloadColor(activeRepairs.length)}
            />
            <Chip
              label={`Non commencées: ${workloadStats.notStarted}`}
              variant="outlined"
            />
            <Chip
              label={`En cours: ${workloadStats.inProgress}`}
              variant="outlined"
            />
            <Chip
              label={`En attente: ${workloadStats.waiting}`}
              variant="outlined"
            />
            <Chip
              label={`Temps total: ${workloadStats.totalHours}h`}
              variant="outlined"
            />
          </Box>
        )}
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {!selectedRepairer && repairerNames.length === 0 && (
        <Alert severity="info">
          Aucun réparateur n'est configuré. Veuillez configurer les réparateurs
          dans les paramètres.
        </Alert>
      )}

      {selectedRepairer && activeRepairs.length === 0 && (
        <Alert severity="info">
          Aucune réparation active pour {selectedRepairer}.
        </Alert>
      )}

      {selectedRepairer && activeRepairs.length > 0 && (
        <Box>
          {Object.entries(groupedRepairs).map(([state, repairs]) => (
            <Accordion key={state} defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">
                  {state} ({repairs.length})
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box>
                  {repairs.map((repair) => (
                    <RepairWorkCard key={repair.id} repair={repair} />
                  ))}
                </Box>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default RepairerWorkView;
