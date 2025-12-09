/**
 * DNS 싱크홀링 (Sinkholing) 서비스
 * 악성/위험 도메인을 감지하고 차단
 */

// 싱크홀 도메인 목록 (실시간 업데이트 가능)
const SINKHOLE_DOMAINS = new Set();

// 카테고리별 블랙리스트
const MALWARE_PATTERNS = [
    // 악성코드 C&C 서버 패턴
    /^[a-f0-9]{32,}\./i,
    /\.onion\./i,
    /\.tor2web\./i,

    // 의심스러운 TLD
    /\.tk$/i,
    /\.ml$/i,
    /\.ga$/i,
    /\.cf$/i,
    /\.gq$/i,

    // 알려진 악성 도메인 패턴
    /malware/i,
    /phishing/i,
    /botnet/i
];

const ADULT_PATTERNS = [
    // 성인 콘텐츠 패턴 (필요시 활성화)
    // /porn/i,
    // /xxx/i,
    // /adult/i
];

const GAMBLING_PATTERNS = [
    // 도박 사이트 패턴
    /casino/i,
    /gambling/i,
    /bet365/i,
    /poker/i
];

// 싱크홀 설정
const SINKHOLE_CONFIG = {
    enabled: true,
    logBlocked: true,
    categories: {
        malware: true,
        adult: false,      // 기본 비활성화
        gambling: false    // 기본 비활성화
    },
    sinkholeIp: '0.0.0.0'  // 차단된 요청은 이 IP로 리다이렉트
};

// 차단 로그 (인메모리, 최근 1000건)
const blockedLog = [];
const MAX_LOG_SIZE = 1000;

/**
 * 도메인 싱크홀 여부 확인
 * @param {string} domain 
 * @returns {object} { blocked: boolean, reason: string, category: string }
 */
function checkDomain(domain) {
    if (!SINKHOLE_CONFIG.enabled) {
        return { blocked: false };
    }

    const normalizedDomain = domain.toLowerCase().trim();

    // 1. 명시적 블랙리스트 확인
    if (SINKHOLE_DOMAINS.has(normalizedDomain)) {
        logBlocked(domain, 'explicit_blacklist');
        return { blocked: true, reason: 'Domain is blacklisted', category: 'blacklist' };
    }

    // 2. 악성코드 패턴 확인
    if (SINKHOLE_CONFIG.categories.malware) {
        for (const pattern of MALWARE_PATTERNS) {
            if (pattern.test(normalizedDomain)) {
                logBlocked(domain, 'malware');
                return { blocked: true, reason: 'Suspected malware domain', category: 'malware' };
            }
        }
    }

    // 3. 성인 콘텐츠 패턴 확인
    if (SINKHOLE_CONFIG.categories.adult) {
        for (const pattern of ADULT_PATTERNS) {
            if (pattern.test(normalizedDomain)) {
                logBlocked(domain, 'adult');
                return { blocked: true, reason: 'Adult content blocked', category: 'adult' };
            }
        }
    }

    // 4. 도박 패턴 확인
    if (SINKHOLE_CONFIG.categories.gambling) {
        for (const pattern of GAMBLING_PATTERNS) {
            if (pattern.test(normalizedDomain)) {
                logBlocked(domain, 'gambling');
                return { blocked: true, reason: 'Gambling site blocked', category: 'gambling' };
            }
        }
    }

    return { blocked: false };
}

/**
 * 차단 로그 기록
 */
function logBlocked(domain, category) {
    if (!SINKHOLE_CONFIG.logBlocked) return;

    blockedLog.push({
        domain,
        category,
        timestamp: new Date().toISOString()
    });

    // 최대 크기 유지
    while (blockedLog.length > MAX_LOG_SIZE) {
        blockedLog.shift();
    }
}

/**
 * 도메인을 블랙리스트에 추가
 */
function addToBlacklist(domain) {
    SINKHOLE_DOMAINS.add(domain.toLowerCase().trim());
}

/**
 * 도메인을 블랙리스트에서 제거
 */
function removeFromBlacklist(domain) {
    SINKHOLE_DOMAINS.delete(domain.toLowerCase().trim());
}

/**
 * 싱크홀 설정 업데이트
 */
function updateConfig(newConfig) {
    Object.assign(SINKHOLE_CONFIG, newConfig);
}

/**
 * 싱크홀 통계 조회
 */
function getStats() {
    const categoryStats = {};
    for (const log of blockedLog) {
        categoryStats[log.category] = (categoryStats[log.category] || 0) + 1;
    }

    return {
        enabled: SINKHOLE_CONFIG.enabled,
        blacklistSize: SINKHOLE_DOMAINS.size,
        recentBlocks: blockedLog.length,
        categoryStats,
        lastBlocked: blockedLog.length > 0 ? blockedLog[blockedLog.length - 1] : null
    };
}

/**
 * 최근 차단 로그 조회
 */
function getBlockedLog(limit = 100) {
    return blockedLog.slice(-limit).reverse();
}

module.exports = {
    checkDomain,
    addToBlacklist,
    removeFromBlacklist,
    updateConfig,
    getStats,
    getBlockedLog,
    SINKHOLE_CONFIG
};
