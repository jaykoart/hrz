
import { useAuthStore } from "../stores/authStore";
import { useVpnStore } from "../stores/vpnStore";
import { useThemeStore } from "../stores/themeStore";
import { useTranslation } from "react-i18next";

const languageMap: { [key: string]: string } = {
    en: 'English',
    ko: '한국어',
    ja: '日本語',
    'zh-CN': '简体中文',
    'zh-TW': '繁體中文',
    es: 'Español',
    fr: 'Français',
    de: 'Deutsch',
    pt: 'Português',
    ru: 'Русский',
    ar: 'العربية',
    hi: 'हिन्दी',
};

export default function Settings() {
    const { logout } = useAuthStore();
    const {
        isNodeModeEnabled, setNodeMode,
        autoConnect, setAutoConnect,
        killSwitch, setKillSwitch,
        wifiOnly, setWifiOnly
    } = useVpnStore();
    const { theme, setTheme } = useThemeStore();
    const { t, i18n } = useTranslation();

    const handleLogout = async () => {
        await logout();
    };

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
    };

    return (
        <div className="settings-page">
            <div className="settings-container">
                <h2 className="settings-title">{t('settings.title')}</h2>

                {/* General Settings */}
                <section className="settings-section">
                    <h3 className="section-label">{t('settings.general.title')}</h3>
                    <div className="settings-card glass">
                        <div className="setting-item">
                            <span className="setting-label">{t('settings.general.auto_connect')}</span>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={autoConnect}
                                    onChange={(e) => setAutoConnect(e.target.checked)}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>
                        <div className="setting-item">
                            <span className="setting-label">{t('settings.general.kill_switch')}</span>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={killSwitch}
                                    onChange={(e) => setKillSwitch(e.target.checked)}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>
                    </div>
                </section>

                {/* Appearance Settings */}
                <section className="settings-section">
                    <h3 className="section-label">{t('settings.appearance.title')}</h3>
                    <div className="settings-card glass">
                        <div className="setting-item">
                            <span className="setting-label">{t('settings.appearance.theme')}</span>
                            <div className="button-group">
                                <button
                                    onClick={() => setTheme('dark')}
                                    className={`group-btn ${theme === 'dark' ? 'active' : ''}`}
                                >
                                    {t('settings.appearance.dark')}
                                </button>
                                <button
                                    onClick={() => setTheme('light')}
                                    className={`group-btn ${theme === 'light' ? 'active' : ''}`}
                                >
                                    {t('settings.appearance.light')}
                                </button>
                                <button
                                    onClick={() => setTheme('system')}
                                    className={`group-btn ${theme === 'system' ? 'active' : ''}`}
                                >
                                    {t('settings.appearance.system')}
                                </button>
                            </div>
                        </div>

                        <div className="setting-item">
                            <span className="setting-label">{t('settings.language.title')}</span>
                            <select
                                value={i18n.language}
                                onChange={(e) => changeLanguage(e.target.value)}
                                className="group-btn"
                                style={{ WebkitAppearance: 'none', appearance: 'none', textAlign: 'center', paddingRight: '2rem' }}
                            >
                                {Object.keys(languageMap).map((lng) => (
                                    <option key={lng} value={lng}>
                                        {languageMap[lng]}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </section>

                {/* Contribution Settings */}
                <section className="settings-section">
                    <h3 className="section-label">{t('settings.contribution.title')}</h3>
                    <div className="settings-card glass">
                        <div className="setting-item">
                            <div className="setting-info">
                                <div className="setting-label">{t('settings.contribution.enable_mode')}</div>
                                <div className="setting-desc">{t('settings.contribution.enable_desc')}</div>
                            </div>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={isNodeModeEnabled}
                                    onChange={(e) => setNodeMode(e.target.checked)}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>
                        <div className="setting-item">
                            <span className="setting-label">{t('settings.contribution.wifi_only')}</span>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={wifiOnly}
                                    onChange={(e) => setWifiOnly(e.target.checked)}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>
                    </div>
                </section>

                {/* Logout */}
                <section className="settings-section">
                    <button
                        onClick={handleLogout}
                        className="logout-btn glass"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                            <polyline points="16 17 21 12 16 7"></polyline>
                            <line x1="21" y1="12" x2="9" y2="12"></line>
                        </svg>
                        {t('settings.account.logout')}
                    </button>
                    <div className="version-text">
                        {t('settings.account.version')}
                    </div>
                </section>
            </div>
        </div>
    );
}
