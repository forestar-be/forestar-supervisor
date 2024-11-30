import React from 'react';
import {
  Box,
  FormControl,
  Grid,
  InputLabel,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  IconButton,
  Chip,
  TextField,
  Divider,
  Select,
  MenuItem,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import Autocomplete from '@mui/material/Autocomplete';
import { SelectChangeEvent } from '@mui/material/Select/SelectInput';

interface ReplacedPart {
  name: string;
  price: number;
}

interface MachineRepair {
  replaced_part_list: {
    quantity: number;
    replacedPart: ReplacedPart;
  }[];
}

interface ReplacedPartSelectProps {
  label: string;
  name: string;
  values: MachineRepair['replaced_part_list'];
  possibleValues: ReplacedPart[];
  editableFields: { [key: string]: boolean };
  handleReplacedPartSelectChange: (event: SelectChangeEvent<string[]>) => void;
  updateQuantityOfReplacedPart: (
    e: SelectChangeEvent<unknown>,
    replacedPart: MachineRepair['replaced_part_list'][0],
  ) => void;
  handleDeleteReplacedPart: (replacedPartName: string) => void;
  possibleReplacedPartToString: (part: ReplacedPart) => string;
}

const ReplacedPartSelect: React.FC<ReplacedPartSelectProps> = ({
  label,
  name,
  values,
  possibleValues,
  editableFields,
  handleReplacedPartSelectChange,
  updateQuantityOfReplacedPart,
  handleDeleteReplacedPart,
  possibleReplacedPartToString,
}) => {
  return (
    <Grid item xs={12}>
      {editableFields[name] && (
        <FormControl sx={{ marginTop: 2, marginBottom: 1, width: '80%' }}>
          <Autocomplete
            multiple
            id={`autocomplete-${name}`}
            options={possibleValues}
            getOptionLabel={possibleReplacedPartToString}
            value={values.map((val) => val.replacedPart)}
            onChange={(event, newValue) => {
              handleReplacedPartSelectChange({
                target: { name, value: newValue.map((val) => val.name) },
              } as SelectChangeEvent<string[]>);
            }}
            filterSelectedOptions
            renderInput={(params) => <TextField label={label} {...params} />}
            renderTags={(selected, getTagProps) =>
              selected.map((option, index) => (
                <Chip label={option.name} {...getTagProps({ index })} />
              ))
            }
          />
        </FormControl>
      )}
      <Box
        display={'flex'}
        flexDirection={values.length ? 'column' : 'row'}
        gap={values.length ? undefined : '10px'}
        margin={'5px 0'}
      >
        <Typography variant="subtitle1">{label} :</Typography>
        <Grid item xs={values.length ? 12 : 6}>
          {values.length ? (
            <List sx={{ width: '100%' }}>
              {values.map((replacedPart, index) => (
                <>
                  {index === 0 && <Divider></Divider>}
                  <ListItem
                    key={replacedPart.replacedPart.name}
                    secondaryAction={
                      <Select
                        sx={{ width: 70 }}
                        size={'small'}
                        value={replacedPart.quantity}
                        onChange={(e) =>
                          updateQuantityOfReplacedPart(e, replacedPart)
                        }
                      >
                        {[...Array(10).keys()].map((num) => (
                          <MenuItem key={num} value={num + 1}>
                            {num + 1}
                          </MenuItem>
                        ))}
                      </Select>
                    }
                  >
                    <ListItemIcon>
                      <IconButton
                        edge="end"
                        aria-label="delete"
                        onClick={() =>
                          handleDeleteReplacedPart(
                            replacedPart.replacedPart.name,
                          )
                        }
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItemIcon>
                    <ListItemText
                      primary={`${replacedPart.replacedPart.name} - ${replacedPart.replacedPart.price}€`}
                    />
                  </ListItem>
                  <Divider></Divider>
                </>
              ))}
            </List>
          ) : (
            <Typography variant="subtitle1">Aucune</Typography>
          )}
        </Grid>
      </Box>
    </Grid>
  );
};

export default ReplacedPartSelect;
