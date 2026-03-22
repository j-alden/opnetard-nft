/**
 * deploy-nft.ts
 *
 * Deploys the OpnetardNFT contract to OPNet mainnet.
 *
 * Prerequisites:
 *   1. npm run pipeline  (generate-traits + generate-images + generate-metadata)
 *   2. npm run upload-ipfs images  → get IMAGES_BASE_CID
 *   3. IMAGES_BASE_CID=xxx npm run generate-metadata
 *   4. npm run upload-ipfs metadata → get METADATA_BASE_CID
 *   5. Set METADATA_BASE_CID in .env (this becomes the contract baseURI)
 *   6. npm run deploy
 *
 * Required env vars (in ../../.env):
 *   DEPLOYER_MNEMONIC
 *   METADATA_BASE_CID   (the IPFS CID of the metadata folder)
 *
 * Usage: npm run deploy
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';
import { networks } from '@btc-vision/bitcoin';
import { Mnemonic, AddressTypes, TransactionFactory } from '@btc-vision/transaction';
import { JSONRpcProvider, getContract, ABIDataTypes, BitcoinAbiTypes, type BitcoinInterfaceAbi } from 'opnet';

const __dirname = dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: '/Users/joshuaholt/Documents/opnetard-nft-launch/.env' });
// Fallback: also check sibling repo .env
dotenv.config({ path: '/Users/joshuaholt/Documents/opnet/.env' });

// ── Network ───────────────────────────────────────────────────────────────────
const NETWORK = networks.bitcoin;
const RPC_URL = 'https://api.opnet.org';

// ── WASM path ─────────────────────────────────────────────────────────────────
const WASM_PATH = join(__dirname, '../../contracts/build/OpnetardNFT.wasm');

// ── Receipt output ────────────────────────────────────────────────────────────
const RECEIPT_PATH = join(__dirname, '../data/nft-deployment-receipt.json');

function writeReceipt(data: object): void {
    mkdirSync(dirname(RECEIPT_PATH), { recursive: true });
    writeFileSync(RECEIPT_PATH, JSON.stringify(data, null, 2));
}

async function waitForConfirmation(
    provider: JSONRpcProvider,
    txHash: string,
    maxWaitMs: number = 600_000,
): Promise<{ blockNumber: bigint } | null> {
    const pollIntervalMs = 30_000;
    const start = Date.now();

    while (Date.now() - start < maxWaitMs) {
        try {
            const tx = await provider.getTransaction(txHash);
            if (tx && tx.blockNumber != null) {
                console.log(`  Confirmed at block ${tx.blockNumber}`);
                return { blockNumber: tx.blockNumber };
            }
        } catch {
            // not yet available
        }
        const elapsed = Math.round((Date.now() - start) / 1000);
        console.log(`  Waiting for confirmation... (${elapsed}s elapsed)`);
        await new Promise((r) => setTimeout(r, pollIntervalMs));
    }
    return null;
}

async function waitForIndexing(
    provider: JSONRpcProvider,
    contractAddress: string,
    maxWaitMs: number = 180_000,
): Promise<boolean> {
    const pollIntervalMs = 10_000;
    const start = Date.now();

    while (Date.now() - start < maxWaitMs) {
        try {
            const code = await provider.getCode(contractAddress);
            if (code) return true;
        } catch {
            // not yet indexed
        }
        const elapsed = Math.round((Date.now() - start) / 1000);
        console.log(`  Waiting for indexer... (${elapsed}s elapsed)`);
        await new Promise((r) => setTimeout(r, pollIntervalMs));
    }
    return false;
}

async function main(): Promise<void> {
    const mnemonic = process.env['DEPLOYER_MNEMONIC'];
    if (!mnemonic) throw new Error('DEPLOYER_MNEMONIC not set in .env');

    const metadataCid = process.env['METADATA_BASE_CID'];
    if (!metadataCid) throw new Error('METADATA_BASE_CID not set in .env');

    const baseURI = `ipfs://${metadataCid}/`;
    console.log(`Deploying OpnetardNFT with baseURI: ${baseURI}`);

    const wasm = new Uint8Array(readFileSync(WASM_PATH));
    if (wasm.length === 0) throw new Error('OpnetardNFT.wasm is empty — run: cd contracts && npm run build');
    console.log(`WASM loaded: ${wasm.length} bytes`);

    const mnemonicObj = new Mnemonic(mnemonic, undefined, NETWORK);
    const wallet = mnemonicObj.deriveOPWallet(AddressTypes.P2TR, 0);
    console.log(`Deployer p2tr:    ${wallet.p2tr}`);
    console.log(`Deployer OPNet:   ${wallet.address.toHex()}`);

    const provider = new JSONRpcProvider({ url: RPC_URL, network: NETWORK });

    const gasParams = await provider.gasParameters();
    const feeRate = gasParams.bitcoin.recommended.medium;
    const TARGET_GAS = 2_000_000_000n;
    const gasPerSat = BigInt(gasParams.gasPerSat);
    const gasSatFee = gasPerSat > 0n
        ? ((TARGET_GAS / gasPerSat) * 12n) / 10n
        : 10_000n;
    const gasSatFeeActual = gasSatFee < 5_000n ? 5_000n : gasSatFee;
    console.log(`feeRate=${feeRate} sat/vB, gasSatFee=${gasSatFeeActual} sats`);

    const btcBalance = await provider.getBalance(wallet.p2tr);
    console.log(`Wallet balance: ${btcBalance} sats`);
    if (btcBalance === 0n) throw new Error(`Wallet ${wallet.p2tr} has 0 sats. Fund it first.`);

    // No deployment calldata — baseURI is set via setBaseURI() after deployment
    // (OPNet has a max transaction size; passing calldata at deploy time exceeds it)
    console.log(`baseURI will be set post-deployment: ${baseURI}`);

    const challenge = await provider.getChallenge();
    const utxos = await provider.utxoManager.getUTXOs({ address: wallet.p2tr, optimize: true });
    if (utxos.length === 0) throw new Error('No confirmed UTXOs available');

    const txFactory = new TransactionFactory();
    const deployResult = await txFactory.signDeployment({
        bytecode: wasm,
        signer: wallet.keypair,
        mldsaSigner: wallet.mldsaKeypair,
        linkMLDSAPublicKeyToAddress: true,
        revealMLDSAPublicKey: true,
        network: NETWORK,
        utxos,
        feeRate,
        priorityFee: 0n,
        gasSatFee: gasSatFeeActual,
        challenge,
    });

    console.log(`Contract address: ${deployResult.contractAddress}`);

    const [fundingTx, deployTx] = deployResult.transaction;

    console.log(`Funding tx size: ${fundingTx.length / 2} bytes`);
    console.log(`Deploy tx size:  ${deployTx.length / 2} bytes`);

    const b1 = await provider.sendRawTransaction(fundingTx, false);
    console.log(`Funding tx response: ${JSON.stringify(b1)}`);
    if (!b1.success) throw new Error(`Funding tx failed: ${b1.error ?? 'unknown'}`);
    console.log(`Funding tx: ${b1.result}`);

    const b2 = await provider.sendRawTransaction(deployTx, false);
    console.log(`Deploy tx response: ${JSON.stringify(b2)}`);
    if (!b2.success) throw new Error(`Deploy tx failed: ${b2.error ?? JSON.stringify(b2)}`);
    const deployTxHash = b2.result ?? '';
    console.log(`Deploy tx: ${deployTxHash}`);
    console.log(`Mempool: https://mempool.space/tx/${deployTxHash}`);

    provider.utxoManager.spentUTXO(wallet.p2tr, utxos, deployResult.utxos);

    console.log('Waiting for confirmation...');
    const receipt = await waitForConfirmation(provider, deployTxHash, 1_800_000);
    if (!receipt) throw new Error('Deploy tx confirmation timed out');

    console.log('Waiting for contract to be indexed...');
    if (!await waitForIndexing(provider, deployResult.contractAddress, 900_000)) {
        throw new Error('Contract not indexed after deployment');
    }

    // ── Set baseURI post-deployment ────────────────────────────────────────────
    console.log(`\nSetting baseURI: ${baseURI}`);

    const setBaseURIAbi: BitcoinInterfaceAbi = [{
        name: 'setBaseURI',
        inputs: [{ name: 'uri', type: ABIDataTypes.STRING }],
        outputs: [{ name: 'success', type: ABIDataTypes.BOOL }],
        type: BitcoinAbiTypes.Function,
    }];

    const nftContract = getContract<{ setBaseURI(uri: string): Promise<{ revert?: string; sendTransaction: Function }> }>(
        deployResult.contractAddress,
        setBaseURIAbi,
        provider,
        NETWORK,
        wallet.address,
    );

    const setUriSim = await nftContract.setBaseURI(baseURI);
    if (setUriSim.revert) throw new Error(`setBaseURI simulation reverted: ${setUriSim.revert}`);

    const setUriUtxos = await provider.utxoManager.getUTXOs({ address: wallet.p2tr, optimize: true });
    const setUriGasParams = await provider.gasParameters();

    const setUriReceipt = await setUriSim.sendTransaction({
        signer: wallet.keypair,
        mldsaSigner: wallet.mldsaKeypair,
        refundTo: wallet.p2tr,
        maximumAllowedSatToSpend: 50_000n,
        network: NETWORK,
        feeRate: setUriGasParams.bitcoin.recommended.medium,
        utxos: setUriUtxos,
    });

    console.log(`setBaseURI tx: ${setUriReceipt.transactionId}`);
    console.log(`Mempool: https://mempool.space/tx/${setUriReceipt.transactionId}`);

    console.log('Waiting for setBaseURI confirmation...');
    await waitForConfirmation(provider, setUriReceipt.transactionId, 1_800_000);

    const result = {
        status: 'success',
        network: 'mainnet',
        contractAddress: deployResult.contractAddress,
        deployTxHash,
        baseURI,
        metadataCid,
        blockNumber: Number(receipt.blockNumber),
        deployedAt: new Date().toISOString(),
    };

    writeReceipt(result);

    console.log('\n=== NFT DEPLOYMENT COMPLETE ===');
    console.log(`Contract: ${deployResult.contractAddress}`);
    console.log(`baseURI:  ${baseURI}`);
    console.log(`OPScan:   https://opscan.org/accounts/${deployResult.contractAddress}`);
    console.log(`Receipt:  ${RECEIPT_PATH}`);
}

main().catch((err) => {
    console.error('Deployment failed:', err instanceof Error ? err.message : err);
    process.exit(1);
});
