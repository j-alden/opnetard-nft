/**
 * useGallery — load owned tokens for the connected wallet.
 */

import { useCallback } from 'react';
import { getContract, JSONRpcProvider } from 'opnet';
import { useNFTStore, type OwnedToken } from '../lib/store';
import { NETWORK, RPC_URL, NFT_CONTRACT_ADDRESS } from '../config';
import { OPNETARD_NFT_ABI, type IOpnetardNFTContract } from '../lib/contract';
import { useWallet } from './useWallet';

const provider = new JSONRpcProvider({ url: RPC_URL, network: NETWORK });

function ipfsToHttp(uri: string): string {
    if (uri.startsWith('ipfs://')) {
        return `https://gateway.pinata.cloud/ipfs/${uri.slice(7)}`;
    }
    return uri;
}

interface NFTMetadata {
    name: string;
    image: string;
    attributes: { trait_type: string; value: string }[];
}

async function fetchMetadata(tokenUri: string): Promise<NFTMetadata | null> {
    try {
        const url = ipfsToHttp(tokenUri);
        const res = await fetch(url);
        if (!res.ok) return null;
        return (await res.json()) as NFTMetadata;
    } catch {
        return null;
    }
}

export function useGallery() {
    const { address } = useWallet();
    const { setOwnedTokens } = useNFTStore();

    const loadGallery = useCallback(async () => {
        if (!address) return;

        const contract = getContract<IOpnetardNFTContract>(
            NFT_CONTRACT_ADDRESS,
            OPNETARD_NFT_ABI,
            provider,
            NETWORK,
            address,
        );

        const balanceResult = await contract.balanceOf(address);
        const count = Number(balanceResult.properties.balance);
        if (count === 0) {
            setOwnedTokens([]);
            return;
        }

        const equippedResult = await contract.equipped(address);
        const equippedId = equippedResult.properties.tokenId;

        // Enumerate tokens by index
        const tokenIds: bigint[] = await Promise.all(
            Array.from({ length: count }, (_, i) =>
                contract
                    .tokenOfOwnerByIndex(address, BigInt(i))
                    .then((r) => r.properties.tokenId),
            ),
        );

        // Load metadata for each token
        const tokens: OwnedToken[] = await Promise.all(
            tokenIds.map(async (tokenId): Promise<OwnedToken> => {
                const id = Number(tokenId);
                let metadataUri = '';
                let imageUrl = '';
                let name = `OPNETARD #${id}`;
                let attributes: { trait_type: string; value: string }[] = [];

                try {
                    const uriResult = await contract.tokenURI(tokenId);
                    metadataUri = uriResult.properties.uri;
                    const meta = await fetchMetadata(metadataUri);
                    if (meta) {
                        imageUrl = ipfsToHttp(meta.image);
                        name = meta.name;
                        attributes = meta.attributes;
                    }
                } catch {
                    // metadata unavailable — show placeholder
                }

                return {
                    tokenId: id,
                    metadataUri,
                    imageUrl,
                    name,
                    attributes,
                    equipped: tokenId === equippedId,
                };
            }),
        );

        setOwnedTokens(tokens.sort((a, b) => a.tokenId - b.tokenId));
    }, [address, setOwnedTokens]);

    return { loadGallery };
}
