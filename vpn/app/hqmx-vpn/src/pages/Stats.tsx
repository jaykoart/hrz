import { useVpnStore } from "../stores/vpnStore";
import { useTranslation } from "react-i18next";

export default function Stats() {
    const { stats, isConnected, isNodeModeEnabled } = useVpnStore();
    const { t } = useTranslation();

    return (
        <div className="flex-1 flex flex-col p-6 animate-fade-in">
            <h2 className="text-xl font-bold mb-6">{t('stats.title')}</h2>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                    <div className="text-muted text-xs mb-1">{t('stats.download')}</div>
                    <div className={`text-2xl font-bold ${isConnected ? 'text-main' : 'text-muted'}`}>
                        {isConnected ? stats.downloadSpeed : 0} <span className="text-sm text-muted">MB/s</span>
                    </div>
                    {/* Tiny Graph Placeholder */}
                    <div className="h-10 mt-2 bg-gradient-to-t from-green-500/20 to-transparent w-full rounded-b-lg relative overflow-hidden">
                        {isConnected && <div className="absolute inset-0 w-full h-full bg-green-500/10 animate-pulse"></div>}
                    </div>
                </div>
                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                    <div className="text-muted text-xs mb-1">{t('stats.upload')}</div>
                    <div className={`text-2xl font-bold ${isConnected ? 'text-purple-400' : 'text-muted'}`}>
                        {isConnected ? stats.uploadSpeed : 0} <span className="text-sm text-muted">MB/s</span>
                    </div>
                    <div className="h-10 mt-2 bg-gradient-to-t from-purple-500/20 to-transparent w-full rounded-b-lg relative overflow-hidden">
                        {isConnected && <div className="absolute inset-0 w-full h-full bg-purple-500/10 animate-pulse"></div>}
                    </div>
                </div>
            </div>

            <div className="bg-white/5 p-4 rounded-xl border border-white/5 flex-1">
                <h3 className="text-sm font-medium mb-4">{t('stats.contribution')}</h3>
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-muted">Status</span>
                        {isNodeModeEnabled ? (
                            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">{t('node.node_mode_active')}</span>
                        ) : (
                            <span className="text-xs bg-white/10 text-muted px-2 py-1 rounded-full">{t('common.unprotected')}</span> // Or specific disabled text
                        )}
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-muted">{t('stats.total_shared')}</span>
                        <span className="text-sm font-bold">{stats.dataShared.toFixed(2)} GB</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-muted">{t('stats.active_time')}</span>
                        <span className="text-sm font-bold">4h 12m</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
