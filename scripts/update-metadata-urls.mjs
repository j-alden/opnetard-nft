#!/usr/bin/env node
/**
 * update-metadata-urls.mjs
 *
 * 1. Lists all image blobs from Vercel Blob to get their actual HTTPS URLs.
 * 2. Updates local metadata files to use those HTTPS URLs in the `image` field.
 * 3. Re-uploads metadata to Vercel Blob with addRandomSuffix=false so URLs are
 *    predictable: https://{store}.public.blob.vercel-storage.com/nft/metadata/{id}
 *
 * Run from repo root: node scripts/update-metadata-urls.mjs
 * Requires BLOB_READ_WRITE_TOKEN in .env
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env
const envPath = join(__dirname, '..', '.env');
for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim().replace(/^"|"$/g, '');
}

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
if (!TOKEN) { console.error('Missing BLOB_READ_WRITE_TOKEN'); process.exit(1); }

const BLOB_BASE = 'https://oclumhz0aoevupwq.public.blob.vercel-storage.com';
const METADATA_BASE_URL = `${BLOB_BASE}/nft/metadata/`;

// ── Step 1: List all image blobs ─────────────────────────────────────────────

async function listAllImageBlobs() {
    const imageMap = {}; // { tokenId: actualUrl }
    let cursor = null;

    do {
        const url = cursor
            ? `https://blob.vercel-storage.com/?prefix=nft%2Fimages%2F&limit=1000&cursor=${encodeURIComponent(cursor)}`
            : `https://blob.vercel-storage.com/?prefix=nft%2Fimages%2F&limit=1000`;

        const res = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'x-api-version': '7',
            },
        });

        if (!res.ok) throw new Error(`List failed: ${res.status} ${await res.text()}`);
        const data = await res.json();

        for (const blob of data.blobs) {
            // pathname is like "nft/images/42.png" → tokenId = 42
            const filename = blob.pathname.replace('nft/images/', '');
            const tokenId = parseInt(filename.replace('.png', ''), 10);
            if (!isNaN(tokenId)) {
                imageMap[tokenId] = blob.url;
            }
        }

        cursor = data.hasMore ? data.cursor : null;
        process.stdout.write(`  Listed ${Object.keys(imageMap).length} images...\r`);
    } while (cursor);

    return imageMap;
}

// ── Step 2: Update local metadata files ──────────────────────────────────────

function updateMetadataFiles(imageMap) {
    const metaDir = join(__dirname, '..', 'scripts', 'output', 'metadata');
    const files = readdirSync(metaDir).filter(f => !f.includes('.'));
    let updated = 0;

    for (const file of files) {
        const tokenId = parseInt(file, 10);
        if (isNaN(tokenId)) continue;

        const imageUrl = imageMap[tokenId];
        if (!imageUrl) {
            console.warn(`  No image URL for token ${tokenId}`);
            continue;
        }

        const filePath = join(metaDir, file);
        const meta = JSON.parse(readFileSync(filePath, 'utf8'));
        meta.image = imageUrl;
        writeFileSync(filePath, JSON.stringify(meta, null, 2));
        updated++;
    }

    return updated;
}

// ── Step 3: Upload metadata with predictable URLs ─────────────────────────────

async function uploadMetadata() {
    const metaDir = join(__dirname, '..', 'scripts', 'output', 'metadata');
    const files = readdirSync(metaDir)
        .filter(f => !f.includes('.'))
        .sort((a, b) => parseInt(a) - parseInt(b));

    const BATCH = 10;
    let uploaded = 0;

    for (let i = 0; i < files.length; i += BATCH) {
        const batch = files.slice(i, i + BATCH);
        await Promise.all(batch.map(async (file) => {
            const body = readFileSync(join(metaDir, file));
            const blobPath = `nft/metadata/${file}`;

            const res = await fetch(`https://blob.vercel-storage.com/${blobPath}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${TOKEN}`,
                    'Content-Type': 'application/json',
                    'x-api-version': '7',
                    'x-content-type': 'application/json',
                    'x-add-random-suffix': '0',  // ← predictable URL
                },
                body,
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(`Upload failed for ${blobPath}: ${res.status} ${text}`);
            }
        }));

        uploaded += batch.length;
        process.stdout.write(`  Uploaded ${uploaded}/${files.length} metadata files...\r`);
    }

    return uploaded;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
    console.log('Step 1: Listing all image blobs from Vercel Blob...');
    const imageMap = await listAllImageBlobs();
    console.log(`\n  Found ${Object.keys(imageMap).length} image URLs.`);

    console.log('\nStep 2: Updating local metadata files with HTTPS image URLs...');
    const updated = updateMetadataFiles(imageMap);
    console.log(`  Updated ${updated} metadata files.`);

    console.log('\nStep 3: Re-uploading metadata with predictable URLs...');
    const count = await uploadMetadata();
    console.log(`\n  Uploaded ${count} metadata files.`);

    console.log('\n✓ Done.');
    console.log(`  Metadata base URL: ${METADATA_BASE_URL}`);
    console.log(`  Example:           ${METADATA_BASE_URL}1`);
    console.log('\nNext step: run set-base-uri to point the contract to this URL.');
    console.log(`  BASE_URI="${METADATA_BASE_URL}" node scripts/set-base-uri.mjs`);
}

main().catch(err => { console.error(err); process.exit(1); });
