/**
 * useNFTContract — mint flow and contract interaction hook.
 */

import { useCallback } from 'react';
import { getContract, JSONRpcProvider } from 'opnet';
import { toSatoshi } from '@btc-vision/bitcoin';
import { useNFTStore } from '../lib/store';
import { NETWORK, RPC_URL, NFT_CONTRACT_ADDRESS, CONTRACT_PAYMENT_ADDRESS, MINT_PRICE_SATS } from '../config';
import { OPNETARD_NFT_ABI, type IOpnetardNFTContract } from '../lib/contract';
import { useWallet } from './useWallet';

const provider = new JSONRpcProvider({ url: RPC_URL, network: NETWORK });

// TransactionOutputFlags.hasTo = 1
const FLAGS_HAS_TO = 1;

export function useNFTContract() {
    const { address, walletAddress } = useWallet();
    const {
        setMintStatus,
        setMintResult,
        setMintError,
        resetMint,
        setTotalMinted,
        setMintPrice,
    } = useNFTStore();

    const loadStats = useCallback(async () => {
        if (!address) return;
        try {
            const contract = getContract<IOpnetardNFTContract>(
                NFT_CONTRACT_ADDRESS,
                OPNETARD_NFT_ABI,
                provider,
                NETWORK,
                address,
            );
            const [totalResult, priceResult] = await Promise.all([
                contract.totalMinted(),
                contract.mintPrice(),
            ]);
            setTotalMinted(Number(totalResult.properties.total));
            setMintPrice(priceResult.properties.price);
        } catch (err) {
            console.error('loadStats failed:', err);
        }
    }, [address, setTotalMinted, setMintPrice]);

    const mint = useCallback(
        async (amount: number) => {
            if (!address || !walletAddress) throw new Error('Wallet not connected');
            resetMint();
            setMintStatus('simulating');

            try {
                const contract = getContract<IOpnetardNFTContract>(
                    NFT_CONTRACT_ADDRESS,
                    OPNETARD_NFT_ABI,
                    provider,
                    NETWORK,
                    address,
                );

                const totalCost = MINT_PRICE_SATS * BigInt(amount);

                // Set payment output BEFORE simulate
                contract.setTransactionDetails({
                    inputs: [],
                    outputs: [{
                        to: CONTRACT_PAYMENT_ADDRESS,
                        value: totalCost,
                        index: 1,
                        flags: FLAGS_HAS_TO,
                    }],
                });

                const sim = await contract.mint(BigInt(amount));

                if (sim.revert) {
                    throw new Error(`Simulation reverted: ${sim.revert}`);
                }

                setMintStatus('pending');

                const gasParams = await provider.gasParameters();

                const receipt = await sim.sendTransaction({
                    signer: null,
                    mldsaSigner: null,
                    refundTo: walletAddress,
                    maximumAllowedSatToSpend: totalCost + 30_000n,
                    network: NETWORK,
                    feeRate: gasParams.bitcoin.recommended.medium,
                    extraOutputs: [{ address: CONTRACT_PAYMENT_ADDRESS, value: toSatoshi(totalCost) }],
                });

                const txId = receipt.transactionId;
                setMintStatus('confirming');

                const tokenIds = await pollForMintedEvent(txId, amount);
                setMintResult(txId, tokenIds);
                await loadStats();
            } catch (err) {
                setMintError(err instanceof Error ? err.message : String(err));
            }
        },
        [address, walletAddress, resetMint, setMintStatus, setMintError, setMintResult, loadStats],
    );

    const equip = useCallback(
        async (tokenId: number) => {
            if (!address || !walletAddress) throw new Error('Wallet not connected');

            const contract = getContract<IOpnetardNFTContract>(
                NFT_CONTRACT_ADDRESS,
                OPNETARD_NFT_ABI,
                provider,
                NETWORK,
                address,
            );

            const sim = await contract.equip(BigInt(tokenId));
            if (sim.revert) throw new Error(`Equip failed: ${sim.revert}`);

            const gasParams = await provider.gasParameters();
            await sim.sendTransaction({
                signer: null,
                mldsaSigner: null,
                refundTo: walletAddress,
                maximumAllowedSatToSpend: 10_000n,
                network: NETWORK,
                feeRate: gasParams.bitcoin.recommended.medium,
            });
        },
        [address, walletAddress],
    );

    const unequip = useCallback(async () => {
        if (!address || !walletAddress) throw new Error('Wallet not connected');

        const contract = getContract<IOpnetardNFTContract>(
            NFT_CONTRACT_ADDRESS,
            OPNETARD_NFT_ABI,
            provider,
            NETWORK,
            address,
        );

        const sim = await contract.unequip();
        if (sim.revert) throw new Error(`Unequip failed: ${sim.revert}`);

        const gasParams = await provider.gasParameters();
        await sim.sendTransaction({
            signer: null,
            mldsaSigner: null,
            refundTo: walletAddress,
            maximumAllowedSatToSpend: 10_000n,
            network: NETWORK,
            feeRate: gasParams.bitcoin.recommended.medium,
        });
    }, [address, walletAddress]);

    return { mint, equip, unequip, loadStats };
}

// ---------------------------------------------------------------------------
// Poll for the Minted event in the transaction receipt
// ---------------------------------------------------------------------------

async function pollForMintedEvent(
    txId: string,
    expectedAmount: number,
    maxAttempts = 10,
    delayMs = 6_000,
): Promise<number[]> {
    for (let i = 0; i < maxAttempts; i++) {
        try {
            const receipt = await provider.getTransactionReceipt(txId);
            if (receipt) {
                return parseMintedTokenIds(receipt, expectedAmount);
            }
        } catch {
            // not yet available
        }
        await new Promise((r) => setTimeout(r, delayMs));
    }
    console.warn('Minted event not found after polling — receipt may appear later.');
    return [];
}

function parseMintedTokenIds(
    receipt: Awaited<ReturnType<typeof provider.getTransactionReceipt>>,
    expectedAmount: number,
): number[] {
    if (!receipt) return [];

    const events = receipt.events;
    if (!events) return [];

    // ContractEvents is { [key: string]: NetEvent[] }; flatten to iterate
    for (const event of Object.values(events).flat()) {
        if (event.type !== 'Minted') continue;

        try {
            // Event encodes: ADDRESS (32) | firstTokenId U256 (32) | amount u64 (8)
            const raw = event.data;
            if (!(raw instanceof Uint8Array) || raw.length < 64) continue;

            // Skip 32-byte address, read 32-byte firstTokenId (big-endian)
            const firstTokenIdBytes = raw.slice(32, 64);
            const firstTokenId = Array.from(firstTokenIdBytes).reduce(
                (acc, byte) => acc * 256n + BigInt(byte),
                0n,
            );

            return Array.from({ length: expectedAmount }, (_, i) =>
                Number(firstTokenId) + i,
            );
        } catch {
            continue;
        }
    }

    return [];
}
