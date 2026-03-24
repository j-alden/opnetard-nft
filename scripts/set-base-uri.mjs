#!/usr/bin/env node
/**
 * set-base-uri.mjs
 *
 * Calls setBaseURI on the deployed OpnetardNFT contract.
 *
 * Usage:
 *   BASE_URI="https://..." node scripts/set-base-uri.mjs
 *
 * Or set BASE_URI in .env.
 * Requires DEPLOYER_MNEMONIC in .env.
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env
for (const envFile of [
    join(__dirname, '..', '.env'),
    join(__dirname, '..', '..', 'opnet', '.env'),
]) {
    try {
        for (const line of readFileSync(envFile, 'utf8').split('\n')) {
            const match = line.match(/^([^#=]+)=(.*)$/);
            if (match && !process.env[match[1].trim()]) {
                process.env[match[1].trim()] = match[2].trim().replace(/^"|"$/g, '');
            }
        }
    } catch { /* file doesn't exist */ }
}

const MNEMONIC = process.env.DEPLOYER_MNEMONIC;
if (!MNEMONIC) { console.error('Missing DEPLOYER_MNEMONIC in .env'); process.exit(1); }

const BASE_URI = process.env.BASE_URI
    || 'https://oclumhz0aoevupwq.public.blob.vercel-storage.com/nft/metadata/';

const NFT_CONTRACT = 'op1sqppm2hmzkynx0jl3yjjhhldd6e80rxm49g7aauhf';
const NETWORK_NAME = 'mainnet';
const RPC_URL = 'https://api.opnet.org';

console.log(`Contract:  ${NFT_CONTRACT}`);
console.log(`New URI:   ${BASE_URI}`);
console.log(`Network:   ${NETWORK_NAME}`);

// Dynamic import (ESM)
const { networks } = await import('@btc-vision/bitcoin');
const { Mnemonic, AddressTypes } = await import('@btc-vision/transaction');
const { JSONRpcProvider, getContract, ABIDataTypes, BitcoinAbiTypes } = await import('opnet');

const NETWORK = networks.bitcoin;

const mnemonicObj = new Mnemonic(MNEMONIC, undefined, NETWORK);
const wallet = mnemonicObj.deriveOPWallet(AddressTypes.P2TR, 0);
console.log(`Deployer:  ${wallet.p2tr}`);

const provider = new JSONRpcProvider({ url: RPC_URL, network: NETWORK });

const setBaseURIAbi = [{
    name: 'setBaseURI',
    inputs: [{ name: 'uri', type: ABIDataTypes.STRING }],
    outputs: [{ name: 'success', type: ABIDataTypes.BOOL }],
    type: BitcoinAbiTypes.Function,
}];

const contract = getContract(
    NFT_CONTRACT,
    setBaseURIAbi,
    provider,
    NETWORK,
    wallet.address,
);

console.log('\nSimulating setBaseURI...');
const sim = await contract.setBaseURI(BASE_URI);
if (sim.revert) {
    console.error(`Simulation reverted: ${sim.revert}`);
    process.exit(1);
}
console.log('Simulation OK.');

const gasParams = await provider.gasParameters();
const utxos = await provider.utxoManager.getUTXOs({ address: wallet.p2tr, optimize: true });
if (utxos.length === 0) throw new Error('No UTXOs — fund the deployer wallet first');

console.log('Sending transaction...');
const receipt = await sim.sendTransaction({
    signer: wallet.keypair,
    mldsaSigner: wallet.mldsaKeypair,
    refundTo: wallet.p2tr,
    maximumAllowedSatToSpend: 50_000n,
    network: NETWORK,
    feeRate: gasParams.bitcoin.recommended.medium,
    utxos,
});

console.log(`\n✓ setBaseURI tx: ${receipt.transactionId}`);
console.log(`  Mempool: https://mempool.space/tx/${receipt.transactionId}`);
console.log(`  OPScan:  https://opscan.org/transactions/${receipt.transactionId}?network=mainnet`);
console.log('\nWaiting for confirmation (check mempool — this script will exit).');
