# 기술 심층 분석 1: 하드웨어 선정 및 가상화 환경 구축

**문서 최종 수정일:** 2025년 11월 29일

## 1. 개요

본 문서는 클라우드 서비스 인프라의 가장 기초가 되는 서버 하드웨어를 선정하고, 그 위에 가상화 플랫폼인 Proxmox VE를 최적의 상태로 설치 및 구성하는 기술적 절차를 상세히 기술합니다. 안정성, 데이터 무결성, 확장성을 최우선 목표로 설정합니다.

## 2. 서버 하드웨어 최종 선정: Dell PowerEdge R730xd

### 2.1. 경쟁 모델 비교 (vs. HPE ProLiant DL380 Gen9)
- **HPE DL380 Gen9:** 더 높은 최대 메모리(3TB)를 지원하는 장점이 있으나, 이는 대규모 단일 데이터베이스와 같은 특수 목적에 더 적합합니다.
- **Dell R730xd:** 'xd'(extreme disk) 모델명에 걸맞게, 2.5인치 드라이브를 최대 26개까지 장착할 수 있는 등 압도적인 스토리지 확장성과 유연성을 제공합니다. 또한, 원격 관리 툴인 iDRAC의 사용자 편의성이 높게 평가됩니다.

### 2.2. 최종 결정
- 다수의 고객에게 독립된 가상 환경(VM)과 데이터를 제공해야 하는 클라우드 호스팅 사업의 특성상, 초기 투자 단계에서는 메모리 용량보다 **스토리지 밀도와 유연성**이 더 중요합니다. 따라서 **Dell PowerEdge R730xd**를 최종 모델로 선정합니다.

## 3. 스토리지 아키텍처: ZFS를 이용한 Software-Defined Storage

하드웨어 RAID 컨트롤러의 제약(종속성, 캐시 배터리 문제 등)에서 벗어나, 데이터 무결성과 유연성이 뛰어난 ZFS 파일 시스템을 운영체제 레벨에서 직접 활용합니다.

### 3.1. RAID 컨트롤러 HBA 모드 전환
- **목표:** Proxmox VE의 ZFS가 모든 디스크를 직접 제어(Passthrough)할 수 있도록, 내장된 `PERC H730P` RAID 컨트롤러를 단순 디스크 연결 장치(HBA, Host Bus Adapter)처럼 작동하게 변경합니다.
- **절차:**
    1.  서버 부팅 시 **F2**를 눌러 'System Setup' 진입.
    2.  `Device Settings` -> `Integrated RAID Controller 1: Dell PERC H730P Mini` 선택.
    3.  `Configuration Management` -> `Switch to HBA Mode` 또는 유사한 메뉴를 선택하여 모드를 변경합니다.
    4.  **경고:** 이 작업은 컨트롤러에 설정된 모든 기존 RAID 구성을 파괴합니다. 반드시 디스크에 데이터가 없는 초기 구축 단계에서 수행해야 합니다.

### 3.2. Proxmox VE 설치 (ZFS on Root)
- **설치 USB:** Proxmox VE 최신 버전 ISO를 Rufus 또는 Etcher로 USB에 굽습니다.
- **설치 과정:**
    1.  USB로 부팅 후, 설치 화면의 `Target Harddisk` 선택 단계에서 `Options` 버튼을 클릭합니다.
    2.  **파일 시스템:** `ZFS (RAID1)`을 선택합니다.
    3.  **디스크 선택:** HBA 모드로 전환되어 개별적으로 보이는 **Samsung 1.92TB SSD** 2개를 모두 선택합니다.
    4.  **고급 옵션 (Advanced Options):**
        - `ashift`: `12` (최신 4K 섹터 디스크에 최적화된 값).
        - `compression`: `on` (lzo/lz4 알고리즘으로 CPU 부하 거의 없이 디스크 공간 절약 및 I/O 성능 향상).
    5.  `OK`를 눌러 ZFS 설정을 완료하고, 나머지 설치 과정을 진행합니다.
- **결과:** OS 및 핵심 VM 데이터가 저장되는 루트 파일 시스템(`rpool`)이 2개의 SSD에 미러링(RAID 1)되어, SSD 1개가 장애 나도 서비스 중단 없이 운영 가능해집니다.

