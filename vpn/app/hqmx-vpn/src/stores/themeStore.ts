import { create } from 'zustand';
import { load } from '@tauri-apps/plugin-store';

type Theme = 'dark' | 'light' | 'system';

interface ThemeState {
    theme: Theme;
    effectiveTheme: 'dark' | 'light';
    isLoading: boolean;
    setTheme: (theme: Theme) => void;
    initTheme: () => Promise<void>;
}

const STORE_PATH = 'settings.json';
const THEME_KEY = 'theme';

// Get system theme preference
const getSystemTheme = (): 'dark' | 'light' => {
    if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark';
};

// Apply theme to document
const applyTheme = (effectiveTheme: 'dark' | 'light') => {
    if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', effectiveTheme);
    }
};

export const useThemeStore = create<ThemeState>((set, get) => ({
    theme: 'dark',
    effectiveTheme: 'dark',
    isLoading: true,

    initTheme: async () => {
        try {
            const store = await load(STORE_PATH, { autoSave: true });
            const savedTheme = (await store.get(THEME_KEY)) as Theme | null;
            const theme = savedTheme || 'dark';
            const effectiveTheme = theme === 'system' ? getSystemTheme() : theme;

            applyTheme(effectiveTheme);
            set({ theme, effectiveTheme, isLoading: false });

            // Listen for system theme changes
            if (typeof window !== 'undefined' && window.matchMedia) {
                window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                    const state = get();
                    if (state.theme === 'system') {
                        const newEffective = e.matches ? 'dark' : 'light';
                        applyTheme(newEffective);
                        set({ effectiveTheme: newEffective });
                    }
                });
            }
        } catch (e) {
            console.error('Failed to load theme:', e);
            applyTheme('dark');
            set({ theme: 'dark', effectiveTheme: 'dark', isLoading: false });
        }
    },

    setTheme: async (theme: Theme) => {
        const effectiveTheme = theme === 'system' ? getSystemTheme() : theme;
        applyTheme(effectiveTheme);
        set({ theme, effectiveTheme });

        try {
            const store = await load(STORE_PATH, { autoSave: true });
            await store.set(THEME_KEY, theme);
            await store.save();
        } catch (e) {
            console.error('Failed to save theme:', e);
        }
    }
}));
