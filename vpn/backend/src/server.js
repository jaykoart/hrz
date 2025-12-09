require('dotenv').config();
const express = require('express');
const passport = require('passport');
const cookieSession = require('cookie-session');
const cors = require('cors');
const WebSocket = require('ws');
const http = require('http');
const authRoutes = require('./auth');
const nodesRoutes = require('./routes/nodes');
const vpnRoutes = require('./routes/vpn');
const proxyRoutes = require('./routes/proxy');
const consentRoutes = require('./routes/consent');
const settingsRoutes = require('./routes/settings');
const kycRoutes = require('./routes/kyc');
const nodeStore = require('./services/nodeStore');
const proxyGateway = require('./services/proxyGateway');
const dnsSinkhole = require('./services/dnsSinkhole');
const kycVerification = require('./services/kycVerification');
const { verifyToken } = require('./utils/security');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors({
    origin: ['http://localhost:5500', 'http://127.0.0.1:5500', 'https://hqmx.net'],
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
app.use('/api/nodes', nodesRoutes);
app.use('/api/vpn', vpnRoutes);
app.use('/api/proxy', proxyRoutes);
app.use('/api/consent', consentRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/kyc', kycRoutes);

// Health Check with stats (모든 서비스 통계)
app.get('/health', (req, res) => {
    const nodeStats = nodeStore.getStats();
    const proxyStats = proxyGateway.getGatewayStats();
    const sinkholeStats = dnsSinkhole.getStats();
    const kycStats = kycVerification.getStats();

    res.status(200).json({
        status: 'ok',
        message: 'VPN Backend is running',
        nodes: nodeStats,
        proxy: proxyStats,
        sinkhole: sinkholeStats,
        kyc: kycStats
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.path} not found`
    });
});

// Cleanup stale nodes every minute
setInterval(() => {
    const cleaned = nodeStore.cleanupStaleNodes(60000);
    if (cleaned > 0) {
        console.log(`Cleaned up ${cleaned} stale nodes`);
    }
}, 60000);

// HTTP Server
const server = http.createServer(app);

// WebSocket Server for Proxy Gateway
const wss = new WebSocket.Server({ server, path: '/ws/proxy' });

wss.on('connection', (ws, req) => {
    console.log('[WebSocket] New connection');

    let nodeId = null;
    let authenticated = false;

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            switch (data.type) {
                case 'AUTH':
                    // 노드 인증
                    const result = verifyToken(data.token);
                    if (result.valid) {
                        nodeId = result.payload.nodeId;
                        authenticated = true;
                        proxyGateway.registerPeer(nodeId, ws);
                        ws.send(JSON.stringify({
                            type: 'AUTH_SUCCESS',
                            nodeId
                        }));
                    } else {
                        ws.send(JSON.stringify({
                            type: 'AUTH_FAILED',
                            error: 'Invalid token'
                        }));
                    }
                    break;

                case 'PROXY_RESPONSE':
                    // 프록시 응답 처리
                    if (authenticated) {
                        proxyGateway.handleProxyResponse(data.requestId, data.response);
                    }
                    break;

                case 'PROXY_ERROR':
                    // 프록시 에러 처리
                    if (authenticated) {
                        proxyGateway.handleProxyError(data.requestId, data.error);
                    }
                    break;

                case 'HEARTBEAT':
                    // Heartbeat
                    if (authenticated) {
                        nodeStore.updateHeartbeat(nodeId, data.stats || {});
                        ws.send(JSON.stringify({ type: 'HEARTBEAT_ACK' }));
                    }
                    break;

                default:
                    ws.send(JSON.stringify({
                        type: 'ERROR',
                        error: 'Unknown message type'
                    }));
            }
        } catch (e) {
            console.error('[WebSocket] Message parse error:', e.message);
        }
    });

    ws.on('close', () => {
        if (nodeId) {
            proxyGateway.unregisterPeer(nodeId);
            console.log(`[WebSocket] Peer disconnected: ${nodeId}`);
        }
    });

    ws.on('error', (error) => {
        console.error('[WebSocket] Error:', error.message);
    });

    // 연결 타임아웃 (30초 내 인증 필요)
    setTimeout(() => {
        if (!authenticated) {
            ws.send(JSON.stringify({
                type: 'AUTH_TIMEOUT',
                error: 'Authentication required within 30 seconds'
            }));
            ws.close();
        }
    }, 30000);
});

server.listen(PORT, () => {
    console.log(`VPN Backend running on port ${PORT}`);
    console.log(`  - Health: http://localhost:${PORT}/health`);
    console.log(`  - Nodes API: http://localhost:${PORT}/api/nodes`);
    console.log(`  - VPN API: http://localhost:${PORT}/api/vpn`);
    console.log(`  - Proxy API: http://localhost:${PORT}/api/proxy`);
    console.log(`  - WebSocket: ws://localhost:${PORT}/ws/proxy`);
});
