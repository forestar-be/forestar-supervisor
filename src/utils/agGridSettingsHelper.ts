import { ColumnState, FilterModel, GridApi } from 'ag-grid-community';
import { debounce } from 'lodash';

const debouncedSave = debounce(
  (gridApi: GridApi<any>, gridStateKey: string) => {
    const columnState = gridApi.getColumnState();
    const filterModel = gridApi.getFilterModel();
    const state = { columnState, filterModel };
    console.log('Saving grid state', gridStateKey, state);
    localStorage.setItem(gridStateKey, JSON.stringify(state));
  },
  300,
);

export function saveGridState(gridApi: GridApi<any>, gridStateKey: string) {
  debouncedSave(gridApi, gridStateKey);
}

export function loadGridState(gridApi: GridApi<any>, gridStateKey: string) {
  const stateJson = localStorage.getItem(gridStateKey);
  if (stateJson) {
    console.log('Loading grid state', gridStateKey, stateJson);
    try {
      const state = JSON.parse(stateJson) as {
        columnState: ColumnState[];
        filterModel: FilterModel;
      };
      if (state.columnState) {
        gridApi.applyColumnState({
          state: state.columnState,
          applyOrder: true,
        });
      }
      if (state.filterModel) {
        gridApi.setFilterModel(state.filterModel);
      }
    } catch (error) {
      console.error('Failed to load grid state', error);
    }
  }
}
