/**
 * VPN Tunnel Routes
 * WireGuard 키 생성, 피어 구성, NAT Traversal API
 */

const express = require('express');
const router = express.Router();

const wireguard = require('../services/wireguard');
const stun = require('../services/stun');
const nodeStore = require('../services/nodeStore');
const { nodeAuthMiddleware } = require('../utils/security');

/**
 * POST /api/vpn/keys
 * WireGuard 키 쌍 생성
 */
router.post('/keys', (req, res) => {
    try {
        const keyPair = wireguard.generateKeyPair();
        const presharedKey = wireguard.generatePresharedKey();

        res.json({
            success: true,
            keys: {
                privateKey: keyPair.privateKey,
                publicKey: keyPair.publicKey,
                presharedKey
            },
            message: 'WireGuard keys generated successfully'
        });
    } catch (error) {
        res.status(500).json({
            error: 'Key Generation Failed',
            message: error.message
        });
    }
});

/**
 * POST /api/vpn/config
 * 클라이언트용 WireGuard 설정 생성
 * 인증된 노드가 서버에 연결하기 위한 설정
 */
router.post('/config', nodeAuthMiddleware, (req, res) => {
    const { nodeId } = req.node;
    const { clientPublicKey } = req.body;

    if (!clientPublicKey) {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'clientPublicKey is required'
        });
    }

    // 노드 정보 조회
    const node = nodeStore.getNode(nodeId);
    if (!node) {
        return res.status(404).json({
            error: 'Not Found',
            message: 'Node not registered'
        });
    }

    // 서버 키 생성 (실제 운영에서는 고정 키 사용)
    const serverKeys = wireguard.generateKeyPair();

    // 클라이언트 설정 생성
    const config = wireguard.generateClientConfig({
        clientPrivateKey: '<YOUR_PRIVATE_KEY>', // 클라이언트가 채워야 함
        clientAddress: `${node.assignedIp}/24`,
        serverPublicKey: serverKeys.publicKey,
        serverEndpoint: process.env.VPN_SERVER_ENDPOINT || 'vpn.hqmx.net:51820',
        dns: '1.1.1.1, 8.8.8.8'
    });

    // 피어 연결 등록
    wireguard.registerPeerConnection(nodeId, 'server', {
        clientPublicKey,
        serverPublicKey: serverKeys.publicKey,
        assignedIp: node.assignedIp
    });

    res.json({
        success: true,
        nodeId,
        assignedIp: node.assignedIp,
        serverPublicKey: serverKeys.publicKey,
        serverEndpoint: process.env.VPN_SERVER_ENDPOINT || 'vpn.hqmx.net:51820',
        dns: ['1.1.1.1', '8.8.8.8'],
        configTemplate: config.fullConfig,
        message: 'Replace <YOUR_PRIVATE_KEY> with your private key'
    });
});

/**
 * POST /api/vpn/peer/connect
 * P2P 피어 연결 요청
 * 두 노드 간 직접 연결을 위한 정보 교환
 */
router.post('/peer/connect', nodeAuthMiddleware, async (req, res) => {
    const { nodeId } = req.node;
    const { targetNodeId, publicKey, localEndpoint } = req.body;

    if (!targetNodeId || !publicKey) {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'targetNodeId and publicKey are required'
        });
    }

    // 대상 노드 확인
    const targetNode = nodeStore.getNode(targetNodeId);
    if (!targetNode) {
        return res.status(404).json({
            error: 'Not Found',
            message: 'Target node not found or offline'
        });
    }

    if (targetNode.status !== 'online') {
        return res.status(400).json({
            error: 'Unavailable',
            message: 'Target node is offline'
        });
    }

    // 현재 노드 정보
    const currentNode = nodeStore.getNode(nodeId);

    // 홀 펀칭 시퀀스 생성
    const holePunchSeq = wireguard.createHolePunchSequence(
        { nodeId, endpoint: currentNode.endpoint, localPort: 51820 },
        { nodeId: targetNodeId, endpoint: targetNode.endpoint, localPort: 51820 }
    );

    // 피어 연결 등록
    wireguard.registerPeerConnection(nodeId, targetNodeId, {
        initiator: true,
        publicKey,
        targetPublicKey: null, // 상대방이 응답하면 채워짐
        holePunchSequenceId: holePunchSeq.sequenceId
    });

    res.json({
        success: true,
        sequenceId: holePunchSeq.sequenceId,
        targetNode: {
            nodeId: targetNodeId,
            country: targetNode.country,
            endpoint: targetNode.endpoint
        },
        holePunch: {
            targetEndpoint: targetNode.endpoint,
            stunServers: wireguard.STUN_SERVERS,
            timeout: holePunchSeq.timeout
        },
        peerConfig: wireguard.generatePeerConfig({
            nodeId: targetNodeId,
            publicKey: '<PEER_PUBLIC_KEY>', // 상대방 공개키 필요
            endpoint: targetNode.endpoint,
            allowedIps: `${targetNode.assignedIp}/32`
        }),
        message: 'Connection request initiated. Wait for peer response.'
    });
});

/**
 * POST /api/vpn/peer/respond
 * P2P 연결 요청 응답
 */
