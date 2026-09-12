#!/usr/bin/env node
/**
 * Prune superseded Vercel deployments.
 *
 * A long-lived Vercel project accumulates a deployment for every push. The
 * ones that matter are the newest production build (what the project's
 * `*.vercel.app` aliases point at) and the per-branch previews that still have
 * an alias attached. Everything else is history that only slows the dashboard
 * down, so this script deletes it.
 *
 * Deletions are irreversible, so two safety rails are built in:
 *
 *   1. The newest `--keep` deployments are never touched, so there is always
 *      something to roll back to.
 *   2. Any deployment that currently backs an alias is never touched, which
 *      protects contributor preview URLs and git-branch domains.
 *
 * Only superseded *production* deployments and *failed* (`ERROR`) deployments
 * are ever candidates, so successful preview builds are left alone as well.
 *
 * Usage:
 *   VERCEL_TOKEN=... node scripts/prune-vercel-deployments.mjs            # dry run
 *   VERCEL_TOKEN=... node scripts/prune-vercel-deployments.mjs --apply    # delete
 *   VERCEL_TOKEN=... node scripts/prune-vercel-deployments.mjs --apply --keep 10
 *
 * Options:
 *   --apply        actually delete (default is a dry run)
 *   --keep <n>     how many of the newest deployments to preserve (default 3)
 *   --project <id> Vercel project id (defaults to $VERCEL_PROJECT_ID)
 *   --team <id>    Vercel team/scope id (defaults to $VERCEL_ORG_ID)
 *   --prune-previews  also delete *preview* deployments, not just production
 */

const API = 'https://api.vercel.com';

function parseArgs(argv) {
  const opts = { apply: false, keep: 3, project: null, team: null, prunePreviews: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--apply') opts.apply = true;
    else if (arg === '--prune-previews') opts.prunePreviews = true;
    else if (arg === '--keep') opts.keep = Number(argv[++i]);
    else if (arg === '--project') opts.project = argv[++i];
    else if (arg === '--team') opts.team = argv[++i];
    else if (arg === '--help' || arg === '-h') {
      console.log(require('fs').readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0]);
      process.exit(0);
    } else {
      console.error(`Unknown argument: ${arg}`);
      process.exit(2);
    }
  }
  if (!Number.isInteger(opts.keep) || opts.keep < 1) {
    console.error('--keep must be a positive integer');
    process.exit(2);
  }
  return opts;
}

async function api(token, path) {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`GET ${path} failed: ${res.status} ${JSON.stringify(body)}`);
  }
  return body;
}

/** Follow pagination on a Vercel list endpoint until it is exhausted. */
async function paginate(token, makePath) {
  const items = [];
  let until = null;
  for (let page = 0; page < 50; page += 1) {
    const body = await api(token, makePath(until));
    items.push(...(body.deployments ?? body.aliases ?? []));
    until = body.pagination?.next ?? null;
    if (!until) break;
  }
  return items;
}

function chunk(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const token = process.env.VERCEL_TOKEN;
  const project = opts.project ?? process.env.VERCEL_PROJECT_ID;
  const team = opts.team ?? process.env.VERCEL_ORG_ID;

  if (!token) throw new Error('VERCEL_TOKEN is required');
  if (!project) throw new Error('VERCEL_PROJECT_ID (or --project) is required');

  const scope = team ? `teamId=${team}` : '';
  const join = (path) => (scope ? `${path}${path.includes('?') ? '&' : '?'}${scope}` : path);

  const deployments = await paginate(token, (until) =>
    join(`/v6/deployments?projectId=${project}&limit=100${until ? `&until=${until}` : ''}`),
  );

  const aliases = await paginate(token, (until) =>
    join(`/v4/aliases?limit=100${until ? `&until=${until}` : ''}`),
  );
  const aliased = new Set(aliases.map((a) => a.deploymentId).filter(Boolean));

  const newest = deployments
    .slice()
    .sort((a, b) => b.created - a.created)
    .slice(0, opts.keep)
    .map((d) => d.uid);
  const protectedIds = new Set(newest);

  const candidates = deployments.filter((d) => {
    if (protectedIds.has(d.uid) || aliased.has(d.uid)) return false;
    if (d.state === 'ERROR') return true;
    if (d.target === 'production') return true;
    return opts.prunePreviews && !d.target;
  });

  const mb = (n) => `${(n / 1_000_000).toFixed(1)} MB`;

  console.log(`Project:            ${project}`);
  console.log(`Deployments found:  ${deployments.length}`);
  console.log(`Preserved (newest): ${newest.length}`);
  console.log(`Preserved (alias):  ${aliased.size}`);
  console.log(`Candidates:         ${candidates.length}`);
  console.log('');

  let pruned = 0;
  let reclaimed = 0;

  // Delete sequentially in small batches; Vercel rate-limits bursts.
  for (const batch of chunk(candidates, 8)) {
    await Promise.all(
      batch.map(async (d) => {
        const when = new Date(d.created).toISOString().replace('T', ' ').slice(0, 16);
        if (!opts.apply) {
          console.log(`would delete  ${d.uid}  ${when}  ${d.target ?? 'preview'}  ${d.state}`);
          return;
        }
        const res = await fetch(`${API}/v13/deployments/${d.uid}?${scope}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          pruned += 1;
          reclaimed += d.sizeBytes ?? 0;
          console.log(`deleted       ${d.uid}  ${when}  ${d.target ?? 'preview'}  ${d.state}`);
        } else {
          const body = await res.json().catch(() => ({}));
          console.error(`FAILED        ${d.uid}  ${res.status} ${JSON.stringify(body)}`);
        }
      }),
    );
  }

  console.log('');
  if (opts.apply) {
    console.log(`Pruned ${pruned}/${candidates.length} deployments (${mb(reclaimed)}).`);
  } else {
    console.log(`Dry run: ${candidates.length} deployments would be pruned. Re-run with --apply.`);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
