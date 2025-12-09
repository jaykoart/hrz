/**
 * In-memory Node Store
 * 개발용 노드 저장소. 프로덕션에서는 Redis로 교체 예정.
 */

const nodes = new Map();

// 내부 IP 할당 카운터 (10.100.0.x 대역)
let ipCounter = 1;

/**
 * 새 VPN 내부 IP 할당
 */
function allocateIp() {
    const ip = `10.100.0.${ipCounter}`;
    ipCounter = (ipCounter % 254) + 1; // 1~254 순환
    return ip;
}

/**
 * 노드 등록
 */
function registerNode({ id, publicKey, endpoint, country, capabilities }) {
    const node = {
        id,
        publicKey,
        endpoint,
        assignedIp: allocateIp(),
        country: country || 'UNKNOWN',
        capabilities: capabilities || ['vpn'],
        status: 'online',
        createdAt: new Date(),
        lastHeartbeat: new Date(),
        stats: {
            bandwidth: 0,
            rtt: 0,
            uptime: 0,
            requestsHandled: 0
        }
    };
    nodes.set(id, node);
    return node;
}

/**
 * 노드 조회
 */
function getNode(id) {
    return nodes.get(id) || null;
}

/**
 * 전체 노드 목록
 */
function getAllNodes(filters = {}) {
    let result = Array.from(nodes.values());

    // 상태 필터
    if (filters.status) {
        result = result.filter(n => n.status === filters.status);
    }

    // 국가 필터
    if (filters.country) {
        result = result.filter(n => n.country === filters.country);
    }

    // 기능 필터
    if (filters.capability) {
        result = result.filter(n => n.capabilities.includes(filters.capability));
    }

    return result;
}

/**
 * Heartbeat 업데이트
 */
function updateHeartbeat(id, stats = {}) {
    const node = nodes.get(id);
    if (!node) return null;

    node.lastHeartbeat = new Date();
    node.status = 'online';

    if (stats.bandwidth !== undefined) node.stats.bandwidth = stats.bandwidth;
    if (stats.rtt !== undefined) node.stats.rtt = stats.rtt;
    if (stats.uptime !== undefined) node.stats.uptime = stats.uptime;
    if (stats.requestsHandled !== undefined) node.stats.requestsHandled = stats.requestsHandled;

    return node;
}

/**
 * 노드 상태 변경
 */
function setNodeStatus(id, status) {
    const node = nodes.get(id);
    if (!node) return null;

    node.status = status;
    return node;
}

/**
 * 노드 삭제
 */
function removeNode(id) {
    return nodes.delete(id);
}

/**
 * 비활성 노드 정리 (마지막 heartbeat 이후 특정 시간 경과)
 */
function cleanupStaleNodes(timeoutMs = 60000) {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, node] of nodes) {
        if (now - node.lastHeartbeat.getTime() > timeoutMs) {
            node.status = 'offline';
            cleaned++;
        }
    }

    return cleaned;
}

/**
 * 통계
 */
function getStats() {
    const all = Array.from(nodes.values());
    return {
        total: all.length,
        online: all.filter(n => n.status === 'online').length,
        offline: all.filter(n => n.status === 'offline').length
    };
}

module.exports = {
    registerNode,
    getNode,
    getAllNodes,
    updateHeartbeat,
    setNodeStatus,
    removeNode,
    cleanupStaleNodes,
    getStats
};
