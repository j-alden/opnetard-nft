import { useEffect, useState } from 'react';
import { useWallet } from './hooks/useWallet';
import { useNFTContract } from './hooks/useNFTContract';
import { MintSection } from './components/MintSection';
import { Gallery } from './components/Gallery';
import './index.css';

type Tab = 'mint' | 'gallery';

const IMAGE_BASE = 'https://w3s.link/ipfs/bafybeiexy2r77dgaqjarl4dse6vqp3girxvttrpozdn3rcjjjyxlmnaakq';

// 25 tokens spread evenly across the 1000 — shows variety without revealing the full collection
const MOSAIC_TOKENS = [
    25,  65, 112, 158, 205,
   252, 298, 345, 392, 438,
   485, 532, 578, 625, 672,
   718, 765, 812, 858, 905,
   952, 999,  42, 188, 734,
];

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
            {/* Fixed NFT mosaic — fills viewport, blurred, behind everything */}
            <div className="nft-mosaic" aria-hidden="true">
                {MOSAIC_TOKENS.map((id) => (
                    <img
                        key={id}
                        src={`${IMAGE_BASE}/${id}.png`}
                        alt=""
                        loading="lazy"
                    />
                ))}
            </div>
            {/* Dark overlay sits on top of mosaic, under content */}
            <div className="mosaic-overlay" aria-hidden="true" />

            {/* Banner — full bleed, at the very top */}
            <div className="banner-wrap">
                <img
                    src="https://www.magicinternet.meme/opnetard-banner.png"
                    alt="OPNETARD"
                    className="banner-img"
                />
            </div>

            <header className="header">
                <a href="https://opnetard.com" target="_blank" rel="noreferrer" className="header-logo">
                    <img
                        src="https://oqo47j6pxmwuqzov.public.blob.vercel-storage.com/logos/og.png"
                        alt="OPNETARD"
                        className="logo-img"
                    />
                </a>

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
                        <div className="mint-content">
                            <div className="mint-hero">
                                <h1>1,000 unique Opnetards</h1>
                                <p>Bitcoin Layer 1 smart contracts. OPNet.</p>
                                <p className="mint-note">10,000 sats per mint · Max 5 per transaction</p>
                            </div>
                            <MintSection />
                        </div>
                    </div>
                )}
                {tab === 'gallery' && <Gallery />}
            </main>

            <footer className="footer">
                <a href="https://opnetard.com" target="_blank" rel="noreferrer">opnetard.com</a>
                <a href="https://opnet.org" target="_blank" rel="noreferrer">OPNet</a>
                <a href="https://t.me/opnetard" target="_blank" rel="noreferrer">Telegram</a>
                <a href="https://x.com/opnetard" target="_blank" rel="noreferrer">Twitter</a>
            </footer>
        </div>
    );
}
