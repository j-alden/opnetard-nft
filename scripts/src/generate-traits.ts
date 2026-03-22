/**
 * generate-traits.ts
 *
 * Generates 1000 randomized trait assignments using weighted random selection
 * and enforces incompatibility rules. Outputs data/assignments.json.
 *
 * A seed is generated once and saved alongside the assignments so the generation
 * is reproducible (provenance). Publish the seed + SHA256 hash of assignments.json
 * before minting opens.
 *
 * Usage: npm run generate-traits
 */

import { randomBytes } from 'crypto';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
    LAYERS,
    COLLECTION_SIZE,
    INCOMPATIBILITY_RULES,
    type Trait,
    type LayerConfig,
} from './config/traits.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../data');

// ---------------------------------------------------------------------------
// Seeded PRNG (xorshift64 — fast, deterministic, good distribution)
// ---------------------------------------------------------------------------

class PRNG {
    private state: bigint;

    constructor(seed: bigint) {
        // Ensure non-zero initial state
        this.state = seed === 0n ? 1n : seed;
    }

    next(): bigint {
        let x = this.state;
        x ^= x << 13n;
        x ^= x >> 7n;
        x ^= x << 17n;
        this.state = x & 0xFFFFFFFFFFFFFFFFn;
        return this.state;
    }

    /** Returns a non-negative integer in [0, max) */
    nextInt(max: number): number {
        return Number(this.next() % BigInt(max));
    }
}

// ---------------------------------------------------------------------------
// Weighted random selection
// ---------------------------------------------------------------------------

function weightedPick(traits: Trait[], rng: PRNG): Trait {
    const totalWeight = traits.reduce((sum, t) => sum + t.weight, 0);
    let roll = rng.nextInt(totalWeight);
    for (const trait of traits) {
        roll -= trait.weight;
        if (roll < 0) return trait;
    }
    return traits[traits.length - 1];
}

// ---------------------------------------------------------------------------
// Assignment type
// ---------------------------------------------------------------------------

export interface TraitAssignment {
    tokenId: number;
    traits: Record<string, string>; // layer name → trait name
}

// ---------------------------------------------------------------------------
// Build a layer name → LayerConfig lookup
// ---------------------------------------------------------------------------

const layerMap = new Map<string, LayerConfig>(LAYERS.map((l) => [l.name, l]));

function pickForLayer(layerName: string, rng: PRNG): string {
    const layer = layerMap.get(layerName);
    if (!layer) throw new Error(`Unknown layer: ${layerName}`);
    return weightedPick(layer.traits, rng).name;
}

// ---------------------------------------------------------------------------
// Incompatibility check
// ---------------------------------------------------------------------------

function isValid(traits: Record<string, string>): boolean {
    for (const rule of INCOMPATIBILITY_RULES) {
        if (traits[rule.layer1] === rule.trait1 && traits[rule.layer2] === rule.trait2) {
            return false;
        }
    }
    return true;
}

// ---------------------------------------------------------------------------
// Generate one assignment with re-roll on rule violation
// ---------------------------------------------------------------------------

function generateOne(tokenId: number, rng: PRNG): TraitAssignment {
    const MAX_ATTEMPTS = 50;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const traits: Record<string, string> = {};

        for (const layer of LAYERS) {
            traits[layer.name] = pickForLayer(layer.name, rng);
        }

        if (isValid(traits)) {
            return { tokenId, traits };
        }
    }

    // Fallback: re-roll individual violating traits
    const traits: Record<string, string> = {};
    for (const layer of LAYERS) {
        traits[layer.name] = pickForLayer(layer.name, rng);
    }

    // Fix each rule violation by re-rolling the second trait
    for (const rule of INCOMPATIBILITY_RULES) {
        let fixAttempts = 0;
        while (traits[rule.layer1] === rule.trait1 && traits[rule.layer2] === rule.trait2) {
            traits[rule.layer2] = pickForLayer(rule.layer2, rng);
            fixAttempts++;
            if (fixAttempts > 100) {
                // Re-roll first trait too as last resort
                traits[rule.layer1] = pickForLayer(rule.layer1, rng);
            }
        }
    }

    return { tokenId, traits };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
    console.log(`Generating ${COLLECTION_SIZE} trait assignments...`);

    // Generate a random 64-bit seed
    const seedBytes = randomBytes(8);
    const seed = seedBytes.readBigUInt64BE(0);
    console.log(`Seed: ${seed.toString()} (0x${seed.toString(16)})`);

    const rng = new PRNG(seed);
    const assignments: TraitAssignment[] = [];

    for (let i = 1; i <= COLLECTION_SIZE; i++) {
        assignments.push(generateOne(i, rng));
    }

    // ---------------------------------------------------------------------------
    // Validate: check no rule violations survived
    // ---------------------------------------------------------------------------
    let violations = 0;
    for (const a of assignments) {
        if (!isValid(a.traits)) {
            console.error(`❌ Rule violation in token #${a.tokenId}:`, a.traits);
            violations++;
        }
    }
    if (violations > 0) {
        throw new Error(`${violations} rule violations found — fix the generator.`);
    }

    // ---------------------------------------------------------------------------
    // Stats: trait frequency per layer
    // ---------------------------------------------------------------------------
    console.log('\nTrait distribution:');
    for (const layer of LAYERS) {
        const counts = new Map<string, number>();
        for (const a of assignments) {
            const t = a.traits[layer.name];
            counts.set(t, (counts.get(t) ?? 0) + 1);
        }
        console.log(`\n  ${layer.name}:`);
        for (const [name, count] of [...counts.entries()].sort((a, b) => b[1] - a[1])) {
            const pct = ((count / COLLECTION_SIZE) * 100).toFixed(1);
            console.log(`    ${name.padEnd(24)} ${count.toString().padStart(4)}  (${pct}%)`);
        }
    }

    // ---------------------------------------------------------------------------
    // Output
    // ---------------------------------------------------------------------------
    mkdirSync(DATA_DIR, { recursive: true });

    const output = {
        seed: seed.toString(),
        seedHex: `0x${seed.toString(16)}`,
        collectionSize: COLLECTION_SIZE,
        generatedAt: new Date().toISOString(),
        assignments,
    };

    const outPath = join(DATA_DIR, 'assignments.json');
    writeFileSync(outPath, JSON.stringify(output, null, 2));
    console.log(`\n✅ Wrote ${assignments.length} assignments to ${outPath}`);
    console.log('\n⚠️  IMPORTANT: Publish this seed + SHA256 hash of assignments.json BEFORE opening mint.');
    console.log(`   Seed: ${seed.toString()}`);
}

main();
