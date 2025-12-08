require('dotenv').config();
const express = require('express');
const passport = require('passport');
const cookieSession = require('cookie-session');
const cors = require('cors');
const authRoutes = require('./auth');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors({
    origin: ['http://localhost:5500', 'http://127.0.0.1:5500', 'https://hqmx.net'], // Adjust based on frontend port
    credentials: true
}));
app.use(express.json());

// Session
app.use(cookieSession({
    name: 'vpn-session',
    keys: [process.env.COOKIE_KEY_1 || 'key1', process.env.COOKIE_KEY_2 || 'key2'],
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
}));

// Passport Init
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/', authRoutes);

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'VPN Backend is running' });
});

app.listen(PORT, () => {
    console.log(`VPN Backend running on port ${PORT}`);
});
