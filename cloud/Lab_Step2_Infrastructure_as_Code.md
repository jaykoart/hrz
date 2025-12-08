# 노트북 클라우드 랩 2단계: 코드를 이용한 인프라 구성 자동화 (IaC)

**문서 최종 수정일:** 2025년 11월 29일

## 1. 개요

수동으로 서버에 접속하여 명령어를 일일이 입력하는 대신, Ansible을 사용하여 모든 구성 작업을 **코드로 정의하고 자동으로 실행**합니다. 이 단계에서는 1단계에서 생성한 2대의 Ubuntu VM에 각각 웹 서버와 백엔드 서버에 필요한 소프트웨어(Nginx, Node.js, Docker, PostgreSQL 등)를 설치하는 Ansible Playbook을 작성하고 실행합니다.

## 2. Ansible 인벤토리 작성 및 연결 테스트

### 2.1. 서버 IP 주소 확인
1.  VirtualBox에서 `web-server-01`과 `backend-server-01` VM을 각각 부팅합니다.
2.  각 VM의 콘솔에 `iks-admin` 계정으로 로그인한 후, `ip a` 명령어를 실행하여 OPNsense DHCP 서버로부터 할당받은 IP 주소를 확인합니다.
    - 예: `web-server-01` -> `192.168.56.101`, `backend-server-01` -> `192.168.56.102`

### 2.2. 인벤토리 파일 작성
- `~/iksan-cloud-lab` 폴더에 있는 `inventory.ini` 파일을 아래와 같이 수정하여 관리할 서버 목록을 정의합니다.

```ini
# ~/iksan-cloud-lab/inventory.ini

[web]
192.168.56.101

[backend]
192.168.56.102

[all:vars]
ansible_user=iks-admin
ansible_password=YOUR_VM_PASSWORD  # VM 생성 시 설정한 iks-admin 사용자의 암호
ansible_become_password=YOUR_VM_PASSWORD # sudo 권한 획득 시 사용할 암호
```
**보안 경고:** 위와 같이 암호를 평문으로 저장하는 것은 테스트 환경에서만 사용해야 합니다. 실제 환경에서는 SSH 키 인증 또는 Ansible Vault를 사용해야 합니다.

### 2.3. Ansible 연결 테스트
- 터미널에서 `ansible all -m ping` 명령어를 실행하여 Ansible이 모든 서버에 정상적으로 접속되는지 확인합니다. "SUCCESS" 메시지가 나타나면 연결이 성공한 것입니다.

```bash
cd ~/iksan-cloud-lab
ansible all -m ping
```
```json
// 예상 결과
192.168.56.101 | SUCCESS => {
    "ansible_facts": {
        "discovered_interpreter_python": "/usr/bin/python3"
    },
    "changed": false,
    "ping": "pong"
}
192.168.56.102 | SUCCESS => {
    "ansible_facts": {
        "discovered_interpreter_python": "/usr/bin/python3"
    },
    "changed": false,
    "ping": "pong"
}
```

## 3. Ansible Playbook 역할(Role) 구조 설계

재사용성과 관리 편의성을 위해 역할(Role) 기반으로 디렉토리 구조를 설계합니다.

```bash
cd ~/iksan-cloud-lab
mkdir -p roles/common/tasks
mkdir -p roles/web-server/tasks
mkdir -p roles/backend-server/tasks
```

## 4. Playbook Task 작성 (YAML)

각 역할의 `tasks/main.yml` 파일에 수행할 작업들을 YAML 형식으로 작성합니다.

### 4.1. `common` 역할 (모든 서버 공통 작업)
- `roles/common/tasks/main.yml` 파일을 작성합니다.
```yaml
# ~/iksan-cloud-lab/roles/common/tasks/main.yml
---
- name: Update apt cache
  become: yes
  apt:
    update_cache: yes
    cache_valid_time: 3600

- name: Install common packages
  become: yes
  apt:
    name:
      - vim
      - git
      - htop
      - ufw
    state: present

- name: Set timezone to Asia/Seoul
  become: yes
  timezone:
    name: Asia/Seoul
```

### 4.2. `web-server` 역할 (웹 서버 전용 작업)
- `roles/web-server/tasks/main.yml` 파일을 작성합니다.
```yaml
# ~/iksan-cloud-lab/roles/web-server/tasks/main.yml
---
- name: Install Nginx
  become: yes
  apt:
    name: nginx
    state: present

- name: Install Node.js and npm
  become: yes
  apt:
    name:
      - nodejs
      - npm
    state: present

- name: Install Docker
  become: yes
  apt:
    name: docker.io
    state: present

- name: Start and enable Docker service
  become: yes
  systemd:
    name: docker
    state: started
    enabled: yes

- name: Add remote user to docker group
  become: yes
  user:
    name: "{{ ansible_user }}"
    groups: docker
    append: yes
```

### 4.3. `backend-server` 역할 (백엔드 서버 전용 작업)
- `roles/backend-server/tasks/main.yml` 파일을 작성합니다.
```yaml
# ~/iksan-cloud-lab/roles/backend-server/tasks/main.yml
---
- name: Install Node.js and npm
  become: yes
  apt:
    name:
      - nodejs
      - npm
    state: present

- name: Install PostgreSQL
  become: yes
  apt:
    name: postgresql
    state: present

- name: Install Docker
  become: yes
  apt:
    name: docker.io
    state: present

- name: Start and enable Docker service
  become: yes
  systemd:
    name: docker
    state: started
    enabled: yes

- name: Add remote user to docker group
  become: yes
  user:
    name: "{{ ansible_user }}"
    groups: docker
    append: yes
```

## 5. 메인 Playbook 작성 및 실행

### 5.1. 메인 Playbook (`site.yml`) 작성
- `~/iksan-cloud-lab` 폴더에 `site.yml` 파일을 작성하여 각 서버 그룹에 어떤 역할을 적용할지 정의합니다.
```yaml
# ~/iksan-cloud-lab/site.yml
---
- hosts: all
  roles:
    - common

- hosts: web
  roles:
    - web-server

- hosts: backend
  roles:
    - backend-server
```

### 5.2. Playbook 실행
- 터미널에서 아래 명령어를 실행하여 정의된 모든 작업을 자동으로 수행합니다.
```bash
cd ~/iksan-cloud-lab
ansible-playbook site.yml
```
- Playbook이 실행되면서 각 서버에 필요한 패키지들이 설치되고 설정되는 과정이 출력됩니다. `failed=0` 이 표시되면 모든 작업이 성공적으로 완료된 것입니다.

### 5.3. 설치 확인
- 각 VM에 SSH로 접속하여 설치된 소프트웨어를 확인합니다.
```bash
# 웹 서버 VM 접속
ssh iks-admin@192.168.56.101

# Nginx, Node, Docker 버전 확인
nginx -v
node -v
docker --version

# 백엔드 서버 VM 접속
ssh iks-admin@192.168.56.102

# PostgreSQL, Docker 버전 확인
psql --version
docker --version
```

---
## 6. 다음 단계
- `[Lab_Step3_Containerized_Application.md]('./Lab_Step3_Containerized_Application.md')`
  - 이제 서버 구성이 완료되었으므로, 실제 웹 애플리케이션(프론트엔드, 백엔드)을 Docker 컨테이너로 패키징하고 Docker Compose를 통해 배포하는 작업을 진행합니다.
