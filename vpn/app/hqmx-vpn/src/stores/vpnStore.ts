import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { sendNotification } from '@tauri-apps/plugin-notification';
import { getNodes, Node } from '../services/api';

// Tauri 환경 확인
const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;

interface Location {
    id?: string;
    country: string;
    city: string;
    flag: string;
    ping: number;
    ip: string;
}

interface VpnState {
    isConnected: boolean;
    isConnecting: boolean;
    statusText: string;
    currentLocation: Location;
    stats: {
        downloadSpeed: number;
        uploadSpeed: number;
        dataShared: number;
    };
    availableNodes: Location[];
    isLoadingNodes: boolean;
    // Settings
    isNodeModeEnabled: boolean;
    autoConnect: boolean;
    killSwitch: boolean;
    wifiOnly: boolean;

    // Actions
    selectNode: (node: Location) => void;
    fetchNodes: () => Promise<void>;
    // Settings Actions
    setNodeMode: (enabled: boolean) => void;
    setAutoConnect: (enabled: boolean) => void;
    setKillSwitch: (enabled: boolean) => void;
    setWifiOnly: (enabled: boolean) => void;

    connect: () => Promise<void>;
    disconnect: () => Promise<void>;
}

// Flag emoji map
const countryFlags: Record<string, string> = {
    'Japan': '🇯🇵',
    'South Korea': '🇰🇷',
    'Korea': '🇰🇷',
    'United States': '🇺🇸',
    'Singapore': '🇸🇬',
    'United Kingdom': '🇬🇧',
    'Germany': '🇩🇪',
    'Netherlands': '🇳🇱',
    'France': '🇫🇷',
    'Australia': '🇦🇺',
    'Canada': '🇨🇦',
};

export const useVpnStore = create<VpnState>((set, get) => ({
    isConnected: false,
    isConnecting: false,
    statusText: 'DISCONNECTED',
    isLoadingNodes: false,

    // Default Settings
    isNodeModeEnabled: true,
    autoConnect: false,
    killSwitch: true,
    wifiOnly: true,

    currentLocation: {
        country: 'Japan',
        city: 'Tokyo',
        flag: '🇯🇵',
        ping: 34,
        ip: '103.20.1.5'
    },
    stats: {
        downloadSpeed: 0,
        uploadSpeed: 0,
        dataShared: 1.2, // GB
    },
    availableNodes: [
        // Fallback nodes if API fails
        { country: 'Japan', city: 'Tokyo', flag: '🇯🇵', ping: 34, ip: '103.20.1.5' },
        { country: 'South Korea', city: 'Seoul', flag: '🇰🇷', ping: 12, ip: '211.45.2.1' },
        { country: 'United States', city: 'Los Angeles', flag: '🇺🇸', ping: 145, ip: '45.12.1.9' },
        { country: 'Singapore', city: 'Singapore', flag: '🇸🇬', ping: 89, ip: '128.1.5.2' },
        { country: 'United Kingdom', city: 'London', flag: '🇬🇧', ping: 210, ip: '5.12.6.1' },
    ],

    fetchNodes: async () => {
        set({ isLoadingNodes: true });
        try {
            const response = await getNodes({ status: 'online' });
            if (response.success && response.data?.nodes) {
                const nodes: Location[] = response.data.nodes.map((node: Node) => ({
                    id: node.id,
                    country: node.country,
                    city: node.city,
                    flag: node.flag || countryFlags[node.country] || '🌐',
                    ping: node.ping || Math.floor(Math.random() * 150) + 10,
                    ip: node.ip
                }));
                if (nodes.length > 0) {
                    set({ availableNodes: nodes });
                }
            }
        } catch (error) {
            console.error('Failed to fetch nodes:', error);
            // Keep fallback nodes
        } finally {
            set({ isLoadingNodes: false });
        }
    },

    selectNode: (node: Location) => {
        set({ currentLocation: node });
    },

    setNodeMode: (enabled: boolean) => {
        set({ isNodeModeEnabled: enabled });
    },
    setAutoConnect: (enabled: boolean) => {
        set({ autoConnect: enabled });
    },
    setKillSwitch: (enabled: boolean) => {
        set({ killSwitch: enabled });
    },
    setWifiOnly: (enabled: boolean) => {
        set({ wifiOnly: enabled });
    },

    connect: async () => {
        if (get().isConnected || get().isConnecting) return;

        set({ isConnecting: true, statusText: 'CONNECTING...' });
        try {
            if (isTauri) {
                // Tauri 환경: 실제 VPN 연결
                await invoke('connect_vpn');
            } else {
                // 브라우저 환경: 연결 시뮬레이션 (1.5초 딜레이)
                await new Promise(resolve => setTimeout(resolve, 1500));
            }

            set({ isConnected: true, statusText: 'PROTECTED', isConnecting: false });

            // Send notification
            if (isTauri) {
                await sendNotification({
                    title: 'VPN Connected',
                    body: `Connected to ${get().currentLocation.country} - ${get().currentLocation.city}`
                });
            } else {
                console.log(`✅ VPN Connected to ${get().currentLocation.country} - ${get().currentLocation.city}`);
            }

            // Start simulation
            const interval = setInterval(() => {
                const state = get();
                if (!state.isConnected) {
                    clearInterval(interval);
                    return;
                }
                set({
                    stats: {
                        downloadSpeed: parseFloat((Math.random() * 50 + 10).toFixed(1)),
                        uploadSpeed: parseFloat((Math.random() * 10 + 2).toFixed(1)),
                        dataShared: parseFloat((state.stats.dataShared + 0.001).toFixed(3))
                    }
                });
            }, 1000);

        } catch (error) {
            console.error('VPN Connect Error:', error);
            set({ statusText: 'ERROR', isConnecting: false });

            if (isTauri) {
                await sendNotification({
                    title: 'VPN Connection Failed',
                    body: 'Unable to establish VPN connection'
                });
            } else {
                console.error('❌ VPN Connection Failed');
            }
        }
    },

    disconnect: async () => {
        if (!get().isConnected) return;

        set({ isConnecting: true, statusText: 'DISCONNECTING...' });
        try {
            if (isTauri) {
                // Tauri 환경: 실제 VPN 연결 해제
                await invoke('disconnect_vpn');
            } else {
                // 브라우저 환경: 연결 해제 시뮬레이션 (0.8초 딜레이)
                await new Promise(resolve => setTimeout(resolve, 800));
            }

            set({
                isConnected: false,
                statusText: 'DISCONNECTED',
                isConnecting: false,
                stats: { downloadSpeed: 0, uploadSpeed: 0, dataShared: get().stats.dataShared }
            });

            // Send notification
            if (isTauri) {
                await sendNotification({
                    title: 'VPN Disconnected',
                    body: 'You are no longer protected'
                });
            } else {
                console.log('🔴 VPN Disconnected');
            }
        } catch (error) {
            console.error('VPN Disconnect Error:', error);
            set({ statusText: 'ERROR', isConnecting: false });
        }
    }
}));
