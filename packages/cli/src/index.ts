#!/usr/bin/env node
// ── LumenMint CLI ────────────────────────────────────────────────────────────
// Usage: lumenmint <command> [options]

import { Command } from 'commander';

const program = new Command();

program
  .name('lumenmint')
  .description('CLI for Stellar LumenMint — contracts, NFTs, admin')
  .version('0.1.0');

// ── NFT Commands ──────────────────────────────────────────────────────────

program
  .command('nft:info <nftId>')
  .description('Get NFT details')
  .option('--api <url>', 'API base URL', 'http://localhost:3000')
  .action(async (nftId, options) => {
    console.log(`Fetching NFT: ${nftId} from ${options.api}`);
    try {
      const response = await fetch(`${options.api}/api/nfts/${nftId}`);
      const data = await response.json();
      console.log(JSON.stringify(data, null, 2));
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exit(1);
    }
  });

program
  .command('nft:list')
  .description('List NFTs')
  .option('--api <url>', 'API base URL', 'http://localhost:3000')
  .option('--collection <id>', 'Filter by collection ID')
  .option('--page <n>', 'Page number', '1')
  .option('--pageSize <n>', 'Page size', '20')
  .action(async (options) => {
    const params = new URLSearchParams({
      page: options.page,
      pageSize: options.pageSize,
    });
    if (options.collection) params.set('collectionId', options.collection);

    try {
      const response = await fetch(
        `${options.api}/api/nfts?${params.toString()}`,
      );
      const data = await response.json();
      console.log(JSON.stringify(data, null, 2));
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exit(1);
    }
  });

// ── Collection Commands ───────────────────────────────────────────────────

program
  .command('collection:info <collectionId>')
  .description('Get collection details')
  .option('--api <url>', 'API base URL', 'http://localhost:3000')
  .action(async (collectionId, options) => {
    try {
      const response = await fetch(
        `${options.api}/api/collections/${collectionId}`,
      );
      const data = await response.json();
      console.log(JSON.stringify(data, null, 2));
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exit(1);
    }
  });

// ── Contract Commands ─────────────────────────────────────────────────────

program
  .command('contract:deploy')
  .description('Deploy a Soroban contract (requires soroban-cli)')
  .option('--wasm <path>', 'Path to WASM file', './target/wasm32-unknown-unknown/release/nft_contract.wasm')
  .option('--network <n>', 'Stellar network', 'testnet')
  .option('--source <key>', 'Source account secret key')
  .action(async (options) => {
    console.log(`Deploying contract from ${options.wasm} to ${options.network}...`);
    console.log(`Run: soroban contract deploy --wasm ${options.wasm} --source ${options.source ?? '<SECRET>'} --network ${options.network}`);
  });

program
  .command('contract:invoke <contractId> <method>')
  .description('Invoke a Soroban contract method (read-only)')
  .option('--rpc <url>', 'Soroban RPC URL', 'https://soroban-testnet.stellar.org/')
  .option('--args <json>', 'JSON array of arguments', '[]')
  .action(async (contractId, method, options) => {
    try {
      const args = JSON.parse(options.args) as unknown[];
      const response = await fetch(options.rpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'simulateTransaction',
          params: { contractId, method, args },
        }),
      });
      const data = await response.json();
      console.log(JSON.stringify(data, null, 2));
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exit(1);
    }
  });

// ── Admin Commands ────────────────────────────────────────────────────────

program
  .command('admin:stats')
  .description('Get platform statistics')
  .option('--api <url>', 'API base URL', 'http://localhost:3000')
  .action(async (options) => {
    try {
      const response = await fetch(`${options.api}/api/admin/stats`);
      const data = await response.json();
      console.log(JSON.stringify(data, null, 2));
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exit(1);
    }
  });

// ── Health Commands ───────────────────────────────────────────────────────

program
  .command('health')
  .description('Check API and Soroban RPC health')
  .option('--api <url>', 'API base URL', 'http://localhost:3000')
  .option('--rpc <url>', 'Soroban RPC URL', 'https://soroban-testnet.stellar.org/')
  .action(async (options) => {
    console.log('Checking health...\n');

    // API health
    try {
      const apiRes = await fetch(`${options.api}/health`);
      const apiData = await apiRes.json();
      console.log('API Health:', JSON.stringify(apiData, null, 2));
    } catch (err) {
      console.error(`API health check failed: ${(err as Error).message}`);
    }

    // Soroban RPC health
    try {
      const rpcRes = await fetch(options.rpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getHealth' }),
      });
      const rpcData = await rpcRes.json();
      console.log('Soroban RPC Health:', JSON.stringify(rpcData, null, 2));
    } catch (err) {
      console.error(`Soroban RPC health check failed: ${(err as Error).message}`);
    }
  });

// ── Wallet Commands ───────────────────────────────────────────────────────

program
  .command('wallet:validate <address>')
  .description('Validate a Stellar public key or secret key')
  .action((address) => {
    const pubRegex = /^G[A-Z2-7]{55}$/;
    const secRegex = /^S[A-Z2-7]{55}$/;

    if (pubRegex.test(address)) {
      console.log(`✅ Valid public key: ${address}`);
    } else if (secRegex.test(address)) {
      console.log(`✅ Valid secret key: ${address}`);
    } else {
      console.log(`❌ Invalid Stellar address: ${address}`);
    }
  });

// ── Parse ─────────────────────────────────────────────────────────────────

program.parse(process.argv);
