/**
 * Sélecteur d'applications — la liste vient du catalogue de
 * `@forestar-be/core` ; l'atelier y est marqué et n'est pas un lien.
 */
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { APP_CATALOG } from '@forestar-be/core';
import AppMenu from './AppMenu';

afterEach(cleanup);

async function open() {
  render(<AppMenu />);
  fireEvent.click(screen.getByRole('button', { name: 'Applications' }));
  return screen.findByRole('menu');
}

describe('AppMenu', () => {
  it('liste les dix applications, groupées', async () => {
    const menu = await open();
    for (const app of APP_CATALOG) {
      expect(menu).toHaveTextContent(app.label);
      expect(menu).toHaveTextContent(app.description);
    }
    for (const group of ['Atelier', 'Locations', 'Ventes et gestion']) {
      expect(menu).toHaveTextContent(group);
    }
  });

  it("marque l'atelier comme courant, sans lien", async () => {
    const menu = await open();
    const current = menu.querySelector('[aria-current="page"]');
    expect(current).toHaveTextContent('Atelier');
    expect(current).toHaveTextContent('Vous êtes ici');
    expect(current?.closest('a')).toBeNull();
    expect(
      menu.querySelector('a[href="https://atelier.forestar.be"]'),
    ).toBeNull();
  });

  it('ouvre les neuf autres dans un nouvel onglet', async () => {
    const menu = await open();
    const links = Array.from(menu.querySelectorAll('a'));
    expect(links.map((a) => a.getAttribute('href'))).toEqual(
      APP_CATALOG.filter((app) => app.id !== 'supervisor').map((app) => app.href),
    );
    for (const link of links) {
      expect(link).toHaveAttribute('target', '_blank');
      expect(link.getAttribute('rel')).toContain('noopener');
    }
  });
});
