import {
    Address,
    ADDRESS_BYTE_LENGTH,
    Blockchain,
    BytesWriter,
    Calldata,
    EMPTY_POINTER,
    NetEvent,
    OP721,
    OP721InitParameters,
    Revert,
    SafeMath,
    StoredMapU256,
    StoredU256,
    StoredU64,
    U256_BYTE_LENGTH,
} from '@btc-vision/btc-runtime/runtime';
import { u256 } from '@btc-vision/as-bignum/assembly';

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_SUPPLY_U32: u32 = 1_000;
const MAX_SUPPLY: u256 = u256.fromU32(MAX_SUPPLY_U32);

// ~$10 at current BTC price. Owner can update via updateMintPrice().
const DEFAULT_MINT_PRICE_SATS: u64 = 10_000;

const MAX_MINT_PER_TX: u64 = 5;

// ── Storage pointers — NEVER reorder, only append ────────────────────────────
// (allocated after OP721's internal pointers)

const mintPricePointer: u16 = Blockchain.nextPointer;
const equippedPointer: u16 = Blockchain.nextPointer;
const mintIndexPointer: u16 = Blockchain.nextPointer;
const collectedSatsPointer: u16 = Blockchain.nextPointer;

// ── Events ────────────────────────────────────────────────────────────────────

/**
 * Emitted on every mint. Carries the minter address and first tokenId minted.
 * Amount is included so clients know how many tokens were minted.
 */
class MintedEvent extends NetEvent {
    constructor(to: Address, firstTokenId: u256, amount: u64) {
        const writer = new BytesWriter(ADDRESS_BYTE_LENGTH + U256_BYTE_LENGTH + 8);
        writer.writeAddress(to);
        writer.writeU256(firstTokenId);
        writer.writeU64(amount);
        super('Minted', writer);
    }
}

/**
 * Emitted when an owner equips or unequips a token as their active avatar.
 * tokenId=0 means unequipped.
 */
class EquippedEvent extends NetEvent {
    constructor(owner: Address, tokenId: u256) {
        const writer = new BytesWriter(ADDRESS_BYTE_LENGTH + U256_BYTE_LENGTH);
        writer.writeAddress(owner);
        writer.writeU256(tokenId);
        super('Equipped', writer);
    }
}

// ── Contract ──────────────────────────────────────────────────────────────────

@final
export class OpnetardNFT extends OP721 {
    private readonly mintPriceStorage: StoredU64;
    private readonly equippedMap: StoredMapU256;
    private readonly mintIndexStorage: StoredU256;
    private readonly collectedSats: StoredU256;

    constructor() {
        super();

        const emptySubPtr = new Uint8Array(30);
        this.mintPriceStorage = new StoredU64(mintPricePointer, emptySubPtr);
        this.equippedMap = new StoredMapU256(equippedPointer);
        this.mintIndexStorage = new StoredU256(mintIndexPointer, EMPTY_POINTER);
        this.collectedSats = new StoredU256(collectedSatsPointer, EMPTY_POINTER);
    }

    /**
     * Runs once on deployment. BaseURI is set separately via setBaseURI()
     * to keep deployment tx size within OPNet limits.
     */
    public override onDeployment(_calldata: Calldata): void {
        const params = new OP721InitParameters(
            'OPNETARD',
            'OPTARDNFT',
            'https://oqo47j6pxmwuqzov.public.blob.vercel-storage.com/logos/og.png',
            MAX_SUPPLY,
            '',
        );
        this.instantiate(params);
        this.mintPriceStorage.set(0, DEFAULT_MINT_PRICE_SATS);
    }

    // ── Mint ─────────────────────────────────────────────────────────────────

