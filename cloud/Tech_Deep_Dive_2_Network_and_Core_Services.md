# 기술 심층 분석 2: 네트워크 아키텍처 및 핵심 서비스 구축

**문서 최종 수정일:** 2025년 11월 29일

## 1. 개요

물리적 서버와 가상화 플랫폼 구축에 이어, 전체 인프라의 보안과 트래픽 관리를 책임질 네트워크 아키텍처를 구축합니다. 오픈소스 방화벽인 OPNsense를 중심으로 네트워크를 구성하고, 핵심 서비스(웹, VPS)의 프로비저닝을 자동화하여 효율적인 운영 기반을 마련합니다.

## 2. OPNsense 방화벽 설치 및 네트워크 인터페이스 구성

### 2.1. Proxmox 네트워크 구성
1.  **Proxmox VE 웹 인터페이스**의 `node1` -> `시스템` -> `네트워크` 메뉴로 이동.
2.  `생성` -> `Linux Bridge` 선택.
    - `이름`: `vmbr1`, `브릿지 포트`: `eno3` (서버의 물리적 LAN 포트 중 하나, KT 모뎀과 직접 연결될 포트). **IP 주소는 설정하지 않음.** (WAN용 브릿지)
3.  `생성` -> `Linux Bridge` 선택.
    - `이름`: `vmbr2`. **IP 주소 및 브릿지 포트 설정하지 않음.** `VLAN 인식` 체크. (내부 LAN용 브릿지)

### 2.2. OPNsense VM 생성 및 설치
1.  Proxmox VE에 VM 생성 (2코어, 4GB RAM, 40GB 디스크).
2.  `네트워크` 탭에서 네트워크 장치를 2개 추가합니다.
    - `net0`: 브릿지 `vmbr1` (WAN)
    - `net1`: 브릿지 `vmbr2` (LAN)
3.  OPNsense 최신 ISO 이미지로 부팅하여 설치를 진행합니다.
4.  설치 후 콘솔에서 초기 설정을 진행합니다.
    - `Assign Interfaces`: `vtnet0`를 WAN으로, `vtnet1`를 LAN으로 할당.
    - `Set interface IP address`:
        - **WAN:** `DHCP` 선택 (KT 모뎀으로부터 공인 IP를 자동 할당받도록 설정).
        - **LAN:** `Static` 선택. IP 주소 `192.168.1.1`, 서브넷 `24` 입력. LAN 인터페이스의 DHCP 서버 활성화.

## 3. VLAN을 이용한 네트워크 분리 및 보안 강화

### 3.1. VLAN 생성 (OPNsense)
1.  **OPNsense 웹 인터페이스**(`https://192.168.1.1`) 접속.
2.  `Interfaces` -> `Other Types` -> `VLAN`으로 이동 후 `Add` 클릭.
    - **VLAN 10 (Management):** `Parent`: `vtnet1` (LAN), `VLAN tag`: `10`.
    - **VLAN 20 (Web-Services):** `Parent`: `vtnet1`, `VLAN tag`: `20`.
    - **VLAN 30 (VPS-Services):** `Parent`: `vtnet1`, `VLAN tag`: `30`.
3.  `Interfaces` -> `Assignments`에서 새로 생긴 VLAN들을 인터페이스로 추가하고, 각각 `Enable` 체크.
4.  각 인터페이스(MGMT, WEBSVC, VPSSVC)를 클릭하여 IP 주소 및 DHCP 서버 설정.
    - **MGMT:** `192.168.10.1/24`
    - **WEBSVC:** `192.168.20.1/24`
    - **VPSSVC:** `192.168.30.1/24`

### 3.2. 방화벽 규칙 설정
- `Firewall` -> `Rules` 메뉴에서 각 인터페이스별 규칙을 설정합니다.
- **기본 원칙:** 기본적으로 모든 통신을 차단하고, 필요한 통신만 명시적으로 허용 (Default Deny).
- **WAN 규칙:** 외부에서 내부로 들어오는 모든 트래픽을 차단. (단, 포트 포워딩 또는 HAProxy를 사용할 포트(80, 443)는 예외)
- **LAN 인터페이스 간 규칙:**
    - MGMT망에서는 모든 다른 망으로 접근 가능.
    - WEBSVC, VPSSVC 망에서는 인터넷(WAN)으로는 나갈 수 있지만, 다른 내부망(MGMT 등)으로는 접근할 수 없도록 설정하여 보안 강화.

## 4. HAProxy를 이용한 리버스 프록시 및 SSL 오프로딩

