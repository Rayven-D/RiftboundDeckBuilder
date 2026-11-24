// SPEC-010 SYNC-007 (H-078): the preview-channel deploy path and the unchanged production path.
import firebaseJson from '../../../firebase.json';
import firebasePreviewJson from '../../../firebase.preview.json';
import angularJson from '../../angular.json';
import packageJson from '../../package.json';
import {
  PREVIEW_CHANNEL_ENV,
  PREVIEW_FIREBASE_CONFIG,
  USAGE,
  checkChannel,
  checkExpires,
  firebaseChannelDeployArgs,
  parsePreviewDeployArgs,
  previewDeployChannelFromEnv,
} from '../../scripts/preview-channel.mjs';

describe('SYNC-007 preview deploy command', () => {
  it('AC 35: "sync-test" deploys that preview channel with the preview config and the Firebase default expiry', () => {
    const parsed = parsePreviewDeployArgs(['sync-test']);
    expect(parsed).toEqual({ channel: 'sync-test', expires: null });
    expect(firebaseChannelDeployArgs(parsed)).toEqual([
      'hosting:channel:deploy',
      'sync-test',
      '--config',
      'firebase.preview.json',
    ]);
  });

  it('SYNC-007 (3) passes an expiry RJ gives', () => {
    expect(firebaseChannelDeployArgs(parsePreviewDeployArgs(['sync-test', '3d']))).toEqual([
      'hosting:channel:deploy',
      'sync-test',
      '--config',
      'firebase.preview.json',
      '--expires',
      '3d',
    ]);
    for (const ok of ['1h', '12h', '30d', '4w', '720h']) expect(checkExpires(ok)).toBe(ok);
  });

  it('SYNC-007 (3) refuses an expiry that is malformed or longer than 30 days', () => {
    for (const bad of ['', '0d', '7', 'd', '31d', '5w', '721h', '1y', '7d;rm', '-1d']) {
      expect(() => checkExpires(bad)).toThrow();
    }
  });

  it('SYNC-007 (3) never deploys to live', () => {
    for (const live of ['live', 'LIVE', 'Live', ' live ']) {
      expect(() => parsePreviewDeployArgs([live])).toThrow(/live/);
      expect(() => firebaseChannelDeployArgs({ channel: live })).toThrow(/live/);
    }
  });

  it('SYNC-007 (3) requires a channel name', () => {
    expect(() => parsePreviewDeployArgs([])).toThrow(/channel name is required/);
    expect(() => parsePreviewDeployArgs([''])).toThrow(/channel name is required/);
    expect(() => checkChannel(undefined)).toThrow(/channel name is required/);
  });

  it('SYNC-007 refuses channel names that are not lowercase letters, digits and inner hyphens', () => {
    for (const bad of ['Sync-Test', '-sync', 'sync-', 'sync test', 'sync_test', 'a/b', 'x'.repeat(37), 'a&&b']) {
      expect(() => checkChannel(bad)).toThrow();
    }
    for (const ok of ['a', 'sync-test', 'h078', 'x'.repeat(36)]) expect(checkChannel(ok)).toBe(ok);
  });

  it('SYNC-007 refuses options and extra arguments (no --config, --only or other overrides)', () => {
    expect(() => parsePreviewDeployArgs(['sync-test', '--only', 'hosting'])).toThrow(/Unknown option/);
    expect(() => parsePreviewDeployArgs(['--config', 'firebase.json'])).toThrow(/Unknown option/);
    expect(() => parsePreviewDeployArgs(['sync-test', '3d', 'extra'])).toThrow();
  });

  it('SYNC-007 (5) the usage text names the command, the channel argument and that preview URLs are public', () => {
    expect(USAGE).toContain('npm run deploy:preview -- <channel>');
    expect(USAGE).toContain('public to anyone who has the link');
  });
});

describe('SYNC-007 preview predeploy guard', () => {
  it('SYNC-007 (3) the preview build refuses to run outside deploy:preview, so it cannot reach live', () => {
    expect(() => previewDeployChannelFromEnv({})).toThrow(/deploy:preview/);
    expect(() => previewDeployChannelFromEnv(undefined)).toThrow(/deploy:preview/);
    expect(() => previewDeployChannelFromEnv({ [PREVIEW_CHANNEL_ENV]: '' })).toThrow(/deploy:preview/);
    expect(() => previewDeployChannelFromEnv({ [PREVIEW_CHANNEL_ENV]: 'live' })).toThrow(/live/);
    expect(previewDeployChannelFromEnv({ [PREVIEW_CHANNEL_ENV]: 'sync-test' })).toBe('sync-test');
  });
});

describe('SYNC-007 build and hosting configuration', () => {
  type Hosting = Record<string, unknown> & { public: string; predeploy: string[] };
  const prodHosting = firebaseJson.hosting as Hosting;
  const previewHosting = firebasePreviewJson.hosting as Hosting;
  const ngBuild = angularJson.projects.web.architect.build;

  it('SYNC-007 (4) AC 35: firebase deploy --only hosting and the main workflow still build production', () => {
    expect(prodHosting.predeploy).toEqual(['npm --prefix web run build']);
    expect(packageJson.scripts.build).toBe('node scripts/build.mjs prod');
    expect(prodHosting.public).toBe('web/dist/web/browser'); // the default outputPath dist/<project>
    expect('outputPath' in ngBuild.options).toBe(false);
    expect(ngBuild.defaultConfiguration).toBe('production');
  });

  it('SYNC-007 (1)(2) the preview config builds the preview configuration and uploads that output only', () => {
    expect(PREVIEW_FIREBASE_CONFIG).toBe('firebase.preview.json');
    expect(previewHosting.predeploy).toEqual(['node web/scripts/build.mjs preview --channel-deploy']);
    expect(ngBuild.configurations.preview.outputPath).toBe('dist/web-preview');
    expect(previewHosting.public).toBe('web/dist/web-preview/browser');
    expect(previewHosting.public).not.toBe(prodHosting.public);
    expect(Object.keys(firebasePreviewJson)).toEqual(['hosting']);
  });

  it('SYNC-007 the preview hosting rules match production apart from public and predeploy', () => {
    const strip = (h: Hosting) => {
      const rest: Record<string, unknown> = { ...h };
      delete rest['public'];
      delete rest['predeploy'];
      return rest;
    };
    expect(strip(previewHosting)).toEqual(strip(prodHosting));
  });

  it('SYNC-007 the preview configuration swaps in environment.preview.ts; production keeps environment.ts', () => {
    expect(ngBuild.configurations.preview.fileReplacements).toEqual([
      { replace: 'src/environments/environment.ts', with: 'src/environments/environment.preview.ts' },
    ]);
    expect('fileReplacements' in ngBuild.configurations.production).toBe(false);
    expect(packageJson.scripts['build:preview']).toBe('node scripts/build.mjs preview');
    expect(packageJson.scripts['deploy:preview']).toBe('node scripts/deploy-preview.mjs');
  });
});
