/**
 * OpnetardNFT contract ABI and typed interface.
 */

import {
    ABIDataTypes,
    BitcoinAbiTypes,
    type BitcoinInterfaceAbi,
    type BaseContractProperties,
    type CallResult,
    OP_NET_ABI,
} from 'opnet';
import type { Address } from '@btc-vision/transaction';

// ── ABI ───────────────────────────────────────────────────────────────────────

export const OPNETARD_NFT_ABI: BitcoinInterfaceAbi = [
    {
        name: 'mint',
        inputs: [{ name: 'amount', type: ABIDataTypes.UINT64 }],
        outputs: [{ name: 'firstTokenId', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'mintTo',
        inputs: [
            { name: 'to', type: ABIDataTypes.ADDRESS },
            { name: 'amount', type: ABIDataTypes.UINT64 },
        ],
        outputs: [{ name: 'firstTokenId', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'equip',
        inputs: [{ name: 'tokenId', type: ABIDataTypes.UINT256 }],
        outputs: [{ name: 'success', type: ABIDataTypes.BOOL }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'unequip',
        inputs: [],
        outputs: [{ name: 'success', type: ABIDataTypes.BOOL }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'equipped',
        constant: true,
        inputs: [{ name: 'owner', type: ABIDataTypes.ADDRESS }],
        outputs: [{ name: 'tokenId', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'mintPrice',
        constant: true,
        inputs: [],
        outputs: [{ name: 'price', type: ABIDataTypes.UINT64 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'totalMinted',
        constant: true,
        inputs: [],
        outputs: [{ name: 'total', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'balanceOf',
        constant: true,
        inputs: [{ name: 'owner', type: ABIDataTypes.ADDRESS }],
        outputs: [{ name: 'balance', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'ownerOf',
        constant: true,
        inputs: [{ name: 'tokenId', type: ABIDataTypes.UINT256 }],
        outputs: [{ name: 'owner', type: ABIDataTypes.ADDRESS }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'tokenURI',
        constant: true,
        inputs: [{ name: 'tokenId', type: ABIDataTypes.UINT256 }],
        outputs: [{ name: 'uri', type: ABIDataTypes.STRING }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'tokenOfOwnerByIndex',
        constant: true,
        inputs: [
            { name: 'owner', type: ABIDataTypes.ADDRESS },
            { name: 'index', type: ABIDataTypes.UINT256 },
        ],
        outputs: [{ name: 'tokenId', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    ...OP_NET_ABI,
];

// ── Contract interface ────────────────────────────────────────────────────────

export interface IOpnetardNFTContract extends BaseContractProperties {
    mint(amount: bigint): Promise<CallResult<{ firstTokenId: bigint }>>;
    equip(tokenId: bigint): Promise<CallResult<{ success: boolean }>>;
    unequip(): Promise<CallResult<{ success: boolean }>>;
    equipped(owner: Address): Promise<CallResult<{ tokenId: bigint }>>;
    mintPrice(): Promise<CallResult<{ price: bigint }>>;
    totalMinted(): Promise<CallResult<{ total: bigint }>>;
    balanceOf(owner: Address): Promise<CallResult<{ balance: bigint }>>;
    ownerOf(tokenId: bigint): Promise<CallResult<{ owner: Address }>>;
    tokenURI(tokenId: bigint): Promise<CallResult<{ uri: string }>>;
    tokenOfOwnerByIndex(owner: Address, index: bigint): Promise<CallResult<{ tokenId: bigint }>>;
}
