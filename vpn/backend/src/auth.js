const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const express = require('express');
const router = express.Router();

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
            // Here you would typically find or create a user in your DB
            const user = {
                id: profile.id,
                displayName: profile.displayName,
                emails: profile.emails,
                photos: profile.photos
            };
            return done(null, user);
        }
    ));
} else {
    console.warn("GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing. Google Auth will not work.");
}

// Routes
router.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login-failed' }),
    function (req, res) {
        // Successful authentication, redirect to frontend.
        // In production, might want to redirect to hqmx.net/vpn/main.html
        // For now, redirect to localhost or relative path if possible, but backend and frontend are on different ports usually.
        // We'll redirect to a generic success page or the referer.
        res.redirect('http://localhost:5500/vpn/frontend/vpn.html'); // Adjust this redirect as needed for dev
    });

router.get('/api/user', (req, res) => {
    if (req.isAuthenticated()) {
        res.json({ authenticated: true, user: req.user });
    } else {
        res.json({ authenticated: false });
    }
});

router.get('/api/logout', (req, res) => {
    req.logout();
    res.redirect('/');
});

module.exports = router;
