#!/usr/bin/env node
/**
 * Dependency audit gate for one workspace.
 *
 * `npm audit --audit-level=high` fails a build for every high advisory,
 * including the ones npm itself reports as having no fix short of a breaking
 * upgrade. That makes the gate permanently red and therefore ignored — the
 * opposite of useful.
 *
 * This gate fails when a high or critical advisory has a fix that does *not*
 * require a semver-major upgrade (`fixAvailable === true`), because that fix is
 * available now and should be taken. Advisories whose only remedy is a major
 * framework or toolchain upgrade are reported, with the version that resolves
 * them, but do not fail the build: those are planned migrations, not oversights.
 *
 * Usage: node scripts/dependency-audit.mjs <workspace-dir>
 */

import { execFileSync } from 'node:child_process';

const workspace = process.argv[2];

if (!workspace) {
  console.error('usage: node scripts/dependency-audit.mjs <workspace-dir>');
  process.exit(2);
}

// `npm audit` exits non-zero whenever it finds anything, so the JSON is read
// from the thrown error's stdout rather than treating that as a crash.
let raw;
try {
  raw = execFileSync('npm', ['audit', '--json'], {
    cwd: workspace,
    encoding: 'utf8',
    maxBuffer: 128 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'ignore'],
  });
} catch (error) {
  raw = error?.stdout;
  if (!raw) {
    console.error(
      `dependency-audit: could not read the audit report for ${workspace}`,
    );
    process.exit(2);
  }
}

let report;
try {
  report = JSON.parse(raw);
} catch {
  console.error(`dependency-audit: unparseable audit report for ${workspace}`);
  process.exit(2);
}

const vulnerabilities = Object.entries(report.vulnerabilities ?? {});
const blocking = [];
const tracked = [];

for (const [name, entry] of vulnerabilities) {
  if (entry.severity !== 'high' && entry.severity !== 'critical') continue;

  if (entry.fixAvailable === true) {
    blocking.push({ name, severity: entry.severity, range: entry.range });
  } else {
    const fix = entry.fixAvailable;
    const fixDescription =
      fix && typeof fix === 'object'
        ? `${fix.name}@${fix.version} (breaking)`
        : 'no fix published';
    tracked.push({ name, severity: entry.severity, fix: fixDescription });
  }
}

const label = `[${workspace}]`;

if (tracked.length > 0) {
  console.log(
    `${label} ${tracked.length} high/critical advisory(ies) with no non-breaking fix (reported, not blocking):`,
  );
  for (const item of tracked) {
    console.log(`  - ${item.severity.toUpperCase()} ${item.name} -> ${item.fix}`);
  }
}

if (blocking.length > 0) {
  console.error(
    `\n${label} ${blocking.length} high/critical advisory(ies) can be fixed now:`,
  );
  for (const item of blocking) {
    console.error(`  - ${item.severity.toUpperCase()} ${item.name} (${item.range})`);
  }
  console.error(
    `\nRun \`npm audit fix\` in ${workspace} (or pin the package in "overrides") and re-run this gate.`,
  );
  process.exit(1);
}

console.log(`${label} no high/critical advisory has an available non-breaking fix.`);
