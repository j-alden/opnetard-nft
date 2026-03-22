import { useEffect, useState } from 'react';
import { useWallet } from './hooks/useWallet';
import { useNFTContract } from './hooks/useNFTContract';
import { MintSection } from './components/MintSection';
import { Gallery } from './components/Gallery';
import './index.css';

type Tab = 'mint' | 'gallery';

const IMAGE_BASE = 'https://w3s.link/ipfs/bafybeiexy2r77dgaqjarl4dse6vqp3girxvttrpozdn3rcjjjyxlmnaakq';

// Preview strip — enough to show variety, not enough to spoil
const STRIP_TOKENS = [47, 183, 321, 478, 590, 712, 856, 934];

// Background scatter — spread across the 1000, show different corners of the collection
const BG_TOKENS: Array<{ id: number; style: React.CSSProperties }> = [
    { id: 12,  style: { top: '7%',   left: '1%',  transform: 'rotate(-7deg)', width: '140px' } },
    { id: 77,  style: { top: '24%',  left: '2%',  transform: 'rotate(4deg)',  width: '120px' } },
    { id: 155, style: { top: '46%',  left: '1%',  transform: 'rotate(-3deg)', width: '150px' } },
    { id: 224, style: { top: '67%',  left: '3%',  transform: 'rotate(6deg)',  width: '130px' } },
    { id: 310, style: { top: '84%',  left: '1%',  transform: 'rotate(-5deg)', width: '115px' } },
    { id: 389, style: { top: '9%',   right: '1%', transform: 'rotate(8deg)',  width: '135px' } },
    { id: 456, style: { top: '31%',  right: '2%', transform: 'rotate(-4deg)', width: '145px' } },
    { id: 533, style: { top: '54%',  right: '1%', transform: 'rotate(5deg)',  width: '125px' } },
    { id: 618, style: { top: '72%',  right: '3%', transform: 'rotate(-7deg)', width: '140px' } },
    { id: 701, style: { top: '89%',  right: '1%', transform: 'rotate(3deg)',  width: '120px' } },
    { id: 798, style: { top: '93%',  left: '37%', transform: 'rotate(-2deg)', width: '130px' } },
    { id: 923, style: { top: '91%',  left: '57%', transform: 'rotate(4deg)',  width: '115px' } },
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
            {/* Background scatter — visible in the margins on wide screens */}
            <div className="nft-bg" aria-hidden="true">
                {BG_TOKENS.map(({ id, style }) => (
                    <img
                        key={id}
                        className="nft-bg-item"
                        src={`${IMAGE_BASE}/${id}.png`}
                        alt=""
                        style={style}
                        loading="lazy"
                    />
                ))}
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
                        <img
                            src="https://www.magicinternet.meme/opnetard-banner.png"
                            alt="OPNETARD"
                            className="banner-img"
                        />

                        {/* NFT teaser strip */}
                        <div className="nft-strip" aria-hidden="true">
                            <div className="nft-strip-inner">
                                {STRIP_TOKENS.map((id) => (
                                    <img
                                        key={id}
                                        src={`${IMAGE_BASE}/${id}.png`}
                                        alt=""
                                        loading="lazy"
                                    />
                                ))}
                            </div>
                        </div>

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
