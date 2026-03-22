import { ABIDataTypes, BitcoinAbiTypes, OP_NET_ABI } from 'opnet';

export const OpnetardNFTEvents = [
    {
        name: 'Minted',
        values: [
            { name: 'to', type: ABIDataTypes.ADDRESS },
            { name: 'firstTokenId', type: ABIDataTypes.UINT256 },
            { name: 'amount', type: ABIDataTypes.UINT64 },
            { name: 'to', type: ABIDataTypes.ADDRESS },
            { name: 'amount', type: ABIDataTypes.UINT256 },
        ],
        type: BitcoinAbiTypes.Event,
    },
    {
        name: 'Equipped',
        values: [
            { name: 'owner', type: ABIDataTypes.ADDRESS },
            { name: 'tokenId', type: ABIDataTypes.UINT256 },
        ],
        type: BitcoinAbiTypes.Event,
    },
];

export const OpnetardNFTAbi = [
    {
        name: 'mint',
        payable: true,
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
        name: 'updateMintPrice',
        inputs: [{ name: 'newPrice', type: ABIDataTypes.UINT64 }],
        outputs: [{ name: 'success', type: ABIDataTypes.BOOL }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'setBaseURI',
        inputs: [{ name: 'uri', type: ABIDataTypes.STRING }],
        outputs: [{ name: 'success', type: ABIDataTypes.BOOL }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'withdraw',
        inputs: [],
        outputs: [{ name: 'amount', type: ABIDataTypes.UINT256 }],
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
    ...OpnetardNFTEvents,
    ...OP_NET_ABI,
];

export default OpnetardNFTAbi;
