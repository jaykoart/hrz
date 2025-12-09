import { useState, useEffect } from "react";
// import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import Login from "./pages/Login";
import Connect from "./pages/Connect";
import Stats from "./pages/Stats";
import Settings from "./pages/Settings";
import { onOpenUrl } from "@tauri-apps/plugin-deep-link";
import { useAuthStore } from "./stores/authStore";
import { useThemeStore } from "./stores/themeStore";
import { useTranslation } from "react-i18next";
import { check } from '@tauri-apps/plugin-updater';
import { ask } from '@tauri-apps/plugin-dialog';
import { relaunch } from '@tauri-apps/plugin-process';

function App() {
  const { isLoggedIn, isLoading, checkLogin, login } = useAuthStore();
  const { initTheme } = useThemeStore();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'connect' | 'stats' | 'settings'>('connect');

  useEffect(() => {
    checkLogin();
    initTheme();

    // Auto-updater
    const checkForUpdates = async () => {
      try {
        const update = await check();
        if (update?.available) {
          const yes = await ask(`Update to ${update.version} is available!\n\nRelease notes: ${update.body}`, {
            title: 'Update Available',
            kind: 'info',
            okLabel: 'Update',
            cancelLabel: 'Later'
          });
          if (yes) {
            await update.downloadAndInstall();
            await relaunch();
          }
        }
      } catch (error) {
        console.error("Update check failed:", error);
      }
    };
    checkForUpdates();

    // Deep Link Listener
    const setupDeepLink = async () => {
      const unlisten = await onOpenUrl((urls) => {
        console.log("Deep link received:", urls);
        for (const url of urls) {
          // Check for auth callback
          // Example: hqmx-vpn://auth/callback#access_token=xyz&...
          if (url.includes("auth/callback")) {
            const hash = url.split('#')[1];
            if (hash) {
              const params = new URLSearchParams(hash);
              const accessToken = params.get('access_token');
              if (accessToken) {
                console.log("Got access token via deep link");
                login(accessToken, {
                  email: "user@hqmx.net", // efficient placeholder for now, would fetch profile
                  name: "HQMX User"
                });
              }
            } else {
              // Handle query params case
              const query = url.split('?')[1];
              if (query) {
                const params = new URLSearchParams(query);
                const accessToken = params.get('access_token');
                if (accessToken) {
                  login(accessToken);
                }
              }
            }
          }
        }
      });
      return unlisten;
    };

    let unlisten: (() => void) | undefined;
    setupDeepLink().then(u => unlisten = u);

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center text-muted">{t('common.loading')}</div>;
  }

  if (!isLoggedIn) {
    return <Login />;
  }

  return (
    <main className="container flex flex-col h-screen overflow-hidden">
      {/* Ambient Background */}
      <div className="ambient-glow"></div>
      <div className="ambient-glow-2"></div>

      {/* Header */}
      <header className="app-header flex-none flex justify-between items-center p-4 z-10">
        <div className="brand flex items-center gap-2">
          <span className="text-xl font-bold tracking-wider">HQMX</span>
          <span className="text-xs text-muted uppercase tracking-widest mt-1">VPN</span>
        </div>
        {/* Placeholder for small status indicator or notification bell */}
        <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {activeTab === 'connect' && <Connect />}
        {activeTab === 'stats' && <Stats />}
        {activeTab === 'settings' && <Settings />}
      </div>

      {/* Bottom Navigation */}
      <nav className="nav-tabs flex-none z-10">
        <button
          className={`nav-tab ${activeTab === 'connect' ? 'active' : ''}`}
          onClick={() => setActiveTab('connect')}
        >
          <span className="nav-tab-icon">🔌</span>
          <span>{t('nav.connect')}</span>
        </button>
        <button
          className={`nav-tab ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          <span className="nav-tab-icon">📊</span>
          <span>{t('nav.stats')}</span>
        </button>
        <button
          className={`nav-tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <span className="nav-tab-icon">⚙️</span>
          <span>{t('nav.settings')}</span>
        </button>
      </nav>
    </main>
  );
}

export default App;
