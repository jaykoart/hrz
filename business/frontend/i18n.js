/**
 * Horizon VPN - Internationalization (i18n) Library
 * Supports 12 languages with JSON-based translations
 * 
 * Usage:
 * 1. Add data-i18n="key.path" attributes to HTML elements
 * 2. Load this script after DOM content
 * 3. Translations are auto-applied based on stored/detected language
 */

const HorizonI18n = (function () {
    'use strict';

    // Supported languages
    const SUPPORTED_LANGUAGES = {
        'en': { name: 'English', native: 'English', flag: '🇺🇸' },
        'ko': { name: 'Korean', native: '한국어', flag: '🇰🇷' },
        'ja': { name: 'Japanese', native: '日本語', flag: '🇯🇵' },
        'zh-CN': { name: 'Chinese (Simplified)', native: '简体中文', flag: '🇨🇳' },
        'zh-TW': { name: 'Chinese (Traditional)', native: '繁體中文', flag: '🇹🇼' },
        'es': { name: 'Spanish', native: 'Español', flag: '🇪🇸' },
        'fr': { name: 'French', native: 'Français', flag: '🇫🇷' },
        'de': { name: 'German', native: 'Deutsch', flag: '🇩🇪' },
        'pt': { name: 'Portuguese', native: 'Português', flag: '🇧🇷' },
        'ru': { name: 'Russian', native: 'Русский', flag: '🇷🇺' },
        'ar': { name: 'Arabic', native: 'العربية', flag: '🇸🇦' },
        'hi': { name: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' }
    };

    const DEFAULT_LANGUAGE = 'en';
    const STORAGE_KEY = 'horizon_language';

    let translations = {};
    let currentLang = DEFAULT_LANGUAGE;
    let dropdownVisible = false;

    /**
     * Get nested value from object using dot notation
     */
    function getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) =>
            current && current[key] !== undefined ? current[key] : null, obj);
    }

    /**
     * Detect browser language
     */
    function detectBrowserLanguage() {
        const browserLang = navigator.language || navigator.userLanguage;
        // Check exact match first
        if (SUPPORTED_LANGUAGES[browserLang]) {
            return browserLang;
        }
        // Check language code without region (e.g., 'ko' from 'ko-KR')
        const langCode = browserLang.split('-')[0];
        if (SUPPORTED_LANGUAGES[langCode]) {
            return langCode;
        }
        return DEFAULT_LANGUAGE;
    }

    /**
     * Load translation file for a language
     */
    async function loadTranslation(lang) {
        if (translations[lang]) {
            return translations[lang];
        }

        try {
            const response = await fetch(`locales/${lang}.json`);
            if (!response.ok) {
                console.warn(`[i18n] Translation file for '${lang}' not found, falling back to '${DEFAULT_LANGUAGE}'`);
                return null;
            }
            translations[lang] = await response.json();
            return translations[lang];
        } catch (error) {
            console.warn(`[i18n] Error loading translation for '${lang}':`, error);
            return null;
        }
    }

    /**
     * Apply translations to all elements with data-i18n attribute
     */
    function applyTranslations() {
        const langData = translations[currentLang] || translations[DEFAULT_LANGUAGE];
        if (!langData) return;

        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = getNestedValue(langData, key) ||
                getNestedValue(translations[DEFAULT_LANGUAGE], key) ||
                key;

            // Handle elements with HTML content (like <gradient> tags)
            if (translation.includes('<gradient>')) {
                element.innerHTML = translation.replace(
                    /<gradient>(.*?)<\/gradient>/g,
                    '<span class="text-gradient">$1</span>'
                );
            } else {
                element.innerHTML = translation;
            }
        });

        // Update HTML lang attribute
        document.documentElement.lang = currentLang;

        // Handle RTL languages (Arabic)
        if (currentLang === 'ar') {
            document.documentElement.dir = 'rtl';
        } else {
            document.documentElement.dir = 'ltr';
        }
    }

    /**
     * Set current language and apply translations
     */
    async function setLanguage(lang) {
        if (!SUPPORTED_LANGUAGES[lang]) {
            console.warn(`[i18n] Language '${lang}' is not supported`);
            return;
        }

        // Load translation if needed
        await loadTranslation(lang);

        // Also ensure fallback language is loaded
        if (lang !== DEFAULT_LANGUAGE) {
            await loadTranslation(DEFAULT_LANGUAGE);
        }

        currentLang = lang;
        localStorage.setItem(STORAGE_KEY, lang);
        applyTranslations();
        updateDropdownSelection();
    }

    /**
     * Create language selector dropdown
     */
    function createDropdown() {
        // Remove existing dropdown if any
        const existing = document.getElementById('horizon-lang-dropdown');
        if (existing) existing.remove();

        const dropdown = document.createElement('div');
        dropdown.id = 'horizon-lang-dropdown';
        dropdown.className = 'lang-dropdown glass';
        dropdown.innerHTML = Object.entries(SUPPORTED_LANGUAGES).map(([code, lang]) => `
            <button class="lang-option ${code === currentLang ? 'active' : ''}" data-lang="${code}">
                <span class="lang-flag">${lang.flag}</span>
                <span class="lang-native">${lang.native}</span>
            </button>
        `).join('');

        // Add event listeners to language options
        dropdown.querySelectorAll('.lang-option').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const lang = btn.getAttribute('data-lang');
                setLanguage(lang);
                hideDropdown();
            });
        });

        return dropdown;
    }

    /**
     * Update dropdown selection indicator
     */
    function updateDropdownSelection() {
        const dropdown = document.getElementById('horizon-lang-dropdown');
        if (!dropdown) return;

        dropdown.querySelectorAll('.lang-option').forEach(btn => {
            const isActive = btn.getAttribute('data-lang') === currentLang;
            btn.classList.toggle('active', isActive);
        });
    }

    /**
     * Show language dropdown
     */
    function showDropdown() {
        let dropdown = document.getElementById('horizon-lang-dropdown');
        if (!dropdown) {
            dropdown = createDropdown();
            const langBtn = document.getElementById('lang-btn');
            if (langBtn && langBtn.parentElement) {
                langBtn.parentElement.appendChild(dropdown);
            }
        }

        requestAnimationFrame(() => {
            dropdown.classList.add('visible');
            dropdownVisible = true;
        });
    }

    /**
     * Hide language dropdown
     */
    function hideDropdown() {
        const dropdown = document.getElementById('horizon-lang-dropdown');
        if (dropdown) {
            dropdown.classList.remove('visible');
            dropdownVisible = false;
        }
    }

    /**
     * Toggle dropdown visibility
     */
    function toggleDropdown() {
        if (dropdownVisible) {
            hideDropdown();
        } else {
            showDropdown();
        }
    }

    /**
     * Initialize i18n system
     */
    async function init() {
        // Get stored language or detect from browser
        const storedLang = localStorage.getItem(STORAGE_KEY);
        const initialLang = storedLang || detectBrowserLanguage();

        // Load translations
        await loadTranslation(DEFAULT_LANGUAGE);
        if (initialLang !== DEFAULT_LANGUAGE) {
            await loadTranslation(initialLang);
        }

        currentLang = initialLang;
        applyTranslations();

        // Setup language button click handler
        const langBtn = document.getElementById('lang-btn');
        if (langBtn) {
            langBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleDropdown();
            });
        }

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (dropdownVisible && !e.target.closest('#horizon-lang-dropdown')) {
                hideDropdown();
            }
        });

        console.log(`[i18n] Initialized with language: ${currentLang}`);
    }

    // Public API
    return {
        init,
        setLanguage,
        getCurrentLanguage: () => currentLang,
        getSupportedLanguages: () => ({ ...SUPPORTED_LANGUAGES }),
        t: (key) => {
            const langData = translations[currentLang] || translations[DEFAULT_LANGUAGE];
            return getNestedValue(langData, key) ||
                getNestedValue(translations[DEFAULT_LANGUAGE], key) ||
                key;
        }
    };
})();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', HorizonI18n.init);
} else {
    HorizonI18n.init();
}
