import { create } from 'zustand';
import { getAuthToken, saveAuthToken, clearAuth, UserProfile } from '../utils/auth';
import { register as apiRegister, loginWithEmail as apiLoginWithEmail, verifyToken as apiVerifyToken, AuthUser } from '../services/api';

interface AuthState {
    isLoggedIn: boolean;
    isLoading: boolean;
    user: UserProfile | null;
    error: string | null;
    checkLogin: () => Promise<void>;
    login: (token: string, user?: UserProfile) => Promise<void>;
    logout: () => Promise<void>;
    loginWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    register: (email: string, password: string, displayName?: string) => Promise<{ success: boolean; error?: string }>;
    clearError: () => void;
}

// AuthUser를 UserProfile로 변환
function toUserProfile(authUser: AuthUser): UserProfile {
    return {
        id: authUser.id,
        displayName: authUser.displayName,
        email: authUser.email,
        photo: authUser.photo,
    };
}

export const useAuthStore = create<AuthState>((set) => ({
    isLoggedIn: false,
    isLoading: true,
    user: null,
    error: null,

    checkLogin: async () => {
        set({ isLoading: true, error: null });
        try {
            const token = await getAuthToken();
            if (token) {
                // 토큰 검증
                const result = await apiVerifyToken(token);
                if (result.success && result.data?.valid) {
                    set({
                        isLoggedIn: true,
                        user: toUserProfile(result.data.user),
                        isLoading: false
                    });
                    return;
                }
                // 토큰이 유효하지 않으면 삭제
                await clearAuth();
            }
            set({ isLoggedIn: false, user: null, isLoading: false });
        } catch (err) {
            console.error('Check login error:', err);
            set({ isLoggedIn: false, user: null, isLoading: false });
        }
    },

    login: async (token: string, user?: UserProfile) => {
        await saveAuthToken(token);
        set({ isLoggedIn: true, user: user || null, error: null });
    },

    logout: async () => {
        await clearAuth();
        set({ isLoggedIn: false, user: null, error: null });
    },

    loginWithEmail: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
            const result = await apiLoginWithEmail(email, password);
            if (result.success && result.data) {
                await saveAuthToken(result.data.token);
                set({
                    isLoggedIn: true,
                    user: toUserProfile(result.data.user),
                    isLoading: false,
                    error: null
                });
                return { success: true };
            } else {
                const errorMsg = result.error || 'Login failed';
                set({ isLoading: false, error: errorMsg });
                return { success: false, error: errorMsg };
            }
        } catch (err) {
            const errorMsg = (err as Error).message || 'Login failed';
            set({ isLoading: false, error: errorMsg });
            return { success: false, error: errorMsg };
        }
    },

    register: async (email: string, password: string, displayName?: string) => {
        set({ isLoading: true, error: null });
        try {
            const result = await apiRegister(email, password, displayName);
            if (result.success && result.data) {
                await saveAuthToken(result.data.token);
                set({
                    isLoggedIn: true,
                    user: toUserProfile(result.data.user),
                    isLoading: false,
                    error: null
                });
                return { success: true };
            } else {
                const errorMsg = result.error || 'Registration failed';
                set({ isLoading: false, error: errorMsg });
                return { success: false, error: errorMsg };
            }
        } catch (err) {
            const errorMsg = (err as Error).message || 'Registration failed';
            set({ isLoading: false, error: errorMsg });
            return { success: false, error: errorMsg };
        }
    },

    clearError: () => set({ error: null })
}));
