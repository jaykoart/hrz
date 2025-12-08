# 기술 심층 분석 3: 백업, 고가용성(HA) 및 모니터링

**문서 최종 수정일:** 2025년 11월 29일

## 1. 개요

인프라 구축의 마지막 단계로, 서비스의 신뢰도와 안정성을 최고 수준으로 끌어올리기 위한 시스템을 구축합니다. 강력한 백업 및 재해 복구(DR) 체계를 마련하고, 하드웨어 장애에 대응하는 고가용성(HA) 클러스터를 구성하며, 모든 시스템을 24시간 감시하는 통합 모니터링 환경을 구축합니다.

## 2. Proxmox Backup Server (PBS) 심화 설정

### 2.1. 데이터스토어 이중화 (로컬 + 클라우드)
- **로컬 데이터스토어:** `Tech_Deep_Dive_1`에서 구성한 로컬 서버의 ZFS 풀을 빠른 백업 및 복구를 위한 'warm' 스토리지로 사용.
- **클라우드 데이터스토어:** `Tech_Deep_Dive_1.4`에서 연동한 AWS S3를 장기 보관 및 재해 복구를 위한 'cold' 스토리지로 사용.

### 2.2. 백업 데이터 동기화 및 보관 정책 자동화
1.  **동기화 작업 (Sync Job) 설정:**
    - **PBS 웹 인터페이스**에서 `데이터센터` -> `동기화 작업` -> `추가`.
    - `원격`: `aws-s3-storage` (S3 리모트).
    - `원격 네임스페이스` 및 `데이터스토어`: S3에 생성한 데이터스토어 선택.
    - `로컬 데이터스토어`: 로컬 백업 데이터스토어 선택.
    - `일정`: `매일 04:00` 과 같이 설정. 이 작업을 통해 매일 새벽 로컬 백업이 S3로 자동 동기화됩니다.
2.  **검증 및 가지치기 (Verification & Pruning):**
    - `데이터센터` -> `데이터스토어`에서 로컬 및 S3 데이터스토어를 각각 선택.
    - **검증 작업:** `검증 작업` 탭 -> `추가`. `매주 토요일` 등으로 일정을 설정하여 백업 데이터의 무결성을 정기적으로 검사합니다.
    - **가지치기(Pruning) 작업:** `가지치기 & GC` 탭 -> `추가`.
        - `보관` 설정 (예시):
            - `keep-last`: `3` (최신 백업 3개는 무조건 보관)
            - `keep-daily`: `7` (최근 7일간은 매일 1개씩 보관)
            - `keep-weekly`: `4` (최근 4주간은 매주 1개씩 보관)
            - `keep-monthly`: `6` (최근 6개월간은 매월 1개씩 보관)
        - 이 규칙을 통해 오래된 백업은 자동으로 정리되어 스토리지 공간을 효율적으로 사용합니다.

### 2.3. 클라이언트 측 암호화
1.  **Proxmox VE 웹 인터페이스**의 `데이터센터` -> `백업` -> 백업 작업 `편집`.
2.  `암호화` 드롭다운 메뉴에서 `클라이언트 측 암호화` 선택.
3.  `암호` 필드에 강력한 암호를 입력하거나, `키 생성` 버튼을 눌러 생성된 암호화 키(`.pem` 파일)를 다운로드하여 **매우 안전한 곳(오프라인, 비밀번호 관리자 등)에 별도 보관**합니다.
4.  **경고:** 암호화 키 분실 시 해당 백업 데이터는 절대 복구할 수 없습니다.

## 3. Proxmox VE 고가용성(HA) 클러스터

### 3.1. 클러스터 생성 및 QDevice 설정
1.  **클러스터 생성 (node1에서 실행):**
    ```bash
    pvecm create iksan-cluster
    ```
2.  **클러스터 참여 (node2에서 실행):**
    ```bash
    pvecm add <node1의 IP 주소>
    ```
3.  **QDevice 설정 (쿼럼 문제 해결):**
    - 제3의 경량 리눅스 VM(Debian 등)을 생성하고 고정 IP를 할당합니다.
    - **QNet 서버 설정 (제3의 VM에서):**
        ```bash
        apt install corosync-qnetd -y
        # /etc/corosync/qnetd/main.conf 설정 확인
        ```
    - **QDevice 설정 (node1, node2에서):**
        ```bash
        pvecm qdevice setup <QNet 서버의 IP 주소>
        ```
    - `pvecm status` 명령으로 쿼럼 상태를 확인합니다.