### 3.3. 데이터 스토리지 풀(Pool) 생성
- **목표:** VM의 대용량 데이터, ISO 이미지, 백업 파일 등을 저장하기 위한 별도의 ZFS 풀을 생성합니다.
- **절차 (Proxmox 셸):**
    1.  `lsblk` 또는 `fdisk -l` 명령으로 4개의 **Seagate 16TB HDD** 디스크 장치명 확인 (예: `/dev/sdc`, `/dev/sdd`, `/dev/sde`, `/dev/sdf`).
    2.  `raidz1` 풀을 생성합니다. `raidz1`은 4개의 디스크 중 1개가 장애 나도 데이터를 보존할 수 있습니다.
    ```bash
    zpool create -f -o ashift=12 data_hdd_pool raidz1 /dev/sdc /dev/sdd /dev/sde /dev/sdf
    ```
    3.  생성된 풀에 압축 옵션을 활성화하고, VM 디스크 이미지용 데이터셋을 생성합니다.
    ```bash
    zfs set compression=lz4 data_hdd_pool
    zfs create data_hdd_pool/vm-data
    ```
    4.  **Proxmox 웹 인터페이스**에서 `데이터센터` -> `스토리지` -> `추가` -> `ZFS` 선택.
        - `ID`: `zfs_data_storage` 입력.
        - `ZFS 풀`: `data_hdd_pool/vm-data` 선택.
        - `콘텐츠`: `디스크 이미지`, `컨테이너` 선택 후 추가.

## 4. 커널 튜닝 및 네트워크 고도화

### 4.1. IOMMU (VT-d) 활성화
- **목표:** 향후 특정 하드웨어(GPU, 고성능 NVMe 등)를 VM에 직접 할당(PCI Passthrough)할 수 있도록 가상화 지원 기능을 활성화합니다.
- **절차:**
    1.  서버 BIOS 설정에서 `Virtualization Technology` -> `VT-d` 또는 `IOMMU`를 `Enabled`로 변경.
    2.  Proxmox 셸에서 `/etc/default/grub` 파일을 수정합니다.
    ```bash
    # nano /etc/default/grub
    # 아래 라인을 찾아서 수정
    GRUB_CMDLINE_LINUX_DEFAULT="quiet intel_iommu=on"
    ```
    3.  GRUB 설정을 업데이트하고 재부팅합니다.
    ```bash
    update-grub
    reboot
    ```

### 4.2. 네트워크 본딩 (LACP)
- **목표:** 서버의 물리적 네트워크 포트 2개를 하나로 묶어 대역폭을 확장하고, 하나의 포트/케이블/스위치 포트에 장애 발생 시에도 통신을 유지합니다.
- **사전 준비:** Mikrotik 스위치에서 2개의 포트를 LACP(802.3ad) 그룹으로 설정해야 합니다.
- **절차 (Proxmox 셸):**
    1.  `/etc/network/interfaces` 파일을 수정하여 본딩 인터페이스를 설정합니다. (서버의 물리적 포트명이 `eno1`, `eno2`라고 가정)
    ```bash
    # nano /etc/network/interfaces

    auto eno1
    iface eno1 inet manual

    auto eno2
    iface eno2 inet manual

    auto bond0
    iface bond0 inet manual
        bond-slaves eno1 eno2
        bond-miimon 100
        bond-mode 802.3ad
        bond-xmit-hash-policy layer2+3

    auto vmbr0
    iface vmbr0 inet static
        address 211.100.20.10/24  # 서버의 공인 IP
        gateway 211.100.20.1     # 게이트웨이 주소
        bridge-ports bond0
        bridge-stp off
        bridge-fd 0
    ```
    2.  네트워크 서비스를 재시작하거나 서버를 재부팅하여 설정을 적용합니다.

---
## 5. 다음 단계
- `[Tech_Deep_Dive_2_Network_and_Core_Services.md](Tech_Deep_Dive_2_Network_and_Core_Services.md)` 로 이동하여 OPNsense 방화벽을 이용한 상세 네트워크 보안 아키텍처를 구축하고, 핵심 서비스를 설정합니다.
