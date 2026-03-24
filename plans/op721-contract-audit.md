# OPNETARD NFT — Contract Situation & Resolution Plan

**Date:** 2026-03-23
**Contract:** `op1sqppm2hmzkynx0jl3yjjhhldd6e80rxm49g7aauhf`
**OPScan:** https://opscan.org/contracts/0x0f9fd9d56df74d6b0d4300c01893afdfa5b034f2eedb3bf5e212df8a29d6c6dc?network=mainnet
**Status:** All 1,000 tokens minted, distributed to community holders
**btc-runtime compiled against:** `1.11.0-rc.10`
**btc-runtime latest:** `1.11.0` (final, post-Verichains audit)

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
| Collection metadata (icon/banner/description/website) | Set via `changeMetadata()` tx on 2026-03-24 |
| baseURI | `https://oclumhz0aoevupwq.public.blob.vercel-storage.com/nft/metadata/` |

---

## 2. Contract Source

**File:** `contracts/src/OpnetardNFT.ts`
**Base class:** `@btc-vision/btc-runtime@1.11.0-rc.10` → `OP721` → `ReentrancyGuard` → `OP_NET`

The full inheritance chain matters because vulnerabilities in any base class affect this contract. The Verichains audit covered the entire btc-runtime library.

### Inheritance chain summary

```
OpnetardNFT
  └─ OP721          (NFT standard: ownership, transfer, approval, enumeration)
       └─ ReentrancyGuard  (uses StoredBoolean for _locked ← KEY CONCERN)
            └─ OP_NET       (base contract: deployment, execution dispatch, deployer tracking)
```

### Storage pointer layout (order is immutable — changing breaks all existing state)

```typescript
// OP721 base — allocated first, in this order:
const stringPointer            = Blockchain.nextPointer; // StoredString subSlots: 0=name,2=symbol,3=baseURI,4=banner,5=icon,6=desc,7=website
const totalSupplyPointer       = Blockchain.nextPointer;
const maxSupplyPointer         = Blockchain.nextPointer;
const ownerOfMapPointer        = Blockchain.nextPointer;
const tokenApprovalMapPointer  = Blockchain.nextPointer;
const operatorApprovalMapPointer = Blockchain.nextPointer;
const balanceOfMapPointer      = Blockchain.nextPointer;
const tokenURIMapPointer       = Blockchain.nextPointer;
const nextTokenIdPointer       = Blockchain.nextPointer; // allocated but never used by OpnetardNFT
const ownerTokensMapPointer    = Blockchain.nextPointer;
const tokenIndexMapPointer     = Blockchain.nextPointer;
const initializedPointer       = Blockchain.nextPointer;
const tokenURICounterPointer   = Blockchain.nextPointer;
const approveNonceMapPointer   = Blockchain.nextPointer;

// ReentrancyGuard — allocated next:
const statusPointer            = Blockchain.nextPointer; // StoredBoolean _locked
const depthPointer             = Blockchain.nextPointer; // StoredU256 _reentrancyDepth

// OpnetardNFT custom — allocated last:
const mintPricePointer         = Blockchain.nextPointer; // StoredU64
const equippedPointer          = Blockchain.nextPointer; // StoredMapU256
const mintIndexPointer         = Blockchain.nextPointer; // StoredU256
const collectedSatsPointer     = Blockchain.nextPointer; // StoredU256
```

---

## 3. Security Findings

Findings are organized by severity. Each includes the relevant code from the deployed source so an external reviewer can follow the exact path.

---

### Finding F1 — ReentrancyGuard uses StoredBoolean (Verichains audit scope)
**Severity: HIGH (unquantified without audit report)**
**Contract path:** `OpnetardNFT → OP721 → ReentrancyGuard._locked`

`ReentrancyGuard` stores its lock flag in a `StoredBoolean`:

