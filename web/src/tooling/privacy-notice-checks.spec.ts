// SPEC-010 SYNC-101 checks 1 and 2 (H-180, AC 66). Check 1 runs in every build (scripts/build.mjs) and here;
// check 2 is `npm run check:privacy-release`, run only by the release step and the production deploy.
/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import packageJson from '../../package.json';
import {
  BLANK_MARKERS,
  NOTICE_PATH,
  RELEASE_MARKER,
  RELEASE_MESSAGE,
  blanksMessage,
  checkPrivacyRelease,
  findNoticeBlanks,
} from '../../scripts/privacy-notice-checks.mjs';

// ng test runs from web/, so the paths are relative to the package root.
const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');
const notice = () => read(NOTICE_PATH);
const DATE_MARKER = '[set on release: date dev → main ships sign-in]';

describe('SPEC-010 SYNC-101 check 1: no RJ or builder blank in the notice text (every build)', () => {
  it('SYNC-101 / AC 66 the scanned file is the notice text source the /privacy page renders from', () => {
    expect(NOTICE_PATH).toBe('src/app/core/privacy/privacy-notice.md');
    expect(read('src/app/core/privacy/privacy-notice-text.ts')).toContain("from './privacy-notice.md'");
  });

  it('SYNC-101 / AC 66 the shipped notice text holds neither "[RJ" nor "[builder"', () => {
    expect(BLANK_MARKERS).toEqual(['[RJ', '[builder']);
    expect(findNoticeBlanks(notice())).toEqual([]);
  });

  it('SYNC-101 / AC 66 a blank such as "[RJ/builder: image host name]", "[RJ: name]" or "[builder: x]" fails it', () => {
    expect(findNoticeBlanks('Who receives it [RJ/builder: image host name].')).toEqual(['[RJ']);
    expect(findNoticeBlanks('Contact: [RJ: email]')).toEqual(['[RJ']);
    expect(findNoticeBlanks('Host [builder: x] and [RJ: y]')).toEqual(['[RJ', '[builder']);
    expect(blanksMessage(['[RJ'])).toBe(`Privacy notice has unfilled blanks: "[RJ" in ${NOTICE_PATH}.`);
  });

  it('SYNC-101 / AC 66 it is case-sensitive and does not match markdown links, template bindings or the release-day date', () => {
    expect(findNoticeBlanks('[Privacy](/privacy) [routerLink]="x" [rj: lower] [Builder: upper]')).toEqual([]);
    expect(findNoticeBlanks(`Effective ${DATE_MARKER}`)).toEqual([]);
  });

  it('SYNC-101 check 1 runs in every build: scripts/build.mjs fails on a blank before ng build', () => {
    const build = read('scripts/build.mjs');
    expect(build).toContain('findNoticeBlanks(readFileSync(resolve(webDir, NOTICE_PATH)');
    expect(build.indexOf('findNoticeBlanks(readFileSync')).toBeLessThan(build.indexOf('ngBuildArgs(configuration'));
  });
});

describe('SPEC-010 SYNC-101 check 2: the release-day date is filled (release step and production deploy only)', () => {
  it('SYNC-101 / AC 66 fails and names the marker while "[set on release" remains (the shipped text today)', () => {
    expect(RELEASE_MARKER).toBe('[set on release');
    expect(notice()).toContain(DATE_MARKER);
    expect(checkPrivacyRelease(notice())).toEqual({ ok: false, message: RELEASE_MESSAGE });
    expect(RELEASE_MESSAGE).toContain('"[set on release"');
  });

  it("SYNC-101 / AC 66 passes once the release step replaced both markers with the day's date; one left still fails", () => {
    expect(checkPrivacyRelease(notice().replaceAll(DATE_MARKER, '2026-12-02'))).toEqual({ ok: true });
    expect(checkPrivacyRelease(notice().replace(DATE_MARKER, '2026-12-02'))).toEqual({
      ok: false,
      message: RELEASE_MESSAGE,
    });
  });

  it('SYNC-101 check 2 is an npm script run by the main deploy workflow and the firebase.json hosting predeploy, never by build, test, lint or the preview deploy', () => {
    const scripts = packageJson.scripts as Record<string, string>;
    expect(scripts['check:privacy-release']).toBe('node scripts/check-privacy-release.mjs');
    for (const name of ['test', 'lint', 'build', 'build:preview', 'deploy:preview']) {
      expect(scripts[name]).not.toContain('privacy');
    }
    expect(read('scripts/build.mjs')).not.toContain('checkPrivacyRelease');

    const workflow = read('../.github/workflows/firebase-hosting-deploy.yml');
    expect(workflow).toContain('run: npm --prefix web run check:privacy-release');
    expect(workflow.indexOf('check:privacy-release')).toBeLessThan(workflow.indexOf('action-hosting-deploy'));

    const prod = JSON.parse(read('../firebase.json')) as { hosting: { predeploy: string[] } };
    expect(prod.hosting.predeploy[0]).toBe('npm --prefix web run check:privacy-release');
    const preview = JSON.parse(read('../firebase.preview.json')) as { hosting: { predeploy: string[] } };
    expect(preview.hosting.predeploy.join(' ')).not.toContain('privacy');
  });
});