### 3.2. 공유 스토리지 설정 (NFS)
1.  **NFS 서버 VM 구축:** Proxmox에 새 VM(Debian 등)을 생성하고, `Tech_Deep_Dive_1`에서 만든 `zfs_data_storage`에 디스크를 할당합니다.
2.  **NFS 서버 설정:**
    ```bash
    apt install nfs-kernel-server -y
    mkdir /export/ha-storage
    chown nobody:nogroup /export/ha-storage
    # /etc/exports 파일에 아래 내용 추가
    /export/ha-storage 192.168.10.0/24(rw,sync,no_subtree_check)
    systemctl restart nfs-kernel-server
    ```
3.  **Proxmox에 스토리지 추가:**
    - `데이터센터` -> `스토리지` -> `추가` -> `NFS`.
    - `ID`: `nfs_ha_shared`, `서버`: NFS 서버 VM의 IP, `내보내기`: `/export/ha-storage`.
    - `콘텐츠`: `디스크 이미지` 선택.

### 3.3. HA 그룹 및 VM 설정
1.  `데이터센터` -> `HA` -> `그룹` -> `생성`. `ID`: `critical-vms`, `노드`: `node1, node2` 추가.
2.  OPNsense, WHMCS 등 장애 시 자동 복구가 필요한 VM의 디스크를 **NFS 공유 스토리지로 이전**합니다. (`리소스` -> `하드 디스크` -> `디스크 작업` -> `스토리지 이동`)
3.  `데이터센터` -> `HA` -> `리소스` -> `추가`. VM을 선택하고 위에서 생성한 `critical-vms` 그룹에 추가합니다.
4.  **테스트:** `node1`을 재부팅했을 때, HA로 지정된 VM들이 `node2`에서 자동으로 시작되는지 확인합니다.

## 4. 통합 모니터링 시스템 (Zabbix)

### 4.1. Zabbix 서버 설치
- Proxmox에 Zabbix Appliance 공식 VM 이미지를 다운로드하여 임포트하거나, Ubuntu VM에 LAMP 스택과 Zabbix 서버를 직접 설치합니다.

### 4.2. 모니터링 대상 추가
1.  **Proxmox 노드:**
    - 각 노드에 `apt install zabbix-agent -y`로 에이전트 설치.
    - `/etc/zabbix/zabbix_agentd.conf` 파일에서 `Server`, `ServerActive`를 Zabbix 서버 IP로 설정.
    - Zabbix 웹 인터페이스의 `Configuration` -> `Hosts`에서 Proxmox 노드를 추가하고, 'Template OS Linux by Zabbix agent' 템플릿 연결.
2.  **OPNsense (SNMP):**
    - OPNsense `Services` -> `SNMP` 활성화, 커뮤니티 문자열 설정.
    - Zabbix에서 호스트 추가 시, IP 주소와 SNMP 인터페이스 설정. 'Template Net OPNsense SNMP'와 같은 템플릿 연결.
3.  **Dell 서버 하드웨어 (iDRAC SNMP):**
    - iDRAC 웹 인터페이스에서 SNMP 활성화.
    - Zabbix에서 iDRAC IP를 호스트로 추가하고, 'Template Server Dell iDRAC SNMPv2' 템플릿 연결. 이를 통해 팬 속도, 온도, 전압, 파워 상태 등을 직접 감시.

### 4.3. 대시보드 및 경고 설정
- **대시보드:** Zabbix의 `Monitoring` -> `Dashboard`에서 위젯을 추가하여 전체 인프라의 CPU, 메모리, 네트워크 사용량, 서버 온도 등을 시각적으로 구성.
- **트리거/경고:**
    - `Configuration` -> `Hosts` -> 각 호스트의 `Triggers` 메뉴.
    - 'CPU utilization is too high on {HOST.NAME}'과 같은 기본 트리거의 임계값을 조정.
    - `Administration` -> `Media types`에서 이메일(SMTP) 또는 슬랙 웹훅(Webhook) 설정.
    - `Configuration` -> `Actions`에서 트리거 발생 시 특정 사용자에게 알림이 가도록 설정.

---
## 5. Phase 1 기술 구축 완료
본 문서의 내용까지 완료되면, 서비스 제공을 위한 기술 인프라는 단순한 MVP 수준을 넘어, 데이터 안정성, 서비스 연속성, 장애 예측 능력을 갖춘 준(準) 상용 등급의 시스템으로 완성됩니다.
