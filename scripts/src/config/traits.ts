/**
 * OPNETARD NFT Trait Configuration
 *
 * Weights are relative (not percentages). Higher weight = more common.
 * file: null means this trait slot is empty (no layer composited).
 *
 * PLEASE REVIEW AND CORRECT WEIGHTS before running generate-traits.
 * These were derived from the ovi.fun screenshots and may need adjustment.
 *
 * Layer render order (bottom → top on canvas):
 *   Background → Body → Mouth → Eyes → Shirts → Hats
 */

export interface Trait {
    name: string;
    file: string | null; // null = empty / no layer
    weight: number;
}

export interface LayerConfig {
    name: string;
    dir: string; // subdirectory name inside NFT_ASSETS_DIR
    traits: Trait[];
}

// Absolute path to the source trait PNG directory
export const NFT_ASSETS_DIR = '/Users/joshuaholt/Documents/opnetard-nft/nft';

// Total NFTs to generate
export const COLLECTION_SIZE = 1000;

// Layers in render order (bottom to top)
export const LAYERS: LayerConfig[] = [
    {
        name: 'Background',
        dir: 'Backgrounds',
        traits: [
            { name: 'Beach',        file: 'Beach.png',        weight: 10 },
            { name: 'Bitcoin',      file: 'Bitcoin.png',      weight: 5  },
            { name: 'Black',        file: 'Black.png',        weight: 5  },
            { name: 'Blue',         file: 'Blue.png',         weight: 10 },
            { name: 'Brown',        file: 'Brown.png',        weight: 10 },
            { name: 'Light Grey',   file: 'Light Grey.png',   weight: 5  },
            { name: 'Moon',         file: 'Moon.png',         weight: 10 },
            { name: 'Motoswap 2',   file: 'Motoswap 2.png',   weight: 5  },
            { name: 'Motoswap',     file: 'Motoswap.png',     weight: 5  },
            { name: 'NM-Purple',    file: 'NM-Purple.png',    weight: 10 },
            { name: 'Opnet Orange', file: 'Opnet Orange.png', weight: 10 },
            { name: 'Pepe Green',   file: 'Pepe Green.png',   weight: 5  },
            { name: 'UW-Bitcoin',   file: 'UW-Bitcoin.png',   weight: 5  },
            { name: 'UW-Red',       file: 'UW-Red.png',       weight: 5  },
            { name: 'White',        file: 'White.png',        weight: 5  },
            { name: 'Yellow',       file: 'Yellow.png',       weight: 5  },
        ],
    },
    {
        name: 'Body',
        dir: 'Body',
        traits: [
            { name: 'Opnetard',      file: 'Main Body.png',      weight: 100 },
            { name: 'Tatted',        file: 'Tatted.png',         weight: 30  },
            { name: 'Moto Opnetard', file: 'Moto Opnetard.png',  weight: 5   },
            { name: 'BTC Opnetard',  file: 'BTC Opnetard.png',   weight: 5   },
        ],
    },
    {
        name: 'Mouth',
        dir: 'Mouth',
        traits: [
            { name: 'None',        file: null,              weight: 100 },
            { name: 'Extra Pillz', file: 'Extra Pillz.png', weight: 15  },
            { name: 'Goatee',      file: 'Goatee.png',      weight: 15  },
            { name: 'Grillz',      file: 'Grillz.png',      weight: 15  },
            { name: 'Le Cabal',    file: 'Le Cabal.png',    weight: 15  },
        ],
    },
    {
        name: 'Eyes',
        dir: 'Eyes',
        traits: [
            { name: 'None',             file: null,                     weight: 30 },
            { name: 'Moto Shades',      file: 'Moto Glasses.png',       weight: 5  },
            { name: 'BTC Tattoo',       file: 'Bitcoin Tatoo.png',      weight: 15 },
            { name: 'Laser Eyes',       file: 'Laser Eyes.png',         weight: 5  },
            { name: 'Sunglasses',       file: 'Sunglasses.png',         weight: 15 },
            { name: 'Grey Shades',      file: 'Grey Glasses.png',       weight: 15 },
            { name: 'BTC Tattoo White', file: 'Bitcoin Tatoo White.png', weight: 15 },
        ],
    },
    {
        name: 'Shirts',
        dir: 'Shirts',
        traits: [
            { name: 'None',                file: null,                     weight: 5  },
            { name: 'Audit Me',            file: 'Audit Me.png',           weight: 10 },
            { name: 'Bitcoin Shirt',       file: 'Bitcoin Shirt.png',      weight: 5  },
            { name: 'Hawaiian Shirt',      file: 'Hawaiian Shirt.png',     weight: 10 },
            { name: 'I Heart OPNet Tank',  file: 'I heart opnet tank.png', weight: 10 },
            { name: 'Moto Pocket',         file: 'Moto Pocket.png',        weight: 20 },
            { name: 'Moto Shirt',          file: 'Moto shirt.png',         weight: 5  },
            { name: 'OPFun Shirt',         file: 'opfun Shirt.png',        weight: 5  },
            { name: 'OPNet Chain',         file: 'opnet chain.png',        weight: 10 },
            { name: 'OPNet Shirt White',   file: 'OPNet Shirt White.png',  weight: 5  },
            { name: 'OPNet Shirt',         file: 'OPNet Shirt.png',        weight: 10 },
            { name: 'OPNet Tank',          file: 'OPNet Tank.png',         weight: 5  },
            { name: 'Orange Shirt',        file: 'Orange Shirt.png',       weight: 5  },
            { name: 'Unga Shirt',          file: 'Unga Shirt.png',         weight: 5  },
        ],
    },
    {
        name: 'Hats',
        dir: 'Hats',
        traits: [
            { name: 'None',          file: null,                weight: 5  },
            { name: 'Afro',          file: 'Afro.png',          weight: 10 },
            { name: 'Anna Bow',      file: 'Anna Bow.png',      weight: 10 },
            { name: 'Bitcoin Crown', file: 'Bitcoin Crown.png', weight: 5  },
            { name: 'Bowl Cut',      file: 'Bowl Cut.png',      weight: 10 },
            { name: 'Cat Ears',      file: 'Cat Ears.png',      weight: 1  },
            { name: 'Hair Bow',      file: 'hair bow.png',      weight: 10 },
            { name: 'Le Cabal Hat',  file: 'Le Cabal.png',      weight: 5  },
            { name: 'MBGA',          file: 'MBGA.png',          weight: 5  },
            { name: 'Moto Hat',      file: 'Moto Hat.png',      weight: 10 },
            { name: 'OPNET Hat',     file: 'OPNET Hat.png',     weight: 10 },
            { name: 'Orange Hat',    file: 'Orange Hat.png',    weight: 5  },
            { name: 'Space Suit',    file: 'Space Suit.png',    weight: 1  },
            { name: 'Trump',         file: 'Trump.png',         weight: 10 },
            { name: 'Wizard Hat',    file: 'Wizard Hat.png',    weight: 10 },
        ],
    },
];

/**
 * Incompatibility rules — these trait combinations are NEVER allowed.
 * If a violation is detected, the second trait is re-rolled.
 */
export interface IncompatibilityRule {
    layer1: string;
    trait1: string;
    layer2: string;
    trait2: string;
}

export const INCOMPATIBILITY_RULES: IncompatibilityRule[] = [
    // Moto Opnetard body cannot wear Cat Ears
    { layer1: 'Body', trait1: 'Moto Opnetard', layer2: 'Hats', trait2: 'Cat Ears' },
    // Le Cabal mouth cannot appear with BTC Tattoo White eyes
    { layer1: 'Mouth', trait1: 'Le Cabal', layer2: 'Eyes', trait2: 'BTC Tattoo White' },
    // Le Cabal mouth cannot appear with BTC Tattoo eyes
    { layer1: 'Mouth', trait1: 'Le Cabal', layer2: 'Eyes', trait2: 'BTC Tattoo' },
];
