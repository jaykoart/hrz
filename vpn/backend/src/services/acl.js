/**
 * ACL (Access Control List) 정책 엔진
 * 사설 IP 차단, 포트 필터링, 도메인 블랙리스트
 */

// RFC 1918 사설 IP 대역
const PRIVATE_IP_RANGES = [
    { start: '10.0.0.0', end: '10.255.255.255' },
    { start: '172.16.0.0', end: '172.31.255.255' },
    { start: '192.168.0.0', end: '192.168.255.255' },
    { start: '127.0.0.0', end: '127.255.255.255' }  // Loopback
];

// 허용 포트 (웹 트래픽만)
const ALLOWED_PORTS = [80, 443, 8080, 8443];

// 도메인 블랙리스트 (보안/민감 사이트)
const DOMAIN_BLACKLIST = [
    // 정부/군사
    /\.gov$/i,
    /\.mil$/i,
    /\.go\.kr$/i,

    // 금융
    /\.bank$/i,
    /banking\./i,

    // 봇넷 C&C 패턴
    /^[a-z0-9]{32,}\./i
];

/**
 * IP를 숫자로 변환
 */
function ipToNumber(ip) {
    const parts = ip.split('.').map(Number);
    return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
}

/**
 * 사설 IP 여부 확인
 */
function isPrivateIp(ip) {
    // IPv6 처리 (간단히 패스)
    if (ip.includes(':')) return false;

    const ipNum = ipToNumber(ip);

    for (const range of PRIVATE_IP_RANGES) {
        const startNum = ipToNumber(range.start);
        const endNum = ipToNumber(range.end);

        if (ipNum >= startNum && ipNum <= endNum) {
            return true;
        }
    }

    return false;
}

/**
 * 유효한 공인 IP 확인
 */
function isValidPublicIp(ip) {
    // 기본 IP 형식 검사
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ip)) {
        return { valid: false, reason: 'Invalid IP format' };
    }

    // 각 옥텟 범위 확인
    const octets = ip.split('.').map(Number);
    if (octets.some(o => o < 0 || o > 255)) {
        return { valid: false, reason: 'IP octet out of range' };
    }

    // 사설 IP 차단
    if (isPrivateIp(ip)) {
        return { valid: false, reason: 'Private IP addresses are not allowed' };
    }

    return { valid: true };
}

/**
 * 포트 허용 여부
 */
function isPortAllowed(port) {
    return ALLOWED_PORTS.includes(Number(port));
}

/**
 * 도메인 차단 여부
 */
function isDomainBlocked(domain) {
    for (const pattern of DOMAIN_BLACKLIST) {
        if (pattern.test(domain)) {
            return true;
        }
    }
    return false;
}

/**
 * Endpoint (IP:Port) 검증
 */
function validateEndpoint(endpoint) {
    if (!endpoint || typeof endpoint !== 'string') {
        return { valid: false, reason: 'Endpoint is required' };
    }

    const parts = endpoint.split(':');
    if (parts.length !== 2) {
        return { valid: false, reason: 'Invalid endpoint format (expected IP:Port)' };
    }

    const [ip, portStr] = parts;
    const port = parseInt(portStr, 10);

    // IP 검증
    const ipCheck = isValidPublicIp(ip);
    if (!ipCheck.valid) {
        return ipCheck;
    }

    // 포트 범위 검증 (WireGuard는 모든 포트 허용)
    if (isNaN(port) || port < 1 || port > 65535) {
        return { valid: false, reason: 'Invalid port number' };
    }

    return { valid: true, ip, port };
}

/**
 * 프록시 요청 검증
 */
function validateProxyRequest(targetUrl) {
    try {
        const url = new URL(targetUrl);

        // 프로토콜 확인
        if (!['http:', 'https:'].includes(url.protocol)) {
            return { allowed: false, reason: 'Only HTTP/HTTPS protocols allowed' };
        }

        // 도메인 블랙리스트 확인
        if (isDomainBlocked(url.hostname)) {
            return { allowed: false, reason: 'Domain is blacklisted' };
        }

        // 사설 IP 직접 접근 차단
        if (isPrivateIp(url.hostname)) {
            return { allowed: false, reason: 'Cannot access private IP addresses' };
        }

        return { allowed: true };
    } catch (e) {
        return { allowed: false, reason: 'Invalid URL format' };
    }
}

module.exports = {
    isPrivateIp,
    isValidPublicIp,
    isPortAllowed,
    isDomainBlocked,
    validateEndpoint,
    validateProxyRequest,
    ALLOWED_PORTS,
    DOMAIN_BLACKLIST
};
