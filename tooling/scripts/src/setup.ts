#!/usr/bin/env node
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { collectRequirementChecks } from './requirements.ts';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const checks = collectRequirementChecks(rootDir);

for (const check of checks) {
  const status = check.ok ? 'ok' : 'missing';
  console.log(`${status.padEnd(7)} ${check.name} - ${check.detail}`);
}

if (checks.some((check) => !check.ok)) {
  process.exitCode = 1;
}
