# 🚨 HQMX 프로젝트 서버 및 경로 참조 문서

> **⚠️ 중요**: 이 문서는 새로운 프로젝트 시작 시 기존 HQMX 인프라와의 **충돌 방지**를 위한 필수 참조 문서입니다.

**최종 업데이트**: 2025-12-08

---

## 🔴 기존 HQMX 서버 정보 (절대 충돌 금지)

### EC2 인스턴스 (프로덕션)

| 항목 | 값 | 비고 |
|------|-----|------|
| **Elastic IP** | `23.21.183.81` | ⚠️ 이 IP는 HQMX 전용 |
| **인스턴스 타입** | `t3.medium` | 2 vCPU, 4GB RAM |
| **SSH 접속** | `ssh -i hqmx-ec2.pem ubuntu@23.21.183.81` | |
| **PEM 키 파일** | `/Users/wonjunjang/hqmx/hqmx-ec2.pem` | HQMX 루트 전용 |
| **도메인** | `hqmx.net` | |

---

## 📁 HQMX 서버 디렉토리 구조 (EC2 내부)

```
/home/ubuntu/hqmx/
├── services/
│   ├── main/current/           # hqmx.net 메인 페이지
│   ├── converter/current/      # hqmx.net/converter/
│   ├── downloader/current/     # hqmx.net/downloader/
│   ├── generator/current/      # hqmx.net/generator/
│   └── calculator/current/     # hqmx.net/calculator/
├── backend/                    # Express API (PM2: hqmx-backend)
└── downloader-backend/         # Flask API (systemd: hqmx-downloader)
```

---

## 🔌 HQMX 포트 사용 현황

| 포트 | 서비스 | 프로세스 |
|------|--------|----------|
| 80 | Nginx HTTP | systemd: nginx |
| 443 | Nginx HTTPS | systemd: nginx |
| **3001** | Converter API | PM2: hqmx-backend |
| **5000** | Downloader API | systemd: hqmx-downloader |

> **새 프로젝트**: 위 포트는 사용하지 마세요. `3002`, `5001`, `8080` 등 사용 권장.

---

## 📂 로컬 프로젝트 경로 (HQMX)

```
/Users/wonjunjang/hqmx/           # HQMX 프로젝트 루트
├── calculator/                   # Calculator 서비스
├── converter/                    # Converter 서비스
├── downloader/                   # Downloader 서비스
├── generator/                    # Generator 서비스
├── main/                         # 메인 페이지
├── soluna/                       # Soluna (Cloudflare Pages)
├── saesal/                       # Saesal 프로젝트
├── hannah-design/                # Hannah Design
├── hqmx-ec2.pem                  # ⚠️ HQMX EC2 전용 키
├── deploy.sh                     # HQMX 배포 스크립트
├── GEMINI.md                     # HQMX 아키텍처 문서
└── server.md                     # 이 문서
```

---

## ⚠️ 새 프로젝트 시작 시 체크리스트

### 1. 서버 관련

- [ ] **새 EC2 인스턴스 사용** 또는 다른 호스팅 (HQMX EC2 공유 금지)
- [ ] **새 PEM 키 생성** (hqmx-ec2.pem 사용 금지)
- [ ] **새 도메인** 또는 서브도메인 사용 (hqmx.net 사용 금지)
- [ ] **포트 충돌 확인**: 3001, 5000 사용 금지

### 2. 배포 스크립트 관련

- [ ] **deploy.sh 복사 금지**: HQMX 전용 배포 스크립트 사용하지 않음
- [ ] **새 배포 스크립트 작성**: 프로젝트별 독립 배포 체계 구축
- [ ] **환경 변수 분리**: `.env` 파일 독립 관리

### 3. Git 관련

- [ ] **새 Git 저장소** 생성 (HQMX 하위 폴더에서 작업 시 주의)
- [ ] **HQMX와 Nested Repository 금지**: 부모-자식 충돌 방지
- [ ] **커밋 시 항상 `-m` 플래그** 사용

---

## 🛡️ 충돌 방지 권장 사항

### 1. 폴더 구조 분리

