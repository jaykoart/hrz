document.addEventListener('DOMContentLoaded', () => {
    console.log('Horizon VPN Frontend Loaded');

    // ============================================
    // Theme Toggle (Dark/Light Mode)
    // ============================================
    const THEME_STORAGE_KEY = 'horizon_theme_mode';
    let currentTheme = 'dark';

    function applyTheme(mode) {
        const root = document.documentElement;

        if (mode === 'light') {
            // 라이트 모드 (6% 디밍)
            root.style.setProperty('--bg-dynamic', '#f0f1f3');
            root.style.setProperty('--text-dynamic', '#1a1a2e');
            root.style.setProperty('--text-muted-dynamic', '#4a5568');
            root.style.setProperty('--glass-bg-dynamic', 'rgba(0, 0, 0, 0.05)');
            root.style.setProperty('--glass-border-dynamic', 'rgba(0, 0, 0, 0.12)');
        } else {
            // 다크 모드
            root.style.setProperty('--bg-dynamic', '#050510');
            root.style.setProperty('--text-dynamic', '#ffffff');
            root.style.setProperty('--text-muted-dynamic', '#b8c5d6');
            root.style.setProperty('--glass-bg-dynamic', 'rgba(255, 255, 255, 0.05)');
            root.style.setProperty('--glass-border-dynamic', 'rgba(255, 255, 255, 0.1)');
        }

        root.dataset.themeMode = mode;
        currentTheme = mode;
        updateLogo(mode);
    }

    function updateLogo(mode) {
        const logoImg = document.querySelector('.logo-img');
        if (logoImg) {
            if (mode === 'light') {
                logoImg.src = 'assets/logo-hqmx-light.svg';
            } else {
                logoImg.src = 'assets/logo-hqmx-dark.svg';
            }
        }
    }

    function updateThemeButton() {
        const btn = document.getElementById('theme-btn');
        if (!btn) return;
        const icon = btn.querySelector('ion-icon');
        if (!icon) return;

        if (currentTheme === 'light') {
            icon.setAttribute('name', 'sunny');
            btn.title = 'Light Mode - Click for Dark';
        } else {
            icon.setAttribute('name', 'moon');
            btn.title = 'Dark Mode - Click for Light';
        }
    }

    function toggleTheme() {
        const newMode = currentTheme === 'dark' ? 'light' : 'dark';
        currentTheme = newMode;
        localStorage.setItem(THEME_STORAGE_KEY, newMode);
        applyTheme(newMode);
        updateThemeButton();
    }

    // Initialize theme
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme && ['light', 'dark'].includes(savedTheme)) {
        currentTheme = savedTheme;
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        currentTheme = 'light';
    }
    applyTheme(currentTheme);

    const themeBtn = document.getElementById('theme-btn');
    if (themeBtn) {
        themeBtn.addEventListener('click', toggleTheme);
    }
    updateThemeButton();

    // ============================================
    // Download Button
    // ============================================
    const downloadBtn = document.getElementById('downloadBtn');

    if (downloadBtn) {
        downloadBtn.addEventListener('click', (e) => {
            e.preventDefault();
            alert('Horizon VPN Beta is coming soon!\n\nWe are currently building the WireGuard-Go core.');
        });
    }

    // ============================================
    // Scroll-driven Holographic Effect
    // ============================================
    const updateHologramEffect = () => {
        const buttons = document.querySelectorAll('.btn-primary');
        const viewportCenter = window.innerHeight / 2;
        const effectRange = window.innerHeight * 0.4;

        buttons.forEach(btn => {
            const rect = btn.getBoundingClientRect();
            const btnCenter = rect.top + rect.height / 2;
            const distanceFromCenter = Math.abs(btnCenter - viewportCenter);

            if (distanceFromCenter < effectRange) {
                const progress = 1 - (distanceFromCenter / effectRange);
                const hologramPos = -50 + (progress * 100);
                btn.style.setProperty('--hologram-pos', `${hologramPos}%`);
            } else {
                btn.style.setProperty('--hologram-pos', '-150%');
            }
        });
    };

    window.addEventListener('scroll', updateHologramEffect, { passive: true });
    window.addEventListener('resize', updateHologramEffect, { passive: true });
    updateHologramEffect();
});

