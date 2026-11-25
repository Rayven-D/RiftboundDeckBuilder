/**
 * SPEC-010 SYNC-006 return path (H-145, Brief H-145 decisions 1-5): where an email sign-in link brings the user
 * back to. Pure (no Angular, no Firebase, no `location`), so the same check runs when the link is sent and when it
 * is opened.
 */

/** The parameters Firebase adds to an email sign-in link (SYNC-006); removed by name, never by position. */
export const LINK_PARAMS: readonly string[] = ['mode', 'oobCode', 'apiKey', 'lang', 'continueUrl'];

/**
 * An app path and query that is safe to return to, or `/`. Accepted only when `raw` starts with exactly one `/`
 * (not `//` or `/\`) and resolves to `origin`; the five Firebase parameters and any `#fragment` are dropped. The
 * user's own query text is kept as written. An unknown app path is allowed through: the router's `**` sends it home.
 */
export function safeReturnPath(raw: string, origin: string): string {
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return '/';
  let url: URL;
  try {
    url = new URL(raw, origin);
  } catch {
    return '/';
  }
  if (url.origin !== new URL(origin).origin) return '/';
  const path = url.pathname;
  // `/.//x` normalizes to `//x`, which a later `origin + path` would read as another host.
  if (path.startsWith('//')) return '/';
  const kept = url.search
    .slice(1)
    .split('&')
    .filter((part) => part !== '' && !LINK_PARAMS.includes(paramName(part)));
  return kept.length ? `${path}?${kept.join('&')}` : path;
}

/**
 * Decision 4: on return the target is the current location's own path and query (never the `continueUrl`
 * parameter), with the Firebase parameters removed; anything outside the app gives `/`.
 */
export function returnTarget(href: string): string {
  const url = new URL(href);
  return safeReturnPath(url.pathname + url.search, url.origin);
}

function paramName(part: string): string {
  const name = part.split('=', 1)[0].replace(/\+/g, ' ');
  try {
    return decodeURIComponent(name);
  } catch {
    return name;
  }
}
