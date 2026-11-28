/**
 * Brief H-716: the motion tokens of styles.scss (`--dur-*`, `--ease-*`) for code that needs them in TS.
 */

/** A CSS time (`220ms`, `0.2s`) in ms; 0 when unreadable. */
export function cssMs(value: string): number {
  const v = value.split(',')[0]?.trim() ?? '';
  const n = parseFloat(v);
  if (!Number.isFinite(n)) return 0;
  return v.endsWith('ms') ? n : n * 1000;
}

/** A transition shorthand for `props` on the given tokens, read from `el` (e.g. `transform 120ms cubic-bezier(…)`). */
export function tokenTransition(
  el: Element,
  props: readonly string[],
  dur: '--dur-fast' | '--dur-med',
  ease: '--ease-out' | '--ease-enter' = '--ease-out',
): { transition: string; ms: number } {
  const style = getComputedStyle(el);
  const d = style.getPropertyValue(dur).trim() || '0ms';
  const e = style.getPropertyValue(ease).trim() || 'ease-out';
  return { transition: props.map((p) => `${p} ${d} ${e}`).join(', '), ms: cssMs(d) };
}

/**
 * Brief H-716 S7: how long Material keeps a dialog in its enter and exit states. They match `--dur-med` (enter) and
 * `--dur-fast` (exit), which drive the CSS (styles.scss, "Dialogs"); Material only uses these to time its classes and
 * to remove the overlay, so the exit must not be shorter than the CSS. Spread first into every `MatDialog.open`
 * config (one global default would be MAT_DIALOG_DEFAULT_OPTIONS in app.config, which pulls the dialog module into
 * the initial bundle, +29 kB). Keep in step with the tokens.
 */
export const DIALOG_MOTION = { enterAnimationDuration: '220ms', exitAnimationDuration: '120ms' } as const;
