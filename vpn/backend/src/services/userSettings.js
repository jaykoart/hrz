/**
 * 사용자 설정 및 동의 관리 서비스
 * - 자원 공유 동의 플로우
 * - Wi-Fi 전용, 데이터 제한 등 설정
 */

// 인메모리 저장소 (실제 환경에서는 DB 사용)
const userConsents = new Map();  // userId -> consent object
const userSettings = new Map();  // userId -> settings object

// 기본 설정값
const DEFAULT_SETTINGS = {
    wifiOnly: false,             // Wi-Fi 전용 모드 (기본: 꺼짐 - 사용자 선택)
    dataLimitMode: 'auto',       // 데이터 제한 모드: 'auto' | 'unlimited' | 'manual'
    dataLimitMB: 0,              // 일일 데이터 제한 (manual 모드용, 0 = 무제한)
    bandwidthLimitMbps: 0,       // 대역폭 제한 (0 = 무제한)
    hasUnlimitedPlan: false,     // 무제한 요금제 여부 (사용자가 설정)
    scheduleEnabled: false,      // 스케줄 모드
    scheduleStart: '00:00',      // 공유 시작 시간
    scheduleEnd: '23:59',        // 공유 종료 시간
    allowResidential: true,      // 거주용 IP 공유 허용
    autoStart: true              // 자동 시작
};

// 동적 데이터 제한 설정 (연결 타입별)
const DYNAMIC_LIMITS = {
    wifi: { limitMB: 0, description: 'Unlimited on Wi-Fi' },
    mobile_unlimited: { limitMB: 0, description: 'Unlimited mobile plan' },
    mobile_metered: { limitMB: 500, description: 'Conservative limit for metered plan' },
    unknown: { limitMB: 100, description: 'Safe default for unknown connection' }
};

// Manual 모드용 데이터 제한 프리셋 (6개)
const DATA_LIMIT_PRESETS = [
    {
        id: 'minimal',
        name: 'Minimal',
        limitMB: 100,
        description: '하루 100MB - 최소 기여'
    },
    {
        id: 'light',
        name: 'Light',
        limitMB: 500,
        description: '하루 500MB - 가벼운 사용'
    },
    {
        id: 'moderate',
        name: 'Moderate',
        limitMB: 1024,   // 1GB
        description: '하루 1GB - 보통 사용 (기본값)',
        isDefault: true
    },
    {
        id: 'generous',
        name: 'Generous',
        limitMB: 3072,   // 3GB
        description: '하루 3GB - 넉넉한 기여'
    },
    {
        id: 'heavy',
        name: 'Heavy',
        limitMB: 5120,   // 5GB
        description: '하루 5GB - 적극적 기여'
    },
    {
        id: 'unlimited',
        name: 'Unlimited',
        limitMB: 0,
        description: '무제한 - 최대 기여'
    }
];

// 동의 항목
const CONSENT_ITEMS = {
    termsOfService: {
        required: true,
        title: 'Terms of Service',
        description: 'Accept terms of service to use Horizon VPN'
    },
    resourceSharing: {
        required: true,
        title: 'Resource Sharing Agreement',
        description: 'Allow sharing your network resources with Horizon network'
    },
    dataCollection: {
        required: false,
        title: 'Anonymous Data Collection',
        description: 'Help improve service by sharing anonymous usage data'
    }
};

/**
 * 사용자 동의 상태 조회
 */
function getConsent(userId) {
    return userConsents.get(userId) || null;
}

/**
 * 사용자 동의 저장 (설치 시 자동 체크)
 */
function setConsent(userId, consents = {}) {
    const now = new Date().toISOString();

    // 기본값: 필수 항목은 자동 동의
    const consentRecord = {
        userId,
        termsOfService: consents.termsOfService ?? true,  // 자동 체크
        resourceSharing: consents.resourceSharing ?? true, // 자동 체크
        dataCollection: consents.dataCollection ?? false,  // 선택
        agreedAt: now,
        ipAddress: consents.ipAddress || null,
        userAgent: consents.userAgent || null,
        version: '1.0'
    };

    userConsents.set(userId, consentRecord);
    return consentRecord;
}

/**
 * 동의 여부 확인 (필수 항목)
 */
function hasRequiredConsent(userId) {
    const consent = userConsents.get(userId);
    if (!consent) return false;

    return consent.termsOfService === true &&
        consent.resourceSharing === true;
}

/**
 * 사용자 설정 조회
 */
function getSettings(userId) {
    const settings = userSettings.get(userId);
    if (!settings) {
        return { ...DEFAULT_SETTINGS };
    }
    return { ...DEFAULT_SETTINGS, ...settings };
}

/**
 * 사용자 설정 업데이트
 */
function updateSettings(userId, newSettings) {
    const current = getSettings(userId);

    // 허용된 필드만 업데이트
    const allowedFields = Object.keys(DEFAULT_SETTINGS);
    const updates = {};

    for (const field of allowedFields) {
        if (newSettings[field] !== undefined) {
            updates[field] = newSettings[field];
        }
    }

    const updated = { ...current, ...updates, updatedAt: new Date().toISOString() };
    userSettings.set(userId, updated);
    return updated;
}

/**
 * 사용자 설정 초기화 (기본값으로)
 */
function resetSettings(userId) {
    userSettings.set(userId, { ...DEFAULT_SETTINGS });
    return getSettings(userId);
}

/**
 * 현재 설정으로 공유 가능한지 확인
 */
function canShareNow(userId, connectionType = 'wifi') {
    const settings = getSettings(userId);
    const reasons = [];

    // Wi-Fi 전용 모드 확인
    if (settings.wifiOnly && connectionType !== 'wifi') {
        reasons.push('Wi-Fi only mode is enabled');
    }

    // 스케줄 확인
    if (settings.scheduleEnabled) {
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        if (currentTime < settings.scheduleStart || currentTime > settings.scheduleEnd) {
            reasons.push('Outside scheduled sharing hours');
        }
    }

    return {
        allowed: reasons.length === 0,
        reasons
    };
}

/**
 * 사용자 데이터 완전 삭제 (탈퇴용)
 */
function deleteUserData(userId) {
    userConsents.delete(userId);
    userSettings.delete(userId);
    return { deleted: true };
}

/**
 * 통계
 */
function getStats() {
    return {
        totalConsents: userConsents.size,
        totalSettings: userSettings.size
    };
}

module.exports = {
    getConsent,
    setConsent,
    hasRequiredConsent,
    getSettings,
    updateSettings,
    resetSettings,
    canShareNow,
    deleteUserData,
    getStats,
    CONSENT_ITEMS,
    DEFAULT_SETTINGS,
    DATA_LIMIT_PRESETS
};
