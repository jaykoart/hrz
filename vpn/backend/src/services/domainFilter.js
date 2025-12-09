/**
 * 도메인 필터 서비스
 * 화이트리스트/블랙리스트 관리
 */

// 기본 화이트리스트 - 허용되는 도메인 패턴
const DOMAIN_WHITELIST = [
    // 전자상거래
    /amazon\./i,
    /ebay\./i,
    /alibaba\./i,
    /aliexpress\./i,
    /shopee\./i,
    /lazada\./i,
    /coupang\./i,
    /gmarket\./i,

    // 검색 엔진
    /google\./i,
    /bing\./i,
    /yahoo\./i,
    /naver\./i,
    /daum\./i,
    /baidu\./i,

    // 소셜 미디어
    /facebook\./i,
    /instagram\./i,
    /twitter\./i,
    /x\.com$/i,
    /linkedin\./i,
    /tiktok\./i,

    // 여행
    /booking\./i,
    /expedia\./i,
    /tripadvisor\./i,
    /airbnb\./i,
    /hotels\./i,
    /agoda\./i,

    // 부동산
    /zillow\./i,
    /realtor\./i,
    /trulia\./i,

    // 가격 비교
    /pricewatch\./i,
    /pricespy\./i,
    /shopzilla\./i
];

// 기본 블랙리스트 - 차단되는 도메인 패턴
const DOMAIN_BLACKLIST = [
    // 정부/군사
    /\.gov$/i,
    /\.gov\.[a-z]{2}$/i,
    /\.mil$/i,
    /\.go\.kr$/i,

    // 금융/은행
    /\.bank$/i,
    /banking\./i,
    /paypal\./i,
    /stripe\./i,
    /venmo\./i,

    // 인증/보안
    /oauth\./i,
    /login\./i,
    /signin\./i,
    /auth\./i,
    /sso\./i,

    // 의료
    /healthcare\./i,
    /hospital\./i,
    /\.health$/i,

    // 교육 (민감)
    /\.edu$/i,

    // 봇넷 패턴
    /^[a-z0-9]{32,}\./i,
    /^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$/  // 직접 IP 접근
];

// 카테고리별 도메인
const DOMAIN_CATEGORIES = {
    ecommerce: [/amazon\./i, /ebay\./i, /alibaba\./i, /shopee\./i],
    search: [/google\./i, /bing\./i, /naver\./i, /baidu\./i],
    social: [/facebook\./i, /instagram\./i, /twitter\./i, /tiktok\./i],
    travel: [/booking\./i, /expedia\./i, /airbnb\./i, /agoda\./i]
};

// 사용자 정의 규칙 저장소
const customWhitelist = new Set();
const customBlacklist = new Set();

/**
 * 도메인에서 루트 도메인 추출
 */
function extractRootDomain(hostname) {
    const parts = hostname.split('.');
    if (parts.length > 2) {
        // 예: www.example.com -> example.com
        return parts.slice(-2).join('.');
    }
    return hostname;
}

/**
 * 화이트리스트 확인
 */
function isWhitelisted(domain) {
    const rootDomain = extractRootDomain(domain);

    // 사용자 정의 화이트리스트 먼저 확인
    if (customWhitelist.has(rootDomain) || customWhitelist.has(domain)) {
        return true;
    }

    // 기본 화이트리스트 확인
    return DOMAIN_WHITELIST.some(pattern => pattern.test(domain));
}

/**
 * 블랙리스트 확인
 */
function isBlacklisted(domain) {
    const rootDomain = extractRootDomain(domain);

    // 사용자 정의 블랙리스트 먼저 확인
    if (customBlacklist.has(rootDomain) || customBlacklist.has(domain)) {
        return true;
    }

    // 기본 블랙리스트 확인
    return DOMAIN_BLACKLIST.some(pattern => pattern.test(domain));
}

/**
 * 도메인 접근 허용 여부 판단
 * 블랙리스트 우선 적용
 */
function isDomainAllowed(domain, options = {}) {
    // 블랙리스트 먼저 확인 (절대 차단)
    if (isBlacklisted(domain)) {
        return {
            allowed: false,
            reason: 'Domain is blacklisted',
            category: 'blacklist'
        };
    }

    // 화이트리스트 모드 (명시된 도메인만 허용)
    if (options.whitelistOnly) {
        if (isWhitelisted(domain)) {
            return { allowed: true, category: 'whitelist' };
        }
        return {
            allowed: false,
            reason: 'Domain not in whitelist',
            category: 'not_whitelisted'
        };
    }

    // 기본 모드 (블랙리스트만 차단)
    return { allowed: true, category: 'default' };
}

/**
 * URL 검증
 */
function validateUrl(targetUrl, options = {}) {
    try {
        const url = new URL(targetUrl);

        // 프로토콜 확인
        if (!['http:', 'https:'].includes(url.protocol)) {
            return {
                allowed: false,
                reason: 'Only HTTP/HTTPS protocols allowed'
            };
        }

        // 도메인 검증
        return isDomainAllowed(url.hostname, options);
    } catch (e) {
        return {
            allowed: false,
            reason: 'Invalid URL format'
        };
    }
}

/**
 * 화이트리스트에 도메인 추가
 */
function addToWhitelist(domain) {
    customWhitelist.add(domain.toLowerCase());
    return true;
}

/**
 * 화이트리스트에서 도메인 제거
 */
function removeFromWhitelist(domain) {
    return customWhitelist.delete(domain.toLowerCase());
}

/**
 * 블랙리스트에 도메인 추가
 */
function addToBlacklist(domain) {
    customBlacklist.add(domain.toLowerCase());
    return true;
}

/**
 * 블랙리스트에서 도메인 제거
 */
function removeFromBlacklist(domain) {
    return customBlacklist.delete(domain.toLowerCase());
}

/**
 * 도메인 카테고리 확인
 */
function getDomainCategory(domain) {
    for (const [category, patterns] of Object.entries(DOMAIN_CATEGORIES)) {
        if (patterns.some(pattern => pattern.test(domain))) {
            return category;
        }
    }
    return 'other';
}

/**
 * 현재 필터 규칙 조회
 */
function getFilterRules() {
    return {
        whitelist: {
            default: DOMAIN_WHITELIST.length,
            custom: Array.from(customWhitelist)
        },
        blacklist: {
            default: DOMAIN_BLACKLIST.length,
            custom: Array.from(customBlacklist)
        },
        categories: Object.keys(DOMAIN_CATEGORIES)
    };
}

module.exports = {
    isWhitelisted,
    isBlacklisted,
    isDomainAllowed,
    validateUrl,
    addToWhitelist,
    removeFromWhitelist,
    addToBlacklist,
    removeFromBlacklist,
    getDomainCategory,
    getFilterRules,
    extractRootDomain
};
