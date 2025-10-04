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
  useMediaQuery,
  useTheme,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
} from '@mui/material';
import { Helmet } from 'react-helmet-async';
import PrintIcon from '@mui/icons-material/Print';
import RefreshIcon from '@mui/icons-material/Refresh';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ViewKanbanIcon from '@mui/icons-material/ViewKanban';
import ViewAgendaIcon from '@mui/icons-material/ViewAgenda';
import { useAuth } from '../hooks/AuthProvider';
import { getAllMachineRepairs } from '../utils/api';
import { MachineRepair, MachineRepairFromApi } from '../utils/types';
import RepairerSelector from '../components/repairer/RepairerSelector';
import RepairWorkCard from '../components/repairer/RepairWorkCard';
import KanbanBoard from '../components/repairer/KanbanBoard';
import {
  getActiveRepairsForRepairer,
  sortByPriority,
  groupByState,
  calculateWorkload,
  getWorkloadColor,
} from '../utils/repairerWorkUtils';
import { notifyError } from '../utils/notifications';
import { pdf } from '@react-pdf/renderer';
import RepairerWorkPdf from '../components/pdf/RepairerWorkPdf';
import LazyPdfDownloadLink from '../components/repairer/LazyPdfDownloadLink';
import { useAppSelector } from '../store/hooks';
import { RootState } from '../store/index';

/**
 * Page de vue ouvrier - affiche les réparations assignées à un ouvrier spécifique
 * Vue Kanban en mode desktop, vue accordéon en mode mobile
 */
const RepairerWorkView: React.FC = () => {
  const auth = useAuth();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const { repairerNames, config } = useAppSelector(
    (state: RootState) => state.config,
  );
  const [selectedRepairer, setSelectedRepairer] = useState<string | null>(null);
  const [allRepairs, setAllRepairs] = useState<MachineRepair[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

  // Parse config for company info
  const adresse = config['Adresse'] || '';
  const telephone = config['Téléphone'] || '';
  const email = config['Email'] || '';
  const siteWeb = config['Site web'] || '';

  // Parse colorByState from config
  const colorByState = useMemo(() => {
    try {
      return JSON.parse(config['États'] || '{}') as Record<string, string>;
    } catch {
      return {} as Record<string, string>;
    }
  }, [config]);

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

  // // Calculate workload stats
  // const workloadStats = useMemo(() => {
  //   return calculateWorkload(activeRepairs);
  // }, [activeRepairs]);

  // const handleRefresh = () => {
  //   fetchRepairs();
  // };

  const handlePrint = async () => {
    if (!selectedRepairer) return;

    try {
      setLoading(true);

      // Generate PDF blob using the pdf function
      const blob = await pdf(
        <RepairerWorkPdf
          repairerName={selectedRepairer}
          repairs={sortedRepairs}
          date={new Date().toLocaleDateString('fr-FR')}
          adresse={adresse}
          telephone={telephone}
          email={email}
          siteWeb={siteWeb}
        />,
      ).toBlob();

      // Create a URL for the blob
      const blobUrl = URL.createObjectURL(blob);

      // Create an invisible iframe for printing
      const printFrame = document.createElement('iframe');
      printFrame.style.position = 'fixed';
      printFrame.style.right = '0';
      printFrame.style.bottom = '0';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = 'none';
      printFrame.src = blobUrl;

      // When iframe is loaded, trigger print
      printFrame.onload = () => {
        try {
          printFrame.contentWindow?.print();
        } catch (err) {
          console.error('Error printing PDF:', err);
          setError("Erreur lors de l'impression");
          document.body.removeChild(printFrame);
          URL.revokeObjectURL(blobUrl);
        }
      };

      document.body.appendChild(printFrame);
    } catch (err) {
      console.error('Error generating PDF:', err);
      setError("Impossible de générer le PDF pour l'impression.");
    } finally {
      setLoading(false);
    }
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
        <title>Ouvrier</title>
      </Helmet>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography
                variant="h4"
                component="h1"
                gutterBottom
                sx={{ mb: 0 }}
              >
                Ouvrier
              </Typography>
              <RepairerSelector
                selectedRepairer={selectedRepairer}
                onSelect={setSelectedRepairer}
                workloadCounts={workloadCounts}
                disabled={loading}
              />
            </Box>
          </Grid>

          <Grid item xs={12} md={8}>
            <Box
              sx={{
                display: 'flex',
                gap: 1,
                justifyContent: { xs: 'flex-start', md: 'flex-end' },
                flexWrap: 'wrap',
              }}
            >
              {isDesktop && (
                <ToggleButtonGroup
                  color="primary"
                  value={viewMode}
                  exclusive
                  onChange={(e, newValue) => {
                    if (newValue !== null) {
                      setViewMode(newValue);
                    }
                  }}
                  size="small"
                  aria-label="mode d'affichage"
                  sx={{ mr: 3 }}
                >
                  <Tooltip
                    arrow
                    title="Afficher les réparations dans une vue Kanban"
                  >
                    <ToggleButton value="kanban" aria-label="vue kanban">
                      <ViewKanbanIcon sx={{ mr: 0.5 }} /> Kanban
                    </ToggleButton>
                  </Tooltip>
                  <Tooltip
                    arrow
                    title="Afficher les réparations sous forme de liste"
                  >
                    <ToggleButton value="list" aria-label="vue liste">
                      <ViewAgendaIcon sx={{ mr: 0.5 }} /> Liste
                    </ToggleButton>
                  </Tooltip>
                </ToggleButtonGroup>
              )}

              {selectedRepairer && activeRepairs.length > 0 && (
                <>
                  <Button
                    variant="outlined"
                    startIcon={<PrintIcon />}
                    onClick={handlePrint}
                    disabled={loading}
                  >
                    Imprimer
                  </Button>

                  <LazyPdfDownloadLink
                    repairerName={selectedRepairer}
                    repairs={sortedRepairs}
                    adresse={adresse}
                    telephone={telephone}
                    email={email}
                    siteWeb={siteWeb}
                  />
                </>
              )}
            </Box>
          </Grid>
        </Grid>
        {/* 
        {selectedRepairer && (
          <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Chip
              label={`Total: ${activeRepairs.length}`}
              color={getWorkloadColor(activeRepairs.length)}
            />
            <Chip
              label={`Non commencées: ${workloadStats.notStarted}`}
              variant="outlined"f
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
        )} */}
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
        <>
          {/* Vue Kanban pour desktop */}
          {isDesktop && viewMode === 'kanban' ? (
            // <Paper sx={{ p: 3, backgroundColor: '#fafafa' }}>
            <KanbanBoard repairs={sortedRepairs} colorByState={colorByState} />
          ) : (
            // </Paper>
            /* Vue Accordéon pour mobile ou mode liste */
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
                        <RepairWorkCard
                          key={repair.id}
                          repair={repair}
                          colorByState={colorByState}
                        />
                      ))}
                    </Box>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

export default RepairerWorkView;
