import { useEffect, useState } from 'react';
import { useWallet } from './hooks/useWallet';
import { useNFTContract } from './hooks/useNFTContract';
import { MintSection } from './components/MintSection';
import { Gallery } from './components/Gallery';
import './index.css';

type Tab = 'mint' | 'gallery';

export function App() {
    const { walletAddress, isConnected, connect, disconnect } = useWallet();
    const { loadStats } = useNFTContract();
    const [tab, setTab] = useState<Tab>('mint');

    useEffect(() => {
        loadStats().catch(console.error);
    }, [loadStats]);

    const shortAddress = walletAddress
        ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
        : null;

    return (
        <div className="app">
            <header className="header">
                <div className="header-logo">
                    <span className="logo-text">OPNETARD NFT</span>
                    <span className="logo-sub">ME ARE OPNETARD</span>
                </div>

                <div className="header-right">
                    {isConnected ? (
                        <div className="wallet-connected">
                            <span className="wallet-address">{shortAddress}</span>
                            <button className="btn-disconnect" onClick={disconnect}>
                                Disconnect
                            </button>
                        </div>
                    ) : (
                        <button className="btn-connect" onClick={connect}>
                            Connect Wallet
                        </button>
                    )}
                </div>
            </header>

            <nav className="tabs">
                <button
                    className={`tab ${tab === 'mint' ? 'active' : ''}`}
                    onClick={() => setTab('mint')}
                >
                    Mint
                </button>
                <button
                    className={`tab ${tab === 'gallery' ? 'active' : ''}`}
                    onClick={() => setTab('gallery')}
                >
                    My Collection
                </button>
            </nav>

            <main className="main">
                {tab === 'mint' && (
                    <div className="mint-page">
                        <div className="mint-hero">
                            <h1>1,000 unique Opnetards</h1>
                            <p>The first NFT collection on OPNet. Bitcoin Layer 1 smart contracts.</p>
                            <p className="mint-note">10,000 sats per mint. Max 5 per transaction.</p>
                        </div>
                        <MintSection />
                    </div>
                )}
                {tab === 'gallery' && <Gallery />}
            </main>

            <footer className="footer">
                <a href="https://opnet.org" target="_blank" rel="noreferrer">OPNet</a>
                <a href="https://t.me/opnetard" target="_blank" rel="noreferrer">Telegram</a>
                <a href="https://x.com/opnetard" target="_blank" rel="noreferrer">Twitter</a>
            </footer>
        </div>
    );
}
