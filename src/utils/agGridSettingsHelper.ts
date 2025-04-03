import { ColumnState, FilterModel, GridApi } from 'ag-grid-community';
import { debounce } from 'lodash';

// Debounced function to save column state
const debouncedSaveColumnState = debounce(
  (gridStateKey: string, columnState: ColumnState[]) => {
    console.log('Saving grid column state', gridStateKey, columnState);
    localStorage.setItem(
      `${gridStateKey}_columns`,
      JSON.stringify(columnState),
    );
  },
  300,
);

// Debounced function to save filter model
const debouncedSaveFilterModel = debounce(
  (gridStateKey: string, filterModel: FilterModel) => {
    console.log('Saving grid filter model', gridStateKey, filterModel);
    localStorage.setItem(
      `${gridStateKey}_filters`,
      JSON.stringify(filterModel),
    );
  },
  300,
);

// Debounced function to save page size
const debouncedSavePageSize = debounce(
  (gridStateKey: string, pageSize: number) => {
    console.log('Saving grid page size', gridStateKey, pageSize);
    localStorage.setItem(`${gridStateKey}_pageSize`, pageSize.toString());
  },
  300,
);

/**
 * Save grid column state
 */
export function onSaveGridColumnState(gridStateKey: string, api: GridApi) {
  const columnState = api.getColumnState();
  debouncedSaveColumnState(gridStateKey, columnState);
}

/**
 * Save grid filter state
 */
export function onSaveGridFilterState(gridStateKey: string, api: GridApi) {
  const filterModel = api.getFilterModel();
  debouncedSaveFilterModel(gridStateKey, filterModel);
}

/**
 * Save grid page size
 * @param gridStateKey Unique key to identify the grid
 * @param pageSize Page size to save
 */
export function saveGridPageSize(gridStateKey: string, pageSize: number) {
  debouncedSavePageSize(gridStateKey, pageSize);
}

/**
 * Load grid page size
 * @param gridStateKey Unique key to identify the grid
 * @param defaultPageSize Default page size to return if none is saved
 * @returns The saved page size or the default if none is saved
 */
export function loadGridPageSize(
  gridStateKey: string,
  defaultPageSize: number = 10,
): number {
  const savedPageSize = localStorage.getItem(`${gridStateKey}_pageSize`);
  if (savedPageSize) {
    try {
      return parseInt(savedPageSize, 10);
    } catch (error) {
      console.error('Failed to load grid page size', error);
    }
  }
  return defaultPageSize;
}

/**
 * Load grid state on first data rendered
 */
export function onFirstDataRendered(params: any, gridStateKey: string) {
  // Load column state
  const columnStateJson = localStorage.getItem(`${gridStateKey}_columns`);
  if (columnStateJson) {
    try {
      const columnState = JSON.parse(columnStateJson) as ColumnState[];
      params.api.applyColumnState({
        state: columnState,
        applyOrder: false,
      });
      console.log('Loaded grid column state', gridStateKey);
    } catch (error) {
      console.error('Failed to load grid column state', error);
    }
  }

  // Load filter model
  const filterModelJson = localStorage.getItem(`${gridStateKey}_filters`);
  if (filterModelJson) {
    try {
      const filterModel = JSON.parse(filterModelJson) as FilterModel;
      params.api.setFilterModel(filterModel);
      console.log('Loaded grid filter model', gridStateKey);
    } catch (error) {
      console.error('Failed to load grid filter model', error);
    }
  }
}

// Setup all grid state saving event handlers
export function setupGridStateEvents(gridApi: GridApi, gridStateKey: string) {
  // Column state events
  gridApi.addEventListener('columnMoved', () =>
    onSaveGridColumnState(gridStateKey, gridApi),
  );
  gridApi.addEventListener('columnResized', () =>
    onSaveGridColumnState(gridStateKey, gridApi),
  );
  gridApi.addEventListener('sortChanged', () =>
    onSaveGridColumnState(gridStateKey, gridApi),
  );

  // Filter state events
  gridApi.addEventListener('filterChanged', () =>
    onSaveGridFilterState(gridStateKey, gridApi),
  );
}

// Keep these for backward compatibility, but mark as deprecated
/**
 * @deprecated Use onSaveGridColumnState and onSaveGridFilterState instead
 */
export function saveGridState(gridApi: GridApi<any>, gridStateKey: string) {
  const columnState = gridApi.getColumnState();
  const filterModel = gridApi.getFilterModel();
  const state = { columnState, filterModel };
  console.log('Saving grid state', gridStateKey, state);
  localStorage.setItem(gridStateKey, JSON.stringify(state));
}

/**
 * Clear saved grid state from localStorage
 */
export function clearGridState(gridStateKey: string) {
  localStorage.removeItem(`${gridStateKey}_columns`);
  localStorage.removeItem(`${gridStateKey}_filters`);
  localStorage.removeItem(`${gridStateKey}_pageSize`);
  console.log('Cleared grid state', gridStateKey);
}