```typescript
// ReentrancyGuard.ts (rc.10 — deployed version)
export class ReentrancyGuard extends OP_NET {
    protected readonly _locked: StoredBoolean;
    protected readonly _reentrancyDepth: StoredU256;

    protected constructor() {
        super();
        this._locked = new StoredBoolean(statusPointer, false);
        this._reentrancyDepth = new StoredU256(depthPointer, EMPTY_POINTER);
    }

    public nonReentrantBefore(): void {
        if (this.reentrancyLevel === ReentrancyLevel.STANDARD) {
            if (this._locked.value) {         // ← reads StoredBoolean
                this.reentrancyGuardReentrantCall();
            }
            this._locked.value = true;        // ← writes StoredBoolean
        } else if (this.reentrancyLevel === ReentrancyLevel.CALLBACK) {
            const currentDepth = this._reentrancyDepth.value;
            if (currentDepth >= u256.One) {
                throw new Revert('ReentrancyGuard: Max depth exceeded');
            }
            this._reentrancyDepth.value = SafeMath.add(currentDepth, u256.One);
            if (currentDepth.isZero()) {
                this._locked.value = true;    // ← writes StoredBoolean
            }
        }
    }
}
```

`StoredBoolean` implementation in rc.10:

```typescript
// StoredBoolean.ts (rc.10 — deployed version)
export class StoredBoolean {
    private readonly pointerBuffer: Uint8Array;
    private _value: Uint8Array;

    constructor(public pointer: u16, defaultValue: bool) {
        this.pointerBuffer = encodePointer(pointer, EMPTY_POINTER, true, 'StoredBoolean');
        const value = GET_EMPTY_BUFFER();
        if (defaultValue) { value[0] = 1; }
        this._value = value;
    }

    public get value(): bool {
        this.ensureValue();          // always re-reads from storage on every get
        return this._value[0] === 1;
    }

    public set value(value: bool) {
        this._value[0] = value ? 1 : 0;
        Blockchain.setStorageAt(this.pointerBuffer, this._value);
    }

    private ensureValue(): void {
        this._value = Blockchain.getStorageAt(this.pointerBuffer);  // overwrites _value
    }
}
```

**The concern:** The Verichains audit commit message references "fix StoredBoolean." Without the audit report we cannot see what was wrong, but it was significant enough to list alongside security findings. The entire reentrancy protection for this contract depends on `StoredBoolean` working correctly. If `_locked` reads incorrectly (e.g., always returns false due to a byte-encoding bug), the guard is bypassed.

**OP721 reentrancy level is STANDARD** (default from `ReentrancyGuard`). Every state-mutating call goes through `nonReentrantBefore()` and `nonReentrantAfter()`. If the lock doesn't hold between a `_transfer` and a re-entrant callback, a token could be double-spent.

**Observed behavior:** All 1,000 mints succeeded with no reported reentrancy issues. However, the mint path does not make external calls before state is committed (the custom `MintedEvent` is emitted after all `_mint` calls complete), so the reentrancy surface in practice is low for minting. The concern is more relevant for `safeTransfer` and future contract interactions.

---

### Finding F2 — Payment validation does not verify output recipient
**Severity: HIGH (exploitable while minting was active; historical now that supply is 0)**
**Contract path:** `OpnetardNFT.mint()` lines 132–146

```typescript
// OpnetardNFT.ts
const mintPrice: u64 = this.mintPriceStorage.get(0);
const totalPrice: u64 = SafeMath.mul64(mintPrice, amount);
const outputs = Blockchain.tx.outputs;
let paymentFound: bool = false;

for (let i: i32 = 1; i < outputs.length; i++) {
    if (u64(outputs[i].value) >= totalPrice) {
        paymentFound = true;
        break;
    }
}

if (!paymentFound) {
    throw new Revert('INSUFFICIENT_PAYMENT');
}
```

**The problem:** The check verifies that *some* output at index 1+ has a value ≥ totalPrice. It does **not** check the recipient address of that output. In OPNet, the client constructs the Bitcoin transaction. An attacker can include a large self-change output to satisfy the value check while routing zero sats to the deployer's payment address. The payment check passes; the deployer receives nothing.

**Compound factor (see F3):** If `mintPriceStorage` is effectively 0, then `totalPrice = 0`, and `outputs[i].value >= 0` is trivially true for every output, making payment entirely convention-based rather than enforced on-chain.

**Fix for any redeployment:** Check the output address — something like `outputs[i].address == CONTRACT_PAYMENT_ADDRESS && u64(outputs[i].value) >= totalPrice`.

