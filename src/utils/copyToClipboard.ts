/**
 * copyToClipboard — robuuste klembord-helper met fallback.
 *
 * Probeert eerst de async Clipboard API (`navigator.clipboard.writeText`), die
 * een secure context + permissie vereist. Faalt dat (o.a. Safari Private Mode,
 * non-secure context, ontbrekende permissie), dan valt hij terug op de klassieke
 * verborgen-textarea + `document.execCommand('copy')`-aanpak.
 *
 * @param text - De te kopiëren tekst.
 * @returns `true` als het kopiëren slaagde, anders `false`.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // Primair: async Clipboard API (vereist secure context + permissie)
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Val door naar de legacy-fallback hieronder.
  }

  // Fallback: verborgen textarea + execCommand('copy')
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}