router.post('/peer/respond', nodeAuthMiddleware, (req, res) => {
    const { nodeId } = req.node;
    const { sequenceId, initiatorNodeId, publicKey, accept } = req.body;

    if (!sequenceId || !initiatorNodeId || accept === undefined) {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'sequenceId, initiatorNodeId, and accept are required'
        });
    }

    // 연결 요청 확인
    const connection = wireguard.getPeerConnection(initiatorNodeId, nodeId);
    if (!connection || connection.holePunchSequenceId !== sequenceId) {
        return res.status(404).json({
            error: 'Not Found',
            message: 'Connection request not found'
        });
    }

    if (!accept) {
        wireguard.removePeerConnection(initiatorNodeId, nodeId);
        return res.json({
            success: true,
            accepted: false,
            message: 'Connection request rejected'
        });
    }

    // 연결 수락 - 공개키 교환
    wireguard.updatePeerConnection(initiatorNodeId, nodeId, {
        targetPublicKey: publicKey,
        status: wireguard.TunnelStatus.CONNECTING
    });

    // 역방향 연결 등록
    wireguard.registerPeerConnection(nodeId, initiatorNodeId, {
        initiator: false,
        publicKey,
        targetPublicKey: connection.publicKey,
        status: wireguard.TunnelStatus.CONNECTING
    });

    const initiatorNode = nodeStore.getNode(initiatorNodeId);

    res.json({
        success: true,
        accepted: true,
        peer: {
            nodeId: initiatorNodeId,
            publicKey: connection.publicKey,
            endpoint: initiatorNode.endpoint,
            assignedIp: initiatorNode.assignedIp
        },
        peerConfig: wireguard.generatePeerConfig({
            nodeId: initiatorNodeId,
            publicKey: connection.publicKey,
            endpoint: initiatorNode.endpoint,
            allowedIps: `${initiatorNode.assignedIp}/32`
        }),
        message: 'Connection accepted. Configure peer and start handshake.'
    });
});

/**
 * POST /api/vpn/tunnel/status
 * 터널 상태 업데이트
 */
router.post('/tunnel/status', nodeAuthMiddleware, (req, res) => {
    const { nodeId } = req.node;
    const { peerNodeId, status, stats } = req.body;

    if (!peerNodeId || !status) {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'peerNodeId and status are required'
        });
    }

    const validStatuses = Object.values(wireguard.TunnelStatus);
    if (!validStatuses.includes(status)) {
        return res.status(400).json({
            error: 'Bad Request',
            message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        });
    }

    const updated = wireguard.updatePeerConnection(nodeId, peerNodeId, {
        status,
        stats: stats || {}
    });

    if (!updated) {
        return res.status(404).json({
            error: 'Not Found',
            message: 'Peer connection not found'
        });
    }

    res.json({
        success: true,
        nodeId,
        peerNodeId,
        status: updated.status,
        lastActivity: updated.lastActivity
    });
});

/**
 * GET /api/vpn/tunnel/connections
 * 현재 노드의 모든 피어 연결 조회
 */
router.get('/tunnel/connections', nodeAuthMiddleware, (req, res) => {
    const { nodeId } = req.node;

    const connections = wireguard.getNodeConnections(nodeId);

    res.json({
        success: true,
        nodeId,
        count: connections.length,
        connections: connections.map(c => ({
            peerNodeId: c.peerNodeId,
            status: c.status,
            initiator: c.initiator,
            createdAt: c.createdAt,
            lastActivity: c.lastActivity
        }))
    });
});

/**
 * DELETE /api/vpn/tunnel/:peerNodeId
 * 피어 연결 종료
 */
router.delete('/tunnel/:peerNodeId', nodeAuthMiddleware, (req, res) => {
    const { nodeId } = req.node;
    const { peerNodeId } = req.params;

    const removed = wireguard.removePeerConnection(nodeId, peerNodeId);
    // 양방향 제거
    wireguard.removePeerConnection(peerNodeId, nodeId);

    if (!removed) {
        return res.status(404).json({
            error: 'Not Found',
            message: 'Peer connection not found'
        });
    }

    res.json({
        success: true,
        message: 'Tunnel disconnected'
    });
});

/**
 * POST /api/vpn/stun/discover
 * STUN으로 공인 IP/NAT 타입 탐지
 */
router.post('/stun/discover', async (req, res) => {
    const { localPort } = req.body;

    try {
        const result = await stun.discoverPublicEndpoint(
            wireguard.STUN_SERVERS,
            localPort || 0
        );

        res.json({
            success: true,
            publicIp: result.primaryEndpoint.publicIp,
            publicPort: result.primaryEndpoint.publicPort,
            localPort: result.primaryEndpoint.localPort,
            natType: result.natType,
            p2pFriendly: result.p2pFriendly,
            allEndpoints: result.allEndpoints.map(e => ({
                ip: e.publicIp,
                port: e.publicPort,
                server: e.stunServer
            }))
        });
    } catch (error) {
        res.status(500).json({
            error: 'STUN Discovery Failed',
            message: error.message
        });
    }
});

module.exports = router;
