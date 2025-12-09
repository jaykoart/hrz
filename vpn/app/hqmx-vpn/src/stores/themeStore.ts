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

// Tauri 환경 확인
const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;

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
            let savedTheme: Theme | null = null;

            if (isTauri) {
                // Tauri 환경: plugin-store 사용
                const store = await load(STORE_PATH, { autoSave: true, defaults: {} });
                savedTheme = (await store.get(THEME_KEY)) as Theme | null;
            } else {
                // 브라우저 환경: localStorage 사용
                const saved = localStorage.getItem(THEME_KEY);
                savedTheme = saved as Theme | null;
            }

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
            if (isTauri) {
                // Tauri 환경: plugin-store 사용
                const store = await load(STORE_PATH, { autoSave: true, defaults: {} });
                await store.set(THEME_KEY, theme);
                await store.save();
            } else {
                // 브라우저 환경: localStorage 사용
                localStorage.setItem(THEME_KEY, theme);
            }
        } catch (e) {
            console.error('Failed to save theme:', e);
        }
    }
}));
