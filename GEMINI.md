# HRZ 프로젝트 가이드 (Horizon VPN)

## 🔗 Repository
**GIT**: https://github.com/jaykoart/hrz.git

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
│   └── frontend/       # VPN 관리 페이지
└── GEMINI.md
```

### 서버 (EC2)
```
/home/ubuntu/hrz/services/
└── vpn/current/        # hqmx.net/vpn/
```

---

## 🌐 URL 구조

| 서비스 | URL |
|--------|-----|
| VPN 관리 | `https://hqmx.net/vpn/main.html` |
| 메인 | `https://hqmx.net/` |

---

## 🔌 포트 사용 (사용 가능)

| 포트 | 용도 | 상태 |
|------|------|------|
| **3002** | VPN Backend API | 사용 가능 |
| **5001** | 기타 서비스 | 사용 가능 |

> ⚠️ **사용 금지 포트**: 3001 (Converter), 5000 (Downloader)

---

## 🚀 배포

```bash
# 1. SSH 접속
ssh -i /Users/wonjunjang/hrz/hqmx-ec2.pem ubuntu@23.21.183.81

# 2. VPN 프론트엔드 배포
rsync -avz -e "ssh -i /Users/wonjunjang/hrz/hqmx-ec2.pem" --delete ./vpn/frontend/ ubuntu@23.21.183.81:/home/ubuntu/hrz/services/vpn/current/

# 3. Nginx 설정 후 리로드
sudo nginx -t && sudo systemctl reload nginx
```

---

## 📝 개발 현황

- [ ] VPN 관리 페이지 (`/vpn/main.html`)
- [ ] Nginx 경로 설정 (`/etc/nginx/sites-available/hqmx.net.conf`)
- [ ] 백엔드 API (포트 3002)
