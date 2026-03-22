import { Address, AddressMap, ExtendedAddressMap, SchnorrSignature } from '@btc-vision/transaction';
import { CallResult, OPNetEvent, IOP_NETContract } from 'opnet';

// ------------------------------------------------------------------
// Event Definitions
// ------------------------------------------------------------------
export type MintedEvent = {
    readonly to: Address;
    readonly firstTokenId: bigint;
    readonly amount: bigint;
    readonly to: Address;
    readonly amount: bigint;
};
export type EquippedEvent = {
    readonly owner: Address;
    readonly tokenId: bigint;
};

// ------------------------------------------------------------------
// Call Results
// ------------------------------------------------------------------

/**
 * @description Represents the result of the mint function call.
 */
export type Mint = CallResult<
    {
        firstTokenId: bigint;
    },
    OPNetEvent<MintedEvent>[]
>;

/**
 * @description Represents the result of the mintTo function call.
 */
export type MintTo = CallResult<
    {
        firstTokenId: bigint;
    },
    OPNetEvent<MintedEvent>[]
>;

/**
 * @description Represents the result of the equip function call.
 */
export type Equip = CallResult<
    {
        success: boolean;
    },
    OPNetEvent<EquippedEvent>[]
>;

/**
 * @description Represents the result of the unequip function call.
 */
export type Unequip = CallResult<
    {
        success: boolean;
    },
    OPNetEvent<EquippedEvent>[]
>;

/**
 * @description Represents the result of the updateMintPrice function call.
 */
export type UpdateMintPrice = CallResult<
    {
        success: boolean;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the setBaseURI function call.
 */
export type SetBaseURI = CallResult<
    {
        success: boolean;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the withdraw function call.
 */
export type Withdraw = CallResult<
    {
        amount: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the equipped function call.
 */
export type Equipped = CallResult<
    {
        tokenId: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the mintPrice function call.
 */
export type MintPrice = CallResult<
    {
        price: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the totalMinted function call.
 */
export type TotalMinted = CallResult<
    {
        total: bigint;
    },
    OPNetEvent<never>[]
>;

// ------------------------------------------------------------------
// IOpnetardNFT
// ------------------------------------------------------------------
export interface IOpnetardNFT extends IOP_NETContract {
    mint(amount: bigint): Promise<Mint>;
    mintTo(to: Address, amount: bigint): Promise<MintTo>;
    equip(tokenId: bigint): Promise<Equip>;
    unequip(): Promise<Unequip>;
    updateMintPrice(newPrice: bigint): Promise<UpdateMintPrice>;
    setBaseURI(uri: string): Promise<SetBaseURI>;
    withdraw(): Promise<Withdraw>;
    equipped(owner: Address): Promise<Equipped>;
    mintPrice(): Promise<MintPrice>;
    totalMinted(): Promise<TotalMinted>;
}
