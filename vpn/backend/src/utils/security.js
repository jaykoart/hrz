/**
 * Security Utilities
 * JWT 토큰 생성/검증, 노드 인증 미들웨어
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'horizon-vpn-dev-secret-change-in-production';
const TOKEN_EXPIRY = '7d';

/**
 * JWT 토큰 생성
 */
function generateToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

/**
 * JWT 토큰 검증
 */
function verifyToken(token) {
    try {
        return { valid: true, payload: jwt.verify(token, JWT_SECRET) };
    } catch (error) {
        return { valid: false, error: error.message };
    }
}

/**
 * 노드 인증 미들웨어
 * Authorization: Bearer <token>
 */
function nodeAuthMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Missing or invalid Authorization header'
        });
    }

    const token = authHeader.substring(7);
    const result = verifyToken(token);

    if (!result.valid) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid or expired token'
        });
    }

    // 노드 정보를 요청 객체에 추가
    req.node = result.payload;
    next();
}

/**
 * 선택적 인증 미들웨어 (토큰이 있으면 검증, 없으면 패스)
 */
function optionalAuthMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const result = verifyToken(token);

        if (result.valid) {
            req.node = result.payload;
        }
    }

    next();
}

/**
 * WireGuard 공개키 형식 검증 (Base64, 44자)
 */
function isValidWireGuardKey(key) {
    if (!key || typeof key !== 'string') return false;

    // WireGuard 키는 Base64로 인코딩된 32바이트 = 44자 (패딩 포함)
    // 또는 43자 (패딩 없이 끝나는 경우)
    const base64Regex = /^[A-Za-z0-9+/]{42,44}=?=?$/;
    return base64Regex.test(key);
}

/**
 * API 키 생성 (간단한 랜덤 토큰)
 */
function generateApiKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'hvpn_';
    for (let i = 0; i < 32; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

module.exports = {
    generateToken,
    verifyToken,
    nodeAuthMiddleware,
    optionalAuthMiddleware,
    isValidWireGuardKey,
    generateApiKey
};
