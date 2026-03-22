import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CACHE_VERSION, MINT_PRICE_SATS } from '../config';

export interface OwnedToken {
    tokenId: number;
    metadataUri: string;
    imageUrl: string;
    name: string;
    attributes: { trait_type: string; value: string }[];
    equipped: boolean;
}

export type MintStatus =
    | 'idle'
    | 'simulating'
    | 'pending'
    | 'confirming'
    | 'success'
    | 'error';

interface NFTStore {
    mintStatus: MintStatus;
    mintTxId: string | null;
    mintError: string | null;
    mintedTokenIds: number[];
    setMintStatus: (status: MintStatus) => void;
    setMintResult: (txId: string, tokenIds: number[]) => void;
    setMintError: (error: string) => void;
    resetMint: () => void;

    totalMinted: number;
    setTotalMinted: (n: number) => void;
    mintPrice: bigint;
    setMintPrice: (price: bigint) => void;

    ownedTokens: OwnedToken[];
    setOwnedTokens: (tokens: OwnedToken[]) => void;
    updateToken: (tokenId: number, update: Partial<OwnedToken>) => void;
}

export const useNFTStore = create<NFTStore>()(
    persist(
        (set) => ({
            mintStatus: 'idle',
            mintTxId: null,
            mintError: null,
            mintedTokenIds: [],
            setMintStatus: (mintStatus) => set({ mintStatus }),
            setMintResult: (txId, tokenIds) =>
                set({ mintStatus: 'success', mintTxId: txId, mintedTokenIds: tokenIds }),
            setMintError: (error) => set({ mintStatus: 'error', mintError: error }),
            resetMint: () =>
                set({ mintStatus: 'idle', mintTxId: null, mintError: null, mintedTokenIds: [] }),

            totalMinted: 0,
            setTotalMinted: (totalMinted) => set({ totalMinted }),
            mintPrice: MINT_PRICE_SATS,
            setMintPrice: (mintPrice) => set({ mintPrice }),

            ownedTokens: [],
            setOwnedTokens: (ownedTokens) => set({ ownedTokens }),
            updateToken: (tokenId, update) =>
                set((state) => ({
                    ownedTokens: state.ownedTokens.map((t) =>
                        t.tokenId === tokenId ? { ...t, ...update } : t,
                    ),
                })),
        }),
        {
            name: 'opnetard-nft-store',
            version: CACHE_VERSION,
        },
    ),
);
