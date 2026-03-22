/**
 * upload-ipfs.ts
 *
 * Uploads output/images/ and output/metadata/ folders to IPFS via Storacha
 * (web3.storage). Free, no monthly cost, 5GB storage.
 *
 * First run: will prompt for email verification (one-time, opens email link).
 * Subsequent runs: uses cached credentials in ~/.storacha/
 *
 * Required env vars:
 *   STORACHA_EMAIL — your storacha.network / web3.storage email
 *
 * Usage:
 *   npm run upload-ipfs images    — upload images, print CID
 *   npm run upload-ipfs metadata  — upload metadata, print CID
 *   npm run upload-ipfs both      — upload both
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '/Users/joshuaholt/Documents/opnetard-nft-launch/.env' });
dotenv.config({ path: '/Users/joshuaholt/Documents/opnet/.env' });

import { create } from '@storacha/client';
import { filesFromPaths } from 'files-from-path';
import { readdirSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';


const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../data');

const STORACHA_EMAIL = process.env['STORACHA_EMAIL'];

if (!STORACHA_EMAIL) {
    console.error('STORACHA_EMAIL must be set in .env (e.g. STORACHA_EMAIL=you@example.com)');
    process.exit(1);
}

// ---------------------------------------------------------------------------
// One-time auth setup — cached in ~/.storacha/ after first run
// ---------------------------------------------------------------------------

async function getClient() {
    const client = await create();

    const spaces = client.spaces();
    if (spaces.length > 0) {
        await client.setCurrentSpace(spaces[0].did());
        return client;
    }

    // First-time setup — login() blocks until the email link is clicked
    console.log(`\nFirst-time setup — sending verification email to ${STORACHA_EMAIL}`);
    console.log('Check your email and click the verification link. This will proceed automatically.\n');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const account = await (client as any).login(STORACHA_EMAIL);

    // Wait for billing plan to be activated (free tier requires visiting storacha.network once)
    console.log('Waiting for plan activation...');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (account as any).plan.wait();

    const space = await client.createSpace('opnetard-nft');
    // Provision the space with the plan (links storage provider to space)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (account as any).provision(space.did());
    await client.setCurrentSpace(space.did());
    // Save the recovery key so the space isn't lost
    await space.save();
    console.log(`Space created and provisioned: ${space.did()}\n`);

    return client;
}

// ---------------------------------------------------------------------------
// Upload a folder as a directory — returns the root CID string
// ---------------------------------------------------------------------------

async function uploadFolder(folderPath: string, label: string): Promise<string> {
    const client = await getClient();

    const fileCount = readdirSync(folderPath).filter((f) => !f.startsWith('.')).length;
    console.log(`Uploading ${fileCount} files from ${folderPath} as "${label}"...`);

    const files = await filesFromPaths([folderPath]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const root = await (client as any).uploadDirectory(files);

    return root.toString();
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
    const target = process.argv[2] ?? 'both';

    const imagesDir = join(__dirname, '../output/images');
    const metadataDir = join(__dirname, '../output/metadata');

    const cids: Record<string, string> = {};

    // Load existing CIDs if any
    try {
        const existing = JSON.parse(
            (await import('fs')).readFileSync(join(DATA_DIR, 'ipfs-cids.json'), 'utf8'),
        ) as Record<string, string>;
        Object.assign(cids, existing);
    } catch {
        // no existing file — fine
    }

    if (target === 'images' || target === 'both') {
        console.log('\n--- Uploading images ---');
        const imagesCid = await uploadFolder(imagesDir, 'opnetard-nft-images');
        cids['images'] = imagesCid;
        console.log(`\n✅ Images CID: ${imagesCid}`);
        console.log(`   Gateway: https://w3s.link/ipfs/${imagesCid}/1.png`);
        console.log(`\n   → Now set IMAGES_BASE_CID=${imagesCid} and run: npm run generate-metadata`);
    }

    if (target === 'metadata' || target === 'both') {
        console.log('\n--- Uploading metadata ---');
        const metadataCid = await uploadFolder(metadataDir, 'opnetard-nft-metadata');
        cids['metadata'] = metadataCid;
        console.log(`\n✅ Metadata CID: ${metadataCid}`);
        console.log(`   Gateway: https://w3s.link/ipfs/${metadataCid}/1`);
        console.log(`\n   → Use ipfs://${metadataCid}/ as the baseURI when deploying the contract.`);
    }

    mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(join(DATA_DIR, 'ipfs-cids.json'), JSON.stringify(cids, null, 2));
    console.log('\n✅ Saved CIDs to data/ipfs-cids.json');
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
