import { useEffect } from 'react';
import { useGallery } from '../hooks/useGallery';
import { useNFTContract } from '../hooks/useNFTContract';
import { useNFTStore } from '../lib/store';
import { useWallet } from '../hooks/useWallet';
import { TokenCard } from './TokenCard';

export function Gallery() {
    const { loadGallery } = useGallery();
    const { equip, unequip } = useNFTContract();
    const { ownedTokens, updateToken } = useNFTStore();
    const { isConnected } = useWallet();

    useEffect(() => {
        if (isConnected) {
            loadGallery().catch(console.error);
        }
    }, [isConnected, loadGallery]);

    const handleEquip = async (tokenId: number) => {
        try {
            await equip(tokenId);
            // Optimistically update UI
            ownedTokens.forEach((t) => updateToken(t.tokenId, { equipped: false }));
            updateToken(tokenId, { equipped: true });
        } catch (err) {
            console.error('Equip failed:', err);
        }
    };

    const handleUnequip = async () => {
        try {
            await unequip();
            ownedTokens.forEach((t) => updateToken(t.tokenId, { equipped: false }));
        } catch (err) {
            console.error('Unequip failed:', err);
        }
    };

    if (!isConnected) {
        return <p className="gallery-empty">Connect your wallet to see your OPNETARDs.</p>;
    }

    if (ownedTokens.length === 0) {
        return (
            <div className="gallery-empty">
                <p>No OPNETARDs found.</p>
                <button onClick={() => loadGallery().catch(console.error)}>Refresh</button>
            </div>
        );
    }

    return (
        <div className="gallery">
            <div className="gallery-header">
                <h2>Your OPNETARDs ({ownedTokens.length})</h2>
                <button className="btn-refresh" onClick={() => loadGallery().catch(console.error)}>
                    Refresh
                </button>
            </div>
            <div className="gallery-grid">
                {ownedTokens.map((token) => (
                    <TokenCard
                        key={token.tokenId}
                        token={token}
                        onEquip={handleEquip}
                        onUnequip={handleUnequip}
                    />
                ))}
            </div>
        </div>
    );
}
