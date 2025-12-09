/**
 * Simple Dark/Light Theme Toggle
 * 
 * 단순 다크/라이트 모드 토글 시스템
 * - 시간대별 자동 밝기 조절 제거
 * - 수동 다크/라이트 모드만 지원
 * 
 * @author Horizon VPN Project
 * @version 2.0.0
 */

(function () {
    'use strict';

    // ============================================
    // Configuration
    // ============================================
    const CONFIG = {
        STORAGE_KEY: 'horizon_theme_mode',
        DEBUG: false
    };

    // ============================================
    // Theme Mode Enum
    // ============================================
    const ThemeMode = {
        LIGHT: 'light',
        DARK: 'dark'
    };

    // ============================================
    // State
    // ============================================
    let state = {
        mode: ThemeMode.DARK  // 기본값: 다크 모드
    };

    // ============================================
    // Theme Application
    // ============================================

    /**
     * CSS 변수를 업데이트합니다.
     * @param {string} mode - 'light' 또는 'dark'
     */
    function applyTheme(mode) {
        const root = document.documentElement;

        if (mode === ThemeMode.LIGHT) {
            // 라이트 모드
            root.style.setProperty('--bg-dynamic', '#f8f9fa');
            root.style.setProperty('--text-dynamic', '#111827');
            root.style.setProperty('--text-muted-dynamic', '#6b7280');
            root.style.setProperty('--glass-bg-dynamic', 'rgba(0, 0, 0, 0.03)');
            root.style.setProperty('--glass-border-dynamic', 'rgba(0, 0, 0, 0.1)');
            root.style.setProperty('--shadow-intensity', '0.15');
            root.style.setProperty('--theme-brightness', '0');
            root.style.setProperty('--theme-factor', '0');
            root.style.setProperty('--theme-inverse-factor', '1');
        } else {
            // 다크 모드
            root.style.setProperty('--bg-dynamic', '#050510');
            root.style.setProperty('--text-dynamic', '#ffffff');
            root.style.setProperty('--text-muted-dynamic', '#8b9bb4');
            root.style.setProperty('--glass-bg-dynamic', 'rgba(255, 255, 255, 0.05)');
            root.style.setProperty('--glass-border-dynamic', 'rgba(255, 255, 255, 0.1)');
            root.style.setProperty('--shadow-intensity', '0.25');
            root.style.setProperty('--theme-brightness', '100');
            root.style.setProperty('--theme-factor', '1');
            root.style.setProperty('--theme-inverse-factor', '0');
        }

        // 데이터 속성으로 현재 상태 표시
        root.dataset.themeMode = mode;

        if (CONFIG.DEBUG) {
            console.log(`[Theme] Applied: ${mode}`);
        }
    }

    // ============================================
    // Mode Control
    // ============================================

    /**
     * 테마 모드를 설정합니다.
     * @param {string} mode - 'light' 또는 'dark'
     */
    function setThemeMode(mode) {
        state.mode = mode;
        localStorage.setItem(CONFIG.STORAGE_KEY, mode);
        applyTheme(mode);
        updateThemeButton();

        // 커스텀 이벤트 발생
        window.dispatchEvent(new CustomEvent('themechange', {
            detail: { mode }
        }));
    }

    /**
     * 테마 모드를 토글합니다. (Dark ↔ Light)
     */
    function toggleThemeMode() {
        const newMode = state.mode === ThemeMode.DARK ? ThemeMode.LIGHT : ThemeMode.DARK;
        setThemeMode(newMode);
    }

    /**
     * 테마 버튼의 아이콘을 업데이트합니다.
     */
    function updateThemeButton() {
        const btn = document.getElementById('theme-btn');
        if (!btn) return;

        const icon = btn.querySelector('ion-icon');
        if (!icon) return;

        if (state.mode === ThemeMode.LIGHT) {
            icon.setAttribute('name', 'sunny');
            btn.title = 'Light Mode - Click for Dark';
        } else {
            icon.setAttribute('name', 'moon');
            btn.title = 'Dark Mode - Click for Light';
        }
    }

    // ============================================
    // Initialization
    // ============================================

    function init() {
        // 저장된 모드 복원 (없으면 시스템 설정 확인)
        const savedMode = localStorage.getItem(CONFIG.STORAGE_KEY);

        if (savedMode && Object.values(ThemeMode).includes(savedMode)) {
            state.mode = savedMode;
        } else {
            // 시스템 다크모드 설정 확인
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
                state.mode = ThemeMode.LIGHT;
            } else {
                state.mode = ThemeMode.DARK;
            }
        }

        // 테마 적용
        applyTheme(state.mode);

        // 테마 버튼 이벤트 연결
        const themeBtn = document.getElementById('theme-btn');
        if (themeBtn) {
            themeBtn.addEventListener('click', toggleThemeMode);
        }

        // 버튼 상태 업데이트
        updateThemeButton();

        // 시스템 테마 변경 감지
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                // 사용자가 수동으로 설정하지 않았다면 시스템 설정 따름
                if (!localStorage.getItem(CONFIG.STORAGE_KEY)) {
                    setThemeMode(e.matches ? ThemeMode.DARK : ThemeMode.LIGHT);
                }
            });
        }

        if (CONFIG.DEBUG) {
            console.log('[Theme] Initialized:', state.mode);
        }
    }

    // ============================================
    // Public API
    // ============================================

    window.SolarAdaptiveTheme = {
        version: '2.0.0',
        getState: () => ({ ...state }),
        setMode: setThemeMode,
        toggle: toggleThemeMode,
        ThemeMode
    };

    // DOM Ready 시 초기화
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
