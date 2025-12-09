import { useState, useEffect } from "react";
// import { invoke } from "@tauri-apps/api/core";
import "./App.css";
// import Login from "./pages/Login"; // 디자인 확인을 위해 임시 비활성화
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

import logoDark from "./assets/logo-hqmx-dark.svg";
import logoLight from "./assets/logo-hqmx-light.svg";

function App() {
  const { checkLogin, login } = useAuthStore();
  const { initTheme, theme } = useThemeStore();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'connect' | 'stats' | 'settings'>('connect');

  const logoSrc = theme === 'light' ? logoLight : logoDark;

  useEffect(() => {
    checkLogin();
    initTheme();

    // Tauri 환경에서만 플러그인 실행
    const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;

    if (isTauri) {
      // Auto-updater (Tauri 전용)
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

      // Deep Link Listener (Tauri 전용)
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
    }
  }, []);

  return (
    <main className="relative h-screen overflow-hidden bg-[var(--bg-color)] text-[var(--text-main)] transition-colors duration-500 font-sans">
      {/* Ambient Background */}
      <div className="ambient-glow"></div>
      <div className="ambient-glow-2"></div>

      {/* Header - Fixed Top Left with Safe Area */}
      <header
        data-tauri-drag-region
        className="fixed top-0 left-0 right-0 h-[60px] flex items-center justify-start pl-[80px] z-50 pointer-events-auto w-full"
      >
        <img src={logoSrc} alt="HQMX VPN" className="h-6 w-auto transition-opacity duration-300" />
      </header>

      {/* Main Content Area */}
      <div className="fixed inset-0 z-0 overflow-y-auto overflow-x-hidden custom-scrollbar">
        <div className="min-h-full w-full pt-[60px] pb-[80px] flex flex-col">
          {activeTab === 'connect' && <Connect />}
          {activeTab === 'stats' && <Stats />}
          {activeTab === 'settings' && <Settings />}
        </div>
      </div>

      {/* Bottom Navigation - Fixed Bottom Floor */}
      <nav
        className="nav-tabs fixed bottom-0 left-0 right-0 z-50 backdrop-blur-md flex w-full m-0 p-0"
        style={{ paddingBottom: '0px', marginBottom: '0px' }}
      >
        <button
          className={`nav-tab ${activeTab === 'connect' ? 'active' : ''}`}
          onClick={() => setActiveTab('connect')}
        >
          <span className="nav-tab-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
            </svg>
          </span>
          <span>{t('nav.connect')}</span>
        </button>
        <button
          className={`nav-tab ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          <span className="nav-tab-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10"></line>
              <line x1="12" y1="20" x2="12" y2="4"></line>
              <line x1="6" y1="20" x2="6" y2="14"></line>
            </svg>
          </span>
          <span>{t('nav.stats')}</span>
        </button>
        <button
          className={`nav-tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <span className="nav-tab-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </span>
          <span>{t('nav.settings')}</span>
        </button>
      </nav>
    </main>
  );
}

export default App;
