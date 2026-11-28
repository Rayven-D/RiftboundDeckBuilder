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

const ENTER_ID = 'h716-enter';

/**
 * Brief H-716 S6: one short enter of `el` (opacity from 0, optionally from an offset) with the Web Animations API,
 * timed by the tokens read from `el`. `shift` is a distance token (`--move-shift`, `--move-rise`) or px, signed by
 * `sign` (-1 = from the left / above). A new call restarts it (never queued). Nothing under reduced motion.
 */
export function playEnter(
  el: Element | null | undefined,
  opts: { axis?: 'x' | 'y'; shift?: string; sign?: 1 | -1; dur?: '--dur-fast' | '--dur-med' } = {},
): void {
  if (!el || typeof (el as HTMLElement).animate !== 'function') return;
  if (el.ownerDocument.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? true) return;
  for (const a of el.getAnimations?.() ?? []) if (a.id === ENTER_ID) a.cancel();
  const style = getComputedStyle(el);
  const ms = cssMs(style.getPropertyValue(opts.dur ?? '--dur-med').trim());
  if (ms <= 0) return;
  const from: Keyframe = { opacity: 0 };
  if (opts.axis && opts.shift) {
    const raw = opts.shift.startsWith('--') ? style.getPropertyValue(opts.shift).trim() : opts.shift;
    const d = `${(opts.sign ?? 1) < 0 ? '-' : ''}${raw}`;
    from['transform'] = opts.axis === 'x' ? `translateX(${d})` : `translateY(${d})`;
  }
  const a = (el as HTMLElement).animate([from, { opacity: 1, transform: 'none' }], {
    duration: ms,
    easing: style.getPropertyValue('--ease-enter').trim() || 'ease-out',
  });
  a.id = ENTER_ID;
}