---

### Finding F3 — `mintPriceStorage` never `save()`d; mint price may be 0 on-chain
**Severity: HIGH (payment enforcement concern)**
**Contract path:** `OpnetardNFT.onDeployment()` and `StoredU64.save()`

`StoredU64` requires an explicit `save()` call to persist to storage:

```typescript
// StoredU64.ts
public set(index: u8, value: u64): void {
    assert(index < 4, '...');
    this.ensureValues();
    if (this._values[index] != value) {
        this._values[index] = value;
        this.isChanged = true;    // marks dirty but does NOT write to storage
    }
}

public save(): void {
    if (this.isChanged) {
        const packed = this.packValues();
        Blockchain.setStorageAt(this.bufferPointer, packed);  // ← only this persists
        this.isChanged = false;
    }
}
```

`onDeployment()` sets the default price but never calls `save()`:

```typescript
// OpnetardNFT.ts — onDeployment
public override onDeployment(_calldata: Calldata): void {
    const params = new OP721InitParameters(...);
    this.instantiate(params);
    this.mintPriceStorage.set(0, DEFAULT_MINT_PRICE_SATS);  // sets in-memory cache only
    // save() never called — if OPNet doesn't auto-flush, price = 0 forever
}
```

Compare with `MerkleClaim` in the same codebase, which correctly calls `save()`:

```typescript
// MerkleClaim.ts — onDeployment (correct pattern)
this.claimDeadline.set(0, deadline);
this.claimDeadline.save();  // ← explicit persist
```

**Implications if OPNet does not auto-flush dirty storage:**
- `mintPrice()` always returns `0`
- `totalPrice = SafeMath.mul64(0, amount) = 0`
- Payment check: any output with value ≥ 0 passes — trivially always true
- `collectedSats` accumulated `0 × amount = 0` per transaction, so `withdraw()` returns 0
- The 10,000 sats per NFT users actually paid went to the deployer as Bitcoin UTXOs because the frontend constructed the transaction to do so — not because the contract enforced it

**`updateMintPrice()` has the same issue** — it also never calls `save()`, meaning the price cannot be updated on-chain either.

**Observed behavior:** 1,000 NFTs were minted. The frontend hardcoded 10,000 sats and all users paid that amount voluntarily because the frontend told them to. If the price was never enforced on-chain, free mints were technically possible for any user who bypassed the frontend and called the contract directly with a zero-value output.

---

### Finding F4 — Address equality via `===` / `!==` (potential reference equality issue)
**Severity: MEDIUM**
**Contract path:** `OP721._transfer()`, `OP721._burn()`, `OP721._approve()`

In AssemblyScript, `===` on reference types performs reference equality (same pointer), not value equality (same bytes). The OP721 base class uses `===` and `!==` extensively for address comparisons:

```typescript
// OP721._transfer() — rc.10
protected _transfer(from: Address, to: Address, tokenId: u256): void {
    if (from === to) return;              // self-transfer skip

    const owner = this._ownerOf(tokenId);
    if (owner !== from) {                 // ownership check
        throw new Revert('Transfer from incorrect owner');
    }

    const sender = Blockchain.tx.sender;
    if (sender !== from && !this._isApprovedForAll(from, sender)) {
        const approved = this._addressFromU256(this.tokenApprovalMap.get(tokenId));
        if (approved !== sender) {        // approval check
            throw new Revert('Not authorized to transfer');
        }
    }
}
```

```typescript
// OP721._burn() — rc.10
if (
    owner !== Blockchain.tx.sender &&
    !this._isApprovedForAll(owner, Blockchain.tx.sender)
) {
    const approved = this._addressFromU256(this.tokenApprovalMap.get(tokenId));
    if (approved !== Blockchain.tx.sender) {
        throw new Revert('Not authorized to burn');
    }
}
```

**The concern:** If `owner` and `Blockchain.tx.sender` are two different AssemblyScript objects with the same 32-byte content, `owner !== Blockchain.tx.sender` evaluates to `true` even though they represent the same address. This would cause the owner's own `_burn` or `_transfer` to be incorrectly rejected, or cause authorization to pass for addresses that shouldn't be authorized.

