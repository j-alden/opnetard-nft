/**
 * generate-metadata.ts
 *
 * Generates ERC-721/OP-721 compatible JSON metadata for each token.
 * Reads data/assignments.json. Writes output/metadata/1 … 1000 (no extension).
 *
 * Image URLs use the IPFS base CID set in IMAGES_BASE_CID env var or
 * the placeholder "REPLACE_WITH_IMAGES_CID" if not set. Run this script
 * AFTER upload-ipfs.ts has uploaded the images and you have the CID.
 *
 * Usage:
 *   IMAGES_BASE_CID=QmXXX npm run generate-metadata
 *   (or set in .env)
 */

import 'dotenv/config';
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { TraitAssignment } from './generate-traits.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../data');
const OUTPUT_DIR = join(__dirname, '../output/metadata');

interface AssignmentsFile {
    collectionSize: number;
    assignments: TraitAssignment[];
}

interface NFTAttribute {
    trait_type: string;
    value: string;
}

interface NFTMetadata {
    name: string;
    description: string;
    image: string;
    edition: number;
    attributes: NFTAttribute[];
}

function main(): void {
    const assignmentsPath = join(DATA_DIR, 'assignments.json');
    if (!existsSync(assignmentsPath)) {
        throw new Error('data/assignments.json not found. Run generate-traits first.');
    }

    const data = JSON.parse(readFileSync(assignmentsPath, 'utf8')) as AssignmentsFile;
    const { assignments } = data;

    const imagesCid = process.env['IMAGES_BASE_CID'] ?? 'REPLACE_WITH_IMAGES_CID';
    if (imagesCid === 'REPLACE_WITH_IMAGES_CID') {
        console.warn('⚠️  IMAGES_BASE_CID not set — using placeholder. Set it after uploading images to IPFS.');
    }

    mkdirSync(OUTPUT_DIR, { recursive: true });

    for (const assignment of assignments) {
        const attributes: NFTAttribute[] = Object.entries(assignment.traits)
            .filter(([, value]) => value !== 'None')
            .map(([trait_type, value]) => ({ trait_type, value }));

        const metadata: NFTMetadata = {
            name: `OPNETARD #${assignment.tokenId}`,
            description: 'Me are OPNETARD. 1,000 unique Opnetards on Bitcoin via OPNet.',
            image: `ipfs://${imagesCid}/${assignment.tokenId}.png`,
            edition: assignment.tokenId,
            attributes,
        };

        // No file extension — standard for IPFS-hosted NFT metadata
        const outPath = join(OUTPUT_DIR, `${assignment.tokenId}`);
        writeFileSync(outPath, JSON.stringify(metadata, null, 2));
    }

    console.log(`✅ Wrote ${assignments.length} metadata files to output/metadata/`);
    console.log(`   Image base: ipfs://${imagesCid}/`);
    console.log('\nNext step: upload output/metadata/ folder to IPFS to get the metadata base CID.');
    console.log('Then set that CID as baseURI when deploying the contract.');
}

main();
