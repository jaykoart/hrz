/**
 * Node Management Routes
 * 노드 등록, Heartbeat, 조회 API
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

const nodeStore = require('../services/nodeStore');
const acl = require('../services/acl');
const { generateToken, nodeAuthMiddleware, isValidWireGuardKey } = require('../utils/security');

/**
 * POST /api/nodes/register
 * 새 노드 등록
 */
router.post('/register', (req, res) => {
    const { publicKey, endpoint, country, capabilities } = req.body;

    // 필수 필드 검증
    if (!publicKey) {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'publicKey is required'
        });
    }

    if (!endpoint) {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'endpoint is required'
        });
    }

    // WireGuard 키 형식 검증 (개발 단계에서는 느슨하게)
    // if (!isValidWireGuardKey(publicKey)) {
    //     return res.status(400).json({ 
    //         error: 'Bad Request', 
    //         message: 'Invalid WireGuard public key format' 
    //     });
    // }

    // Endpoint 검증 (ACL)
    const endpointCheck = acl.validateEndpoint(endpoint);
    if (!endpointCheck.valid) {
        return res.status(400).json({
            error: 'Bad Request',
            message: endpointCheck.reason
        });
    }

    // 노드 ID 생성 및 등록
    const nodeId = uuidv4();
    const node = nodeStore.registerNode({
        id: nodeId,
        publicKey,
        endpoint,
        country,
        capabilities
    });

    // 인증 토큰 생성
    const token = generateToken({ nodeId, publicKey });

    res.status(201).json({
        success: true,
        nodeId: node.id,
        assignedIp: node.assignedIp,
        token,
        message: 'Node registered successfully'
    });
});

/**
 * POST /api/nodes/heartbeat
 * 노드 상태 업데이트
 */
router.post('/heartbeat', nodeAuthMiddleware, (req, res) => {
    const { nodeId } = req.node;
    const { status, stats } = req.body;

    const node = nodeStore.getNode(nodeId);
    if (!node) {
        return res.status(404).json({
            error: 'Not Found',
            message: 'Node not registered'
        });
    }

    // 상태 업데이트
    if (status) {
        nodeStore.setNodeStatus(nodeId, status);
    }

    // Heartbeat 및 통계 갱신
    const updated = nodeStore.updateHeartbeat(nodeId, stats || {});

    res.json({
        success: true,
        nodeId,
        status: updated.status,
        lastHeartbeat: updated.lastHeartbeat
    });
});

/**
 * GET /api/nodes
 * 활성 노드 목록 조회
 */
router.get('/', (req, res) => {
    const { status, country, capability, limit = 50, offset = 0 } = req.query;

    let nodes = nodeStore.getAllNodes({ status, country, capability });

    // 페이지네이션
    const total = nodes.length;
    nodes = nodes.slice(Number(offset), Number(offset) + Number(limit));

    // 민감 정보 제거 (공개 API용)
    const sanitized = nodes.map(n => ({
        id: n.id,
        country: n.country,
        status: n.status,
        capabilities: n.capabilities,
        stats: {
            rtt: n.stats.rtt,
            uptime: n.stats.uptime
        }
    }));

    res.json({
        success: true,
        total,
        count: sanitized.length,
        nodes: sanitized
    });
});

/**
 * GET /api/nodes/stats
 * 네트워크 통계
 */
router.get('/stats', (req, res) => {
    const stats = nodeStore.getStats();

    res.json({
        success: true,
        stats
    });
});

/**
 * GET /api/nodes/:id
 * 특정 노드 상세 정보
 */
router.get('/:id', nodeAuthMiddleware, (req, res) => {
    const { id } = req.params;

    // 자신의 노드만 조회 가능
    if (req.node.nodeId !== id) {
        return res.status(403).json({
            error: 'Forbidden',
            message: 'You can only view your own node'
        });
    }

    const node = nodeStore.getNode(id);
    if (!node) {
        return res.status(404).json({
            error: 'Not Found',
            message: 'Node not found'
        });
    }

    res.json({
        success: true,
        node
    });
});

/**
 * DELETE /api/nodes/:id
 * 노드 등록 해제
 */
router.delete('/:id', nodeAuthMiddleware, (req, res) => {
    const { id } = req.params;

    // 자신의 노드만 삭제 가능
    if (req.node.nodeId !== id) {
        return res.status(403).json({
            error: 'Forbidden',
            message: 'You can only delete your own node'
        });
    }

    const removed = nodeStore.removeNode(id);
    if (!removed) {
        return res.status(404).json({
            error: 'Not Found',
            message: 'Node not found'
        });
    }

    res.json({
        success: true,
        message: 'Node unregistered successfully'
    });
});

module.exports = router;