**In practice:** The OPNet runtime may intern address objects such that the same 32-byte address always returns the same heap pointer, making reference equality equivalent to value equality. This behavior is not documented and not guaranteed by the AssemblyScript language spec. The risk depends entirely on how `Blockchain.tx.sender`, `_ownerOf()`, and `_addressFromU256()` allocate memory.

**The `Address.zero()` case** is safer — if `Address.zero()` returns a well-known singleton, then `to === Address.zero()` is reliable. But comparisons between two non-singleton addresses (e.g., `owner !== from` where both come from calldata or storage reads) are the risky case.

---

### Finding F5 — Dual supply counters; `mintIndexStorage` is redundant with `_totalSupply`
**Severity: MEDIUM**
**Contract path:** `OpnetardNFT.mint()` and `OpnetardNFT.mintTo()`

Both `mint()` and `mintTo()` maintain two separate supply counters in the same transaction:

```typescript
// OpnetardNFT.mint()
for (let i: u64 = 0; i < amount; i++) {
    const tokenId: u256 = SafeMath.add(currentSupply, u256.fromU64(i + 1));
    this._mint(caller, tokenId);    // updates _totalSupply inside OP721 base
}

this.mintIndexStorage.value = SafeMath.add(  // ALSO increments this counter
    this.mintIndexStorage.value,
    u256.fromU64(amount),
);
```

`_mint()` in OP721 already increments `_totalSupply`:

```typescript
// OP721._mint()
this._totalSupply.value = SafeMath.add(this._totalSupply.value, u256.One);
```

**The result:** Two storage writes per token minted tracking the same quantity. `totalMinted()` returns `mintIndexStorage`; `totalSupply()` (from OP721 base) returns `_totalSupply`. If a transaction reverts between the `_mint` loop and the `mintIndexStorage` update, the two values diverge. External callers reading both views would see inconsistent state.

Additionally: `mint()` pre-calculates `firstTokenId = currentSupply + 1` from `_totalSupply` before the loop, then assigns IDs as `currentSupply + i + 1`. This is correct, but uses `_totalSupply` as the authoritative source while also maintaining a separate parallel counter.

---

### Finding F6 — `withdraw()` is accounting-only; no BTC is transferred
**Severity: LOW (by design, but misleading)**
**Contract path:** `OpnetardNFT.withdraw()`

```typescript
@method()
@returns({ name: 'amount', type: ABIDataTypes.UINT256 })
public withdraw(_calldata: Calldata): BytesWriter {
    this.onlyDeployer(Blockchain.tx.sender);

    const amount = this.collectedSats.value;
    this.collectedSats.value = u256.Zero;  // zeros the counter

    const writer = new BytesWriter(U256_BYTE_LENGTH);
    writer.writeU256(amount);              // returns the (now zeroed) counter
    return writer;
}
```

This function does not move any Bitcoin. In OPNet, payments to the deployer are direct Bitcoin transaction outputs (UTXOs) that land in the deployer's wallet immediately upon block confirmation. There is no escrow contract holding the BTC. `collectedSats` is purely an accounting counter incremented at mint time by `totalPrice` (see F3 — may always be zero). Calling `withdraw()` clears this counter and emits no real funds.

**Risk:** The name `withdraw()` implies a BTC withdrawal. If the deployer or a future developer expects this to actually move funds, they could believe funds have been withdrawn when they have not — or vice versa.

---

### Finding F7 — Silent self-transfer (no revert, no event)
**Severity: LOW**
**Contract path:** `OP721._transfer()`

```typescript
protected _transfer(from: Address, to: Address, tokenId: u256): void {
    if (from === to) return;  // ← returns silently with no state change, no event
    ...
}
```

A transfer where `from === to` succeeds (no revert) but does nothing and emits no `Transferred` event. A caller watching for the transfer event would see nothing, while the transaction itself succeeds. This could confuse off-chain indexers that assume a successful call implies an event.

---

### Finding F8 — `_nextTokenId` storage slot allocated but never used
**Severity: INFO**
**Contract path:** `OP721` constructor

OP721 allocates and initializes a `_nextTokenId` storage slot:

