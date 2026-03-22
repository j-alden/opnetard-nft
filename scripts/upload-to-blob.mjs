#!/usr/bin/env node
/**
 * Uploads all NFT images and metadata files to Vercel Blob.
 * Run from the repo root: node scripts/upload-to-blob.mjs
 * Requires BLOB_READ_WRITE_TOKEN in .env (or environment).
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env manually (no dotenv dependency needed)
const envPath = join(__dirname, '..', '.env');
if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, 'utf8').split('\n')) {
        const match = line.match(/^([^#=]+)=(.*)$/);
        if (match) process.env[match[1].trim()] = match[2].trim().replace(/^"|"$/g, '');
    }
}

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
if (!TOKEN) { console.error('Missing BLOB_READ_WRITE_TOKEN'); process.exit(1); }

const BLOB_BASE = 'https://oclumhz0aoevupwq.public.blob.vercel-storage.com';

async function uploadFile(localPath, blobPath, contentType) {
    const body = readFileSync(localPath);
    const url = `https://blob.vercel-storage.com/${blobPath}`;
    const res = await fetch(url, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${TOKEN}`,
            'Content-Type': contentType,
            'x-api-version': '7',
            'x-content-type': contentType,
        },
        body,
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Upload failed for ${blobPath}: ${res.status} ${text}`);
    }
    return await res.json();
}

async function main() {
    const imagesDir = join(__dirname, '..', 'scripts', 'output', 'images');
    const metaDir   = join(__dirname, '..', 'scripts', 'output', 'metadata');

    const imageFiles = readdirSync(imagesDir).filter(f => f.endsWith('.png')).sort((a, b) => parseInt(a) - parseInt(b));
    const metaFiles  = readdirSync(metaDir).filter(f => !f.includes('.')).sort((a, b) => parseInt(a) - parseInt(b));

    console.log(`Uploading ${imageFiles.length} images and ${metaFiles.length} metadata files...`);
    console.log(`Destination: ${BLOB_BASE}/nft/\n`);

    // Upload in batches of 10 to avoid overwhelming the API
    const BATCH = 10;

    // -- Images --
    console.log('=== Images ===');
    for (let i = 0; i < imageFiles.length; i += BATCH) {
        const batch = imageFiles.slice(i, i + BATCH);
        await Promise.all(batch.map(async (file) => {
            const localPath = join(imagesDir, file);
            const blobPath  = `nft/images/${file}`;
            await uploadFile(localPath, blobPath, 'image/png');
        }));
        process.stdout.write(`  ${Math.min(i + BATCH, imageFiles.length)}/${imageFiles.length}\r`);
    }
    console.log(`\n  Done.`);

    // -- Metadata --
    console.log('=== Metadata ===');
    for (let i = 0; i < metaFiles.length; i += BATCH) {
        const batch = metaFiles.slice(i, i + BATCH);
        await Promise.all(batch.map(async (file) => {
            const localPath = join(metaDir, file);
            const blobPath  = `nft/metadata/${file}`;
            await uploadFile(localPath, blobPath, 'application/json');
        }));
        process.stdout.write(`  ${Math.min(i + BATCH, metaFiles.length)}/${metaFiles.length}\r`);
    }
    console.log(`\n  Done.`);

    console.log('\n✓ Upload complete.');
    console.log(`  Images:   ${BLOB_BASE}/nft/images/{id}.png`);
    console.log(`  Metadata: ${BLOB_BASE}/nft/metadata/{id}`);
}

main().catch(err => { console.error(err); process.exit(1); });
