/**
 * generate-images.ts
 *
 * Composites trait PNGs into 1000 final NFT images using `sharp`.
 * Reads data/assignments.json, writes output/images/1.png … 1000.png.
 *
 * Layer render order (bottom → top): Background → Body → Mouth → Eyes → Shirts → Hats
 *
 * Usage: npm run generate-images
 */

import sharp from 'sharp';
import { readFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { NFT_ASSETS_DIR, LAYERS } from './config/traits.js';
import type { TraitAssignment } from './generate-traits.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../data');
const OUTPUT_DIR = join(__dirname, '../output/images');

// ---------------------------------------------------------------------------
// Load assignments
// ---------------------------------------------------------------------------

interface AssignmentsFile {
    collectionSize: number;
    assignments: TraitAssignment[];
}

function loadAssignments(): TraitAssignment[] {
    const path = join(DATA_DIR, 'assignments.json');
    if (!existsSync(path)) {
        throw new Error('data/assignments.json not found. Run generate-traits first.');
    }
    const data = JSON.parse(readFileSync(path, 'utf8')) as AssignmentsFile;
    return data.assignments;
}

// ---------------------------------------------------------------------------
// Build a lookup: layer name → trait name → file path
// ---------------------------------------------------------------------------

const traitPathMap = new Map<string, Map<string, string | null>>();
for (const layer of LAYERS) {
    const inner = new Map<string, string | null>();
    for (const trait of layer.traits) {
        const filePath = trait.file
            ? join(NFT_ASSETS_DIR, layer.dir, trait.file)
            : null;
        inner.set(trait.name, filePath);
    }
    traitPathMap.set(layer.name, inner);
}

function getTraitPath(layerName: string, traitName: string): string | null {
    const path = traitPathMap.get(layerName)?.get(traitName);
    if (path === undefined) {
        throw new Error(`Unknown trait "${traitName}" in layer "${layerName}"`);
    }
    return path;
}

// ---------------------------------------------------------------------------
// Composite one NFT
// ---------------------------------------------------------------------------

async function compositeNFT(assignment: TraitAssignment, outPath: string): Promise<void> {
    // Background is always present — use it as the base image
    const bgPath = getTraitPath('Background', assignment.traits['Background']);
    if (!bgPath) throw new Error(`Background trait has no file for token #${assignment.tokenId}`);

    // Remaining layers in render order (skip Background which is the base)
    const overlayLayers = LAYERS.slice(1); // Body, Mouth, Eyes, Shirts, Hats

    const composites: sharp.OverlayOptions[] = [];
    for (const layer of overlayLayers) {
        const traitName = assignment.traits[layer.name];
        if (!traitName) continue;
        const filePath = getTraitPath(layer.name, traitName);
        if (!filePath) continue; // null = empty layer, skip
        composites.push({ input: filePath });
    }

    await sharp(bgPath)
        .composite(composites)
        .png({ compressionLevel: 8 })
        .toFile(outPath);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
    const assignments = loadAssignments();
    mkdirSync(OUTPUT_DIR, { recursive: true });

    console.log(`Compositing ${assignments.length} NFT images...`);

    const BATCH_SIZE = 20; // Process in parallel batches to avoid file handle limits
    let completed = 0;
    let errors = 0;

    for (let i = 0; i < assignments.length; i += BATCH_SIZE) {
        const batch = assignments.slice(i, i + BATCH_SIZE);
        await Promise.all(
            batch.map(async (assignment) => {
                const outPath = join(OUTPUT_DIR, `${assignment.tokenId}.png`);
                try {
                    await compositeNFT(assignment, outPath);
                    completed++;
                } catch (err) {
                    console.error(`❌ Error on token #${assignment.tokenId}:`, err);
                    errors++;
                }
            }),
        );

        const progress = Math.min(i + BATCH_SIZE, assignments.length);
        process.stdout.write(`\r  ${progress}/${assignments.length} images generated...`);
    }

    console.log(`\n\n✅ Done. ${completed} images written to output/images/`);
    if (errors > 0) {
        console.error(`❌ ${errors} errors encountered. Check output above.`);
        process.exit(1);
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
