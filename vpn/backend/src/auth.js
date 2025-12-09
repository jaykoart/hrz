const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const express = require('express');
const router = express.Router();
const userSettings = require('./services/userSettings');

// 인메모리 사용자 저장소 (실제 환경에서는 DB)
const users = new Map();

passport.serializeUser(function (user, done) {
    done(null, user);
});

passport.deserializeUser(function (user, done) {
    done(null, user);
});

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "/auth/google/callback"
    },
        function (accessToken, refreshToken, profile, done) {
            // 사용자 저장 또는 업데이트
            const user = {
                id: profile.id,
                displayName: profile.displayName,
                email: profile.emails?.[0]?.value || null,
                photo: profile.photos?.[0]?.value || null,
                provider: 'google',
                createdAt: users.has(profile.id) ? users.get(profile.id).createdAt : new Date().toISOString(),
                lastLoginAt: new Date().toISOString()
            };
            users.set(profile.id, user);
            return done(null, user);
        }
    ));
} else {
    console.warn("GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing. Google Auth will not work.");
}

// ============================================
// OAuth Routes
// ============================================

router.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login-failed' }),
    function (req, res) {
        // 성공 시 프론트엔드로 리다이렉트
        const redirectUrl = process.env.FRONTEND_URL || 'https://hqmx.net/vpn/main.html';
        res.redirect(redirectUrl);
    });

// ============================================
// User API Routes
// ============================================

/**
 * GET /api/user
 * 현재 로그인 상태 및 사용자 정보
 */
router.get('/api/user', (req, res) => {
    if (req.isAuthenticated()) {
        res.json({ authenticated: true, user: req.user });
    } else {
        res.json({ authenticated: false });
    }
});

/**
 * GET /api/user/profile
 * 사용자 프로필 상세 조회
 */
router.get('/api/user/profile', (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Unauthorized', message: 'Please login first' });
    }

    const user = users.get(req.user.id);
    if (!user) {
        return res.status(404).json({ error: 'Not Found', message: 'User not found' });
    }

    const settings = userSettings.getSettings(req.user.id);
    const consent = userSettings.getConsent(req.user.id);

    res.json({
        profile: user,
        settings,
        consent: consent ? { agreed: true, agreedAt: consent.agreedAt } : { agreed: false }
    });
});

/**
 * PUT /api/user/profile
 * 프로필 수정 (표시 이름만 수정 가능)
 */
router.put('/api/user/profile', (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Unauthorized', message: 'Please login first' });
    }

    const user = users.get(req.user.id);
    if (!user) {
        return res.status(404).json({ error: 'Not Found', message: 'User not found' });
    }

    const { displayName } = req.body;

    if (displayName && typeof displayName === 'string') {
        user.displayName = displayName.trim().substring(0, 50);  // 최대 50자
        user.updatedAt = new Date().toISOString();
        users.set(req.user.id, user);
    }

    res.json({
        success: true,
        profile: user
    });
});

/**
 * POST /api/logout
 * 로그아웃
 */
router.post('/api/logout', (req, res) => {
    if (req.isAuthenticated()) {
        const userId = req.user.id;
        req.logout((err) => {
            if (err) {
                return res.status(500).json({ error: 'Logout failed' });
            }
            res.json({ success: true, message: 'Logged out successfully' });
        });
    } else {
        res.json({ success: true, message: 'Already logged out' });
    }
});

// 기존 GET /api/logout 유지 (하위 호환)
router.get('/api/logout', (req, res) => {
    req.logout(() => { });
    res.redirect('/');
});

/**
 * DELETE /api/user
 * 계정 탈퇴 (모든 데이터 삭제)
 */
router.delete('/api/user', (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Unauthorized', message: 'Please login first' });
    }

    const userId = req.user.id;

    // 1. 사용자 설정/동의 데이터 삭제
    userSettings.deleteUserData(userId);

    // 2. 사용자 프로필 삭제
    users.delete(userId);

    // 3. 세션 종료
    req.logout((err) => {
        if (err) {
            console.error('Logout error during deletion:', err);
        }
        res.json({
            success: true,
            message: 'Account deleted successfully',
            deletedData: ['profile', 'settings', 'consent', 'session']
        });
    });
});

/**
 * GET /api/user/export
 * 사용자 데이터 내보내기 (GDPR 준수)
 */
router.get('/api/user/export', (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Unauthorized', message: 'Please login first' });
    }

    const userId = req.user.id;
    const user = users.get(userId);
    const settings = userSettings.getSettings(userId);
    const consent = userSettings.getConsent(userId);

    res.json({
        exportDate: new Date().toISOString(),
        profile: user || null,
        settings,
        consent
    });
});

module.exports = router;

