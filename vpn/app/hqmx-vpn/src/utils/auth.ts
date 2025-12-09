import { load } from '@tauri-apps/plugin-store';

const STORE_PATH = 'auth_store.json';
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user_info';

// Tauri 환경 확인
const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;

// Initialize store (lazy load) - Tauri에서만 사용
const getStore = async () => {
    if (!isTauri) {
        return null; // 브라우저 환경에서는 localStorage 사용
    }
    try {
        const store = await load(STORE_PATH, { autoSave: true, defaults: {} });
        return store;
    } catch (e) {
        console.error("Failed to load store:", e);
        return null;
    }
};

export const saveAuthToken = async (token: string) => {
    if (isTauri) {
        const store = await getStore();
        if (store) {
            await store.set(TOKEN_KEY, token);
            await store.save(); // Ensure save
        }
    } else {
        // 브라우저 환경: localStorage 사용
        localStorage.setItem(TOKEN_KEY, token);
    }
};

export const getAuthToken = async (): Promise<string | null> => {
    if (isTauri) {
        const store = await getStore();
        if (store) {
            return (await store.get(TOKEN_KEY)) as string | null;
        }
        return null;
    } else {
        // 브라우저 환경: localStorage 사용
        return localStorage.getItem(TOKEN_KEY);
    }
};

export const clearAuth = async () => {
    if (isTauri) {
        const store = await getStore();
        if (store) {
            await store.delete(TOKEN_KEY);
            await store.save();
        }
    } else {
        // 브라우저 환경: localStorage 사용
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
    }
};

// User Profile Interface
export interface UserProfile {
    id: string;
    email: string;
    displayName: string;
    photo: string | null;
    picture?: string; // legacy support
    name?: string; // legacy support
}

export const saveUserProfile = async (profile: UserProfile) => {
    if (isTauri) {
        const store = await getStore();
        if (store) {
            await store.set(USER_KEY, profile);
            await store.save();
        }
    } else {
        // 브라우저 환경: localStorage 사용
        localStorage.setItem(USER_KEY, JSON.stringify(profile));
    }
};

export const getUserProfile = async (): Promise<UserProfile | null> => {
    if (isTauri) {
        const store = await getStore();
        if (store) {
            return (await store.get(USER_KEY)) as UserProfile | null;
        }
        return null;
    } else {
        // 브라우저 환경: localStorage 사용
        const data = localStorage.getItem(USER_KEY);
        return data ? JSON.parse(data) : null;
    }
};
