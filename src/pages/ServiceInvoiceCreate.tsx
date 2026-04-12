import React, { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Paper,
  Tabs,
  Tab,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchIcon from '@mui/icons-material/Search';
import { useAuth } from '../hooks/AuthProvider';
import {
  createServiceInvoice,
  searchRepairsForInvoice,
  isHttpError,
} from '../utils/api';
import { RepairForInvoice } from '../utils/types';
import InvoiceForm, {
  InvoiceFormData,
} from '../components/invoices/InvoiceForm';

const ServiceInvoiceCreate: React.FC = () => {
  const navigate = useNavigate();
  const auth = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [tabIndex, setTabIndex] = useState(0);

  // Import from repair
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<RepairForInvoice[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedRepair, setSelectedRepair] = useState<RepairForInvoice | null>(
    null,
  );
  const searchTimeout = useRef<NodeJS.Timeout>();

  const handleSearch = useCallback(
    (q: string) => {
      setSearchQuery(q);
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
      if (!q.trim() || !auth.token) {
        setSearchResults([]);
        return;
      }
      searchTimeout.current = setTimeout(async () => {
        setSearching(true);
        try {
          const results = await searchRepairsForInvoice(auth.token, q.trim());
          setSearchResults(results);
        } catch {
          setSearchResults([]);
        } finally {
          setSearching(false);
        }
      }, 400);
    },
    [auth.token],
  );

  const handleSelectRepair = (repair: RepairForInvoice) => {
    setSelectedRepair(repair);
    setSearchResults([]);
    setSearchQuery('');
  };

  const getInitialData = (): Partial<InvoiceFormData> | undefined => {
    if (!selectedRepair) return undefined;
    return {
      clientFirstName: selectedRepair.first_name,
      clientLastName: selectedRepair.last_name,
      clientPhone: selectedRepair.phone,
      clientEmail: selectedRepair.email,
      clientAddress: selectedRepair.address || '',
      clientCity: selectedRepair.city || '',
      clientPostalCode: selectedRepair.postal_code || '',
      machineRepairId: selectedRepair.id,
    };
  };

  const handleSubmit = async (data: InvoiceFormData) => {
    setError(null);
    setSaving(true);
    try {
      const result = await createServiceInvoice(auth.token, {
        ...data,
        type: 'REPAIR',
      });
      navigate(`/factures/${result.id}`);
    } catch (err: any) {
      setError(
        isHttpError(err) ? err.message : 'Erreur lors de la création',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1300, mx: 'auto' }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/factures')}
        sx={{ mb: 2 }}
      >
        Retour aux factures
      </Button>

      <Typography variant="h5" fontWeight="bold" sx={{ mb: 2 }}>
        Nouvelle facture de réparation
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Tabs
        value={tabIndex}
        onChange={(_, v) => {
          setTabIndex(v);
          setSelectedRepair(null);
        }}
        sx={{ mb: 2 }}
      >
        <Tab label="Nouveau client" />
        <Tab label="Import depuis réparation" />
      </Tabs>

      {tabIndex === 1 && !selectedRepair && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Rechercher une réparation
          </Typography>
          <TextField
            size="small"
            fullWidth
            placeholder="Nom, téléphone, email..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            InputProps={{
              startAdornment: searching ? (
                <CircularProgress size={18} sx={{ mr: 1 }} />
              ) : (
                <SearchIcon sx={{ mr: 1, color: 'grey.500' }} />
              ),
            }}
          />
          {searchResults.length > 0 && (
            <List dense sx={{ mt: 1 }}>
              {searchResults.map((r) => (
                <ListItem key={r.id} disablePadding>
                  <ListItemButton onClick={() => handleSelectRepair(r)}>
                    <ListItemText
                      primary={`#${r.id} — ${r.first_name} ${r.last_name}`}
                      secondary={[
                        r.phone,
                        r.repair_or_maintenance,
                        r.brand_name,
                        r.robot_type_name,
                      ]
                        .filter(Boolean)
                        .join(' • ')}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
          {searchQuery.trim() &&
            !searching &&
            searchResults.length === 0 && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 1 }}
              >
                Aucune réparation trouvée
              </Typography>
            )}
        </Paper>
      )}

      {tabIndex === 1 && selectedRepair && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Import depuis la réparation #{selectedRepair.id} —{' '}
          {selectedRepair.first_name} {selectedRepair.last_name}
          <Button
            size="small"
            sx={{ ml: 2 }}
            onClick={() => setSelectedRepair(null)}
          >
            Changer
          </Button>
        </Alert>
      )}

      {(tabIndex === 0 || selectedRepair) && (
        <InvoiceForm
          key={selectedRepair?.id || 'new'}
          initialData={getInitialData()}
          onSubmit={handleSubmit}
          submitLabel="Créer la facture"
          saving={saving}
        />
      )}
    </Box>
  );
};

export default ServiceInvoiceCreate;
