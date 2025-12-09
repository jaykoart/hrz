import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { sendNotification } from '@tauri-apps/plugin-notification';

interface Location {
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
    // Settings
    isNodeModeEnabled: boolean;
    autoConnect: boolean;
    killSwitch: boolean;
    wifiOnly: boolean;

    selectNode: (node: Location) => void;
    // Settings Actions
    setNodeMode: (enabled: boolean) => void;
    setAutoConnect: (enabled: boolean) => void;
    setKillSwitch: (enabled: boolean) => void;
    setWifiOnly: (enabled: boolean) => void;

    connect: () => Promise<void>;
    disconnect: () => Promise<void>;
}

export const useVpnStore = create<VpnState>((set, get) => ({
    isConnected: false,
    isConnecting: false,
    statusText: 'DISCONNECTED',

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
        { country: 'Japan', city: 'Tokyo', flag: '🇯🇵', ping: 34, ip: '103.20.1.5' },
        { country: 'South Korea', city: 'Seoul', flag: '🇰🇷', ping: 12, ip: '211.45.2.1' },
        { country: 'United States', city: 'Los Angeles', flag: '🇺🇸', ping: 145, ip: '45.12.1.9' },
        { country: 'Singapore', city: 'Singapore', flag: '🇸🇬', ping: 89, ip: '128.1.5.2' },
        { country: 'United Kingdom', city: 'London', flag: '🇬🇧', ping: 210, ip: '5.12.6.1' },
    ],

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
            await invoke('connect_vpn');
            set({ isConnected: true, statusText: 'PROTECTED', isConnecting: false });

            // Send notification
            await sendNotification({
                title: 'VPN Connected',
                body: `Connected to ${get().currentLocation.country} - ${get().currentLocation.city}`
            });

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

            await sendNotification({
                title: 'VPN Connection Failed',
                body: 'Unable to establish VPN connection'
            });
        }
    },

    disconnect: async () => {
        if (!get().isConnected) return;

        set({ isConnecting: true, statusText: 'DISCONNECTING...' });
        try {
            await invoke('disconnect_vpn');
            set({
                isConnected: false,
                statusText: 'DISCONNECTED',
                isConnecting: false,
                stats: { downloadSpeed: 0, uploadSpeed: 0, dataShared: get().stats.dataShared }
            });

            // Send notification
            await sendNotification({
                title: 'VPN Disconnected',
                body: 'You are no longer protected'
            });
        } catch (error) {
            console.error('VPN Disconnect Error:', error);
            set({ statusText: 'ERROR', isConnecting: false });
        }
    }
}));
