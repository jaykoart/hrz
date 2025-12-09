/**
 * STUN Service
 * NAT Traversal을 위한 STUN 클라이언트 기능
 */

const dgram = require('dgram');

// STUN 메시지 타입
const STUN_BINDING_REQUEST = 0x0001;
const STUN_BINDING_RESPONSE = 0x0101;

// STUN 속성 타입
const MAPPED_ADDRESS = 0x0001;
const XOR_MAPPED_ADDRESS = 0x0020;

// Magic Cookie (RFC 5389)
const MAGIC_COOKIE = 0x2112A442;

/**
 * STUN Binding Request 생성
 */
function createBindingRequest() {
    const buffer = Buffer.alloc(20);

    // Message Type (2 bytes)
    buffer.writeUInt16BE(STUN_BINDING_REQUEST, 0);

    // Message Length (2 bytes) - 헤더 제외
    buffer.writeUInt16BE(0, 2);

    // Magic Cookie (4 bytes)
    buffer.writeUInt32BE(MAGIC_COOKIE, 4);

    // Transaction ID (12 bytes)
    const transactionId = Buffer.alloc(12);
    for (let i = 0; i < 12; i++) {
        transactionId[i] = Math.floor(Math.random() * 256);
    }
    transactionId.copy(buffer, 8);

    return { buffer, transactionId };
}

/**
 * STUN 응답 파싱
 */
function parseBindingResponse(buffer, transactionId) {
    if (buffer.length < 20) {
        throw new Error('Response too short');
    }

    const messageType = buffer.readUInt16BE(0);
    if (messageType !== STUN_BINDING_RESPONSE) {
        throw new Error('Not a binding response');
    }

    const messageLength = buffer.readUInt16BE(2);
    const magicCookie = buffer.readUInt32BE(4);

    // Transaction ID 확인
    const responseTxId = buffer.slice(8, 20);
    if (!responseTxId.equals(transactionId)) {
        throw new Error('Transaction ID mismatch');
    }

    // 속성 파싱
    let offset = 20;
    let mappedAddress = null;

    while (offset < 20 + messageLength) {
        const attrType = buffer.readUInt16BE(offset);
        const attrLength = buffer.readUInt16BE(offset + 2);
        const attrValue = buffer.slice(offset + 4, offset + 4 + attrLength);

        if (attrType === XOR_MAPPED_ADDRESS || attrType === MAPPED_ADDRESS) {
            // Family (1 byte) + Port (2 bytes) + IP (4 bytes for IPv4)
            const family = attrValue[1];

            if (family === 0x01) { // IPv4
                let port, ip;

                if (attrType === XOR_MAPPED_ADDRESS) {
                    // XOR 복호화
                    port = attrValue.readUInt16BE(2) ^ (MAGIC_COOKIE >> 16);
                    const xorIp = attrValue.readUInt32BE(4);
                    const ipNum = xorIp ^ MAGIC_COOKIE;
                    ip = [
                        (ipNum >> 24) & 0xff,
                        (ipNum >> 16) & 0xff,
                        (ipNum >> 8) & 0xff,
                        ipNum & 0xff
                    ].join('.');
                } else {
                    port = attrValue.readUInt16BE(2);
                    ip = [
                        attrValue[4], attrValue[5], attrValue[6], attrValue[7]
                    ].join('.');
                }

                mappedAddress = { ip, port };
            }
        }

        // 4바이트 정렬
        offset += 4 + attrLength + (attrLength % 4 ? 4 - (attrLength % 4) : 0);
    }

    return mappedAddress;
}

/**
 * STUN 서버로 공인 IP/포트 조회
 */
async function getPublicEndpoint(stunServer, localPort = 0, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const [_, host, port] = stunServer.match(/stun:([^:]+):(\d+)/) || [];

        if (!host || !port) {
            return reject(new Error('Invalid STUN server format'));
        }

        const socket = dgram.createSocket('udp4');
        const { buffer, transactionId } = createBindingRequest();
        let closed = false;

        const closeSocket = () => {
            if (!closed) {
                closed = true;
                try {
                    socket.close();
                } catch (e) {
                    // 이미 닫힌 소켓 무시
                }
            }
        };

        const timer = setTimeout(() => {
            closeSocket();
            reject(new Error('STUN request timeout'));
        }, timeout);

        socket.on('message', (msg) => {
            clearTimeout(timer);
            try {
                const result = parseBindingResponse(msg, transactionId);
                const localAddr = socket.address();
                closeSocket();
                resolve({
                    publicIp: result.ip,
                    publicPort: result.port,
                    localPort: localAddr.port,
                    stunServer
                });
            } catch (err) {
                closeSocket();
                reject(err);
            }
        });

        socket.on('error', (err) => {
            clearTimeout(timer);
            closeSocket();
            reject(err);
        });

        socket.bind(localPort, () => {
            socket.send(buffer, parseInt(port), host);
        });
    });
}

/**
 * 여러 STUN 서버에 동시 요청
 */
async function discoverPublicEndpoint(stunServers, localPort = 0) {
    const results = await Promise.allSettled(
        stunServers.map(server => getPublicEndpoint(server, localPort))
    );

    const successful = results
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value);

    if (successful.length === 0) {
        throw new Error('All STUN requests failed');
    }

    // NAT 타입 추정
    const uniqueEndpoints = new Set(
        successful.map(r => `${r.publicIp}:${r.publicPort}`)
    );

    let natType;
    if (uniqueEndpoints.size === 1) {
        natType = 'full-cone'; // 또는 restricted-cone
    } else if (successful.every(r => r.publicIp === successful[0].publicIp)) {
        natType = 'port-restricted-cone';
    } else {
        natType = 'symmetric'; // P2P 어려움
    }

    return {
        primaryEndpoint: successful[0],
        allEndpoints: successful,
        natType,
        p2pFriendly: natType !== 'symmetric'
    };
}

module.exports = {
    createBindingRequest,
    parseBindingResponse,
    getPublicEndpoint,
    discoverPublicEndpoint
};
