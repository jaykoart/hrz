import { useState } from 'react';
import { open } from '@tauri-apps/plugin-shell';
import { useAuthStore } from '../stores/authStore';
import { useTranslation } from 'react-i18next';
import logoHqmx from '../assets/logo-hqmx-dark.svg';

// Mock Config
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID"; // Replace later
const REDIRECT_URI = "hqmx-vpn://auth/callback";
const SCOPE = "email profile";

type AuthMode = 'login' | 'register';

export default function Login() {
    const { loginWithEmail, register, error, clearError, isLoading } = useAuthStore();
    const { t } = useTranslation();
    const [mode, setMode] = useState<AuthMode>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [localError, setLocalError] = useState<string | null>(null);

    const handleGoogleLogin = async () => {
        try {
            const authUrl = `${GOOGLE_AUTH_URL}?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=token&scope=${SCOPE}`;
            await open(authUrl);
        } catch (err) {
            console.error("Failed to open browser:", err);
        }
    };

    const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalError(null);
        clearError();

        if (!email || !password) {
            setLocalError(t('login.error_required_fields'));
            return;
        }

        if (mode === 'register') {
            if (password.length < 8) {
                setLocalError(t('login.error_password_length'));
                return;
            }
            if (password !== confirmPassword) {
                setLocalError(t('login.error_password_mismatch'));
                return;
            }
            const result = await register(email, password, displayName || undefined);
            if (!result.success) {
                setLocalError(result.error || t('login.error_register_failed'));
            }
        } else {
            const result = await loginWithEmail(email, password);
            if (!result.success) {
                setLocalError(result.error || t('login.error_login_failed'));
            }
        }
    };

    const toggleMode = () => {
        setMode(mode === 'login' ? 'register' : 'login');
        setLocalError(null);
        clearError();
        setPassword('');
        setConfirmPassword('');
    };

    const displayError = localError || error;

    return (
        <div className="login-container">
            {/* Background Glows */}
            <div className="ambient-glow" />
            <div className="ambient-glow-2" />

            {/* Main Content */}
            <div className="login-content">
                {/* Logo Section */}
                <div className="login-header">
                    <img src={logoHqmx} alt="HQMX" className="logo-img" />
                    <h1 className="login-title">
                        {mode === 'login' ? t('login.title') : t('login.register_title')}
                    </h1>
                    <p className="login-subtitle">{t('login.subtitle')}</p>
                </div>

                {/* Auth Form */}
                <div className="auth-container">
                    {/* Google Button */}
                    <button
                        onClick={handleGoogleLogin}
                        disabled={isLoading}
                        className="google-btn glass"
                    >
                        <svg className="google-icon" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        <span>{t('login.continue_with_google')}</span>
                    </button>

                    {/* Divider */}
                    <div className="divider">
                        <div className="divider-line" />
                        <span className="divider-text">OR</span>
                        <div className="divider-line" />
                    </div>

                    {/* Error Message */}
                    {displayError && (
                        <div className="error-message">
                            {displayError}
                        </div>
                    )}

                    {/* Email Form */}
                    <form className="auth-form" onSubmit={handleEmailSubmit}>
                        {mode === 'register' && (
                            <input
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                placeholder={t('login.name_placeholder')}
                                className="input-field glass"
                            />
                        )}
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder={t('login.email_placeholder')}
                            className="input-field glass"
                            autoComplete="email"
                        />
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={t('login.password_placeholder')}
                            className="input-field glass"
                            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                        />
                        {mode === 'register' && (
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder={t('login.confirm_password_placeholder')}
                                className="input-field glass"
                                autoComplete="new-password"
                            />
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="submit-btn"
                        >
                            {isLoading
                                ? t('common.loading')
                                : mode === 'login'
                                    ? t('login.sign_in')
                                    : t('login.create_account')
                            }
                        </button>

                        <button
                            type="button"
                            onClick={toggleMode}
                            className="toggle-mode-btn"
                        >
                            {mode === 'login' ? t('login.new_account') : t('login.have_account')}
                        </button>
                    </form>

                    {/* Terms */}
                    <p className="terms-text">
                        {t('login.terms_agreement')}{' '}
                        <a href="https://hqmx.net/terms.html" target="_blank" rel="noopener noreferrer">
                            {t('login.terms')}
                        </a>
                        {' & '}
                        <a href="https://hqmx.net/privacy.html" target="_blank" rel="noopener noreferrer">
                            {t('login.privacy_policy')}
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}
