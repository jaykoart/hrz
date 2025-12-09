import { useState } from 'react';
import { useVpnStore } from '../stores/vpnStore';
import { useTranslation } from 'react-i18next';

export default function Connect() {
    const { isConnected, isConnecting, statusText, currentLocation, connect, disconnect, availableNodes, selectNode } = useVpnStore();
    const { t } = useTranslation();
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

    const toggleConnection = async () => {
        if (isConnected) {
            await disconnect();
        } else {
            await connect();
        }
    };

    const handleNodeSelect = (node: any) => {
        selectNode(node);
        setIsLocationModalOpen(false);
    };

    const getStatusText = () => {
        if (isConnecting) {
            if (statusText.includes('DISCONNECTING')) return t('common.disconnecting');
            return t('common.connecting');
        }
        if (isConnected) return t('common.protected');
        return t('common.unprotected');
    }

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 relative animate-fade-in">
            {/* Connection Status Card */}
            <div className={`connection-ring mb-8 ${isConnected ? 'connected' : ''}`}>
                <div className={`ring-pulse ${isConnecting ? 'animate-pulse' : ''}`}></div>
                <button
                    className={`connect-btn ${isConnected ? 'active' : ''}`}
                    onClick={toggleConnection}
                    disabled={isConnecting}
                >
                    <div className="icon-wrapper">
                        {/* Power Icon */}
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 512 512"><path d="M378,108.33A223.51,223.51,0,0,1,464,256c0,123.71-100.29,224-224,224S16,379.71,16,256a223.51,223.51,0,0,1,86-147.67" style={{ fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '32px' }} /><line x1="256" y1="48" x2="256" y2="256" style={{ fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '32px' }} /></svg>
                    </div>
                </button>
            </div>

            <div className="status-display text-center mb-8">
                <h2 className={`text-2xl font-bold mb-1 ${isConnected ? 'text-gradient' : 'text-muted'}`}>
                    {getStatusText()}
                </h2>
                <p className="text-sm text-muted">
                    {isConnected ? `Your IP is hidden: ${currentLocation.ip}` : 'Your real IP is exposed'}
                </p>
                {isConnecting && <p className="text-xs text-main mt-2">{t('common.loading')}</p>}
            </div>

            {/* Location Selector */}
            <div className="w-full max-w-xs relative z-20">
                <button
                    onClick={() => setIsLocationModalOpen(!isLocationModalOpen)}
                    disabled={isConnected}
                    className={`country-select w-full flex items-center justify-between bg-white/5 hover:bg-white/10 p-3 rounded-xl border border-white/5 transition-all ${isConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">{currentLocation.flag}</span>
                        <div className="text-left">
                            <div className="text-sm font-medium text-white">{currentLocation.country}</div>
                            <div className="text-xs text-muted">{currentLocation.city} • <span className="text-success">{currentLocation.ping}{t('node.ping')}</span></div>
                        </div>
                    </div>
                    <span className="text-muted">▼</span>
                </button>

                {/* Dropdown Modal */}
                {isLocationModalOpen && (
                    <div className="absolute bottom-full left-0 w-full mb-2 bg-[#0a0a1a] border border-white/10 rounded-xl overflow-hidden shadow-2xl max-h-60 overflow-y-auto backdrop-blur-xl">
                        {availableNodes.map((node) => (
                            <button
                                key={node.country}
                                onClick={() => handleNodeSelect(node)}
                                className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-0"
                            >
                                <span className="text-xl">{node.flag}</span>
                                <div className="flex-1">
                                    <div className="text-sm text-white">{node.country}</div>
                                    <div className="text-xs text-muted">{node.city}</div>
                                </div>
                                <span className={`text-xs ${node.ping < 50 ? 'text-success' : node.ping < 150 ? 'text-yellow-400' : 'text-red-400'}`}>
                                    {node.ping}{t('node.ping')}
                                </span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
