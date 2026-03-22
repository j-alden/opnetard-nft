import { useState } from 'react';
import { useNFTContract } from '../hooks/useNFTContract';
import { useNFTStore } from '../lib/store';
import { useWallet } from '../hooks/useWallet';
import { COLLECTION_SIZE } from '../config';

export function MintSection() {
    const [amount, setAmount] = useState(1);
    const { mint } = useNFTContract();
    const { isConnected, connect } = useWallet();
    const { mintStatus, mintError, mintTxId, mintedTokenIds, totalMinted, mintPrice, resetMint } =
        useNFTStore();

    const totalCostSats = mintPrice * amount;
    const remaining = COLLECTION_SIZE - totalMinted;
    const soldOut = remaining <= 0;

    return (
        <div className="mint-section">
            <div className="mint-stats">
                <span>{totalMinted} / {COLLECTION_SIZE} minted</span>
                <span>{remaining} remaining</span>
            </div>

            {mintStatus === 'idle' && !soldOut && isConnected && (
                <>
                    <div className="amount-selector">
                        <button onClick={() => setAmount((a) => Math.max(1, a - 1))}>−</button>
                        <span>{amount}</span>
                        <button onClick={() => setAmount((a) => Math.min(5, a + 1))}>+</button>
                    </div>
                    <div className="mint-cost">
                        {totalCostSats.toLocaleString()} sats
                        <span className="mint-usd">
                            {' '}≈ ${((totalCostSats / 100_000_000) * 85_000).toFixed(2)}
                        </span>
                    </div>
                    <button className="btn-mint" onClick={() => mint(amount).catch(console.error)}>
                        MINT {amount} OPNETARD{amount > 1 ? 'S' : ''}
                    </button>
                </>
            )}

            {!isConnected && mintStatus === 'idle' && (
                <button className="btn-mint" onClick={connect}>
                    Connect Wallet to Mint
                </button>
            )}

            {soldOut && <p className="sold-out">SOLD OUT</p>}

            {mintStatus === 'simulating' && <p className="status">Simulating transaction...</p>}
            {mintStatus === 'pending' && <p className="status">Waiting for wallet signature...</p>}

            {mintStatus === 'confirming' && (
                <p className="status">
                    Transaction sent — waiting for Bitcoin block.{' '}
                    {mintTxId && (
                        <a href={`https://mempool.space/tx/${mintTxId}`} target="_blank" rel="noreferrer">
                            View on Mempool
                        </a>
                    )}
                </p>
            )}

            {mintStatus === 'success' && (
                <div className="mint-success">
                    <p>✓ Minted! Your OPNETARDs are incoming.</p>
                    {mintedTokenIds.length > 0 && (
                        <p>Token{mintedTokenIds.length > 1 ? 's' : ''}: #{mintedTokenIds.join(', #')}</p>
                    )}
                    {mintTxId && (
                        <a href={`https://mempool.space/tx/${mintTxId}`} target="_blank" rel="noreferrer">
                            View transaction
                        </a>
                    )}
                    <button onClick={resetMint} style={{ marginTop: 12 }}>Mint more</button>
                </div>
            )}

            {mintStatus === 'error' && mintError && (
                <div className="mint-error">
                    <p>Mint failed: {mintError}</p>
                    <button onClick={resetMint}>Try again</button>
                </div>
            )}
        </div>
    );
}
