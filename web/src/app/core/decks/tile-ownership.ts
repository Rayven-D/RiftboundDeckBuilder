/** Ownership state of one deck tile (SPEC-005 OWN-023). */
export type OwnershipState = 'full' | 'partial' | 'none';

export interface TileOwnership {
  /** Copies allocated to this tile, capped at `required` (SPEC-005 design decision 5). */
  readonly allocated: number;
  readonly required: number;
  /** Exact fraction in [0, 1]; 1 of 3 is 0.333…, never rounded to steps (OWN-032). */
  readonly fill: number;
  readonly state: OwnershipState;
  /** Visible count label, e.g. "1 of 3 available" or "3 of 3 locked in" (OWN-033, SHARE-040). */
  readonly label: string;
}

/**
 * Pure helper: turns allocated / required copies into the tile's fill, state and label.
 * `locked` switches the label to "… locked in" for a deck that is locked in (SPEC-008 SHARE-040).
 */
export function tileOwnership(allocated: number, required: number, locked = false): TileOwnership {
  if (!Number.isInteger(required) || required < 1) {
    throw new RangeError(`required must be a positive integer, got ${required}`);
  }
  const capped = Math.min(Math.max(0, Math.trunc(allocated)), required);
  const fill = capped / required;
  const state: OwnershipState = capped === required ? 'full' : capped === 0 ? 'none' : 'partial';
  const label = `${capped} of ${required} ${locked ? 'locked in' : 'available'}`;
  return { allocated: capped, required, fill, state, label };
}