    /**
     * Mint 1–5 NFTs. Payment must be present in transaction outputs.
     * Token IDs are assigned sequentially starting from 1.
     *
     * @param amount - Number of NFTs to mint (1–5)
     * @returns firstTokenId - The first token ID minted in this transaction
     */
    @method({ name: 'amount', type: ABIDataTypes.UINT64 })
    @returns({ name: 'firstTokenId', type: ABIDataTypes.UINT256 })
    @emit('Minted')
    @payable
    public mint(calldata: Calldata): BytesWriter {
        const amount: u64 = calldata.readU64();

        if (amount == 0 || amount > MAX_MINT_PER_TX) {
            throw new Revert('INVALID_AMOUNT');
        }

        const currentSupply: u256 = this._totalSupply.value;
        const amountU256: u256 = u256.fromU64(amount);

        if (SafeMath.add(currentSupply, amountU256) > MAX_SUPPLY) {
            throw new Revert('EXCEEDS_MAX_SUPPLY');
        }

        // ── Payment validation ────────────────────────────────────────────────
        // The frontend sends a BTC output to the deployer's payment address.
        // We verify that at least one output (index 1+) covers the total price.
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

        this.collectedSats.value = SafeMath.add(
            this.collectedSats.value,
            u256.fromU64(totalPrice),
        );

        // ── Mint tokens ───────────────────────────────────────────────────────
        const caller: Address = Blockchain.tx.sender;
        const firstTokenId: u256 = SafeMath.add(currentSupply, u256.One);

        for (let i: u64 = 0; i < amount; i++) {
            const tokenId: u256 = SafeMath.add(currentSupply, u256.fromU64(i + 1));
            this._mint(caller, tokenId);
        }

        this.mintIndexStorage.value = SafeMath.add(
            this.mintIndexStorage.value,
            u256.fromU64(amount),
        );

        this.emitEvent(new MintedEvent(caller, firstTokenId, amount));

        const writer = new BytesWriter(U256_BYTE_LENGTH);
        writer.writeU256(firstTokenId);
        return writer;
    }

    /**
     * Mint tokens to a specific address. Owner-only.
     *
     * @param to     - Recipient address
     * @param amount - Number of NFTs to mint (1–5)
     * @returns firstTokenId
     */
    @method(
        { name: 'to', type: ABIDataTypes.ADDRESS },
        { name: 'amount', type: ABIDataTypes.UINT64 },
    )
    @returns({ name: 'firstTokenId', type: ABIDataTypes.UINT256 })
    @emit('Minted')
    public mintTo(calldata: Calldata): BytesWriter {
        this.onlyDeployer(Blockchain.tx.sender);

        const to: Address = calldata.readAddress();
        const amount: u64 = calldata.readU64();

        if (amount == 0 || amount > MAX_MINT_PER_TX) {
            throw new Revert('INVALID_AMOUNT');
        }

        const currentSupply: u256 = this._totalSupply.value;
        const amountU256: u256 = u256.fromU64(amount);

        if (SafeMath.add(currentSupply, amountU256) > MAX_SUPPLY) {
            throw new Revert('EXCEEDS_MAX_SUPPLY');
        }

        const firstTokenId: u256 = SafeMath.add(currentSupply, u256.One);

        for (let i: u64 = 0; i < amount; i++) {
            const tokenId: u256 = SafeMath.add(currentSupply, u256.fromU64(i + 1));
            this._mint(to, tokenId);
        }

        this.mintIndexStorage.value = SafeMath.add(
            this.mintIndexStorage.value,
            u256.fromU64(amount),
        );

        this.emitEvent(new MintedEvent(to, firstTokenId, amount));

        const writer = new BytesWriter(U256_BYTE_LENGTH);
        writer.writeU256(firstTokenId);
        return writer;
    }

    // ── Avatar / Equip ────────────────────────────────────────────────────────

    /**
     * Set a token as the caller's active on-chain avatar.
     * Caller must own the token.
     *
     * @param tokenId - The token to equip
     */
    @method({ name: 'tokenId', type: ABIDataTypes.UINT256 })
    @returns({ name: 'success', type: ABIDataTypes.BOOL })
    @emit('Equipped')
    public equip(calldata: Calldata): BytesWriter {
        const tokenId: u256 = calldata.readU256();
        const caller: Address = Blockchain.tx.sender;

        if (!this._exists(tokenId)) {
            throw new Revert('TOKEN_NOT_EXIST');
        }

        const owner: Address = this._ownerOf(tokenId);
        if (!caller.equals(owner)) {
            throw new Revert('NOT_TOKEN_OWNER');
        }

        const callerKey: u256 = this._u256FromAddress(caller);
        this.equippedMap.set(callerKey, tokenId);
        this.emitEvent(new EquippedEvent(caller, tokenId));

        const writer = new BytesWriter(1);
        writer.writeBoolean(true);
        return writer;
    }

