document.addEventListener('DOMContentLoaded', () => {
    console.log('HQMX VPN Frontend Loaded');

    // ============================================
    // Theme Toggle (Dark/Light Mode)
    // ============================================
    // ============================================
    // Theme Toggle (Dark/Light Mode)
    // ============================================
    const THEME_STORAGE_KEY = 'hqmx_theme_mode';

    // Check system preference or localStorage
    const getPreferredTheme = () => {
        const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
        if (storedTheme) {
            return storedTheme;
        }
        return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    };

    let currentTheme = getPreferredTheme();

    function applyTheme(mode) {
        const root = document.documentElement;
        root.setAttribute('data-theme', mode);

        currentTheme = mode;
        localStorage.setItem(THEME_STORAGE_KEY, mode);

        updateLogo(mode);
        updateThemeButton(mode);
    }

    function updateLogo(mode) {
        const logoImg = document.querySelector('.logo-img');
        if (logoImg) {
            // mode가 'light'이면 light 로고, 아니면 dark 로고
            logoImg.src = mode === 'light' ? 'assets/logo-hqmx-light.svg' : 'assets/logo-hqmx-dark.svg';
        }
    }

    function updateThemeButton(mode) {
        const btn = document.getElementById('theme-btn');
        if (!btn) return;
        const icon = btn.querySelector('ion-icon');
        if (!icon) return;

        if (mode === 'light') {
            icon.setAttribute('name', 'sunny-outline');
            btn.title = 'Switch to Dark Mode';
        } else {
            icon.setAttribute('name', 'moon-outline');
            btn.title = 'Switch to Light Mode';
        }
    }

    function toggleTheme() {
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        applyTheme(newTheme);
    }

    // Initialize theme
    applyTheme(currentTheme);

    const themeBtn = document.getElementById('theme-btn');
    if (themeBtn) {
        themeBtn.addEventListener('click', toggleTheme);
    }

    // ============================================
    // Download Button
    // ============================================
    const downloadBtn = document.getElementById('downloadBtn');

    if (downloadBtn) {
        downloadBtn.addEventListener('click', (e) => {
            e.preventDefault();
            alert('HQMX VPN Beta is coming soon!\n\nWe are currently building the WireGuard-Go core.');
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

// ============================================
// Mobile Navigation (Hamburger)
// ============================================
const hamburgerBtn = document.getElementById('hamburger-btn');
const navLinks = document.querySelector('.nav-links');

if (hamburgerBtn && navLinks) {
    hamburgerBtn.addEventListener('click', () => {
        navLinks.classList.toggle('mobile-active');

        // Toggle icon between "menu" and "close"
        const icon = hamburgerBtn.querySelector('ion-icon');
        if (icon) {
            const currentIcon = icon.getAttribute('name');
            icon.setAttribute('name', currentIcon === 'menu-outline' ? 'close-outline' : 'menu-outline');
        }
    });

    // Close menu when a link is clicked
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('mobile-active');
            const icon = hamburgerBtn.querySelector('ion-icon');
            if (icon) {
                icon.setAttribute('name', 'menu-outline');
            }
        });
    });
}

// ============================================
