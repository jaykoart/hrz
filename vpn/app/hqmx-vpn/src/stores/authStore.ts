import { create } from 'zustand';
import { getAuthToken, saveAuthToken, clearAuth, UserProfile } from '../utils/auth';

interface AuthState {
    isLoggedIn: boolean;
    isLoading: boolean;
    user: UserProfile | null;
    checkLogin: () => Promise<void>;
    login: (token: string, user?: UserProfile) => Promise<void>;
    logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    isLoggedIn: false,
    isLoading: true,
    user: null,

    checkLogin: async () => {
        set({ isLoading: true });
        const token = await getAuthToken();
        // In real app, validate token or fetch profile here
        set({ isLoggedIn: !!token, isLoading: false });
    },

    login: async (token: string, user?: UserProfile) => {
        await saveAuthToken(token);
        set({ isLoggedIn: true, user: user || null });
    },

    logout: async () => {
        await clearAuth();
        set({ isLoggedIn: false, user: null });
    }
}));
