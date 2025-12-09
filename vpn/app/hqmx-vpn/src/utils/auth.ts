import { load } from '@tauri-apps/plugin-store';

const STORE_PATH = 'auth_store.json';
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user_info';

// Initialize store (lazy load)
const getStore = async () => {
    try {
        const store = await load(STORE_PATH, { autoSave: true });
        return store;
    } catch (e) {
        console.error("Failed to load store:", e);
        return null;
    }
};

export const saveAuthToken = async (token: string) => {
    const store = await getStore();
    if (store) {
        await store.set(TOKEN_KEY, token);
        await store.save(); // Ensure save
    }
};

export const getAuthToken = async (): Promise<string | null> => {
    const store = await getStore();
    if (store) {
        return (await store.get(TOKEN_KEY)) as string | null;
    }
    return null;
};

export const clearAuth = async () => {
    const store = await getStore();
    if (store) {
        await store.delete(TOKEN_KEY);
        await store.save();
    }
};

// Mock User Interface
export interface UserProfile {
    email: string;
    picture?: string;
    name?: string;
}

export const saveUserProfile = async (profile: UserProfile) => {
    const store = await getStore();
    if (store) {
        await store.set(USER_KEY, profile);
        await store.save();
    }
};

export const getUserProfile = async (): Promise<UserProfile | null> => {
    const store = await getStore();
    if (store) {
        return (await store.get(USER_KEY)) as UserProfile | null;
    }
    return null;
};