```
# ✅ 권장: 완전히 분리된 경로
/Users/wonjunjang/new-project/      # 새 프로젝트

# ❌ 비권장: HQMX 폴더 내부
/Users/wonjunjang/hqmx/new-project/ # HQMX와 충돌 가능
```

### 2. 배포 대상 분리

```bash
# ✅ 새 프로젝트용 배포
ssh -i new-project-key.pem ubuntu@NEW_EC2_IP

# ❌ HQMX EC2 사용 금지
ssh -i hqmx-ec2.pem ubuntu@23.21.183.81
```

### 3. Nginx 설정 분리

- 새 프로젝트는 **별도 Nginx 설정 파일** 사용
- `/etc/nginx/sites-available/new-project.conf`
- HQMX 설정 (`hqmx.net.conf`) 수정 금지

---

## 📋 HQMX 서비스 URL 참조

| 서비스 | URL | 설명 |
|--------|-----|------|
| Main | `https://hqmx.net/` | 메인 사이트맵 |
| Converter | `https://hqmx.net/converter/` | 파일 변환 |
| Downloader | `https://hqmx.net/downloader/` | 미디어 다운로드 |
| Generator | `https://hqmx.net/generator/` | 생성기 서비스 |
| Calculator | `https://hqmx.net/calculator/` | 계산기 서비스 |
| Soluna | `https://soluna.hqmx.net/` | Cloudflare Pages |

---

## 🔧 HQMX 백엔드 서비스 관리

```bash
# ❌ 새 프로젝트에서 절대 실행 금지 (HQMX 전용)

# Converter Backend (PM2)
pm2 restart hqmx-backend
pm2 logs hqmx-backend

# Downloader Backend (systemd)
sudo systemctl restart hqmx-downloader
sudo systemctl status hqmx-downloader
journalctl -u hqmx-downloader -f
```

---

## 🆕 새 프로젝트 시작 템플릿

새 프로젝트를 HQMX와 완전히 분리하여 시작할 때의 권장 구조:

```bash
# 1. 새 프로젝트 폴더 생성 (HQMX 외부)
mkdir -p /Users/wonjunjang/new-project
cd /Users/wonjunjang/new-project

# 2. Git 초기화
git init

# 3. 새 GEMINI.md 작성 (필수)
cat > GEMINI.md << 'EOF'
# [NEW PROJECT NAME] 가이드

## 서버 정보
- IP: [NEW EC2 IP or Hosting]
- PEM: ./new-project-key.pem
- 도메인: [NEW DOMAIN]

## 포트 사용
- Backend: 3002 (HQMX 충돌 방지)

## 배포
- 배포 스크립트: ./deploy.sh
- HQMX와 무관한 독립 배포
EOF

# 4. 새 SSH 키 설정 (있는 경우)
# cp /path/to/new-key.pem ./new-project-key.pem
# chmod 400 new-project-key.pem
```

---

## ⚠️ 절대 하지 말아야 할 것들

1. **HQMX EC2 IP 사용**: `23.21.183.81` ← 절대 금지
2. **HQMX PEM 키 사용**: `hqmx-ec2.pem` ← 절대 금지
3. **HQMX 포트 사용**: `3001`, `5000` ← 절대 금지
4. **HQMX deploy.sh 실행**: 서비스 덮어쓰기 위험
5. **HQMX Nginx 설정 수정**: 전체 서비스 다운 위험
6. **hqmx.net 도메인 사용**: DNS 충돌

---

## 📞 긴급 상황 시

HQMX 서비스에 문제가 발생한 경우:

```bash
# 1. 서비스 상태 확인
ssh -i /Users/wonjunjang/hqmx/hqmx-ec2.pem ubuntu@23.21.183.81

# 2. Nginx 상태
sudo systemctl status nginx
sudo nginx -t

# 3. 백엔드 상태
pm2 status
sudo systemctl status hqmx-downloader

# 4. 로그 확인
tail -f /var/log/nginx/error.log
pm2 logs hqmx-backend
journalctl -u hqmx-downloader -f
```

---

**이 문서는 새 프로젝트 작업 전 반드시 확인하세요.**
