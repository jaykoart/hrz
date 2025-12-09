# HQMX VPN Backend 개발 가이드

## 📌 Overview
HQMX는 P2P 기반의 분산형 VPN 서비스로, 사용자의 유휴 대역폭을 활용하여 상업용 프록시 네트워크를 구축합니다.

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

### Phase 1: 제어 평면 (Control Plane) 구축 ✅
> 노드 인증, 상태 관리, 라우팅 테이블
- [x] Node Registration API (`POST /api/nodes/register`)
- [x] Node Heartbeat/Status API (`POST /api/nodes/heartbeat`)
- [x] Node List/Discovery API (`GET /api/nodes`)
- [x] ACL (Access Control List) 정책 엔진

### Phase 2: VPN 터널 관리 ✅
> WireGuard 기반 VPN 연결 관리
- [x] WireGuard 키 생성/교환 API
- [x] 피어(Peer) 구성 API
- [x] NAT Traversal 지원 (STUN/TURN 통합)
- [x] 터널 상태 모니터링 API

### Phase 3: 프록시 계층 (Proxy Layer) ✅
> 상업용 프록시 트래픽 라우팅
- [x] WebSocket 게이트웨이 구현
- [x] 프록시 요청 분배 로직 (Load Balancing)
- [x] IP 로테이션 로직 (Rotating/Sticky Session)
- [x] 도메인 화이트리스트/블랙리스트

### Phase 4: 보안 및 남용 방지 ✅
> 사용자 보호 및 악성 트래픽 차단
- [x] 사설 IP 대역 (RFC 1918) 차단
- [x] 포트 필터링 (80, 443 외 차단)
- [x] DNS 싱크홀링 (Sinkholing) - 악성/위험 도메인 차단
- [x] KYC 검증 시스템 (기업 고객용) - 이메일 인증 기반

### Phase 5: 사용자 경험 (UX/Consent) ✅
> 투명한 동의 및 설정 시스템
- [x] 자원 공유 동의 플로우 API - 설치 시 자동 체크 방식
- [x] 설정 API (Wi-Fi 전용, 데이터 제한)
  - `wifiOnly`: Wi-Fi 전용 모드
  - `dataLimitMode`: 'auto' | 'unlimited' | 'manual'
  - `hasUnlimitedPlan`: 무제한 요금제 사용자 설정
  - 동적 제한: 연결 타입에 따라 자동 조절
- ~~기여도 측정 API~~ (불필요 - 무료 서비스)
- ~~크레딧/포인트 시스템~~ (불필요 - 무료 = 크레딧)

### Phase 6: 인증 ✅
> Google OAuth 및 사용자 관리
- [x] Google OAuth 2.0 구현
- [x] 세션/토큰 관리
- [x] 사용자 프로필 API (`GET/PUT /api/user/profile`)
- [x] 로그아웃 API (`POST /api/logout`)
- [x] 탈퇴 API (`DELETE /api/user`)
- [x] 데이터 내보내기 API (`GET /api/user/export`) - GDPR 준수

---

## 📂 디렉토리 구조
```
vpn/backend/
├── src/
│   ├── server.js           # Express 앱 엔트리
│   ├── auth.js             # Google OAuth + 사용자 API
│   ├── routes/
│   │   ├── nodes.js        # 노드 관리 API
│   │   ├── vpn.js          # VPN 터널 API
│   │   ├── proxy.js        # 프록시 게이트웨이
│   │   ├── consent.js      # 동의 플로우 API (Phase 5)
│   │   ├── settings.js     # 사용자 설정 API (Phase 5)
│   │   └── kyc.js          # KYC 검증 API (Phase 4)
│   ├── services/
│   │   ├── wireguard.js    # WireGuard 키/피어 관리
│   │   ├── stun.js         # NAT Traversal
│   │   ├── acl.js          # 접근 제어
│   │   ├── nodeStore.js    # 노드 저장소
│   │   ├── proxyGateway.js # 프록시 게이트웨이
│   │   ├── domainFilter.js # 도메인 필터링
│   │   ├── dnsSinkhole.js  # DNS 싱크홀링 (Phase 4)
│   │   ├── kycVerification.js # KYC 검증 (Phase 4)
│   │   └── userSettings.js # 사용자 설정/동의 (Phase 5)
│   └── utils/
│       └── security.js     # 보안 필터링
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
