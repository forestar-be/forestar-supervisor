import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Stack,
  Grid2,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { Dayjs } from 'dayjs';

import {
  Download as DownloadIcon,
  DateRange as DateRangeIcon,
  TrendingUp as TrendingUpIcon,
  ShoppingCart as ShoppingCartIcon,
  AttachMoney as AttachMoneyIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { useAppDispatch } from '../store/hooks';
import {
  fetchSalesSummaryAsync,
  downloadSalesExcelAsync,
  clearSalesData,
} from '../store/salesSummarySlice';
import { toast } from 'react-toastify';

interface WeeklySummaryModalProps {
  open: boolean;
  onClose: () => void;
}

// Helper function to get last week's date range
const getLastWeekDateRange = () => {
  const today = dayjs();
  const dayOfWeek = today.day(); // 0 = Sunday, 1 = Monday, etc.

  // Calculate the start of last week (Monday)
  const daysToSubtract = dayOfWeek === 0 ? 13 : dayOfWeek + 6; // If today is Sunday, subtract 13, otherwise subtract (dayOfWeek + 6)
  const lastWeekStart = today.subtract(daysToSubtract, 'day');

  // Calculate the end of last week (Sunday)
  const lastWeekEnd = lastWeekStart.add(6, 'day');

  return {
    start: lastWeekStart,
    end: lastWeekEnd,
  };
};

// Helper function to get current month's date range
const getCurrentMonthDateRange = () => {
  const today = dayjs();
  const start = today.startOf('month');
  const end = today.endOf('month');

  return {
    start,
    end,
  };
};

const WeeklySummaryModal: React.FC<WeeklySummaryModalProps> = ({
  open,
  onClose,
}) => {
  const dispatch = useAppDispatch();
  const { items, summary, loading, error } = useSelector(
    (state: RootState) => state.salesSummary,
  );

  const [startDate, setStartDate] = useState<Dayjs | null>(null);
  const [endDate, setEndDate] = useState<Dayjs | null>(null);

  // Initialize with last week's dates
  useEffect(() => {
    if (open) {
      const lastWeek = getLastWeekDateRange();
      setStartDate(lastWeek.start);
      setEndDate(lastWeek.end);
    }
  }, [open]);

  // Fetch data when dates change
  useEffect(() => {
    if (open && startDate && endDate) {
      const token = localStorage.getItem('token');
      if (token) {
        dispatch(
          fetchSalesSummaryAsync({
            token,
            startDate: startDate.format('YYYY-MM-DD'),
            endDate: endDate.format('YYYY-MM-DD'),
          }),
        );
      }
    }
  }, [open, startDate, endDate, dispatch]);

  // Clear data when modal is closed
  useEffect(() => {
    if (!open) {
      dispatch(clearSalesData());
    }
  }, [open, dispatch]);

  const handlePresetPeriod = (period: 'lastWeek' | 'thisMonth') => {
    if (period === 'lastWeek') {
      const lastWeek = getLastWeekDateRange();
      setStartDate(lastWeek.start);
      setEndDate(lastWeek.end);
    } else if (period === 'thisMonth') {
      const thisMonth = getCurrentMonthDateRange();
      setStartDate(thisMonth.start);
      setEndDate(thisMonth.end);
    }
  };

  const handleDownloadExcel = async () => {
    if (!startDate || !endDate) {
      toast.error('Veuillez sélectionner des dates');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Token manquant');
      return;
    }

    try {
      await dispatch(
        downloadSalesExcelAsync({
          token,
          startDate: startDate.format('YYYY-MM-DD'),
          endDate: endDate.format('YYYY-MM-DD'),
        }),
      ).unwrap();
      toast.success('Fichier Excel téléchargé avec succès');
    } catch (err) {
      console.error('Error downloading Excel:', err);
      toast.error('Erreur lors du téléchargement du fichier Excel');
    }
  };

  const formatPrice = (price: number) => {
    return `${price.toLocaleString('fr-FR')} €`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'robot':
        return 'primary';
      case 'antenne':
        return 'secondary';
      case 'plugin':
        return 'success';
      case 'abri':
        return 'warning';
      default:
        return 'default';
    }
  };

  const totalItemsByCategory = useMemo(() => {
    const categoryCount: { [key: string]: number } = {};
    items.forEach((item) => {
      categoryCount[item.category] = (categoryCount[item.category] || 0) + 1;
    });
    return categoryCount;
  }, [items]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { minHeight: '80vh' },
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <TrendingUpIcon color="primary" />
            <Typography variant="h6">Récapitulatif des Ventes</Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3}>
          {/* Date Selection */}
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <DateRangeIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Période
              </Typography>

              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={4}>
                  <DatePicker
                    label="Date de début"
                    value={startDate}
                    onChange={(newValue) => setStartDate(newValue)}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        size: 'small',
                      },
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <DatePicker
                    label="Date de fin"
                    value={endDate}
                    onChange={(newValue) => setEndDate(newValue)}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        size: 'small',
                      },
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handlePresetPeriod('lastWeek')}
                    >
                      Semaine dernière
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handlePresetPeriod('thisMonth')}
                    >
                      Ce mois
                    </Button>
                  </Stack>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Error Display */}
          {error && (
            <Alert severity="error" onClose={() => dispatch(clearSalesData())}>
              {error}
            </Alert>
          )}

          {/* Loading */}
          {loading && (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          )}

          {/* Summary Cards */}
          {summary && !loading && (
            <Grid2 container spacing={2}>
              <Grid2 size={{ xs: 12, md: 4 }}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" gap={2}>
                      <ShoppingCartIcon color="primary" fontSize="large" />
                      <Box>
                        <Typography variant="h4" color="primary">
                          {summary.totalOrders}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Commandes
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid2>

              <Grid2 size={{ xs: 12, md: 4 }}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" gap={2}>
                      <TrendingUpIcon color="success" fontSize="large" />
                      <Box>
                        <Typography variant="h4" color="success.main">
                          {summary.totalItems}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Articles vendus
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid2>

              <Grid2 size={{ xs: 12, md: 4 }}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" gap={2}>
                      <AttachMoneyIcon color="warning" fontSize="large" />
                      <Box>
                        <Typography variant="h4" color="warning.main">
                          {formatPrice(summary.totalRevenue)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Chiffre d'affaires
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid2>
            </Grid2>
          )}

          {/* Category Summary */}
          {Object.keys(totalItemsByCategory).length > 0 && (
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Répartition par catégorie
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {Object.entries(totalItemsByCategory).map(
                    ([category, count]) => (
                      <Chip
                        key={category}
                        label={`${category}: ${count}`}
                        color={getCategoryColor(category) as any}
                        variant="outlined"
                      />
                    ),
                  )}
                </Stack>
              </CardContent>
            </Card>
          )}

          {/* Sales Table */}
          {items.length > 0 && !loading && (
            <Card variant="outlined">
              <CardContent>
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  mb={2}
                >
                  <Typography variant="h6">Détail des ventes</Typography>
                  <Button
                    variant="contained"
                    startIcon={<DownloadIcon />}
                    onClick={handleDownloadExcel}
                    disabled={loading}
                  >
                    Télécharger Excel
                  </Button>
                </Box>

                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Client</TableCell>
                        <TableCell>Référence</TableCell>
                        <TableCell>Produit</TableCell>
                        <TableCell>Catégorie</TableCell>
                        <TableCell align="right">Prix</TableCell>
                        <TableCell>N° Série</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {items.map((item, index) => (
                        <TableRow key={`${item.orderId}-${index}`}>
                          <TableCell>{formatDate(item.date)}</TableCell>
                          <TableCell>{item.clientName}</TableCell>
                          <TableCell>{item.reference || '-'}</TableCell>
                          <TableCell>{item.name}</TableCell>
                          <TableCell>
                            <Chip
                              label={item.category}
                              color={getCategoryColor(item.category) as any}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="right">
                            {formatPrice(item.price)}
                          </TableCell>
                          <TableCell>{item.serialNumber || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          )}

          {/* No Data */}
          {items.length === 0 && !loading && !error && summary && (
            <Card variant="outlined">
              <CardContent>
                <Typography
                  variant="h6"
                  textAlign="center"
                  color="text.secondary"
                >
                  Aucune vente trouvée pour cette période
                </Typography>
              </CardContent>
            </Card>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Fermer</Button>
      </DialogActions>
    </Dialog>
  );
};

export default WeeklySummaryModal;
