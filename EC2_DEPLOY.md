# EC2 배포 및 공존 가이드라인 (HQMX 통합 서버)

이 문서는 하나의 EC2 서버(`23.21.183.81`)에서 **HQMX VPN(메인 프로젝트)**과 **기존 레거시 프로젝트들(Webtools, Converter, Downloader 등)**이 충돌 없이 안정적으로 공존하기 위한 **절대적인 규칙과 배포 절차**를 정의합니다.

---

## 1. 📂 디렉토리 격리 (Directory Isolation)

가장 중요한 것은 **가상 벽(Virtual Wall)**을 세우는 것입니다. 두 생태계는 서로 다른 루트 디렉토리를 사용해야 합니다.

| 생태계 | 루트 경로 (Root Path) | 프로젝트 포함 | 비고 |
|:---:|:---|:---|:---|
| **🆕 HQMX VPN** | `/home/ubuntu/hrz/` | VPN Frontend, VPN Backend, Tauri Updater | 현재 메인 프로젝트 공간 |
| **🏛️ Legacy Tools** | `/home/ubuntu/hqmx/` | Webtools, Converter, Downloader, Generator, Calculator | 기존 서비스 공간 |

### ⚠️ 절대 금지 사항
1. **교차 수정 금지:** VPN 배포 스크립트가 `/home/ubuntu/hqmx/` 건드리지 않기. 반대도 마찬가지.
2. **상위 폴더 삭제 금지:** `rm -rf /home/ubuntu/` 같은 명령은 절대 금지.

---

## 2. 🔌 포트 할당 정책 (Port Allocation)

포트 충돌은 서비스 중단의 주원인입니다. 새로운 서비스를 띄울 때는 반드시 이 표를 확인하고 빈 포트를 점유하십시오.

| Port | 서비스명 | 프로젝트 | 상태 | 비고 |
|:---:|:---|:---|:---:|:---|
| **80 / 443** | Nginx | **Shared** | 🟢 | 모든 요청의 진입점 (Reverse Proxy) |
| **3001** | Converter API | Legacy | 🔴 | **사용 금지** |
| **3002** | Hannah Design API | Legacy | 🔴 | **사용 금지** |
| **3003** | **VPN Backend API** | **VPN** | 🟢 | VPN 전용 할당 |
| **5000** | Downloader API | Legacy | 🔴 | **사용 금지** |
| **5001** | (예비) | - | ⚪ | 사용 가능 |
| **5002~** | (예비) | - | ⚪ | 사용 가능 |

### 🛠 새 서비스 배포 시 절차
1. `netstat -tuln | grep <포트번호>` 명령어로 서버에서 빈 포트인지 확인.
2. 위 표에 등록 후 사용.
3. PM2 구동 시 포트 환경변수 명시.

---

## 3. 🌐 Nginx 라우팅 전략 (Traffic Control)

하나의 도메인(`hqmx.net`)을 공유하므로, Nginx 설정에서 경로(Path) 기반으로 트래픽을 엄격히 분리합니다.

### `/etc/nginx/sites-available/hqmx.net` 구조

```nginx
server {
    server_name hqmx.net;

    # =========================================
    # 🆕 1. 메인 (Main): HQMX VPN
    # =========================================
    location / {
        # VPN 프론트엔드 경로로 연결
        root /home/ubuntu/hrz/services/main/current;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    location /api/vpn/ {
        # VPN 백엔드 (Port 3003)
        proxy_pass http://localhost:3003/;
    }

    # =========================================
    # 🏛️ 2. 레거시 (Legacy): Webtools & Others
    # =========================================
    
    # Webtools 메인
    location /webtools.html {
        alias /home/ubuntu/hqmx/services/webtools/current/index.html;
    }

    # Converter 서비스
    location /converter/ {
        alias /home/ubuntu/hqmx/services/converter/current/;
        index index.html;
    }

    # Downloader 서비스
    location /downloader/ {
        alias /home/ubuntu/hqmx/services/downloader/current/;
        index index.html;
    }
    
    # ... 기타 서비스들 ...
}
```

---

## 4. 🤖 프로세스 관리 (PM2 Naming Rule)

PM2에서 프로세스 목록을 봤을 때 어떤 프로젝트인지 즉시 식별 가능해야 합니다.

### Naming Convention: `[프로젝트]-[서비스]`

| PM2 이름 | 프로젝트 | 포트 |
|:---|:---|:---:|
| `vpn-backend` | HQMX VPN | 3003 |
| `converter-api` | Legacy | 3001 |
| `downloader-worker` | Legacy | 5000 |

### 명령어 예시
```bash
# Good
pm2 start server.js --name "vpn-backend" --port 3003

# Bad (식별 불가)
pm2 start server.js 
```

---

## 5. 🚀 안전한 배포 스크립트 (Safe Deployment)

배포 스크립트 작성 시 `rsync`의 타겟 경로를 명확히 지정하여 "옆집"을 부수지 않도록 합니다.

### VPN 프론트엔드 배포 예시 (Safe)
```bash
# ✅ 안전함: hrz 폴더 내로만 전송
rsync -avz --delete ./vpn/frontend/ ubuntu@server:/home/ubuntu/hrz/services/main/current/
```

### 💣 위험한 배포 예시 (Do NOT Use)
```bash
# ❌ 위험: 실수로 hqmx 폴더까지 건드릴 수 있음
rsync -avz ./ ubuntu@server:/home/ubuntu/
```

---

## 6. 📝 체크리스트 (Before Deployment)

배포 전 다음 항목을 반드시 확인하세요.

- [ ] **Target Directory 확인**: 내가 배포하려는 경로가 `/home/ubuntu/hrz/`가 맞는가?
- [ ] **Port 충돌 확인**: 새로 사용할 포트가 Legacy 프로젝트 포트(3001, 3002, 5000)와 겹치지 않는가?
- [ ] **Nginx Config 확인**: `nginx -t` 테스트를 통과했는가?
- [ ] **백업**: 만약 Legacy 설정을 건드려야 한다면, 기존 설정 파일을 백업했는가?
