# HRZ 프로젝트 가이드 (HQMX VPN - 메인 서비스)

## 🔗 Repository
**GIT**: https://github.com/jaykoart/hrz.git

---
## 작업행동강령
**사용자의 요청으로 버그수정,디자인수정 후, 적용이 올바르게 되지 않는 경우. 안먹히는 코드는 즉시 삭제하여, 쓰레기 코드들이 쌓이지 않도록 미연에 방지한다.**

---

## 🎨 프론트엔드 작업 지침

### ⚠️ 기준 파일: `index.html`
> **모든 UI 변경은 `index.html`을 기준으로 작업한다.**

| 항목 | 기준 |
|------|------|
| **헤더/네비게이션** | `index.html`의 `<header>` 구조를 따름 |
| **푸터** | `index.html`의 `<footer>` 구조를 따름 |
| **스타일** | 인라인 스타일 최소화, `style.css` 사용 |
| **로그인 버튼** | 모든 페이지에 동일하게 적용 |

### 📋 페이지별 동기화 필수 항목
새로운 UI 요소(로그인 버튼 등)를 추가할 때, **모든 페이지**에 적용해야 함:
- `index.html` ← **기준**
- `vpn.html`
- `plant-ai.html`
- `download.html`
- `cloud.html`
- `terms.html`
- `privacy.html`

### 🚫 금지 사항
- 특정 페이지에만 UI 요소 추가하고 다른 페이지는 누락하는 것
- `index.html`과 다른 스타일/구조로 헤더/푸터 작성

---

## 🖥️ 서버 정보 (HQMX EC2 공유)

| 항목 | 값 |
|------|-----|
| **Elastic IP** | `23.21.183.81` |
| **SSH 접속** | `ssh -i hqmx-ec2.pem ubuntu@23.21.183.81` |
| **PEM 키** | `/Users/wonjunjang/hrz/hqmx-ec2.pem` |
| **도메인** | `hqmx.net` |

---

## 📁 경로 구조

### 로컬 (개발)
```
/Users/wonjunjang/hrz/
├── vpn/
│   ├── frontend/           # VPN 랜딩 페이지 (메인)
│   ├── app/hqmx-vpn/       # Tauri 데스크톱 앱
│   ├── releases/v1/        # Updater JSON
│   └── nginx/              # Nginx 설정 파일
├── GEMINI.md
└── hqmx-ec2.pem
```

### 서버 (EC2)
```
/home/ubuntu/
├── hrz/
│   ├── services/main/current/   # hqmx.net/ (VPN 메인)
│   └── releases/                # Tauri Updater 배포
└── hqmx/services/
    ├── webtools/current/            # 기존 Tools → hqmx.net/webtools.html
    ├── converter/current/       # hqmx.net/converter/
    ├── downloader/current/      # hqmx.net/downloader/
    ├── generator/current/       # hqmx.net/generator/
    └── calculator/current/      # hqmx.net/calculator/
```

---

## 🌐 URL 구조

| 서비스 | URL | 설명 |
|--------|-----|------|
| **VPN 메인** | `https://hqmx.net/` | 🆕 VPN 랜딩 페이지 |
| **기존 Tools** | `https://hqmx.net/webtools.html` | 기존 메인 페이지 |
| **Tauri Updater** | `https://hqmx.net/releases/v1/latest.json` | 앱 업데이트 엔드포인트 |
| Converter | `https://hqmx.net/converter/` | 파일 변환 |
| Downloader | `https://hqmx.net/downloader/` | 다운로더 |
| Generator | `https://hqmx.net/generator/` | 생성기 |
| Calculator | `https://hqmx.net/calculator/` | 계산기 |

---

## 🔌 포트 사용

| 포트 | 용도 | 상태 |
|------|------|------|
| **3003** | VPN Backend API | 사용 중 |
| **3002** | hannah-design | 사용 중 |
| **5001** | 기타 서비스 | 사용 가능 |

> ⚠️ **사용 금지 포트**: 3001 (Converter), 5000 (Downloader)

---

## 🚀 배포

### VPN 메인 페이지 배포
```bash
# VPN 프론트엔드 배포 (메인 사이트)
rsync -avz -e "ssh -i /Users/wonjunjang/hrz/hqmx-ec2.pem" --delete \
  ./vpn/frontend/ ubuntu@23.21.183.81:/home/ubuntu/hrz/services/main/current/

# Nginx 리로드
ssh -i /Users/wonjunjang/hrz/hqmx-ec2.pem ubuntu@23.21.183.81 \
  "sudo nginx -t && sudo systemctl reload nginx"
```

### Nginx 설정 배포
```bash
# Nginx 설정 업로드 및 적용
rsync -avz -e "ssh -i /Users/wonjunjang/hrz/hqmx-ec2.pem" \
  ./vpn/nginx/hqmx.net.conf ubuntu@23.21.183.81:/tmp/

ssh -i /Users/wonjunjang/hrz/hqmx-ec2.pem ubuntu@23.21.183.81 \
  "sudo cp /tmp/hqmx.net.conf /etc/nginx/sites-available/hqmx.net && \
   sudo nginx -t && sudo systemctl reload nginx"
```

---

## 🖥️ Tauri 데스크톱 앱

### 설정
- **앱 ID**: `io.hqmx.vpn`
- **Deep Link**: `hqmx-vpn://`
- **Updater Endpoint**: `https://hqmx.net/releases/v1/latest.json`

### 빌드 및 배포
```bash
cd vpn/app/hqmx-vpn
npm run tauri build

# 빌드 완료 후:
# 1. .sig 파일 내용을 releases/v1/latest.json의 signature에 입력
# 2. 빌드된 파일을 서버에 업로드
```

---

## 📝 개발 현황

### ✅ 완료
- [x] VPN 프론트엔드 메인 페이지 (`hqmx.net/`)
- [x] Nginx 설정 (VPN 메인, 기존 서비스 분리)
- [x] Tauri Updater 플러그인 구성
- [x] Deep Link 설정 (`hqmx-vpn://`)
- [x] 업데이트 엔드포인트 (`/releases/v1/latest.json`)

### 🔄 진행 중
- [ ] Tauri 앱 첫 릴리즈 빌드
- [ ] VPN 백엔드 API (포트 3002)
- [ ] 사용자 인증 시스템

---

## 📅 변경 이력

### 2025-12-10
- **VPN을 메인 서비스로 승격**: `hqmx.net/` 루트가 VPN 랜딩 페이지로 변경
- **기존 Tools 페이지 이전**: `hqmx.net/webtools.html`로 접근 가능
- **Tauri Updater 설정 완료**: `/releases/v1/latest.json` 엔드포인트 추가
- **Nginx 설정 정리**: VPN 메인, 기존 서비스 분리
