# OPNETARD NFT — Contract Situation & Resolution Plan

**Date:** 2026-03-23
**Contract:** `op1sqppm2hmzkynx0jl3yjjhhldd6e80rxm49g7aauhf`
**Status:** All 1,000 tokens minted, distributed to community holders

---

## 1. Current State

| Item | Value |
|---|---|
| Contract address | `op1sqppm2hmzkynx0jl3yjjhhldd6e80rxm49g7aauhf` |
| Network | Bitcoin Mainnet (OPNet) |
| Tokens minted | 1,000 / 1,000 (sold out) |
| Token holders | Distributed across community (unknown count) |
| btc-runtime compiled against | `1.11.0-rc.10` |
| btc-runtime latest | `1.11.0` (final, post-Verichains audit) |
| as-bignum compiled against | `0.1.2` |
| as-bignum latest | `1.0.0` |
| opnet-transform compiled against | `1.1.0` |
| opnet-transform latest | `1.2.2` |
| Collection metadata (icon/banner/description/website) | **Empty** |
| baseURI | Set to `https://oclumhz0aoevupwq.public.blob.vercel-storage.com/nft/metadata/` |

---

## 2. Issues Found

### Issue 1 — Missing Collection Metadata (Wallet Display Broken)
**Severity: HIGH — Affects users right now**

The OPNet wallet calls `metadata()` / `collectionInfo()` on the contract to display the collection. These methods return `icon`, `banner`, `description`, and `website`. All four were deployed as empty strings.

The `OP721InitParameters` passed at deployment was:
```typescript
new OP721InitParameters(
    'OPNETARD',    // name ✓
    'OPTARDNFT',   // symbol ✓
    'https://oqo47j6pxmwuqzov.public.blob.vercel-storage.com/logos/og.png',  // baseURI (later overwritten)
    MAX_SUPPLY,    // 1000 ✓
    '',            // collectionBanner ← EMPTY
    // collectionIcon, collectionWebsite, collectionDescription all defaulted to ''
)
```

**Impact:** The wallet shows the collection name ("OPNETARD") but no image, no description, no website link.

**Fix available without redeployment:** The OP721 base class exposes a `changeMetadata()` method (deployer-only) that sets all four fields in a single transaction. This can be called on the existing contract.

---

### Issue 2 — OP_721 Event Names Changed (Breaking Change in 1.11.0 final)
**Severity: MEDIUM — Protocol compatibility risk**

