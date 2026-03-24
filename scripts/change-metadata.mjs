#!/usr/bin/env node
/**
 * change-metadata.mjs
 *
 * Calls changeMetadata() on the deployed OpnetardNFT contract to set
 * collection icon, banner, description, and website.
 *
 * Usage: node scripts/change-metadata.mjs
 * Requires DEPLOYER_MNEMONIC in .env
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

const NFT_CONTRACT = 'op1sqppm2hmzkynx0jl3yjjhhldd6e80rxm49g7aauhf';
const RPC_URL = 'https://api.opnet.org';

const METADATA = {
    icon:        'https://oqo47j6pxmwuqzov.public.blob.vercel-storage.com/logos/og.png',
    banner:      'https://www.magicinternet.meme/opnetard-banner.png',
    description: 'Me are OPNETARD.',
    website:     'https://opnetard.com/',
};

console.log('Collection metadata to set:');
console.log(`  icon:        ${METADATA.icon}`);
console.log(`  banner:      ${METADATA.banner}`);
console.log(`  description: ${METADATA.description}`);
console.log(`  website:     ${METADATA.website}`);
console.log('');

const { networks } = await import('@btc-vision/bitcoin');
const { Mnemonic, AddressTypes } = await import('@btc-vision/transaction');
const { JSONRpcProvider, getContract, ABIDataTypes, BitcoinAbiTypes } = await import('opnet');

const NETWORK = networks.bitcoin;

const mnemonicObj = new Mnemonic(MNEMONIC, undefined, NETWORK);
const wallet = mnemonicObj.deriveOPWallet(AddressTypes.P2TR, 0);
console.log(`Deployer: ${wallet.p2tr}`);

const provider = new JSONRpcProvider({ url: RPC_URL, network: NETWORK });

const changeMetadataAbi = [{
    name: 'changeMetadata',
    inputs: [
        { name: 'icon',        type: ABIDataTypes.STRING },
        { name: 'banner',      type: ABIDataTypes.STRING },
        { name: 'description', type: ABIDataTypes.STRING },
        { name: 'website',     type: ABIDataTypes.STRING },
    ],
    outputs: [],
    type: BitcoinAbiTypes.Function,
}];

const contract = getContract(
    NFT_CONTRACT,
    changeMetadataAbi,
    provider,
    NETWORK,
    wallet.address,
);

// The WASM was compiled with @method('changeMetadata') — no params in the decorator —
// so the on-chain selector is sha256('changeMetadata()')[0:4] = 0x4b1dd8fb.
// The opnet ABI with 4 STRING inputs would produce sha256('changeMetadata(string,string,string,string)').
// Patch getSelector so the correct selector is used while still encoding the 4 strings.
const _origGetSelector = contract.getSelector.bind(contract);
contract.getSelector = (element) => {
    if (element.name === 'changeMetadata') return 'changeMetadata()';
    return _origGetSelector(element);
};

console.log('\nSimulating changeMetadata...');
const sim = await contract.changeMetadata(
    METADATA.icon,
    METADATA.banner,
    METADATA.description,
    METADATA.website,
);

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

console.log(`\n✓ changeMetadata tx: ${receipt.transactionId}`);
console.log(`  Mempool: https://mempool.space/tx/${receipt.transactionId}`);
console.log(`  OPScan:  https://opscan.org/transactions/${receipt.transactionId}?network=mainnet`);
