/**
 * R004-S04 — colle d'impression des tickets 80 mm (D-11).
 *
 * Même colle que l'opérateur (`forestar-operator/src/utils/printHtml.ts`) :
 * injecte le HTML reçu du serveur dans une iframe cachée, attend son
 * chargement puis déclenche `contentWindow.print()`, à la manière du POS
 * Dolibarr (`tpv.js:8709-8870`) — jamais automatique, toujours sur clic.
 * L'iframe est retirée après `afterprint`, ou au bout d'un délai de
 * sécurité si l'événement n'arrive jamais (certains navigateurs embarqués),
 * ou si `load` lui-même n'arrive jamais : le filet est posé dès l'appel, pas
 * seulement une fois `load` reçu, pour que l'iframe ne reste jamais dans la
 * page.
 *
 * L'appelant ne doit pas rattacher d'indicateur de chargement à cette
 * promesse : Chrome fige la page (minuteurs compris) pendant que la modale
 * d'impression est ouverte, la promesse ne se résout donc qu'à sa fermeture.
 */
export function printHtml(html: string): Promise<void> {
  return new Promise((resolve) => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.setAttribute('aria-hidden', 'true');

    let settled = false;
    const cleanup = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      iframe.remove();
      resolve();
    };

    const timeoutId = setTimeout(cleanup, 5000);

    iframe.addEventListener('load', () => {
      const win = iframe.contentWindow;
      if (!win) {
        cleanup();
        return;
      }
      try {
        win.addEventListener('afterprint', cleanup);
        win.focus();
        win.print();
      } catch (error) {
        console.error('Error triggering print:', error);
        cleanup();
      }
    });

    iframe.srcdoc = html;
    document.body.appendChild(iframe);
  });
}

/**
 * Imprime un PDF (fiche A4) sans ouvrir d'onglet : le blob est chargé dans une
 * iframe cachée, dont le lecteur PDF de Chrome ouvre la boîte d'impression.
 * Même règle que `printHtml` : aucun indicateur ne doit attendre cette promesse.
 * L'iframe reste en place pendant l'impression (la retirer trop tôt annule le
 * travail), puis est retirée au bout d'une minute.
 */
export function printPdfBlob(blob: Blob): Promise<void> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.setAttribute('aria-hidden', 'true');

    const cleanup = () => {
      iframe.remove();
      URL.revokeObjectURL(url);
    };

    iframe.addEventListener('load', () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (error) {
        console.error('Error triggering PDF print:', error);
      }
      setTimeout(cleanup, 60_000);
      resolve();
    });

    iframe.src = url;
    document.body.appendChild(iframe);
  });
}