The final `1.11.0` release (PR #149 "Finalize OP_721") renamed the base class events:

| Action | rc.10 event name | 1.11.0 final event name |
|---|---|---|
| Mint (base class) | `Transferred` (from zero address) | `OP721MintedEvent` |
| Transfer | `Transferred` | `OP721TransferredEvent` |
| Burn | `Transferred` (to zero address) | `OP721BurnedEvent` |
| Approve | `Approved` | `OP721ApprovedEvent` |

**Note:** The OpnetardNFT contract emits its own custom `MintedEvent` directly, which is unaffected. However, any transfer, approval, or burn operations go through the OP721 base class and will emit the old `Transferred`/`Approved` event names.

**Impact:** Wallets, indexers, or marketplaces built against the final 1.11.0 event spec may not parse transfers and approvals correctly from this contract. Until ecosystem tooling enforces the new names strictly, this is a latent risk rather than an immediate breakage.

---

### Issue 3 — Verichains Audit Fixes Not Included
**Severity: MEDIUM — Unquantified security exposure**

The 1.11.0 final release incorporates the full Verichains security audit (`Add audit PDF, bump versions & fix StoredBoolean`). The specific vulnerability vectors from the audit are not public, but the changes landed across `OP721.ts` and related event files.

**What is confirmed NOT affected in this contract:**
- `StoredBoolean` bug: this contract does not use `StoredBoolean`
- `_mint` implementation: identical between rc.10 and 1.11.0 final (verified by diff)
- Storage pointer layout: identical in both versions (same 14 pointers in same order — no state corruption risk)
- Reentrancy: extends `ReentrancyGuard` via OP721 base

**Remaining uncertainty:** Other audit findings may exist in the OP721 base class that are not reflected in the public PR description.

---

### Issue 4 — as-bignum and opnet-transform Behind Latest
**Severity: LOW**

- `as-bignum` 0.1.2 → 1.0.0: Major version bump. The contract only uses `u256.fromU32`, `u256.fromU64`, `u256.One`, `u256.Zero`, and `SafeMath` operations — all basic operations that appear stable. No known breaking changes affect this contract's logic.
- `opnet-transform` 1.1.0 → 1.2.2: Used only at compile time for method dispatch. Deployed WASM is unaffected by transform version; only matters on next recompile.

---

### Issue 5 — MAX_MINT_PER_TX = 5 (Historical, Now Irrelevant)
**Severity: N/A** — collection is fully minted

The contract hardcoded `MAX_MINT_PER_TX = 5` while the frontend was updated to allow 50. Any mint attempt above 5 would have reverted. Since all 1,000 are now minted by the deployer, this no longer matters operationally but should be fixed if redeploying.

---

## 3. Resolution Options

### Option A — Patch in Place (No Redeploy) ← Recommended
**Best choice given tokens are distributed across community holders.**

Redeployment with distributed holders is a complex multi-party migration that requires snapshotting every holder, coordinating a new contract address announcement, and airdropping to potentially hundreds of wallets. The cost-benefit only makes sense if there is a confirmed active exploit.

**Steps:**
1. Call `changeMetadata()` on the existing contract (fixes Issue 1 immediately)
2. Monitor for wallet/indexer breakage due to event name change (Issue 2)
3. Ask Anakun to share specific Verichains audit findings privately (Issue 3)
4. If a concrete exploit vector is confirmed, escalate to Option B

**Pros:** No disruption to holders, no new contract address to communicate, fast
**Cons:** Latent unquantified security exposure from Verichains audit, event name incompatibility with tools built against 1.11.0 final

**Effort:** 1 transaction + ~1 hour

---

### Option B — Full Redeploy + Community Airdrop
**Only warranted if a concrete exploit is confirmed by Anakun.**

With tokens distributed across the community this is a significant coordination effort.

**Phase 1 — Snapshot holders**
1. Query OPNet RPC or OPScan API to enumerate all holders of the current contract
2. For each holder, record: `{tweakedPubKey, tokenIds[]}`
3. Verify snapshot total = 1,000 tokens across all holders
4. Freeze: announce publicly that the old contract is being migrated; ask holders not to transfer

**Phase 2 — Deploy new contract**
1. Update contract source:
   - Upgrade `@btc-vision/btc-runtime` to `latest` (1.11.0 final)
   - Upgrade `@btc-vision/as-bignum` to `1.0.0`
   - Upgrade `@btc-vision/opnet-transform` to `1.2.2`
   - Change `MAX_MINT_PER_TX` from `5` to `50`
   - Populate `OP721InitParameters` with full collection metadata (icon, banner, description, website)
2. Rebuild: `cd contracts && npm install && npm run build && npm run typecheck`
3. Deploy new contract
4. Set `baseURI` and call `changeMetadata()` on new contract

**Phase 3 — Airdrop to all holders**
1. Write a `airdrop-holders.ts` script that:
   - Reads the snapshot
   - Calls `mintTo(holderAddress, tokenCount)` for each holder in batches
   - Assigns equivalent token IDs (or sequential, since traits are not token-ID-specific)
   - Confirms each batch transaction before continuing
2. Run the airdrop — at 50 per tx, this takes at minimum 20 transactions
3. Verify all 1,000 tokens re-minted across correct holders

**Phase 4 — Cutover**
1. Update `frontend/src/config.ts` with new contract address
2. Update the OPScan footer link in `App.tsx`
3. Deploy frontend
4. Announce migration on Twitter/Telegram with old → new contract mapping
5. Old contract: add a note to the frontend that it is deprecated

**Pros:** Clean slate, audit-compliant, correct event names
**Cons:** Requires public coordination, risk of holder confusion, complex airdrop logistics, ~100,000–200,000 sats in gas, social overhead

**Effort:** 1–2 days minimum

---

### Option B — Critical Unknowns

Before committing to Option B, these questions must be answered:

| Question | Why it matters |
|---|---|
| How many unique holders are there? | Determines airdrop complexity |
| Does OPNet RPC expose a `balanceOf`/`ownerOf` enumeration API? | Required to snapshot holders — `tokenOfOwnerByIndex` works per-address but we need all addresses first |
| Will OPScan provide a holder list export? | Alternative snapshot method |
| Are holders willing to accept a new contract address? | Social risk — some may see it as a rug |
| Does OPNet wallet auto-recognise new contract or require manual re-add? | UX impact on holders |

---

## 4. Immediate Action (Do This Today)

**Call `changeMetadata()` on the existing contract.** One transaction, fixes the wallet display for all holders immediately. This is low-risk and should be done regardless of which longer-term path is chosen.

Fields to set:
- `icon`: `https://www.magicinternet.meme/opnetard-banner.png` (square image preferred — create dedicated 400×400 icon if possible)
- `banner`: `https://www.magicinternet.meme/opnetard-banner.png`
- `description`: `Me are OPNETARD. 1,000 unique Opnetards on Bitcoin via OPNet.`
- `website`: `https://opnetard.com`

---

## 5. Decision Framework

```
Anakun shares specific exploit vector?
├── YES → Is it exploitable against token holders (theft/burn)?
│         ├── YES → Option B (redeploy + airdrop) — urgently
│         └── NO  → Option A (patch in place) — monitor
└── NO  → Option A (patch in place)
           └── Monitor: do wallets/marketplaces break on transfers?
                        ├── YES → Option B
                        └── NO  → Stay on Option A indefinitely
```

**Default recommendation: Option A.** The storage layout and `_mint` implementation are identical between rc.10 and 1.11.0 final. No StoredBoolean is used. The primary confirmed risk is the event name change, which is a compatibility issue not a security one. A distributed-holder migration should only be triggered by a concrete, confirmed exploit.
