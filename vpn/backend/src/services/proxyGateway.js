/**
 * Proxy Gateway Service
 * WebSocket 기반 프록시 게이트웨이 - 상업용 프록시 트래픽 라우팅
 */

const WebSocket = require('ws');
const nodeStore = require('./nodeStore');
const acl = require('./acl');

// 활성 피어 연결 (WebSocket)
const activePeers = new Map();

// 대기 중인 프록시 요청
const pendingRequests = new Map();

// 세션 관리 (Sticky Session)
const stickySessions = new Map();

// 로드 밸런싱 인덱스
let roundRobinIndex = 0;

/**
 * 피어 연결 등록
 */
function registerPeer(nodeId, ws) {
    activePeers.set(nodeId, {
        ws,
        nodeId,
        connectedAt: new Date(),
        requestsHandled: 0,
        lastActivity: new Date(),
        status: 'ready'
    });

    console.log(`[ProxyGateway] Peer registered: ${nodeId}`);
    return true;
}

/**
 * 피어 연결 해제
 */
function unregisterPeer(nodeId) {
    const peer = activePeers.get(nodeId);
    if (peer) {
        if (peer.ws.readyState === WebSocket.OPEN) {
            peer.ws.close();
        }
        activePeers.delete(nodeId);
        console.log(`[ProxyGateway] Peer unregistered: ${nodeId}`);
        return true;
    }
    return false;
}

/**
 * 활성 피어 목록
 */
function getActivePeers(filters = {}) {
    let peers = Array.from(activePeers.values());

    if (filters.country) {
        peers = peers.filter(p => {
            const node = nodeStore.getNode(p.nodeId);
            return node && node.country === filters.country;
        });
    }

    if (filters.status) {
        peers = peers.filter(p => p.status === filters.status);
    }

    return peers;
}

/**
 * 로드 밸런싱 - Round Robin
 */
function selectPeerRoundRobin(filters = {}) {
    const peers = getActivePeers({ ...filters, status: 'ready' });
    if (peers.length === 0) return null;

    roundRobinIndex = (roundRobinIndex + 1) % peers.length;
    return peers[roundRobinIndex];
}

/**
 * 로드 밸런싱 - Least Connections
 */
function selectPeerLeastConnections(filters = {}) {
    const peers = getActivePeers({ ...filters, status: 'ready' });
    if (peers.length === 0) return null;

    return peers.reduce((min, peer) =>
        peer.requestsHandled < min.requestsHandled ? peer : min
    );
}

/**
 * 로드 밸런싱 - Random
 */
function selectPeerRandom(filters = {}) {
    const peers = getActivePeers({ ...filters, status: 'ready' });
    if (peers.length === 0) return null;

    return peers[Math.floor(Math.random() * peers.length)];
}

/**
 * Sticky Session - 동일 클라이언트는 같은 피어 사용
 */
function getOrAssignStickyPeer(clientId, filters = {}, ttlMs = 600000) {
    const existing = stickySessions.get(clientId);

    if (existing && Date.now() - existing.assignedAt < ttlMs) {
        const peer = activePeers.get(existing.nodeId);
        if (peer && peer.status === 'ready') {
            return peer;
        }
    }

    // 새 피어 할당
    const peer = selectPeerLeastConnections(filters);
    if (peer) {
        stickySessions.set(clientId, {
            nodeId: peer.nodeId,
            assignedAt: Date.now()
        });
    }

    return peer;
}

/**
 * Rotating Session - 매 요청마다 다른 IP
 */
function getRotatingPeer(filters = {}) {
    return selectPeerRandom(filters);
}

/**
 * 프록시 요청 생성
 */
function createProxyRequest(targetUrl, options = {}) {
    // ACL 검증
    const aclCheck = acl.validateProxyRequest(targetUrl);
    if (!aclCheck.allowed) {
        return {
            success: false,
            error: 'ACL_BLOCKED',
            message: aclCheck.reason
        };
    }

    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
        success: true,
        request: {
            id: requestId,
            targetUrl,
            method: options.method || 'GET',
            headers: options.headers || {},
            body: options.body || null,
            timeout: options.timeout || 30000,
            createdAt: new Date()
        }
    };
}

/**
 * 프록시 요청 전송
 */
async function sendProxyRequest(peer, request) {
    return new Promise((resolve, reject) => {
        if (!peer || peer.ws.readyState !== WebSocket.OPEN) {
            return reject(new Error('Peer not available'));
        }

        const timeout = setTimeout(() => {
            pendingRequests.delete(request.id);
            reject(new Error('Request timeout'));
        }, request.timeout);

        pendingRequests.set(request.id, {
            resolve: (response) => {
                clearTimeout(timeout);
                pendingRequests.delete(request.id);
                resolve(response);
            },
            reject: (error) => {
                clearTimeout(timeout);
                pendingRequests.delete(request.id);
                reject(error);
            },
            peer,
            request,
            sentAt: new Date()
        });

        // 피어에게 요청 전송
        peer.ws.send(JSON.stringify({
            type: 'PROXY_REQUEST',
            requestId: request.id,
            payload: {
                url: request.targetUrl,
                method: request.method,
                headers: request.headers,
                body: request.body
            }
        }));

        peer.requestsHandled++;
        peer.lastActivity = new Date();
    });
}

/**
 * 프록시 응답 처리
 */
function handleProxyResponse(requestId, response) {
    const pending = pendingRequests.get(requestId);
    if (!pending) {
        console.warn(`[ProxyGateway] No pending request for: ${requestId}`);
        return false;
    }

    pending.resolve(response);
    return true;
}

/**
 * 프록시 에러 처리
 */
function handleProxyError(requestId, error) {
    const pending = pendingRequests.get(requestId);
    if (!pending) {
        return false;
    }

    pending.reject(new Error(error.message || 'Proxy error'));
    return true;
}

/**
 * 게이트웨이 통계
 */
function getGatewayStats() {
    const peers = Array.from(activePeers.values());

    return {
        activePeers: peers.length,
        readyPeers: peers.filter(p => p.status === 'ready').length,
        totalRequestsHandled: peers.reduce((sum, p) => sum + p.requestsHandled, 0),
        pendingRequests: pendingRequests.size,
        stickySessions: stickySessions.size,
        peersByCountry: peers.reduce((acc, p) => {
            const node = nodeStore.getNode(p.nodeId);
            const country = node?.country || 'UNKNOWN';
            acc[country] = (acc[country] || 0) + 1;
            return acc;
        }, {})
    };
}

/**
 * Sticky Session 정리 (만료된 세션 제거)
 */
function cleanupStickySessions(ttlMs = 600000) {
    const now = Date.now();
    let cleaned = 0;

    for (const [clientId, session] of stickySessions) {
        if (now - session.assignedAt > ttlMs) {
            stickySessions.delete(clientId);
            cleaned++;
        }
    }

    return cleaned;
}

// 주기적 정리
setInterval(() => {
    cleanupStickySessions();
}, 60000);

module.exports = {
    registerPeer,
    unregisterPeer,
    getActivePeers,
    selectPeerRoundRobin,
    selectPeerLeastConnections,
    selectPeerRandom,
    getOrAssignStickyPeer,
    getRotatingPeer,
    createProxyRequest,
    sendProxyRequest,
    handleProxyResponse,
    handleProxyError,
    getGatewayStats,
    cleanupStickySessions
};
