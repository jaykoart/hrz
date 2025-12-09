/**
 * 설정 API
 * Wi-Fi 전용, 데이터 제한 (동적/수동), 스케줄 등
 */
const express = require('express');
const router = express.Router();
const userSettings = require('../services/userSettings');

/**
 * GET /api/settings/defaults
 * 기본 설정값 조회
 */
router.get('/defaults', (req, res) => {
    res.json({
        defaults: userSettings.DEFAULT_SETTINGS,
        description: {
            wifiOnly: 'Only share resources when connected to Wi-Fi',
            dataLimitMode: 'auto=adjust by connection, unlimited=no limit, manual=user set',
            dataLimitMB: 'Daily data limit in MB (for manual mode)',
            hasUnlimitedPlan: 'Set to true if you have unlimited mobile data plan',
            bandwidthLimitMbps: 'Bandwidth limit in Mbps (0=unlimited)',
            scheduleEnabled: 'Enable time-based sharing schedule',
            scheduleStart: 'Start time (HH:MM)',
            scheduleEnd: 'End time (HH:MM)'
        }
    });
});

/**
 * GET /api/settings/presets
 * 데이터 제한 프리셋 목록 조회 (manual 모드용)
 */
router.get('/presets', (req, res) => {
    res.json({
        presets: userSettings.DATA_LIMIT_PRESETS,
        description: 'Available data limit presets for manual mode',
        usage: 'Use preset ID with PUT /api/settings/:userId/preset/:presetId'
    });
});

/**
 * GET /api/settings/:userId
 * 사용자 설정 조회
 */
router.get('/:userId', (req, res) => {
    const { userId } = req.params;
    const settings = userSettings.getSettings(userId);

    res.json({
        userId,
        settings
    });
});

/**
 * PUT /api/settings/:userId
 * 사용자 설정 업데이트
 */
router.put('/:userId', (req, res) => {
    const { userId } = req.params;
    const newSettings = req.body;

    // 유효성 검사
    if (newSettings.dataLimitMode && !['auto', 'unlimited', 'manual'].includes(newSettings.dataLimitMode)) {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'dataLimitMode must be: auto, unlimited, or manual'
        });
    }

    if (newSettings.dataLimitMB !== undefined && newSettings.dataLimitMB < 0) {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'dataLimitMB cannot be negative'
        });
    }

    const updated = userSettings.updateSettings(userId, newSettings);

    res.json({
        success: true,
        userId,
        settings: updated
    });
});

/**
 * POST /api/settings/:userId/reset
 * 설정 초기화
 */
router.post('/:userId/reset', (req, res) => {
    const { userId } = req.params;
    const settings = userSettings.resetSettings(userId);

    res.json({
        success: true,
        userId,
        settings,
        message: 'Settings reset to defaults'
    });
});

/**
 * PUT /api/settings/:userId/preset/:presetId
 * 데이터 제한 프리셋 적용
 */
router.put('/:userId/preset/:presetId', (req, res) => {
    const { userId, presetId } = req.params;

    // 프리셋 찾기
    const preset = userSettings.DATA_LIMIT_PRESETS.find(p => p.id === presetId);

    if (!preset) {
        return res.status(400).json({
            error: 'Bad Request',
            message: `Invalid preset ID: ${presetId}`,
            availablePresets: userSettings.DATA_LIMIT_PRESETS.map(p => p.id)
        });
    }

    // 설정 업데이트 (manual 모드로 전환 + 프리셋 제한값 적용)
    const updated = userSettings.updateSettings(userId, {
        dataLimitMode: 'manual',
        dataLimitMB: preset.limitMB
    });

    res.json({
        success: true,
        userId,
        appliedPreset: preset,
        settings: updated
    });
});

/**
 * GET /api/settings/:userId/can-share
 * 현재 설정으로 공유 가능 여부 확인
 * Query: connectionType=wifi|mobile
 */
router.get('/:userId/can-share', (req, res) => {
    const { userId } = req.params;
    const { connectionType = 'wifi' } = req.query;

    const result = userSettings.canShareNow(userId, connectionType);

    res.json({
        userId,
        connectionType,
        ...result
    });
});

/**
 * GET /api/settings/:userId/effective-limit
 * 현재 연결 타입 기준 실제 적용되는 데이터 제한 조회
 * Query: connectionType=wifi|mobile
 */
router.get('/:userId/effective-limit', (req, res) => {
    const { userId } = req.params;
    const { connectionType = 'wifi' } = req.query;

    const settings = userSettings.getSettings(userId);
    let effectiveLimit;
    let description;

    switch (settings.dataLimitMode) {
        case 'unlimited':
            effectiveLimit = 0;  // 무제한
            description = 'Unlimited (user has unlimited plan)';
            break;

        case 'manual':
            effectiveLimit = settings.dataLimitMB;
            description = `Manual limit: ${effectiveLimit}MB`;
            break;

        case 'auto':
        default:
            // 동적 결정
            if (connectionType === 'wifi') {
                effectiveLimit = 0;
                description = 'Unlimited on Wi-Fi';
            } else if (settings.hasUnlimitedPlan) {
                effectiveLimit = 0;
                description = 'Unlimited (user indicated unlimited mobile plan)';
            } else {
                effectiveLimit = 500;  // 보수적 제한
                description = 'Conservative limit for metered connection';
            }
            break;
    }

    res.json({
        userId,
        connectionType,
        dataLimitMode: settings.dataLimitMode,
        hasUnlimitedPlan: settings.hasUnlimitedPlan,
        effectiveLimitMB: effectiveLimit,
        isUnlimited: effectiveLimit === 0,
        description
    });
});

module.exports = router;
