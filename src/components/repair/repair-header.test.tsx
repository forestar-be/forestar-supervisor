/**
 * En-tête de la fiche : les actions du parcours restent sur la première
 * ligne ; ce qui sert rarement, ce qui est désactivé sur une fiche archivée
 * et la suppression passent par « Plus ».
 */
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { RepairHeader } from './repair-header';

const noop = async () => {};

function renderHeader(
  overrides: Partial<Parameters<typeof RepairHeader>[0]> = {},
) {
  return render(
    <RepairHeader
      id="42"
      onDelete={noop}
      isDeleting={false}
      onDownloadPdf={noop}
      isLoadingDownload={false}
      onPrintPdf={noop}
      isLoadingPrint={false}
      onSendEmail={noop}
      isLoadingEmail={false}
      onSendDropbox={noop}
      isLoadingDropbox={false}
      onCall={noop}
      loadingCall={false}
      callCount={2}
      onOpenCallHistory={() => {}}
      hasCalendarEvent={false}
      onCalendarEventCreate={() => {}}
      onCalendarEventView={() => {}}
      loadingCalendarEvent={false}
      onPrintTickets={noop}
      isPrintingTickets={false}
      readOnly={false}
      archivedAt={null}
      onUnarchive={noop}
      isArchiving={false}
      onHandoverOpen={() => {}}
      onArchiveWithoutExit={noop}
      {...overrides}
    />,
  );
}

function openMoreMenu() {
  fireEvent.click(screen.getByRole('button', { name: 'Plus' }));
}

describe('RepairHeader', () => {
  it('garde la suppression hors de vue, derrière « Plus »', () => {
    renderHeader();

    expect(
      screen.getByRole('button', { name: 'Machine rendue au client' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Appel client' })).toBeEnabled();
    expect(screen.queryByText('Supprimer la fiche')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Supprimer/ }),
    ).not.toBeInTheDocument();

    openMoreMenu();

    expect(
      screen.getByRole('menuitem', { name: 'Archiver sans sortie' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: 'Historique des appels 2' }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('menuitem', { name: 'Supprimer la fiche' }),
    );

    expect(screen.getByRole('dialog')).toHaveTextContent(
      'Cette action est irréversible',
    );
  });

  it('sur une fiche archivée : badge, Désarchiver, et l’appel désactivé dans « Plus »', () => {
    const onUnarchive = vi.fn(noop);
    renderHeader({
      readOnly: true,
      archivedAt: '2026-09-24T08:00:00.000Z',
      onUnarchive,
    });

    expect(screen.getByText('Archivée le 24/09/2026')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Machine rendue au client' }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Désarchiver' }));
    expect(onUnarchive).toHaveBeenCalledOnce();

    openMoreMenu();

    expect(
      screen.getByRole('menuitem', { name: 'Appel client' }),
    ).toHaveAttribute('aria-disabled', 'true');
    expect(
      screen.getByRole('menuitem', { name: "Ajouter à l'agenda" }),
    ).toHaveAttribute('aria-disabled', 'true');
    expect(
      screen.queryByRole('menuitem', { name: 'Archiver sans sortie' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: 'Supprimer la fiche' }),
    ).toBeInTheDocument();
  });
});
