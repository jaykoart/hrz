import { useState, useEffect } from 'react';
import { useVpnStore } from '../stores/vpnStore';
import { useTranslation } from 'react-i18next';

export default function Connect() {
    const {
        isConnected,
        isConnecting,
        statusText,
        currentLocation,
        connect,
        disconnect,
        availableNodes,
        selectNode,
        fetchNodes,
        isLoadingNodes
    } = useVpnStore();
    const { t } = useTranslation();
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

    // Fetch nodes on mount
    useEffect(() => {
        fetchNodes();
    }, [fetchNodes]);

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
    };

    return (
        <div className="connect-page">
            {/* Ambient Background */}
            <div className="ambient-glow" />
            <div className="ambient-glow-2" />

            {/* Main Content */}
            <div className="connect-container">
                {/* Connection Ring - Premium Glass Style */}
                <div className={`connection-ring ${isConnected ? 'connected' : ''} ${isConnecting ? 'connecting' : ''}`}>
                    <div className="ring-outer" />
                    <div className="ring-middle" />
                    <div className="ring-inner" />

                    <button
                        className={`connect-btn ${isConnected ? 'active' : ''}`}
                        onClick={toggleConnection}
                        disabled={isConnecting}
                    >
                        <div className="power-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
                                <line x1="12" y1="2" x2="12" y2="12"></line>
                            </svg>
                        </div>
                    </button>
                </div>

                {/* Status Display */}
                <div className="status-display">
                    <h2 className={`status-title ${isConnected ? 'connected' : ''}`}>
                        {getStatusText()}
                    </h2>
                    <p className="status-subtitle">
                        {isConnected
                            ? `${t('common.protected')} • ${currentLocation.ip}`
                            : t('common.unprotected')
                        }
                    </p>
                    {isConnecting && (
                        <div className="loading-indicator">
                            <div className="loading-dot" />
                            <div className="loading-dot" />
                            <div className="loading-dot" />
                        </div>
                    )}
                </div>

                {/* Location Selector - Premium Glass Card */}
                <div className="location-selector">
                    <button
                        onClick={() => setIsLocationModalOpen(!isLocationModalOpen)}
                        disabled={isConnected}
                        className={`location-btn glass ${isConnected ? 'disabled' : ''}`}
                    >
                        <div className="location-info">
                            <span className="location-flag">{currentLocation.flag}</span>
                            <div className="location-details">
                                <div className="location-country">{currentLocation.country}</div>
                                <div className="location-meta">
                                    {currentLocation.city} •
                                    <span className={`ping ${currentLocation.ping < 50 ? 'excellent' : currentLocation.ping < 150 ? 'good' : 'fair'}`}>
                                        {currentLocation.ping}{t('node.ping')}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <svg className="chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </button>

                    {/* Dropdown Modal - Premium Glass */}
                    {isLocationModalOpen && (
                        <>
                            <div className="modal-backdrop" onClick={() => setIsLocationModalOpen(false)} />
                            <div className="location-modal glass">
                                <div className="modal-header">
                                    <h3>{t('node.select_location')}</h3>
                                    <button
                                        className="modal-close"
                                        onClick={() => setIsLocationModalOpen(false)}
                                    >
                                        ✕
                                    </button>
                                </div>
                                <div className="modal-content">
                                    {isLoadingNodes ? (
                                        <div className="modal-loading">
                                            <div className="loading-spinner" />
                                            <p>{t('common.loading')}</p>
                                        </div>
                                    ) : (
                                        <div className="nodes-list">
                                            {availableNodes.map((node) => (
                                                <button
                                                    key={node.id || node.country}
                                                    onClick={() => handleNodeSelect(node)}
                                                    className="node-item"
                                                >
                                                    <span className="node-flag">{node.flag}</span>
                                                    <div className="node-info">
                                                        <div className="node-country">{node.country}</div>
                                                        <div className="node-city">{node.city}</div>
                                                    </div>
                                                    <span className={`node-ping ${node.ping < 50 ? 'excellent' : node.ping < 150 ? 'good' : 'fair'}`}>
                                                        {node.ping}{t('node.ping')}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Node Mode Status - If Active */}
                {/* This can be added later when node contribution is implemented */}
            </div>
        </div>
    );
}
