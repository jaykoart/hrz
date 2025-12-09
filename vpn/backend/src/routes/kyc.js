/**
 * KYC 검증 API
 * 기업 고객용 이메일 인증
 */
const express = require('express');
const router = express.Router();
const kycVerification = require('../services/kycVerification');

/**
 * GET /api/kyc/levels
 * KYC 레벨 정보 조회
 */
router.get('/levels', (req, res) => {
    res.json({
        levels: kycVerification.KYC_LEVELS,
        description: {
            NONE: 'No verification',
            EMAIL: 'Email verified',
            PHONE: 'Phone number verified',
            BUSINESS: 'Business registration verified',
            ENTERPRISE: 'Enterprise account with dedicated support'
        }
    });
});

/**
 * GET /api/kyc/:entityId
 * 엔티티 KYC 상태 조회
 */
router.get('/:entityId', (req, res) => {
    const { entityId } = req.params;
    const kyc = kycVerification.getEntityKyc(entityId);

    res.json({
        entityId,
        kyc
    });
});

/**
 * POST /api/kyc/email/request
 * 이메일 인증 요청
 */
router.post('/email/request', (req, res) => {
    const { entityId, email } = req.body;

    if (!entityId || !email) {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'entityId and email are required'
        });
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'Invalid email format'
        });
    }

    const result = kycVerification.createEmailVerification(entityId, email);

    res.json({
        success: true,
        ...result,
        message: 'Verification code sent to email'
    });
});

/**
 * POST /api/kyc/email/verify
 * 이메일 인증 코드 확인
 */
router.post('/email/verify', (req, res) => {
    const { requestId, code } = req.body;

    if (!requestId || !code) {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'requestId and code are required'
        });
    }

    const result = kycVerification.verifyEmail(requestId, code);

    if (result.success) {
        res.json({
            success: true,
            level: result.level,
            levelName: 'EMAIL',
            entityId: result.entityId,
            message: 'Email verification successful'
        });
    } else {
        res.status(400).json({
            success: false,
            error: result.error,
            attemptsRemaining: result.attemptsRemaining
        });
    }
});

/**
 * GET /api/kyc/stats
 * KYC 시스템 통계 (관리자용)
 */
router.get('/admin/stats', (req, res) => {
    // TODO: 관리자 인증 추가
    const stats = kycVerification.getStats();

    res.json({
        success: true,
        stats
    });
});

module.exports = router;
