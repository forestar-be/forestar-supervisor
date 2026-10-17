import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
} from '@testing-library/react';
import {
  DataTable,
  type ColumnDef,
  type DataTableState,
} from '@forestar-be/ui';
import { usePersistedState } from './use-persisted-state';

const initialState: DataTableState = {
  sorting: [{ id: 'name', desc: false }],
  pagination: { pageIndex: 0, pageSize: 2 },
  columnFilters: [],
  columnVisibility: {},
  columnSizing: {},
};
const columns: ColumnDef<{ name: string }, unknown>[] = [
  { accessorKey: 'name', header: 'Nom' },
];
const data = Array.from({ length: 6 }, (_, index) => ({
  name: `Robot ${index}`,
}));

function PersistedTable() {
  const [state, setState] = usePersistedState('test.pagination', initialState);
  return (
    <DataTable
      columns={columns}
      data={data}
      state={state}
      onStateChange={setState}
    />
  );
}

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe('usePersistedState avec le tableau commun', () => {
  it('change de page sans revenir à la première, puis restaure la page après remontage', async () => {
    const view = render(<PersistedTable />);
    const navigation = () => screen.getAllByRole('button').slice(-4);
    // Vider aussi les microtâches de réinitialisation de TanStack Table.
    await act(async () => fireEvent.click(navigation()[2]));
    expect(screen.getByText('Page 2 / 3')).toBeInTheDocument();
    expect(screen.getByText('Robot 2')).toBeInTheDocument();
    expect(screen.queryByText('Robot 0')).not.toBeInTheDocument();

    await act(async () => fireEvent.click(navigation()[3]));
    expect(screen.getByText('Page 3 / 3')).toBeInTheDocument();
    expect(navigation()[2]).toBeDisabled();
    await act(async () => fireEvent.click(navigation()[1]));
    expect(screen.getByText('Page 2 / 3')).toBeInTheDocument();

    view.unmount();
    render(<PersistedTable />);
    expect(screen.getByText('Page 2 / 3')).toBeInTheDocument();
    await act(async () => fireEvent.click(navigation()[0]));
    expect(screen.getByText('Page 1 / 3')).toBeInTheDocument();
  });

  it('conserve la remise à la première page quand le tri change', async () => {
    render(<PersistedTable />);
    await act(async () =>
      fireEvent.click(screen.getAllByRole('button').slice(-4)[2]),
    );
    expect(screen.getByText('Page 2 / 3')).toBeInTheDocument();
    await act(async () => fireEvent.click(screen.getByText('Nom')));
    expect(screen.getByText('Page 1 / 3')).toBeInTheDocument();
    expect(screen.getByText('Robot 5')).toBeInTheDocument();
  });

  it('synchronise deux abonnés et prend en compte les modifications d’un autre onglet', () => {
    const first = renderHook(() =>
      usePersistedState('test.shared', { count: 0 }),
    );
    const second = renderHook(() =>
      usePersistedState('test.shared', { count: 0 }),
    );
    act(() =>
      first.result.current[1]((previous) => ({ count: previous.count + 1 })),
    );
    expect(second.result.current[0]).toEqual({ count: 1 });
    act(() => {
      localStorage.setItem('test.shared', JSON.stringify({ count: 5 }));
      window.dispatchEvent(new StorageEvent('storage', { key: 'test.shared' }));
    });
    expect(first.result.current[0]).toEqual({ count: 5 });
    expect(second.result.current[0]).toEqual({ count: 5 });
  });
});
