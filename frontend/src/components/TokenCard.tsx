import type { OwnedToken } from '../lib/store';

interface TokenCardProps {
    token: OwnedToken;
    onEquip: (tokenId: number) => void;
    onUnequip: () => void;
}

export function TokenCard({ token, onEquip, onUnequip }: TokenCardProps) {
    return (
        <div className={`token-card ${token.equipped ? 'equipped' : ''}`}>
            {token.equipped && <span className="equipped-badge">EQUIPPED</span>}

            <div className="token-image-wrap">
                {token.imageUrl ? (
                    <img
                        src={token.imageUrl}
                        alt={token.name}
                        loading="lazy"
                    />
                ) : (
                    <div className="token-image-placeholder">
                        #{token.tokenId}
                    </div>
                )}
            </div>

            <div className="token-info">
                <h3>{token.name}</h3>

                <div className="token-traits">
                    {token.attributes.map((attr) => (
                        <div key={attr.trait_type} className="trait-pill">
                            <span className="trait-type">{attr.trait_type}</span>
                            <span className="trait-value">{attr.value}</span>
                        </div>
                    ))}
                </div>

                <div className="token-actions">
                    {token.equipped ? (
                        <button className="btn-unequip" onClick={onUnequip}>
                            Unequip Avatar
                        </button>
                    ) : (
                        <button className="btn-equip" onClick={() => onEquip(token.tokenId)}>
                            Set as Avatar
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
