import { useWalletConnect, SupportedWallets } from '@btc-vision/walletconnect';

export function useWallet() {
    const {
        address,        // Address | null  — full OPNet address object (use for contract calls)
        walletAddress,  // string | null   — bech32 P2TR string (use for refundTo, display)
        connecting,
        disconnect,
        connectToWallet,
    } = useWalletConnect();

    const isConnected = walletAddress !== null;

    function connect(): void {
        connectToWallet(SupportedWallets.OP_WALLET);
    }

    return {
        address,
        walletAddress,
        isConnected,
        connecting,
        connect,
        disconnect,
    };
}
