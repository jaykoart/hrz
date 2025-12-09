/**
 * Proxy Routes
 * 상업용 프록시 API
 */

const express = require('express');
const router = express.Router();

const proxyGateway = require('../services/proxyGateway');
const domainFilter = require('../services/domainFilter');
const dnsSinkhole = require('../services/dnsSinkhole');
const { nodeAuthMiddleware, optionalAuthMiddleware } = require('../utils/security');

/**
 * GET /api/proxy/stats
 * 게이트웨이 통계
 */
router.get('/stats', (req, res) => {
    const stats = proxyGateway.getGatewayStats();

    res.json({
        success: true,
        stats
    });
});

/**
 * GET /api/proxy/peers
 * 활성 프록시 피어 목록
 */
router.get('/peers', (req, res) => {
    const { country, status } = req.query;

    const peers = proxyGateway.getActivePeers({ country, status });

    res.json({
        success: true,
        count: peers.length,
        peers: peers.map(p => ({
            nodeId: p.nodeId,
            status: p.status,
            requestsHandled: p.requestsHandled,
            connectedAt: p.connectedAt,
            lastActivity: p.lastActivity
        }))
    });
});

/**
 * POST /api/proxy/request
 * 프록시 요청 생성 및 전송
 */
router.post('/request', optionalAuthMiddleware, async (req, res) => {
    const {
        targetUrl,
        method = 'GET',
        headers = {},
        body,
        sessionType = 'rotating',  // 'rotating' | 'sticky'
        country,
        timeout = 30000
    } = req.body;

    if (!targetUrl) {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'targetUrl is required'
        });
    }

    // URL 검증 (도메인 필터)
    const urlCheck = domainFilter.validateUrl(targetUrl);
    if (!urlCheck.allowed) {
        return res.status(403).json({
            error: 'Forbidden',
            message: urlCheck.reason,
            category: urlCheck.category
        });
    }

    // DNS 싱크홀링 체크
    try {
        const url = new URL(targetUrl);
        const sinkholeCheck = dnsSinkhole.checkDomain(url.hostname);
        if (sinkholeCheck.blocked) {
            return res.status(403).json({
                error: 'Forbidden',
                message: sinkholeCheck.reason,
                category: sinkholeCheck.category,
                sinkholed: true
            });
        }
    } catch (e) {
        // URL 파싱 실패 시 무시 (이미 domainFilter에서 체크됨)
    }

    // 프록시 요청 생성
    const requestResult = proxyGateway.createProxyRequest(targetUrl, {
        method,
        headers,
        body,
        timeout
    });

    if (!requestResult.success) {
        return res.status(403).json({
            error: 'Forbidden',
            message: requestResult.message
        });
    }

    // 피어 선택
    let peer;
    const filters = country ? { country } : {};

    if (sessionType === 'sticky' && req.node) {
        // 인증된 클라이언트는 Sticky Session 사용 가능
        peer = proxyGateway.getOrAssignStickyPeer(req.node.nodeId, filters);
    } else {
        // Rotating: 매번 다른 피어
        peer = proxyGateway.getRotatingPeer(filters);
    }

    if (!peer) {
        return res.status(503).json({
            error: 'Service Unavailable',
            message: 'No available proxy peers',
            filters
        });
    }

    try {
        // 프록시 요청 전송
        const response = await proxyGateway.sendProxyRequest(peer, requestResult.request);

        res.json({
            success: true,
            requestId: requestResult.request.id,
            peerNodeId: peer.nodeId,
            response
        });
    } catch (error) {
        res.status(502).json({
            error: 'Bad Gateway',
            message: error.message
        });
    }
});

/**
 * POST /api/proxy/batch
 * 배치 프록시 요청 (여러 URL 동시 요청)
 */
router.post('/batch', optionalAuthMiddleware, async (req, res) => {
    const {
        urls,
        method = 'GET',
        headers = {},
        concurrency = 5,
        country
    } = req.body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'urls array is required'
        });
    }

    if (urls.length > 100) {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'Maximum 100 URLs per batch'
        });
    }

    const results = [];
    const filters = country ? { country } : {};

    // URL 검증
    for (const url of urls) {
        const urlCheck = domainFilter.validateUrl(url);
        if (!urlCheck.allowed) {
            results.push({
                url,
                success: false,
                error: urlCheck.reason
            });
        } else {
            results.push({
                url,
                success: null,  // 대기 중
                checked: true
            });
        }
    }

    // 유효한 URL만 처리
    const validRequests = results.filter(r => r.checked);

    res.json({
        success: true,
        batchId: `batch_${Date.now()}`,
        totalUrls: urls.length,
        validUrls: validRequests.length,
        invalidUrls: results.filter(r => r.success === false).length,
        message: 'Batch request queued',
        note: 'Full batch processing requires WebSocket connection'
    });
});

/**
 * GET /api/proxy/domains/check
 * 도메인 필터 확인
 */
router.get('/domains/check', (req, res) => {
    const { domain, url } = req.query;

    if (!domain && !url) {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'domain or url parameter is required'
        });
    }

    let result;
    if (url) {
        result = domainFilter.validateUrl(url);
        result.url = url;
    } else {
        result = domainFilter.isDomainAllowed(domain);
        result.domain = domain;
        result.category = domainFilter.getDomainCategory(domain);
    }

    res.json({
        success: true,
        ...result
    });
});

/**
 * GET /api/proxy/domains/rules
 * 도메인 필터 규칙 조회
 */
router.get('/domains/rules', (req, res) => {
    const rules = domainFilter.getFilterRules();

    res.json({
        success: true,
        rules
    });
});

/**
 * POST /api/proxy/domains/whitelist
 * 화이트리스트 추가 (관리자용)
 */
router.post('/domains/whitelist', nodeAuthMiddleware, (req, res) => {
    const { domain, action = 'add' } = req.body;

    if (!domain) {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'domain is required'
        });
    }

    let success;
    if (action === 'add') {
        success = domainFilter.addToWhitelist(domain);
    } else if (action === 'remove') {
        success = domainFilter.removeFromWhitelist(domain);
    } else {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'action must be "add" or "remove"'
        });
    }

    res.json({
        success,
        action,
        domain
    });
});

/**
 * POST /api/proxy/domains/blacklist
 * 블랙리스트 추가 (관리자용)
 */
router.post('/domains/blacklist', nodeAuthMiddleware, (req, res) => {
    const { domain, action = 'add' } = req.body;

    if (!domain) {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'domain is required'
        });
    }

    let success;
    if (action === 'add') {
        success = domainFilter.addToBlacklist(domain);
    } else if (action === 'remove') {
        success = domainFilter.removeFromBlacklist(domain);
    } else {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'action must be "add" or "remove"'
        });
    }

    res.json({
        success,
        action,
        domain
    });
});

/**
 * GET /api/proxy/session/:clientId
 * Sticky Session 조회
 */
router.get('/session/:clientId', (req, res) => {
    const { clientId } = req.params;
    const { country } = req.query;

    const filters = country ? { country } : {};
    const peer = proxyGateway.getOrAssignStickyPeer(clientId, filters);

    if (!peer) {
        return res.status(503).json({
            error: 'Service Unavailable',
            message: 'No available peers for session'
        });
    }

    res.json({
        success: true,
        clientId,
        assignedPeer: {
            nodeId: peer.nodeId,
            status: peer.status
        }
    });
});

module.exports = router;
