import { IconName } from '../icon';

/** Ownership state of one deck tile (SPEC-005 OWN-023). */
export type OwnershipState = 'full' | 'partial' | 'none';

export interface TileOwnership {
  /** Copies allocated to this tile, capped at `required` (OWN-005 design decision 5). */
  readonly allocated: number;
  readonly required: number;
  /** Exact fraction in [0, 1]; 1 of 3 is 0.333…, never rounded to steps (OWN-032). */
  readonly fill: number;
  readonly state: OwnershipState;
  /** Visible count label, e.g. "1 of 3 owned" (OWN-033). */
  readonly label: string;
}

/** Pure helper: turns allocated / required copies into the tile's fill, state and label. */
export function tileOwnership(allocated: number, required: number): TileOwnership {
  if (!Number.isInteger(required) || required < 1) {
    throw new RangeError(`required must be a positive integer, got ${required}`);
  }
  const capped = Math.min(Math.max(0, Math.trunc(allocated)), required);
  const fill = capped / required;
  const state: OwnershipState = capped === required ? 'full' : capped === 0 ? 'none' : 'partial';
  return { allocated: capped, required, fill, state, label: `${capped} of ${required} owned` };
}

/** Icon per state (OWN-033: full check, partial half circle, none empty circle). */
export const OWNERSHIP_ICON: Readonly<Record<OwnershipState, IconName>> = {
  full: 'check_circle',
  partial: 'contrast',
  none: 'radio_button_unchecked',
};
