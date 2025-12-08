# Horizon VPN Backend 개발 가이드

## 📌 Overview
Horizon VPN은 P2P 기반의 분산형 VPN 서비스로, 사용자의 유휴 대역폭을 활용하여 상업용 프록시 네트워크를 구축합니다.

---

## 🎯 핵심 아키텍처

### 이중 오버레이 네트워크 (Dual Overlay Network)
| 계층 | 목적 | 프로토콜 |
|------|------|----------|
| **VPN 오버레이** | 사용자 익명성/지역 우회 | WireGuard (UDP) |
| **프록시 오버레이** | 상업용 데이터 수집 | HTTP/2, WebSocket |

---

## 🔌 서버 정보
- **Port**: `3002` (HQMX EC2 공유, 충돌 방지)
- **로컬 경로**: `/Users/wonjunjang/hrz/vpn/backend`
- **서버 경로**: `/home/ubuntu/hrz/services/vpn-backend`

---

## ✅ 개발 체크리스트

### Phase 1: 제어 평면 (Control Plane) 구축
> 노드 인증, 상태 관리, 라우팅 테이블
- [ ] Node Registration API (`POST /api/nodes/register`)
- [ ] Node Heartbeat/Status API (`POST /api/nodes/heartbeat`)
- [ ] Node List/Discovery API (`GET /api/nodes`)
- [ ] ACL (Access Control List) 정책 엔진

### Phase 2: VPN 터널 관리
> WireGuard 기반 VPN 연결 관리
- [ ] WireGuard 키 생성/교환 API
- [ ] 피어(Peer) 구성 API
- [ ] NAT Traversal 지원 (STUN/TURN 통합)
- [ ] 터널 상태 모니터링 API

### Phase 3: 프록시 계층 (Proxy Layer)
> 상업용 프록시 트래픽 라우팅
- [ ] WebSocket 게이트웨이 구현
- [ ] 프록시 요청 분배 로직 (Load Balancing)
- [ ] IP 로테이션 로직 (Rotating/Sticky Session)
- [ ] 도메인 화이트리스트/블랙리스트

### Phase 4: 보안 및 남용 방지
> 사용자 보호 및 악성 트래픽 차단
- [ ] 사설 IP 대역 (RFC 1918) 차단
- [ ] 포트 필터링 (80, 443 외 차단)
- [ ] DNS 싱크홀링 (Sinkholing)
- [ ] KYC 검증 시스템 (기업 고객용)

### Phase 5: 사용자 경험 (UX/Consent)
> 투명한 동의 및 보상 시스템
- [ ] 자원 공유 동의 플로우 API
- [ ] 기여도 측정 API (트래픽 양, 가동 시간)
- [ ] 크레딧/포인트 시스템
- [ ] 설정 API (Wi-Fi 전용, 데이터 제한 등)

### Phase 6: 인증 (마지막)
> Google OAuth 및 사용자 관리
- [ ] Google OAuth 2.0 구현
- [ ] 세션/토큰 관리
- [ ] 사용자 프로필 API
- [ ] 로그아웃/탈퇴 API

---

## 📂 디렉토리 구조 (계획)
```
vpn/backend/
├── src/
│   ├── server.js         # Express 앱 엔트리
│   ├── auth.js           # Google OAuth (Phase 6)
│   ├── routes/
│   │   ├── nodes.js      # 노드 관리 API
│   │   ├── vpn.js        # VPN 터널 API
│   │   └── proxy.js      # 프록시 게이트웨이
│   ├── services/
│   │   ├── wireguard.js  # WireGuard 키/피어 관리
│   │   ├── stun.js       # NAT Traversal
│   │   └── acl.js        # 접근 제어
│   └── utils/
│       └── security.js   # 보안 필터링
├── .env
├── .env.example
└── package.json
```

---

## 🚀 개발 시작 명령어
```bash
cd /Users/wonjunjang/hrz/vpn/backend
npm install
npm run dev  # nodemon 사용
```

---

## 📝 참고 문서
- `Hola VPN 유사 서비스 구축 방안.md`: 기술 보고서
- `vpn-future.md`: 비즈니스 모델 및 확장 전략
- Headscale: https://headscale.net/
- WireGuard-Go: https://github.com/WireGuard/wireguard-go
- Coturn (TURN Server): https://github.com/coturn/coturn
