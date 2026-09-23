/**
 * Les étapes Dolibarr de la modale d'envoi lisent la réponse 409 réelle de
 * `handleSendInvoice` (forestar-server) : `matches` et `differences` en
 * tableau de `{ field, invoice, dolibarr }`.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { HttpError } from '@forestar-be/core';

const sendServiceInvoice = vi.fn();
vi.mock('@/lib/api', async () => {
  const core = await import('@forestar-be/core');
  return {
    sendServiceInvoice: (...args: unknown[]) => sendServiceInvoice(...args),
    HttpError: core.HttpError,
    isHttpError: core.isHttpError,
  };
});
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ token: 'jeton' }) }));

import SendInvoiceModal from './send-invoice-modal';

const invoiceClient = {
  name: 'Jean Dupont',
  email: 'jean@example.be',
  phone: '0470000000',
  address: 'Rue 1',
  zip: '1000',
  town: 'Bruxelles',
};

function renderModal() {
  render(
    <SendInvoiceModal
      invoiceId={7}
      clientEmail="jean@example.be"
      onClose={() => {}}
      onSent={() => {}}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: /confirmer l.envoi/i }));
}

afterEach(() => {
  cleanup();
  sendServiceInvoice.mockReset();
});

describe('SendInvoiceModal', () => {
  it('affiche les champs en conflit par leur libellé', async () => {
    sendServiceInvoice.mockRejectedValueOnce(
      new HttpError('Conflit', 409, {
        confirmationType: 'resolve-conflict',
        invoiceClient,
        dolibarrClient: { id: 12, ...invoiceClient, email: 'autre@example.be' },
        differences: [
          {
            field: 'Email',
            invoice: 'jean@example.be',
            dolibarr: 'autre@example.be',
          },
        ],
      }),
    );
    renderModal();

    expect(await screen.findByText('Conflit de données client')).toBeTruthy();
    expect(screen.getByText('Email')).toBeTruthy();
    expect(screen.getAllByText('autre@example.be').length).toBeGreaterThan(0);
  });

  it('propose les tiers candidats et envoie le choix', async () => {
    sendServiceInvoice.mockRejectedValueOnce(
      new HttpError('Conflit', 409, {
        confirmationType: 'select-client',
        invoiceClient,
        matches: [
          {
            id: 3,
            ...invoiceClient,
            name: 'Jean Dupont SPRL',
            differences: [],
          },
          {
            id: 4,
            ...invoiceClient,
            differences: [
              { field: 'Ville', invoice: 'Bruxelles', dolibarr: 'Namur' },
            ],
          },
        ],
      }),
    );
    renderModal();

    expect(await screen.findByText('Jean Dupont SPRL')).toBeTruthy();
    expect(screen.getByText(/1 différence/)).toBeTruthy();
    expect(screen.queryByText('Réponse inattendue du serveur')).toBeNull();

    sendServiceInvoice.mockResolvedValueOnce({});
    fireEvent.click(screen.getAllByRole('radio')[0]);
    fireEvent.click(
      screen.getByRole('button', { name: /valider et envoyer/i }),
    );
    expect(sendServiceInvoice).toHaveBeenLastCalledWith('jeton', 7, {
      thirdpartyAction: 'select',
      thirdpartyId: 3,
    });
  });
});