### 4.1. HAProxy 플러그인 설치
- OPNsense의 `System` -> `Firmware` -> `Plugins`에서 `os-haproxy`를 검색하여 설치.

### 4.2. SSL 인증서 발급 (Let's Encrypt)
1.  `System` -> `Firmware` -> `Plugins`에서 `os-acme-client` (Let's Encrypt 클라이언트) 설치.
2.  `Services` -> `ACME Client`에서 인증 기관, 계정을 설정하고, DNS-01 Challenge 방식을 이용하여 와일드카드 인증서(`*.ikscloud.local`)를 발급받습니다.

### 4.3. HAProxy 설정
1.  **Real Servers (백엔드):** `Services` -> `HAProxy` -> `Real Servers`에서 실제 웹 트래픽을 처리할 내부 웹 서버 VM(cPanel VM 등)의 IP 주소와 포트(80)를 등록.
2.  **Backend Pools (백엔드 그룹):** 등록한 Real Server들을 하나의 그룹으로 묶습니다. (로드 밸런싱 알고리즘: `Round-robin`)
3.  **Public Services (프론트엔드):**
    - `Listen Addresses`: `0.0.0.0:443` (모든 IP의 443 포트로 들어오는 요청 수신).
    - `SSL Offloading`: 위에서 발급받은 Let's Encrypt 인증서 선택.
    - `Default Backend Pool`: 위에서 생성한 백엔드 그룹 선택.
- **작동 원리:** 외부 사용자가 `https://service.ikscloud.local` 로 접속 -> DNS가 OPNsense의 공인 IP로 안내 -> OPNsense의 HAProxy가 443 포트에서 요청을 받아 SSL 복호화 -> 내부 웹 서버 VM으로 HTTP 요청 전달. 이로써 모든 웹 서비스가 단일 IP와 인증서로 서비스되며, 내부 서버는 SSL 처리 부담을 덜게 됩니다.

## 5. WHMCS를 이용한 서비스 프로비저닝 자동화

### 5.1. Proxmox API 토큰 생성
1.  **Proxmox VE 웹 인터페이스**에서 `데이터센터` -> `권한` -> `사용자` -> `추가`.
    - `사용자 이름`: `whmcs-api@pve`, `영역`: `pve`.
2.  `데이터센터` -> `권한` -> `API 토큰` -> `추가`.
    - `사용자`: `whmcs-api@pve`, `토큰 ID`: `whmcs_token`.
    - 생성된 **Token ID**와 **Secret**을 복사.
3.  `데이터센터` -> `권한` -> `추가` -> `사용자 권한`.
    - `경로`: `/`, `사용자`: `whmcs-api@pve`, `역할`: `PVEAdmin` (또는 더 제한적인 역할).

### 5.2. WHMCS 연동
1.  **WHMCS용 VM**을 생성(Ubuntu 22.04 + LAMP)하고 WHMCS를 설치합니다.
2.  WHMCS Marketplace에서 **'Proxmox VE VPS'** 공식 모듈을 구매하여 설치합니다.
3.  **WHMCS 관리자 페이지**에서 `System Settings` -> `Servers` -> `Add New Server`.
    - `Name`: `PVE-Node1`
    - `Hostname or IP Address`: Proxmox 서버 IP 주소.
    - `Type`: `Proxmox VE VPS` 선택.
    - `Username`: `whmcs-api@pve!whmcs_token` (사용자@영역!토큰ID).
    - `Password`: Proxmox API 토큰의 **Secret** 입력.
    - `Test Connection`으로 연동 확인.
4.  `System Settings` -> `Products/Services`에서 VPS 상품 생성.
    - `Module Settings` 탭에서 서버를 `PVE-Node1`로 선택.
    - 고객이 선택할 수 있는 OS 템플릿, 디스크/메모리/CPU 등 옵션 설정.
- **자동화 흐름:** 고객이 WHMCS에서 VPS 상품 주문 및 결제 완료 -> WHMCS가 Proxmox API를 호출 -> Proxmox는 지정된 템플릿을 복제하여 VM을 생성하고 IP 할당 -> WHMCS가 고객에게 VPS 정보 이메일 발송.

---
## 6. 다음 단계
- `[Tech_Deep_Dive_3_Backup_HA_and_Monitoring.md](Tech_Deep_Dive_3_Backup_HA_and_Monitoring.md)` 로 이동하여 Proxmox Backup Server의 고급 기능, 클러스터를 이용한 고가용성(HA) 구성, 그리고 전체 인프라에 대한 통합 모니터링 시스템을 구축합니다.
