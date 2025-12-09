/**
 * WireGuard Service
 * 키 생성, 피어 구성, 터널 관리
 * 
 * WireGuard는 Curve25519 키 쌍을 사용합니다.
 * tweetnacl 라이브러리로 키 생성을 구현합니다.
 */

const nacl = require('tweetnacl');
const naclUtil = require('tweetnacl-util');

// 피어 연결 상태 저장
const peerConnections = new Map();

// STUN 서버 목록 (공용)
const STUN_SERVERS = [
    'stun:stun.l.google.com:19302',
    'stun:stun1.l.google.com:19302',
    'stun:stun2.l.google.com:19302',
    'stun:stun.cloudflare.com:3478'
];

/**
 * WireGuard 키 쌍 생성
 * Curve25519 기반
 */
function generateKeyPair() {
    const keyPair = nacl.box.keyPair();

    return {
        privateKey: naclUtil.encodeBase64(keyPair.secretKey),
        publicKey: naclUtil.encodeBase64(keyPair.publicKey)
    };
}

/**
 * 공개키 유효성 검증
 */
function validatePublicKey(publicKeyBase64) {
    try {
        const decoded = naclUtil.decodeBase64(publicKeyBase64);
        return decoded.length === 32;
    } catch {
        return false;
    }
}

/**
 * Pre-shared Key 생성 (추가 보안 계층)
 */
function generatePresharedKey() {
    const key = nacl.randomBytes(32);
    return naclUtil.encodeBase64(key);
}

/**
 * 피어 구성 생성
 * WireGuard 설정 파일 형식
 */
function generatePeerConfig({ nodeId, publicKey, endpoint, allowedIps, persistentKeepalive = 25 }) {
    return {
        nodeId,
        config: {
            PublicKey: publicKey,
            Endpoint: endpoint,
            AllowedIPs: allowedIps || '0.0.0.0/0, ::/0',
            PersistentKeepalive: persistentKeepalive
        },
        configString: `[Peer]
PublicKey = ${publicKey}
Endpoint = ${endpoint}
AllowedIPs = ${allowedIps || '0.0.0.0/0, ::/0'}
PersistentKeepalive = ${persistentKeepalive}`
    };
}

/**
 * 인터페이스 구성 생성
 * 클라이언트용 WireGuard 설정
 */
function generateInterfaceConfig({ privateKey, address, dns = '1.1.1.1, 8.8.8.8', listenPort }) {
    const config = {
        PrivateKey: privateKey,
        Address: address,
        DNS: dns
    };

    if (listenPort) {
        config.ListenPort = listenPort;
    }

    let configString = `[Interface]
PrivateKey = ${privateKey}
Address = ${address}
DNS = ${dns}`;

    if (listenPort) {
        configString += `\nListenPort = ${listenPort}`;
    }

    return { config, configString };
}

/**
 * 전체 클라이언트 설정 생성
 */
function generateClientConfig({ clientPrivateKey, clientAddress, serverPublicKey, serverEndpoint, dns }) {
    const interfaceConfig = generateInterfaceConfig({
        privateKey: clientPrivateKey,
        address: clientAddress,
        dns: dns || '1.1.1.1, 8.8.8.8'
    });

    const peerConfig = generatePeerConfig({
        nodeId: 'server',
        publicKey: serverPublicKey,
        endpoint: serverEndpoint,
        allowedIps: '0.0.0.0/0, ::/0'
    });

    return {
        interface: interfaceConfig.config,
        peer: peerConfig.config,
        fullConfig: `${interfaceConfig.configString}\n\n${peerConfig.configString}`
    };
}

/**
 * 피어 연결 상태 등록
 */
function registerPeerConnection(nodeId, peerNodeId, connectionInfo) {
    const key = `${nodeId}:${peerNodeId}`;
    peerConnections.set(key, {
        ...connectionInfo,
        createdAt: new Date(),
        lastActivity: new Date(),
        status: 'pending'
    });
    return peerConnections.get(key);
}

/**
 * 피어 연결 상태 업데이트
 */
function updatePeerConnection(nodeId, peerNodeId, updates) {
    const key = `${nodeId}:${peerNodeId}`;
    const connection = peerConnections.get(key);

    if (!connection) return null;

    Object.assign(connection, updates, { lastActivity: new Date() });
    return connection;
}

/**
 * 피어 연결 조회
 */
function getPeerConnection(nodeId, peerNodeId) {
    const key = `${nodeId}:${peerNodeId}`;
    return peerConnections.get(key) || null;
}

/**
 * 노드의 모든 피어 연결 조회
 */
function getNodeConnections(nodeId) {
    const connections = [];

    for (const [key, value] of peerConnections) {
        if (key.startsWith(`${nodeId}:`)) {
            connections.push({
                peerNodeId: key.split(':')[1],
                ...value
            });
        }
    }

    return connections;
}

/**
 * 피어 연결 해제
 */
function removePeerConnection(nodeId, peerNodeId) {
    const key = `${nodeId}:${peerNodeId}`;
    return peerConnections.delete(key);
}

/**
 * ICE Candidate 정보 생성 (NAT Traversal용)
 */
function createIceCandidate({ nodeId, publicIp, publicPort, localIp, localPort, type = 'srflx' }) {
    return {
        nodeId,
        candidate: {
            type,  // 'host', 'srflx' (STUN), 'relay' (TURN)
            publicEndpoint: `${publicIp}:${publicPort}`,
            localEndpoint: `${localIp}:${localPort}`,
            priority: type === 'host' ? 100 : type === 'srflx' ? 50 : 10
        },
        stunServers: STUN_SERVERS,
        timestamp: new Date()
    };
}

/**
 * 홀 펀칭 시퀀스 생성
 */
function createHolePunchSequence(nodeA, nodeB) {
    return {
        sequenceId: `hp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        participants: [nodeA.nodeId, nodeB.nodeId],
        nodeA: {
            nodeId: nodeA.nodeId,
            targetEndpoint: nodeB.endpoint,
            localPort: nodeA.localPort || 51820
        },
        nodeB: {
            nodeId: nodeB.nodeId,
            targetEndpoint: nodeA.endpoint,
            localPort: nodeB.localPort || 51820
        },
        stunServers: STUN_SERVERS,
        timeout: 30000,
        createdAt: new Date()
    };
}

/**
 * 터널 상태
 */
const TunnelStatus = {
    PENDING: 'pending',
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
    DISCONNECTED: 'disconnected',
    FAILED: 'failed'
};

module.exports = {
    generateKeyPair,
    validatePublicKey,
    generatePresharedKey,
    generatePeerConfig,
    generateInterfaceConfig,
    generateClientConfig,
    registerPeerConnection,
    updatePeerConnection,
    getPeerConnection,
    getNodeConnections,
    removePeerConnection,
    createIceCandidate,
    createHolePunchSequence,
    TunnelStatus,
    STUN_SERVERS
};