```typescript
// OP721.ts
const nextTokenIdPointer: u16 = Blockchain.nextPointer;
...
this._nextTokenId = new StoredU256(nextTokenIdPointer, EMPTY_POINTER);
...
// in instantiate():
this._nextTokenId.value = u256.One;
```

`OpnetardNFT.mint()` ignores `_nextTokenId` entirely. Token IDs are derived from `_totalSupply` at the start of each call (`currentSupply + 1..N`). The `_nextTokenId` slot occupies a storage pointer, is set to `1` on deployment, and is never read or written again. It does not affect correctness but wastes gas on writes and creates confusion about which counter is authoritative.

---

### Finding F9 — EXPERIMENTAL label on OP721 base class
**Severity: INFO**
**Location:** First line of `OP721.ts` in btc-runtime

```typescript
// THIS STANDARD IS EXPERIMENTAL AND SHOULDN'T BE USED IN REAL PROJECTS
// CONTRACTS USING THIS COULD BREAK IN THE FUTURE
```

This header was present in rc.10 (compiled against) and is still present in the installed version. The OPNet team explicitly tagged this standard as experimental. This is not a code vulnerability but is relevant context for an external reviewer — the base class the entire contract is built on was not declared production-ready at the time of deployment.

---

### Finding F10 — `MAX_MINT_PER_TX = 5` applies to deployer (`mintTo`) as well
**Severity: INFO (relevant for Option B redeployment)**

```typescript
// OpnetardNFT.mintTo() — deployer-only
public mintTo(calldata: Calldata): BytesWriter {
    this.onlyDeployer(Blockchain.tx.sender);
    ...
    if (amount == 0 || amount > MAX_MINT_PER_TX) {
        throw new Revert('INVALID_AMOUNT');
    }
    ...
}
```

If Option B (redeploy + airdrop) is executed, the `mintTo()` function used for the airdrop is limited to 5 tokens per call. With 1,000 tokens and an average holder count TBD, this means a minimum of 200 transactions for the airdrop, each requiring a Bitcoin block confirmation cycle. This constraint is locked into the WASM; it cannot be bypassed without redeployment.

---

## 4. Summary Table

| ID | Finding | Severity | Affects current deployment | Fix without redeploy |
|---|---|---|---|---|
| F1 | ReentrancyGuard uses StoredBoolean (Verichains scope) | HIGH | Yes, if StoredBoolean is buggy | No |
| F2 | Payment check doesn't verify output recipient | HIGH | Historical (supply = 0) | No |
| F3 | mintPriceStorage never `save()`d; price may be 0 | HIGH | Historical (supply = 0) | No |
| F4 | Address comparison with `===` (reference equality) | MEDIUM | Yes, for transfers/burns | No |
| F5 | Dual supply counters can diverge | MEDIUM | Low probability | No |
| F6 | `withdraw()` doesn't move BTC | LOW | Yes, but by design | N/A |
| F7 | Silent self-transfer | LOW | Yes | No |
| F8 | `_nextTokenId` slot allocated but unused | INFO | No | N/A |
| F9 | OP721 labeled EXPERIMENTAL by btc-runtime team | INFO | Context only | N/A |
| F10 | `mintTo()` capped at 5 per tx (airdrop impact) | INFO | Only if redeploying | No |

---

## 5. Resolution Options

### Option A — Patch in Place (No Redeploy) ← Recommended
**Best choice given tokens are distributed across community holders.**

Redeployment with distributed holders requires snapshotting every holder, coordinating a new contract address announcement, and airdropping to potentially hundreds of wallets. The cost-benefit only justifies this if there is a confirmed active exploit.

**Steps:**
1. ~~Call `changeMetadata()` — done 2026-03-24~~ ✓
2. Monitor for wallet/indexer breakage due to event name change (F4/Issue 2)
3. Request specific Verichains audit findings from Anakun — particularly whether `StoredBoolean` had a read or write correctness bug (F1)
4. If a concrete exploit is confirmed via F1 (reentrant double-spend via broken lock), escalate to Option B

**Pros:** No disruption to holders, no new contract address, fast
**Cons:** F1 (StoredBoolean reentrancy) and F4 (address reference equality) remain unquantified risks

