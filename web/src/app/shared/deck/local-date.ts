import { formatIsoDate } from '../../core/decks';

/**
 * OWN-090: an ISO date-time (`updatedAt`, `lockedAt`) as the **local** calendar date, `MMM D, YYYY`
 * (e.g. "Nov 23, 2026"). null when it doesn't parse (SHARE-030: a lock is then shown without a date).
 */
export function localDateText(isoDateTime: string | null | undefined): string | null {
  if (!isoDateTime || !/^\d{4}-\d{2}-\d{2}/.test(isoDateTime)) return null;
  const t = Date.parse(isoDateTime);
  if (Number.isNaN(t)) return null;
  const d = new Date(t);
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return formatIsoDate(iso);
}
