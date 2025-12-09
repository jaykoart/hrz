/**
 * HQMX VPN API Service
 * Backend API 호출을 위한 클라이언트 서비스
 */

const API_BASE = 'https://hqmx.net';

// ============================================
// Types
// ============================================

export interface Node {
    id: string;
    country: string;
    city: string;
    flag: string;
    ip: string;
    ping?: number;
    status: 'online' | 'offline';
    load?: number;
}

export interface VpnConfig {
    publicKey: string;
    endpoint: string;
    allowedIps: string[];
    dns: string[];
}

export interface UserSettings {
    wifiOnly: boolean;
    dataLimitMode: 'auto' | 'unlimited' | 'manual';
    hasUnlimitedPlan: boolean;
    sharingConsent: boolean;
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

// ============================================
// Helper
// ============================================

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    try {
        const res = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options?.headers,
            },
            credentials: 'include',
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            return { success: false, error: errorData.error || `HTTP ${res.status}` };
        }

        const data = await res.json();
        return { success: true, data };
    } catch (error) {
        console.error('API Error:', error);
        return { success: false, error: (error as Error).message };
    }
}

// ============================================
// Nodes API
// ============================================

export async function getNodes(filters?: { country?: string; status?: string }): Promise<ApiResponse<{ nodes: Node[]; total: number }>> {
    const params = new URLSearchParams();
    if (filters?.country) params.set('country', filters.country);
    if (filters?.status) params.set('status', filters.status);

    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchApi(`/api/nodes${query}`);
}

export async function getNodeById(nodeId: string): Promise<ApiResponse<Node>> {
    return fetchApi(`/api/nodes/${nodeId}`);
}

// ============================================
// VPN API
// ============================================

export async function initiateVpnConnection(nodeId: string): Promise<ApiResponse<VpnConfig>> {
    return fetchApi('/api/vpn/connect', {
        method: 'POST',
        body: JSON.stringify({ nodeId }),
    });
}

export async function disconnectVpn(): Promise<ApiResponse<{ message: string }>> {
    return fetchApi('/api/vpn/disconnect', {
        method: 'POST',
    });
}

export async function getVpnStatus(): Promise<ApiResponse<{ connected: boolean; nodeId?: string; uptime?: number }>> {
    return fetchApi('/api/vpn/status');
}

// ============================================
// Settings API
// ============================================

export async function getUserSettings(): Promise<ApiResponse<UserSettings>> {
    return fetchApi('/api/settings');
}

export async function updateUserSettings(settings: Partial<UserSettings>): Promise<ApiResponse<UserSettings>> {
    return fetchApi('/api/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
    });
}

// ============================================
// Consent API
// ============================================

export async function submitConsent(consent: { sharingConsent: boolean }): Promise<ApiResponse<{ message: string }>> {
    return fetchApi('/api/consent', {
        method: 'POST',
        body: JSON.stringify(consent),
    });
}

// ============================================
// Authentication API
// ============================================

export interface AuthUser {
    id: string;
    email: string;
    displayName: string;
    photo: string | null;
    provider: 'email' | 'google';
    createdAt: string;
    lastLoginAt: string;
}

export interface AuthResponse {
    success: boolean;
    message: string;
    token: string;
    user: AuthUser;
}

export async function register(email: string, password: string, displayName?: string): Promise<ApiResponse<AuthResponse>> {
    return fetchApi('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, displayName }),
    });
}

export async function loginWithEmail(email: string, password: string): Promise<ApiResponse<AuthResponse>> {
    return fetchApi('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    });
}

export async function verifyToken(token: string): Promise<ApiResponse<{ success: boolean; valid: boolean; user: AuthUser }>> {
    return fetchApi('/api/auth/verify', {
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });
}

// ============================================
// Health Check
// ============================================

export async function getHealth(): Promise<ApiResponse<{
    status: string;
    nodes: { total: number; online: number };
    proxy: { activePeers: number };
}>> {
    return fetchApi('/health');
}
