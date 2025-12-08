# 노트북 클라우드 랩 1단계: 가상 인프라 및 제어 환경 구축

**문서 최종 수정일:** 2025년 11월 29일

## 1. 개요

본격적인 개발에 앞서, 실제 클라우드 환경과 유사한 네트워크 및 서버 인프라를 노트북 내에 가상으로 구축합니다. VirtualBox를 사용하여 인터넷과 분리된 안전한 내부 개발망을 만들고, OPNsense 방화벽을 통해 모든 트래픽을 제어하며, Ansible을 설치하여 이후의 모든 인프라 구성을 코드로 자동화할 준비를 마칩니다.

## 2. 필수 소프트웨어 설치 및 다운로드

1.  **VirtualBox 설치:**
    -   [VirtualBox 공식 다운로드 페이지](https://www.virtualbox.org/wiki/Downloads)
    -   자신의 운영체제(Windows, macOS, Linux)에 맞는 플랫폼 패키지를 다운로드하여 설치합니다.

2.  **OS 이미지 다운로드:**
    -   **OPNsense:**
        -   [OPNsense 다운로드 페이지](https://opnsense.org/download/)
        -   `Type`: `vga`, `Image`: `iso`, `Mirror`: 가까운 지역 선택 후 다운로드. (예: `OPNsense-24.1-vga-amd64.iso.bz2`)
        -   다운로드 후 `bzip2` 압축을 해제하여 `.iso` 파일을 준비합니다.
    -   **Ubuntu Server:**
        -   [Ubuntu Server 22.04.4 LTS 다운로드 페이지](https://ubuntu.com/download/server)
        -   'Option 2 - Manual server installation'의 'Download Ubuntu Server' 버튼을 눌러 `.iso` 파일을 다운로드합니다.

## 3. 가상 네트워크 환경 구성 (VirtualBox)

### 3.1. 호스트 전용 네트워크 생성
VM들이 서로 통신하고, 우리 노트북(호스트)과도 통신할 수 있는 내부 전용 네트워크를 생성합니다.

1.  VirtualBox 실행 후, 상단 메뉴에서 `파일` > `호스트 네트워크 관리자` 클릭.
2.  `만들기` 버튼 클릭.
3.  새로 생성된 어댑터(보통 `vboxnet0`)를 선택하고 아래와 같이 설정합니다.
    - **어댑터 탭:**
        - `IPv4 주소`: `192.168.56.1`
        - `IPv4 서브넷 마스크`: `255.255.255.0`
    - **DHCP 서버 탭:**
        - `서버 사용` 체크 **해제**. (DHCP 서버 역할은 OPNsense가 담당할 것이므로 충돌을 방지해야 합니다.)
4.  `적용` 후 창을 닫습니다.

## 4. OPNsense 방화벽 VM 생성 및 설정

### 4.1. VM 생성
1.  VirtualBox에서 `새로 만들기` 클릭.
2.  **이름 및 운영 체제:**
    - `이름`: `Firewall-OPNsense`
    - `종류`: `BSD`, `버전`: `FreeBSD (64-bit)`
3.  **메모리 크기:** `2048` MB (2GB)
4.  **하드 디스크:** `지금 새 가상 하드 디스크 만들기` 선택 후 `만들기`.
    - `파일 종류`: `VDI`, `동적 할당`, `크기`: `20` GB
5.  생성된 `Firewall-OPNsense` VM 선택 후 `설정` 클릭.
6.  **스토리지:** `저장 장치` -> `컨트롤러: IDE` 아래의 `비어 있음` 선택 -> 오른쪽 디스크 아이콘 클릭 -> `디스크 파일 선택` -> 다운로드한 OPNsense `.iso` 파일 선택.
7.  **네트워크:**
    - **어댑터 1:** `다음에 연결됨`: `NAT`. (인터넷 연결용 WAN)
    - **어댑터 2:** `사용하기` 체크 -> `다음에 연결됨`: `호스트 전용 어댑터` -> `이름`: `vboxnet0`. (내부망 연결용 LAN)
8.  `확인`을 눌러 저장.

### 4.2. OPNsense 설치 및 초기 설정
1.  `Firewall-OPNsense` VM을 시작합니다.
2.  콘솔 화면이 나타나면, 로그인 프롬프트에서 사용자 `installer`, 암호 `opnsense`를 입력하여 설치를 시작합니다. 기본 설정으로 끝까지 설치를 완료합니다.
3.  설치가 끝나면 `Reboot`을 선택하고, **재부팅 전에 VM 설정에서 OPNsense ISO 파일을 제거**해야 합니다.
4.  재부팅 후 로그인 프롬프트에서 `root`로 로그인 (초기 암호 `opnsense`).
5.  **인터페이스 할당:**
    - `1) Assign interfaces` 선택.
    - `vtnet0`가 WAN, `vtnet1`가 LAN이 되도록 설정합니다.
6.  **LAN IP 주소 설정:**
    - `2) Set interface(s) IP address` 선택.
    - `LAN` 인터페이스 선택 후, IP 주소를 `192.168.56.2` 로, 서브넷을 `24` 로 설정합니다.
7.  **LAN DHCP 서버 활성화:**
    - 노트북의 웹 브라우저에서 `http://192.168.56.2` 로 접속 (초기 ID `root`, 암호 `opnsense`).
    - `Services` > `DHCPv4` > `[LAN]` 메뉴로 이동.
    - `Enable DHCP server on LAN interface` 체크.
    - `Range`: 시작 `192.168.56.100`, 끝 `192.168.56.200` 입력 후 `Save`.

## 5. Ansible 제어 환경 구축 (노트북)

### 5.1. Ansible 설치
- **macOS (Homebrew):**
  ```bash
  brew install ansible
  ```
- **Windows (WSL2 - Ubuntu):**
  ```bash
  sudo apt update
  sudo apt install ansible -y
  ```

### 5.2. 프로젝트 폴더 및 Ansible 설정 파일 생성
1.  터미널에서 아래 명령어를 실행하여 프로젝트 폴더를 생성하고 이동합니다.
    ```bash
    mkdir ~/iksan-cloud-lab
    cd ~/iksan-cloud-lab
    ```
2.  `ansible.cfg` 파일을 생성하여 기본 설정을 정의합니다.
    ```ini
    # ~/iksan-cloud-lab/ansible.cfg
    [defaults]
    inventory = inventory.ini
    host_key_checking = False
    private_key_file = ~/.ssh/id_rsa
    remote_user = iks-admin
    ```
3.  `inventory.ini` 파일을 비어있는 상태로 생성합니다. 이 파일에는 나중에 생성할 서버들의 IP 주소를 기록하게 됩니다.
    ```bash
    touch inventory.ini
    ```

## 6. 서비스 VM 템플릿 생성

향후 웹 서버와 백엔드 서버로 사용할 기본 VM 2대를 생성합니다.

1.  VirtualBox에서 `새로 만들기` 클릭.
2.  **이름 및 운영 체제:**
    - `이름`: `web-server-01`
    - `ISO 이미지`: 다운로드한 Ubuntu Server 22.04.4 `.iso` 파일 선택.
3.  **무인 설치:** '무인 설치 건너뛰기'를 체크하거나, 사용자 이름(`iks-admin`)과 암호, 호스트 이름을 지정합니다. **OpenSSH 서버 설치 옵션은 반드시 활성화**합니다.
4.  **하드웨어:**
    - `기본 메모리`: `2048` MB
    - `프로세서`: `1` CPU
5.  **하드 디스크:** `25` GB
6.  VM 생성 후 `설정` -> `네트워크` -> `어댑터 1` -> `다음에 연결됨`: `호스트 전용 어댑터` -> `이름`: `vboxnet0` 로 변경.
7.  `web-server-01` VM을 시작하여 설치를 완료합니다. 설치 후 `ip a` 명령어로 OPNsense DHCP 서버로부터 `192.168.56.x` IP를 할당받았는지 확인합니다.
8.  `backend-server-01` 이라는 이름으로 위 과정을 동일하게 반복하여 두 번째 VM을 생성합니다.

---

## 7. 다음 단계
- `[Lab_Step2_Infrastructure_as_Code.md]('./Lab_Step2_Infrastructure_as_Code.md')`
  - 이 단계에서 생성한 VM들의 IP를 Ansible `inventory.ini` 파일에 등록하고, Ansible Playbook을 작성하여 서버 구성을 코드로 자동화하는 작업을 진행합니다.
