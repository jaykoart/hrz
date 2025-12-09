/**
 * KYC 검증 시스템 (기업 고객용)
 * 간단한 이메일 인증 수준의 검증
 */

const crypto = require('crypto');

// 인메모리 저장소 (실제 환경에서는 DB 사용)
const verificationRequests = new Map();  // requestId -> verification data
const verifiedEntities = new Map();       // entityId -> verification status

// KYC 레벨
const KYC_LEVELS = {
    NONE: 0,        // 미인증
    EMAIL: 1,       // 이메일 인증
    PHONE: 2,       // 전화번호 인증
    BUSINESS: 3,    // 사업자 인증
    ENTERPRISE: 4   // 기업 인증 (전담 계정)
};

// 인증 코드 유효 시간 (10분)
const CODE_EXPIRY_MS = 10 * 60 * 1000;

/**
 * 이메일 인증 요청 생성
 */
function createEmailVerification(entityId, email) {
    const requestId = crypto.randomUUID();
    const verificationCode = generateVerificationCode();

    const request = {
        requestId,
        entityId,
        email: email.toLowerCase().trim(),
        code: verificationCode,
        type: 'email',
        status: 'pending',
        createdAt: Date.now(),
        expiresAt: Date.now() + CODE_EXPIRY_MS,
        attempts: 0
    };

    verificationRequests.set(requestId, request);

    // 실제 환경에서는 여기서 이메일 발송
    console.log(`[KYC] Verification code for ${email}: ${verificationCode}`);

    return {
        requestId,
        email: maskEmail(email),
        expiresIn: CODE_EXPIRY_MS / 1000
    };
}

/**
 * 이메일 인증 확인
 */
function verifyEmail(requestId, code) {
    const request = verificationRequests.get(requestId);

    if (!request) {
        return { success: false, error: 'Invalid request ID' };
    }

    if (request.status !== 'pending') {
        return { success: false, error: 'Request already processed' };
    }

    if (Date.now() > request.expiresAt) {
        request.status = 'expired';
        return { success: false, error: 'Verification code expired' };
    }

    request.attempts++;

    if (request.attempts > 5) {
        request.status = 'blocked';
        return { success: false, error: 'Too many attempts' };
    }

    if (request.code !== code) {
        return { success: false, error: 'Invalid verification code', attemptsRemaining: 5 - request.attempts };
    }

    // 인증 성공
    request.status = 'verified';
    request.verifiedAt = Date.now();

    // 엔티티 KYC 레벨 업데이트
    updateEntityKyc(request.entityId, KYC_LEVELS.EMAIL, { email: request.email });

    return {
        success: true,
        level: KYC_LEVELS.EMAIL,
        entityId: request.entityId
    };
}

/**
 * 엔티티 KYC 레벨 업데이트
 */
function updateEntityKyc(entityId, level, data = {}) {
    const existing = verifiedEntities.get(entityId) || {
        entityId,
        level: KYC_LEVELS.NONE,
        verifications: []
    };

    existing.level = Math.max(existing.level, level);
    existing.verifications.push({
        level,
        data,
        verifiedAt: new Date().toISOString()
    });
    existing.updatedAt = new Date().toISOString();

    verifiedEntities.set(entityId, existing);
    return existing;
}

/**
 * 엔티티 KYC 상태 조회
 */
function getEntityKyc(entityId) {
    return verifiedEntities.get(entityId) || {
        entityId,
        level: KYC_LEVELS.NONE,
        verifications: []
    };
}

/**
 * KYC 레벨 확인
 */
function hasKycLevel(entityId, requiredLevel) {
    const entity = verifiedEntities.get(entityId);
    if (!entity) return false;
    return entity.level >= requiredLevel;
}

/**
 * 6자리 인증 코드 생성
 */
function generateVerificationCode() {
    return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * 이메일 마스킹 (abc@example.com -> a***@example.com)
 */
function maskEmail(email) {
    const [local, domain] = email.split('@');
    if (local.length <= 1) return `${local}***@${domain}`;
    return `${local[0]}***@${domain}`;
}

/**
 * 만료된 요청 정리
 */
function cleanupExpiredRequests() {
    const now = Date.now();
    for (const [requestId, request] of verificationRequests) {
        if (now > request.expiresAt && request.status === 'pending') {
            request.status = 'expired';
        }
    }
}

/**
 * 통계
 */
function getStats() {
    let pending = 0, verified = 0, expired = 0;

    for (const request of verificationRequests.values()) {
        if (request.status === 'pending') pending++;
        else if (request.status === 'verified') verified++;
        else if (request.status === 'expired') expired++;
    }

    const levelStats = {};
    for (const entity of verifiedEntities.values()) {
        const levelName = Object.keys(KYC_LEVELS).find(k => KYC_LEVELS[k] === entity.level);
        levelStats[levelName] = (levelStats[levelName] || 0) + 1;
    }

    return {
        requests: { pending, verified, expired },
        entities: verifiedEntities.size,
        levelStats
    };
}

// 1분마다 만료된 요청 정리
setInterval(cleanupExpiredRequests, 60000);

module.exports = {
    createEmailVerification,
    verifyEmail,
    getEntityKyc,
    hasKycLevel,
    updateEntityKyc,
    getStats,
    KYC_LEVELS
};