---

### Option B — Full Redeploy + Community Airdrop
**Only warranted if a concrete exploit is confirmed by Anakun.**

With tokens distributed across the community this is a significant coordination effort.

**Phase 1 — Snapshot holders**
1. Query OPNet RPC or OPScan API to enumerate all holders of the current contract
2. For each holder, record: `{tweakedPubKey, tokenIds[]}`
3. Verify snapshot total = 1,000 tokens across all holders
4. Announce publicly that the old contract is being migrated

**Phase 2 — Deploy new contract**
1. Update contract source:
   - Upgrade `@btc-vision/btc-runtime` to `latest` (1.11.0 final)
   - Upgrade `@btc-vision/as-bignum` to `1.0.0`
   - Upgrade `@btc-vision/opnet-transform` to `1.2.2`
   - Change `MAX_MINT_PER_TX` from `5` to `50` (reduces airdrop tx count)
   - Fix F3: add `this.mintPriceStorage.save()` in `onDeployment()` and `updateMintPrice()`
   - Fix F2: add output recipient address check in payment validation
   - Populate `OP721InitParameters` with full collection metadata
2. Rebuild: `cd contracts && npm install && npm run build && npm run typecheck`
3. Deploy new contract
4. Set `baseURI` and call `changeMetadata()` on new contract

**Phase 3 — Airdrop to all holders**
1. Write an `airdrop-holders.ts` script that:
   - Reads the snapshot
   - Calls `mintTo(holderAddress, amount)` for each holder in batches
   - Confirms each batch transaction before continuing
2. At 50 per tx (after fix): minimum 20 transactions total
3. Verify all 1,000 tokens re-minted across correct holders

**Phase 4 — Cutover**
1. Update `frontend/src/config.ts` with new contract address
2. Update the OPScan footer link in `App.tsx`
3. Deploy frontend
4. Announce migration on Twitter/Telegram with old → new contract mapping

**Pros:** Clean slate, audit-compliant, correct event names, F2/F3/F4 fixed
**Cons:** Requires public coordination, risk of holder confusion, complex airdrop logistics, ~100,000–200,000 sats in gas, social overhead

---

### Option B — Critical Unknowns

| Question | Why it matters |
|---|---|
| How many unique holders are there? | Determines airdrop complexity |
| Does OPNet RPC expose holder enumeration? | Required to snapshot holders |
| Will OPScan provide a holder list export? | Alternative snapshot method |
| Are holders willing to accept a new contract address? | Social risk |
| Does OPNet wallet auto-recognise new contract or require manual re-add? | UX impact |

---

## 6. Decision Framework

```
Anakun confirms StoredBoolean had read/write correctness bug? (F1)
├── YES → Reentrancy guard may be bypassed
│         └── Is there a realistic callback path in current token operations?
│              ├── YES (safeTransfer to contract) → Option B urgently
│              └── NO (pure NFT transfers only) → Option A with monitoring
└── NO  → Option A (patch in place)
           └── Monitor: do wallets/marketplaces break on transfers?
                        ├── YES (F4 reference equality bites) → Option B
                        └── NO  → Stay on Option A indefinitely
```

**Default recommendation: Option A.** The storage layout and `_mint` implementation are identical between rc.10 and 1.11.0 final. No StoredBoolean-based logic is exercised in the hot path (mint is no longer possible; transfers don't make external calls unless `safeTransfer` is used). The primary unresolved risk is F1 (StoredBoolean correctness in ReentrancyGuard), which requires Anakun's input to quantify.

---

## 7. References

- Contract source: `contracts/src/OpnetardNFT.ts`
- btc-runtime source (rc.10 installed): `contracts/node_modules/@btc-vision/btc-runtime/runtime/`
- Key files: `OP721.ts`, `ReentrancyGuard.ts`, `StoredBoolean.ts`, `AddressMemoryMap.ts`, `abi.ts`
- setBaseURI tx: `59799eb745bc15fe36df33091da71465c298f842faa95e62dead1ed4b7a9a670`
- changeMetadata tx: `c22bb40145680916c07cfb12005b00713b9cb5f5a0cc0816d7a067e929d006ec`
