/**
 * Retour de recette du 25/09 — le bouton « Retour » revient à la page d'où
 * l'on vient, sauf si elle n'est pas dans l'application (lien direct,
 * rechargement) : il va alors à sa page de repli.
 */
import '@testing-library/jest-dom/vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, renderHook, screen } from '@testing-library/react';

const router = vi.hoisted(() => ({ back: vi.fn(), push: vi.fn() }));
const nav = vi.hoisted(() => ({ pathname: '/clients/1' }));

vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => nav.pathname,
}));

describe('BackButton', () => {
  beforeEach(() => {
    vi.resetModules();
    router.back.mockReset();
    router.push.mockReset();
  });

  async function load() {
    const history = await import('@/lib/in-app-history');
    const { default: BackButton } = await import('./back-button');
    return { ...history, BackButton };
  }

  it('va à la page de repli quand la page est la première vue', async () => {
    const { useTrackInAppHistory, BackButton } = await load();
    nav.pathname = '/clients/1';
    // Un effet exécuté deux fois (mode strict) ne compte pas deux pages.
    const { rerender } = renderHook(() => useTrackInAppHistory());
    rerender();
    render(<BackButton fallback="/clients" />);
    fireEvent.click(screen.getByRole('button', { name: 'Retour' }));
    expect(router.push).toHaveBeenCalledWith('/clients');
    expect(router.back).not.toHaveBeenCalled();
  });

  it("revient en arrière après une navigation dans l'application", async () => {
    const { useTrackInAppHistory, BackButton } = await load();
    nav.pathname = '/reparation/12';
    const { rerender } = renderHook(() => useTrackInAppHistory());
    nav.pathname = '/clients/1';
    rerender();
    render(<BackButton fallback="/clients" />);
    fireEvent.click(screen.getByRole('button', { name: 'Retour' }));
    expect(router.back).toHaveBeenCalledOnce();
    expect(router.push).not.toHaveBeenCalled();
  });
});
