#!/usr/bin/env node
// ── Error-code registry ───────────────────────────────────────────────────────
//
// Every error code the project can return lives in one of a few source files.
// This script reads them all and renders `docs/ERROR_CODES.md`, so the registry
// cannot drift from the code it documents.
//
//   node scripts/error-code-registry.mjs           # write docs/ERROR_CODES.md
//   node scripts/error-code-registry.mjs --check    # fail if it is out of date
//
// The `--check` mode is what CI runs. Without it the document is just prose that
// becomes wrong the first time someone adds a code and forgets to update it —
// which is exactly the failure this is meant to prevent.

import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  globSync,
} from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT = join(ROOT, 'docs', 'ERROR_CODES.md');

/**
 * Soroban caps a contract error enum at 50 variants. Exceeding it is a compile
 * error, so it is asserted here too — the number is a real constraint, not a
 * style preference.
 */
const SOROBAN_VARIANT_LIMIT = 50;

function read(relPath) {
  return readFileSync(join(ROOT, relPath), 'utf8');
}

// ── Rust contracts ────────────────────────────────────────────────────────────

/**
 * Parse a `#[contracterror]` enum, keeping each variant's doc comment so the
 * registry carries the condition the code describes rather than just its name.
 */
function parseRustErrors(relPath) {
  const lines = read(relPath).split('\n');
  const codes = [];
  let enumName = null;
  let doc = [];

  for (const line of lines) {
    const enumMatch = line.match(/^pub enum (\w+)\s*\{/);
    if (enumMatch) {
      enumName = enumMatch[1];
      doc = [];
      continue;
    }

    const docMatch = line.match(/^\s*\/\/\/\s?(.*)$/);
    if (docMatch) {
      doc.push(docMatch[1].trim());
      continue;
    }

    const variantMatch = line.match(/^\s{4}([A-Z][A-Za-z0-9]*)\s*=\s*(\d+),/);
    if (variantMatch && enumName) {
      codes.push({
        code: variantMatch[1],
        value: Number(variantMatch[2]),
        doc: doc.join(' ').trim(),
        enum: enumName,
        file: relPath,
      });
      doc = [];
      continue;
    }

    if (line.trim() !== '' && !line.trim().startsWith('//')) {
      doc = [];
    }
  }

  return codes;
}

// ── Backend ───────────────────────────────────────────────────────────────────

/**
 * Parse the `AppErrorCode` string enum, tracking `// ── Section ──` headings so
 * the registry keeps the domain grouping the enum already uses.
 */
function parseBackendErrors(relPath) {
  const lines = read(relPath).split('\n');
  const codes = [];
  let section = 'General';

  for (const line of lines) {
    const sectionMatch = line.match(/^\s*\/\/\s*──\s*(.+?)\s*─+\s*$/);
    if (sectionMatch) {
      section = sectionMatch[1].trim();
      continue;
    }

    const memberMatch = line.match(/^\s{2}([A-Z][A-Z0-9_]*)\s*=\s*'([A-Z0-9_]+)',/);
    if (memberMatch) {
      const [, name, value] = memberMatch;
      if (name !== value) {
        throw new Error(
          `${relPath}: ${name} should equal its own value but is '${value}'`,
        );
      }
      codes.push({ code: name, section, file: relPath });
    }
  }

  return codes;
}

// ── Frontend ──────────────────────────────────────────────────────────────────

/**
 * Parse a `export type XErrorCode = | 'a' | 'b';` union. The mapping function
 * that selects between them is checked separately, by the coverage assertion in
 * the frontend test suite.
 */
function parseFrontendErrors(relPath) {
  const source = read(relPath);
  const typeMatch = source.match(
    /export type (\w+ErrorCode)\s*=\s*((?:\s*\|\s*'[a-z0-9_]+')+);/,
  );
  if (!typeMatch) {
    throw new Error(`${relPath}: no error-code union found`);
  }

  const [, typeName, body] = typeMatch;
  const codes = [...body.matchAll(/'([a-z0-9_]+)'/g)].map((match) => ({
    code: match[1],
    section: typeName,
    file: relPath,
  }));

  return codes;
}

// ── Collect ───────────────────────────────────────────────────────────────────

function collect() {
  const contracts = globSync('soroban/contracts/*/src/error.rs')
    .sort()
    .flatMap((file) => parseRustErrors(relative(ROOT, file)));

  const backend = parseBackendErrors(
    'backend/src/common/enums/app-error-code.enum.ts',
  );

  const frontend = [
    ...parseFrontendErrors('frontend/lib/telemetry/auth-error-codes.ts'),
    ...parseFrontendErrors('frontend/lib/telemetry/creator-error-codes.ts'),
  ];

  return { contracts, backend, frontend };
}

function assertWithinSorobanLimit(contracts) {
  const byEnum = new Map();
  for (const entry of contracts) {
    const key = `${entry.file}::${entry.enum}`;
    byEnum.set(key, (byEnum.get(key) ?? 0) + 1);
  }

  for (const [key, count] of byEnum) {
    if (count > SOROBAN_VARIANT_LIMIT) {
      throw new Error(
        `${key} has ${count} variants; Soroban allows at most ${SOROBAN_VARIANT_LIMIT}`,
      );
    }
  }

  return byEnum;
}

// ── Render ────────────────────────────────────────────────────────────────────

function render({ contracts, backend, frontend }) {
  const byEnum = assertWithinSorobanLimit(contracts);
  const total = contracts.length + backend.length + frontend.length;

  const out = [];
  out.push('# Error Codes');
  out.push('');
  out.push(
    '> **Generated file — do not edit by hand.** Run `npm run errors:build` after',
  );
  out.push(
    '> changing any error enum. CI runs `npm run errors:check` and fails if this',
  );
  out.push('> document is out of date.');
  out.push('');
  out.push(
    `${total} codes are declared across the contracts, the backend API and the`,
  );
  out.push('frontend telemetry layer.');
  out.push('');
  out.push('| Layer | Codes | Where |');
  out.push('| --- | ---: | --- |');
  out.push(
    `| Soroban contracts | ${contracts.length} | \`soroban/contracts/*/src/error.rs\` |`,
  );
  out.push(
    `| Backend API | ${backend.length} | \`backend/src/common/enums/app-error-code.enum.ts\` |`,
  );
  out.push(
    `| Frontend telemetry | ${frontend.length} | \`frontend/lib/telemetry/*-error-codes.ts\` |`,
  );
  out.push('');
  out.push(
    'Codes are part of each layer\'s public interface. Never renumber a contract',
  );
  out.push(
    'code or reuse a retired number for a different meaning; clients switch on',
  );
  out.push('these values.');
  out.push('');
  out.push('---');
  out.push('');
  out.push('## Soroban contracts');
  out.push('');
  out.push(
    'Contract codes are numeric and travel in the on-chain error, so they are',
  );
  out.push(
    `capped by Soroban at ${SOROBAN_VARIANT_LIMIT} variants per enum. Gaps in the`,
  );
  out.push(
    'numbering are retired codes; each one is explained in a comment in the source',
  );
  out.push('and its number is never reused.');
  out.push('');

  const contractFiles = [...new Set(contracts.map((entry) => entry.file))].sort();
  for (const file of contractFiles) {
    const entries = contracts.filter((entry) => entry.file === file);
    const enumName = entries[0].enum;
    out.push(`### \`${enumName}\` — \`${file}\``);
    out.push('');
    out.push(`_${entries.length} of ${SOROBAN_VARIANT_LIMIT} codes used._`);
    out.push('');
    out.push('| Code | Value | Meaning |');
    out.push('| --- | ---: | --- |');
    for (const entry of entries.sort((a, b) => a.value - b.value)) {
      const meaning = entry.doc ? entry.doc.replace(/\|/g, '\\|') : '—';
      out.push(`| \`${entry.code}\` | ${entry.value} | ${meaning} |`);
    }
    out.push('');
  }

  out.push('---');
  out.push('');
  out.push('## Backend API');
  out.push('');
  out.push(
    'Returned in the `code` field of every error response by',
  );
  out.push(
    '`HttpExceptionFilter`. A code attached by the throw site wins; otherwise the',
  );
  out.push(
    'HTTP status selects the default, so the field is never absent.',
  );
  out.push('');

  const sections = [...new Set(backend.map((entry) => entry.section))];
  for (const section of sections) {
    const entries = backend.filter((entry) => entry.section === section);
    out.push(`### ${section}`);
    out.push('');
    out.push('| Code |');
    out.push('| --- |');
    for (const entry of entries) {
      out.push(`| \`${entry.code}\` |`);
    }
    out.push('');
  }

  out.push('---');
  out.push('');
  out.push('## Frontend telemetry');
  out.push('');
  out.push(
    'Emitted with client-side telemetry events. These are deliberately not the',
  );
  out.push(
    'backend codes: they describe where a user flow failed on the client, which',
  );
  out.push('the backend never observes.');
  out.push('');

  const frontendSections = [...new Set(frontend.map((entry) => entry.section))];
  for (const section of frontendSections) {
    const entries = frontend.filter((entry) => entry.section === section);
    out.push(`### \`${section}\``);
    out.push('');
    out.push('| Code |');
    out.push('| --- |');
    for (const entry of entries) {
      out.push(`| \`${entry.code}\` |`);
    }
    out.push('');
  }

  out.push('---');
  out.push('');
  out.push('## See also');
  out.push('');
  out.push(
    '- [`soroban/GAS.md`](../soroban/GAS.md) — the fee cost of the paths these codes guard.',
  );
  out.push(
    '- [`soroban/CONTRACT_INVARIANTS.md`](../soroban/CONTRACT_INVARIANTS.md) — the invariants whose violation the contract codes report.',
  );
  out.push(
    '- [`packages/sdk/ERRORS.md`](../packages/sdk/ERRORS.md) — the SDK\'s typed error classes.',
  );
  out.push('');

  return out.join('\n');
}

// ── Main ──────────────────────────────────────────────────────────────────────

const rendered = render(collect());
const check = process.argv.includes('--check');

if (check) {
  if (!existsSync(OUTPUT)) {
    console.error(
      'docs/ERROR_CODES.md is missing. Run `npm run errors:build` and commit it.',
    );
    process.exit(1);
  }

  const current = readFileSync(OUTPUT, 'utf8');
  if (current !== rendered) {
    console.error(
      'docs/ERROR_CODES.md is out of date with the error enums.\n' +
        'Run `npm run errors:build` and commit the result.',
    );

    // Show the first divergence so the fix is obvious.
    const currentLines = current.split('\n');
    const renderedLines = rendered.split('\n');
    for (let i = 0; i < Math.max(currentLines.length, renderedLines.length); i++) {
      if (currentLines[i] !== renderedLines[i]) {
        console.error(`\n  first difference at line ${i + 1}:`);
        console.error(`    committed: ${currentLines[i] ?? '<end of file>'}`);
        console.error(`    generated: ${renderedLines[i] ?? '<end of file>'}`);
        break;
      }
    }
    process.exit(1);
  }

  console.log('Error-code registry is up to date.');
} else {
  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, rendered);
  const { contracts, backend, frontend } = collect();
  console.log(
    `Wrote ${relative(ROOT, OUTPUT)}: ${contracts.length} contract, ` +
      `${backend.length} backend, ${frontend.length} frontend codes.`,
  );
}
