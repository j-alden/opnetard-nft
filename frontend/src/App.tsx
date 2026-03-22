import { useEffect, useState } from 'react';
import { useWallet } from './hooks/useWallet';
import { useNFTContract } from './hooks/useNFTContract';
import { MintSection } from './components/MintSection';
import { Gallery } from './components/Gallery';
import './index.css';

type Tab = 'mint' | 'gallery';

const IMAGE_BASE = '/mosaic';

// 25 tokens picked for visual variety across the collection
const MOSAIC_TOKENS = [
   500, 111, 703,  33, 961,
   260, 830, 167, 555,  77,
   390, 988, 644,   7, 472,
   222, 750, 303, 919,  55,
   609, 444, 680, 799, 877,
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
                    />
                ))}
            </div>
            <header className="header">
                <a href="https://opnetard.com" target="_blank" rel="noreferrer" className="header-logo">
                    <img
                        src="https://www.magicinternet.meme/opnetard-banner.png"
                        alt="OPNETARD"
                        className="banner-img"
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
                                <p>The bip110 boys want to kill OPNet.</p>
                                <p>Raise an army. Flood the timeline. Hold the line.</p>
                                <p className="mint-note">10,000 sats per mint · Max 50 per transaction</p>
                                <p className="mint-note">100% of raised funds go to $OPTARD LP on Motoswap</p>
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
