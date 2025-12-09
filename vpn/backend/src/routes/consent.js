/**
 * 동의 플로우 API
 * 설치 시 자동 체크되는 동의 항목 처리
 */
const express = require('express');
const router = express.Router();
const userSettings = require('../services/userSettings');

/**
 * GET /api/consent
 * 동의 항목 목록 조회
 */
router.get('/', (req, res) => {
    res.json({
        items: userSettings.CONSENT_ITEMS,
        description: 'Required items are auto-checked during installation'
    });
});

/**
 * GET /api/consent/:userId
 * 특정 사용자 동의 상태 조회
 */
router.get('/:userId', (req, res) => {
    const { userId } = req.params;
    const consent = userSettings.getConsent(userId);

    if (!consent) {
        return res.status(404).json({
            error: 'Not Found',
            message: 'No consent record found for this user'
        });
    }

    res.json(consent);
});

/**
 * POST /api/consent
 * 동의 저장 (설치 시 호출)
 * Body: { userId, termsOfService?, resourceSharing?, dataCollection? }
 */
router.post('/', (req, res) => {
    const { userId, termsOfService, resourceSharing, dataCollection } = req.body;

    if (!userId) {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'userId is required'
        });
    }

    // 동의 저장 (필수 항목은 자동 체크됨)
    const consent = userSettings.setConsent(userId, {
        termsOfService: termsOfService ?? true,   // 기본 자동 체크
        resourceSharing: resourceSharing ?? true,  // 기본 자동 체크
        dataCollection: dataCollection ?? false,   // 선택 항목
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
    });

    res.status(201).json({
        success: true,
        consent,
        message: 'Consent recorded successfully'
    });
});

/**
 * GET /api/consent/:userId/check
 * 필수 동의 여부 확인 (미들웨어용)
 */
router.get('/:userId/check', (req, res) => {
    const { userId } = req.params;
    const hasConsent = userSettings.hasRequiredConsent(userId);

    res.json({
        userId,
        hasRequiredConsent: hasConsent,
        canUseService: hasConsent
    });
});

module.exports = router;
