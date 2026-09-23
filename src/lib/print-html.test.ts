import { describe, expect, it, vi } from 'vitest';
import { printHtml } from './print-html';

function getIframe(): HTMLIFrameElement {
  const iframe = document.querySelector('iframe');
  if (!iframe) throw new Error('iframe introuvable');
  return iframe;
}

describe('printHtml', () => {
  it('injecte le HTML dans une iframe cachée, attend le chargement, imprime puis retire l’iframe', async () => {
    const html = '<html><body>Ticket</body></html>';
    const promise = printHtml(html);

    const iframe = getIframe();
    expect(iframe.srcdoc).toBe(html);
    expect(document.body.contains(iframe)).toBe(true);

    const printSpy = vi.fn();
    // jsdom crée un `contentWindow` dès l'attachement de l'iframe au
    // document, même sans navigation réseau réelle.
    Object.defineProperty(iframe.contentWindow, 'print', {
      value: printSpy,
      configurable: true,
    });

    iframe.dispatchEvent(new Event('load'));

    expect(printSpy).toHaveBeenCalledTimes(1);

    iframe.contentWindow?.dispatchEvent(new Event('afterprint'));
    await promise;

    expect(document.body.contains(iframe)).toBe(false);
  });

  it('retire l’iframe après un délai de sécurité si `afterprint` n’arrive jamais', async () => {
    vi.useFakeTimers();
    try {
      const promise = printHtml('<html><body>Ticket</body></html>');
      const iframe = getIframe();
      Object.defineProperty(iframe.contentWindow, 'print', {
        value: vi.fn(),
        configurable: true,
      });

      iframe.dispatchEvent(new Event('load'));
      await vi.advanceTimersByTimeAsync(5000);
      await promise;

      expect(document.body.contains(iframe)).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});
