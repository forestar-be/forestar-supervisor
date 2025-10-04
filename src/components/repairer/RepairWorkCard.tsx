import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  Chip,
  Button,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PersonIcon from '@mui/icons-material/Person';
import PhoneIcon from '@mui/icons-material/Phone';
import BuildIcon from '@mui/icons-material/Build';
import WarningIcon from '@mui/icons-material/Warning';
import { MachineRepair } from '../../utils/types';
import {
  formatWorkTime,
  getDaysSinceCreation,
  isDelayed,
  needsAttention,
} from '../../utils/repairerWorkUtils';
import { useAppSelector } from '../../store/hooks';
import { RootState } from '../../store/index';

interface RepairWorkCardProps {
  repair: MachineRepair;
  onView?: (id: number) => void;
  showRepairer?: boolean;
  colorByState?: Record<string, string>;
}

/**
 * Card compacte pour afficher une réparation dans la vue ouvrier
 */
const RepairWorkCard: React.FC<RepairWorkCardProps> = ({
  repair,
  onView,
  showRepairer = false,
  colorByState: colorByStateProp,
}) => {
  const navigate = useNavigate();
  const { config } = useAppSelector((state: RootState) => state.config);

  // Use prop if provided, otherwise parse from config (fallback for backward compatibility)
  const colorByState = React.useMemo(() => {
    if (colorByStateProp) {
      return colorByStateProp;
    }
    try {
      return JSON.parse(config['États'] || '{}') as Record<string, string>;
    } catch {
      return {} as Record<string, string>;
    }
  }, [colorByStateProp, config]);

  const handleView = () => {
    if (onView) {
      onView(repair.id);
    } else {
      navigate(`/reparation/${repair.id}`);
    }
  };

  const state = repair.state || 'Non commencé';
  const stateColor = colorByState[state] || '#e0e0e0';
  const daysSince = getDaysSinceCreation(repair.createdAt);
  const delayed = isDelayed(repair);
  const attention = needsAttention(repair);

  return (
    <Card
      sx={{
        mb: 2,
        borderLeft: `4px solid ${stateColor}`,
        width: '100%',
        maxWidth: '100%',
        '&:hover': {
          boxShadow: 3,
          transform: 'translateY(-2px)',
          transition: 'all 0.2s ease-in-out',
        },
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
      }}
      onClick={handleView}
    >
      <CardContent sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
          <Typography
            variant="h6"
            component="div"
            sx={{
              flexGrow: 1,
              fontSize: '1rem!important',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            #{repair.id} - {repair.machine_type_name}
          </Typography>
        </Box>

        <Chip
          label={state}
          size="small"
          sx={{
            backgroundColor: stateColor,
            color: '#000',
            mb: 1,
          }}
        />

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            mb: 0.5,
            gap: 1,
            minWidth: 0,
          }}
        >
          <PersonIcon fontSize="small" color="action" sx={{ flexShrink: 0 }} />
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {repair.first_name} {repair.last_name}
          </Typography>
        </Box>

        {repair.phone && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              mb: 0.5,
              gap: 1,
              minWidth: 0,
            }}
          >
            <PhoneIcon fontSize="small" color="action" sx={{ flexShrink: 0 }} />
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {repair.phone}
            </Typography>
          </Box>
        )}

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            mb: 0.5,
            gap: 1,
            minWidth: 0,
          }}
        >
          <BuildIcon fontSize="small" color="action" sx={{ flexShrink: 0 }} />
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {repair.brand_name}{' '}
            {repair.robot_type_name && `- ${repair.robot_type_name}`}
          </Typography>
        </Box>

        {repair.fault_description && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mt: 1,
              fontStyle: 'italic',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {repair.fault_description}
          </Typography>
        )}

        <Box
          sx={{
            display: 'flex',
            gap: 1,
            mt: 2,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          {repair.working_time_in_sec > 0 && (
            <Chip
              icon={<AccessTimeIcon />}
              label={formatWorkTime(repair.working_time_in_sec)}
              size="small"
              variant="outlined"
            />
          )}
          <Chip
            label={`${daysSince} jour${daysSince > 1 ? 's' : ''}`}
            size="small"
            variant="outlined"
            sx={{
              // borderColor: delayed
              //   ? 'error.main'
              //   : attention
              //     ? 'warning.main'
              //     : undefined,
              borderWidth: delayed || attention ? 2 : 1,
            }}
          />
          {delayed && (
            <Chip
              icon={<WarningIcon />}
              label="En retard"
              color="error"
              size="small"
            />
          )}
          {!delayed && attention && (
            <Chip
              icon={<WarningIcon />}
              label="Attention"
              color="warning"
              size="small"
            />
          )}
          {showRepairer && repair.repairer_name && (
            <Chip
              label={repair.repairer_name}
              size="small"
              variant="outlined"
              color="primary"
            />
          )}
        </Box>
      </CardContent>

      <CardActions sx={{ pt: 0, pb: 1.5, px: 2 }}>
        <Button
          size="small"
          startIcon={<VisibilityIcon />}
          onClick={(e) => {
            e.stopPropagation();
            handleView();
          }}
          fullWidth
          sx={{ justifyContent: 'flex-start' }}
        >
          Voir les détails
        </Button>
      </CardActions>
    </Card>
  );
};

export default RepairWorkCard;
