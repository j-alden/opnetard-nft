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
    mintAmount: number;
    setMintStatus: (status: MintStatus) => void;
    setMintTxId: (txId: string) => void;
    setMintResult: (txId: string, tokenIds: number[]) => void;
    setMintError: (error: string) => void;
    setMintAmount: (n: number) => void;
    resetMint: () => void;

    totalMinted: number;
    setTotalMinted: (n: number) => void;
    mintPrice: number;
    setMintPrice: (price: bigint | number) => void;

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
            mintAmount: 0,
            setMintStatus: (mintStatus) => set({ mintStatus }),
            setMintTxId: (mintTxId) => set({ mintTxId }),
            setMintResult: (txId, tokenIds) =>
                set({ mintStatus: 'success', mintTxId: txId, mintedTokenIds: tokenIds }),
            setMintError: (error) => set({ mintStatus: 'error', mintError: error }),
            setMintAmount: (mintAmount) => set({ mintAmount }),
            resetMint: () =>
                set({ mintStatus: 'idle', mintTxId: null, mintError: null, mintedTokenIds: [], mintAmount: 0 }),

            totalMinted: 0,
            setTotalMinted: (totalMinted) => set({ totalMinted }),
            mintPrice: MINT_PRICE_SATS,
            setMintPrice: (price) => set({ mintPrice: Number(price) }),

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
            // Persist gallery + in-flight mint so txId survives a page refresh.
            // 'confirming' resumes polling on next load; 'success' keeps the receipt visible.
            partialize: (state) => ({
                ownedTokens: state.ownedTokens,
                mintTxId: state.mintTxId,
                mintAmount: state.mintAmount,
                mintedTokenIds: state.mintedTokenIds,
                mintStatus: (state.mintStatus === 'confirming' || state.mintStatus === 'success')
                    ? state.mintStatus
                    : 'idle',
            }),
        },
    ),
);
