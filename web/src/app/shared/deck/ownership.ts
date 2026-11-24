import { IconName } from '../icon';
import { OwnershipState } from '../../core/decks/tile-ownership';

// The pure tile helper lives with the ownership engine (core/decks); re-exported for the components.
export { tileOwnership } from '../../core/decks/tile-ownership';
export type { OwnershipState, TileOwnership } from '../../core/decks/tile-ownership';

/** Icon per state (OWN-033: full check, partial half circle, none empty circle). */
export const OWNERSHIP_ICON: Readonly<Record<OwnershipState, IconName>> = {
  full: 'check_circle',
  partial: 'contrast',
  none: 'radio_button_unchecked',
};
