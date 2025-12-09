
import { useAuthStore } from "../stores/authStore";
import { useVpnStore } from "../stores/vpnStore";
import { useThemeStore } from "../stores/themeStore";
import { useTranslation } from "react-i18next";

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
        <div className="flex-1 flex flex-col p-6 animate-fade-in overflow-y-auto">
            <h2 className="text-xl font-bold mb-6">{t('settings.title')}</h2>

            <section className="mb-6">
                <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-3">{t('settings.general.title')}</h3>
                <div className="bg-white/5 rounded-xl border border-white/5 overflow-hidden">
                    <div className="flex items-center justify-between p-4 border-b border-white/5">
                        <span className="text-sm">{t('settings.general.auto_connect')}</span>
                        <input
                            type="checkbox"
                            className="toggle toggle-success toggle-sm"
                            checked={autoConnect}
                            onChange={(e) => setAutoConnect(e.target.checked)}
                        />
                    </div>
                    <div className="flex items-center justify-between p-4">
                        <span className="text-sm">{t('settings.general.kill_switch')}</span>
                        <input
                            type="checkbox"
                            className="toggle toggle-success toggle-sm"
                            checked={killSwitch}
                            onChange={(e) => setKillSwitch(e.target.checked)}
                        />
                    </div>
                </div>
            </section>

            <section className="mb-6">
                <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-3">{t('settings.appearance.title')}</h3>
                <div className="bg-white/5 rounded-xl border border-white/5 overflow-hidden">
                    {/* Theme Selector */}
                    <div className="flex items-center justify-between p-4 border-b border-white/5">
                        <span className="text-sm">{t('settings.appearance.theme')}</span>
                        <div className="flex gap-1">
                            <button
                                onClick={() => setTheme('dark')}
                                className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${theme === 'dark'
                                    ? 'bg-primary-accent/20 text-primary-accent border border-primary-accent/30'
                                    : 'bg-white/5 text-muted hover:bg-white/10'
                                    }`}
                            >
                                {t('settings.appearance.dark')}
                            </button>
                            <button
                                onClick={() => setTheme('light')}
                                className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${theme === 'light'
                                    ? 'bg-primary-accent/20 text-primary-accent border border-primary-accent/30'
                                    : 'bg-white/5 text-muted hover:bg-white/10'
                                    }`}
                            >
                                {t('settings.appearance.light')}
                            </button>
                            <button
                                onClick={() => setTheme('system')}
                                className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${theme === 'system'
                                    ? 'bg-primary-accent/20 text-primary-accent border border-primary-accent/30'
                                    : 'bg-white/5 text-muted hover:bg-white/10'
                                    }`}
                            >
                                {t('settings.appearance.system')}
                            </button>
                        </div>
                    </div>

                    {/* Language Selector */}
                    <div className="flex items-center justify-between p-4">
                        <span className="text-sm">{t('settings.language.title')}</span>
                        <div className="flex gap-1">
                            <button
                                onClick={() => changeLanguage('en')}
                                className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${i18n.language.startsWith('en')
                                    ? 'bg-primary-accent/20 text-primary-accent border border-primary-accent/30'
                                    : 'bg-white/5 text-muted hover:bg-white/10'
                                    }`}
                            >
                                English
                            </button>
                            <button
                                onClick={() => changeLanguage('ko')}
                                className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${i18n.language.startsWith('ko')
                                    ? 'bg-primary-accent/20 text-primary-accent border border-primary-accent/30'
                                    : 'bg-white/5 text-muted hover:bg-white/10'
                                    }`}
                            >
                                한국어
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <section className="mb-6">
                <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-3">{t('settings.contribution.title')}</h3>
                <div className="bg-white/5 rounded-xl border border-white/5 overflow-hidden">
                    <div className="flex items-center justify-between p-4 border-b border-white/5">
                        <div>
                            <div className="text-sm">{t('settings.contribution.enable_mode')}</div>
                            <div className="text-xs text-muted">{t('settings.contribution.enable_desc')}</div>
                        </div>
                        <input
                            type="checkbox"
                            className="toggle toggle-success toggle-sm"
                            checked={isNodeModeEnabled}
                            onChange={(e) => setNodeMode(e.target.checked)}
                        />
                    </div>
                    <div className="flex items-center justify-between p-4">
                        <span className="text-sm">{t('settings.contribution.wifi_only')}</span>
                        <input
                            type="checkbox"
                            className="toggle toggle-success toggle-sm"
                            checked={wifiOnly}
                            onChange={(e) => setWifiOnly(e.target.checked)}
                        />
                    </div>
                </div>
            </section>

            <section>
                <button
                    onClick={handleLogout}
                    className="w-full bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 rounded-xl py-3 text-sm font-medium transition-colors"
                >
                    {t('settings.account.logout')}
                </button>
                <div className="text-center mt-4">
                    <span className="text-xs text-muted">{t('settings.account.version')}</span>
                </div>
            </section>
        </div>
    );
}

