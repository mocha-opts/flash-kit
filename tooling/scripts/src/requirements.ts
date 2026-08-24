import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

export const REQUIRED_NODE_VERSION = '24.19.0';
export const REQUIRED_PNPM_VERSION = '11.23.0';
const COMMAND_PROBE_TIMEOUT_MS = 3_000;

type CommandFailureReason = 'not-found' | 'timeout' | 'failed';

export type RequirementCheck = {
  readonly name: string;
  readonly ok: boolean;
  readonly detail: string;
};

export type CommandResult = {
  readonly ok: boolean;
  readonly output: string;
  readonly failureReason: CommandFailureReason | null;
};

function normalizeCommandOutput(output: string | null | undefined): string {
  return output ?? '';
}

function hasErrorCode(error: unknown): error is { readonly code: string } {
  return (
    typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string'
  );
}

function formatCommandFailureDetail(commandName: string, result: CommandResult): string {
  switch (result.failureReason) {
    case 'not-found':
      return `${commandName} command was not found`;
    case 'timeout':
      return result.output;
    case 'failed':
      return result.output
        ? `${commandName} command failed: ${result.output}`
        : `${commandName} command failed`;
    case null:
      return result.output;
  }
}

export function readCommand(
  rootDir: string,
  command: string,
  args: readonly string[],
): CommandResult {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: COMMAND_PROBE_TIMEOUT_MS,
  });
  const output =
    `${normalizeCommandOutput(result.stdout)}${normalizeCommandOutput(result.stderr)}`.trim();
  const errorCode = hasErrorCode(result.error) ? result.error.code : undefined;
  const timedOut = errorCode === 'ETIMEDOUT';
  const commandNotFound = errorCode === 'ENOENT';

  return {
    ok: result.status === 0,
    output: timedOut ? `command timed out after ${COMMAND_PROBE_TIMEOUT_MS}ms` : output,
    failureReason: timedOut
      ? 'timeout'
      : commandNotFound
        ? 'not-found'
        : result.status === 0
          ? null
          : 'failed',
  };
}

export function checkNodeVersion(): RequirementCheck {
  return {
    name: 'Node',
    ok: process.versions.node === REQUIRED_NODE_VERSION,
    detail: `found ${process.versions.node}, expected ${REQUIRED_NODE_VERSION}`,
  };
}

export function checkPnpmVersion(rootDir: string): RequirementCheck {
  const pnpmVersion = readCommand(rootDir, 'pnpm', ['--version']);

  return {
    name: 'pnpm',
    ok: pnpmVersion.ok && pnpmVersion.output === REQUIRED_PNPM_VERSION,
    detail: pnpmVersion.ok
      ? `found ${pnpmVersion.output}, expected ${REQUIRED_PNPM_VERSION}`
      : formatCommandFailureDetail('pnpm', pnpmVersion),
  };
}

export function checkDocker(rootDir: string): RequirementCheck {
  const dockerVersion = readCommand(rootDir, 'docker', ['--version']);

  return {
    name: 'Docker',
    ok: dockerVersion.ok,
    detail: dockerVersion.ok
      ? dockerVersion.output
      : formatCommandFailureDetail('docker', dockerVersion),
  };
}

export function checkWebEnvLocal(rootDir: string): RequirementCheck {
  const envPath = resolve(rootDir, 'apps/web/.env.local');
  const envExists = existsSync(envPath);

  return {
    name: 'apps/web/.env.local',
    ok: envExists,
    detail: envExists
      ? 'apps/web/.env.local exists'
      : 'create apps/web/.env.local from the documented local development settings before running the app',
  };
}

export function collectRequirementChecks(rootDir: string): RequirementCheck[] {
  return [
    checkNodeVersion(),
    checkPnpmVersion(rootDir),
    checkDocker(rootDir),
    checkWebEnvLocal(rootDir),
  ];
}