    /**
     * Clear the caller's active avatar.
     */
    @method()
    @returns({ name: 'success', type: ABIDataTypes.BOOL })
    @emit('Equipped')
    public unequip(_calldata: Calldata): BytesWriter {
        const caller: Address = Blockchain.tx.sender;
        const callerKey: u256 = this._u256FromAddress(caller);

        this.equippedMap.set(callerKey, u256.Zero);
        this.emitEvent(new EquippedEvent(caller, u256.Zero));

        const writer = new BytesWriter(1);
        writer.writeBoolean(true);
        return writer;
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    /**
     * Update the mint price in satoshis. Owner-only.
     *
     * @param newPrice - New price in satoshis (must be > 0)
     */
    @method({ name: 'newPrice', type: ABIDataTypes.UINT64 })
    @returns({ name: 'success', type: ABIDataTypes.BOOL })
    public updateMintPrice(calldata: Calldata): BytesWriter {
        this.onlyDeployer(Blockchain.tx.sender);

        const newPrice: u64 = calldata.readU64();
        if (newPrice == 0) throw new Revert('INVALID_PRICE');

        this.mintPriceStorage.set(0, newPrice);

        const writer = new BytesWriter(1);
        writer.writeBoolean(true);
        return writer;
    }

    /**
     * Update the base URI for tokenURI. Owner-only.
     * Inherited _setBaseURI from OP721.
     *
     * @param uri - New base URI (e.g. "ipfs://newCID/")
     */
    @method({ name: 'uri', type: ABIDataTypes.STRING })
    @returns({ name: 'success', type: ABIDataTypes.BOOL })
    public setBaseURI(calldata: Calldata): BytesWriter {
        this.onlyDeployer(Blockchain.tx.sender);

        const uri: string = calldata.readStringWithLength();
        this._setBaseURI(uri);

        const writer = new BytesWriter(1);
        writer.writeBoolean(true);
        return writer;
    }

    /**
     * Withdraw collected BTC to the deployer. Owner-only.
     *
     * @returns amount - Total sats collected (for frontend display)
     */
    @method()
    @returns({ name: 'amount', type: ABIDataTypes.UINT256 })
    public withdraw(_calldata: Calldata): BytesWriter {
        this.onlyDeployer(Blockchain.tx.sender);

        const amount = this.collectedSats.value;
        this.collectedSats.value = u256.Zero;

        const writer = new BytesWriter(U256_BYTE_LENGTH);
        writer.writeU256(amount);
        return writer;
    }

    // ── View ──────────────────────────────────────────────────────────────────

    /**
     * Get the equipped token ID for a given owner address.
     * Returns 0 if nothing is equipped.
     *
     * @param owner - The address to query
     * @returns tokenId - Active avatar token ID (0 = none)
     */
    @view
    @method({ name: 'owner', type: ABIDataTypes.ADDRESS })
    @returns({ name: 'tokenId', type: ABIDataTypes.UINT256 })
    public equipped(calldata: Calldata): BytesWriter {
        const owner: Address = calldata.readAddress();
        const ownerKey: u256 = this._u256FromAddress(owner);
        const tokenId: u256 = this.equippedMap.get(ownerKey);

        const writer = new BytesWriter(U256_BYTE_LENGTH);
        writer.writeU256(tokenId);
        return writer;
    }

    /**
     * Get the current mint price in satoshis.
     *
     * @returns price - Current mint price in sats
     */
    @view
    @method()
    @returns({ name: 'price', type: ABIDataTypes.UINT64 })
    public mintPrice(_calldata: Calldata): BytesWriter {
        const price = this.mintPriceStorage.get(0);
        const writer = new BytesWriter(8);
        writer.writeU64(price);
        return writer;
    }

    /**
     * Get the total number of tokens minted so far.
     *
     * @returns total - Tokens minted
     */
    @view
    @method()
    @returns({ name: 'total', type: ABIDataTypes.UINT256 })
    public totalMinted(_calldata: Calldata): BytesWriter {
        const total = this.mintIndexStorage.value;
        const writer = new BytesWriter(U256_BYTE_LENGTH);
        writer.writeU256(total);
        return writer;
    }
}
