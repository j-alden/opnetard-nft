import { networks } from '@btc-vision/bitcoin';

// ── Network ───────────────────────────────────────────────────────────────────
export const NETWORK = networks.bitcoin;
export const RPC_URL = 'https://api.opnet.org';

// ── Contract ──────────────────────────────────────────────────────────────────
// Deployed 2026-03-22 at block 941752
export const NFT_CONTRACT_ADDRESS = 'op1sqppm2hmzkynx0jl3yjjhhldd6e80rxm49g7aauhf';

// Payment address — deployer's P2TR address (receives BTC from mints)
export const CONTRACT_PAYMENT_ADDRESS = 'bc1p6xun83aper025lr4yua00nykr354drys2y5duhtsfjmgssae0q4q99fufs';

// ── Collection ────────────────────────────────────────────────────────────────
export const COLLECTION_SIZE = 1000;
export const MINT_PRICE_SATS = 10_000; // 10,000 sats ≈ $8.50

// Block at which the contract was deployed (for event indexing)
export const DEPLOYMENT_BLOCK = 941752n;

// Cache version — bump to invalidate localStorage cache
export const CACHE_VERSION = 2;
