// SPEC-010 SYNC-007 (H-078): argument handling for the preview-channel deploy.
// Pure functions only (no Node APIs), so the web unit tests can import them; deploy-preview.mjs does the I/O.
// No dependencies.

/** Firebase config used for preview deploys: same hosting as firebase.json, but its predeploy builds `preview`. */
export const PREVIEW_FIREBASE_CONFIG = 'firebase.preview.json';

/**
 * Set by deploy-preview.mjs for the firebase child process only. The preview predeploy refuses to build
 * without it, so `firebase deploy --config firebase.preview.json` (which would target `live`) fails.
 */
export const PREVIEW_CHANNEL_ENV = 'RIFT_PREVIEW_CHANNEL';

export const USAGE =
  'Usage (from web/): npm run deploy:preview -- <channel> [expires]\n' +
  '  <channel>  preview channel name: 1-36 lowercase letters, digits or inner hyphens; never "live"\n' +
  '  [expires]  optional lifetime such as 12h, 3d or 2w (max 30d); Firebase default 7d\n' +
  'Preview URLs are public to anyone who has the link: share them privately and let them expire.';

const CHANNEL = /^[a-z0-9](?:[a-z0-9-]{0,34}[a-z0-9])?$/;
const EXPIRES = /^([1-9]\d*)([hdw])$/;
const MAX_HOURS = 30 * 24;
const HOURS = { h: 1, d: 24, w: 24 * 7 };

/** Throws unless `channel` is an allowed preview channel name. Returns it unchanged. */
export function checkChannel(channel) {
  if (typeof channel !== 'string' || channel.trim() === '') {
    throw new Error('A preview channel name is required.');
  }
  if (channel.trim().toLowerCase() === 'live') {
    throw new Error('"live" is the production site, not a preview channel. Pick another name.');
  }
  if (!CHANNEL.test(channel)) {
    throw new Error(`"${channel}" is not a valid channel name (1-36 lowercase letters, digits or inner hyphens).`);
  }
  return channel;
}

/** Throws unless `expires` is a Firebase channel lifetime of at most 30 days. Returns it unchanged. */
export function checkExpires(expires) {
  const m = typeof expires === 'string' ? EXPIRES.exec(expires) : null;
  if (!m) throw new Error(`"${expires}" is not a lifetime such as 12h, 3d or 2w.`);
  if (Number(m[1]) * HOURS[m[2]] > MAX_HOURS) throw new Error(`"${expires}" is longer than 30 days.`);
  return expires;
}

/** `<channel> [expires]` → `{ channel, expires }` (expires null = the Firebase default). Throws on anything else. */
export function parsePreviewDeployArgs(argv) {
  if (!Array.isArray(argv) || argv.length === 0) {
    throw new Error('A preview channel name is required.');
  }
  const flag = argv.find((a) => typeof a === 'string' && a.startsWith('-'));
  if (flag) throw new Error(`Unknown option "${flag}".`);
  if (argv.length > 2) throw new Error('Expected a channel name and an optional lifetime only.');
  return { channel: checkChannel(argv[0]), expires: argv.length === 2 ? checkExpires(argv[1]) : null };
}

/** Arguments for the Firebase CLI: a channel deploy (never `live`) with the preview config. */
export function firebaseChannelDeployArgs({ channel, expires }) {
  checkChannel(channel);
  const args = ['hosting:channel:deploy', channel, '--config', PREVIEW_FIREBASE_CONFIG];
  if (expires !== null && expires !== undefined) args.push('--expires', checkExpires(expires));
  return args;
}

/** The preview predeploy's guard: the channel deploy-preview.mjs set, or a thrown error. */
export function previewDeployChannelFromEnv(env) {
  const channel = env ? env[PREVIEW_CHANNEL_ENV] : undefined;
  if (channel === undefined || channel === '') {
    throw new Error(
      `${PREVIEW_FIREBASE_CONFIG} deploys only through "npm run deploy:preview -- <channel>" (from web/), ` +
        'so a preview build can never reach the live site.',
    );
  }
  return checkChannel(channel);
}
