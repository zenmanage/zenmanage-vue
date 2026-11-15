#!/usr/bin/env node
// Packs this package, installs the tarball in a copy of examples/smoke-app, and runs the app's
// tests there. A copy, so the smoke app resolves vue and @zenmanage/sdk from its own
// node_modules, exactly as a user's project would, not from this repository's.
//
//   npm run build && node scripts/smoke.mjs
//   SMOKE_VUE_VERSION=3.4 node scripts/smoke.mjs    # another Vue version

import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const vueVersion = process.env.SMOKE_VUE_VERSION;
const work = mkdtempSync(join(tmpdir(), 'zenmanage-vue-smoke-'));
const appDir = join(work, 'app');

function run(command, args, options = {}) {
  console.log(`$ ${command} ${args.join(' ')}`);
  execFileSync(command, args, { stdio: 'inherit', ...options });
}

try {
  run('npm', ['pack', '--pack-destination', work, '--silent'], { cwd: root });
  const tarball = join(
    work,
    readdirSync(work).find((name) => name.endsWith('.tgz'))
  );

  cpSync(join(root, 'examples', 'smoke-app'), appDir, {
    recursive: true,
    filter: (source) => !source.includes('node_modules'),
  });

  const packages = [tarball];
  if (vueVersion) {
    packages.push(`vue@${vueVersion}`);
  }

  run('npm', ['install', '--no-audit', '--no-fund'], { cwd: appDir });
  run('npm', ['install', '--no-audit', '--no-fund', ...packages], { cwd: appDir });
  run('npx', ['vitest', 'run'], { cwd: appDir });
} finally {
  rmSync(work, { recursive: true, force: true });
}
