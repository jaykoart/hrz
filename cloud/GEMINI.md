# GEMINI 프로젝트: 익산 클라우드 사업 계획 총괄

## 1. 프로젝트 개요

**목표:** 한국 전북 익산시에 5,000만 원의 초기 자본으로 클라우드 호스팅 사업을 시작하여, 단계적으로 국내 시장에 안착하고(Phase 1, 2), 최종적으로 두바이 법인 설립을 통해 글로벌 시장으로 확장 및 세금 구조를 최적화(Phase 3)하는 것을 목표로 합니다.

본 문서는 프로젝트의 모든 계획 및 기술 문서를 종합하고, 각 문서로 연결되는 중앙 허브 역할을 합니다.

---

## 2. 전체 문서 구조

```
/ (root)
├── GEMINI.md (현재 문서)
├── Procurement_List_and_Links.md
│
├── Phase1_Initial_Setup.md (개요)
├── 1.1_Business_Registration_and_Funding.md
├── 1.2_Office_and_Physical_Infrastructure.md
├── 1.3_Initial_Server_Hardware_Setup.md
├── 1.4_Hybrid_Cloud_Integration.md
├── 1.5_MVP_Service_Launch.md
│
├── Tech_Deep_Dive_1_Hardware_and_Virtualization.md
├── Tech_Deep_Dive_2_Network_and_Core_Services.md
├── Tech_Deep_Dive_3_Backup_HA_and_Monitoring.md
│
├── Phase2_Service_Expansion.md
└── Phase3_Global_Optimization.md
```

---

## 3. Phase 1: 초기 인프라 구축 (상세 계획)

초기 5,000만 원 예산 내에서 MVP(최소 기능 제품)를 출시하기 위한 법률, 행정, 물리적/기술적 인프라 구축의 모든 과정을 구체적으로 기술합니다.

- **`[Phase1_Initial_Setup.md]('./Phase1_Initial_Setup.md')`**: Phase 1 전체 계획에 대한 요약본.

#### 3.1. 법률, 행정 및 자금 계획
- **`[1.1_Business_Registration_and_Funding.md]('./1.1_Business_Registration_and_Funding.md')`**
  - 개인사업자 등록 절차, 익산시 창업 지원금 신청 방법, 5,000만 원 예산의 상세 집행 계획을 다룹니다.

#### 3.2. 물리적 인프라
- **`[1.2_Office_and_Physical_Infrastructure.md]('./1.2_Office_and_Physical_Infrastructure.md')`**
  - 익산시 내 창업보육센터 입주, 인터넷 회선(KT 기업 오피스넷) 신청, 서버 랙, UPS, 냉방 및 보안 설비 구축 방법을 기술합니다.

#### 3.3. 서비스 인프라 구축
- **`[1.3_Initial_Server_Hardware_Setup.md]('./1.3_Initial_Server_Hardware_Setup.md')`**
  - Dell PowerEdge R730xd 서버의 물리적 설치, 스토리지(SSD, HDD) 장착, RAID 구성 및 가상화 OS(Proxmox VE) 설치 과정을 안내합니다.
- **`[1.4_Hybrid_Cloud_Integration.md]('./1.4_Hybrid_Cloud_Integration.md')`**
  - 구축한 Proxmox 서버와 AWS를 연동하여 하이브리드 클라우드 환경을 구축합니다. (IAM, S3, Site-to-Site VPN)
- **`[1.5_MVP_Service_Launch.md]('./1.5_MVP_Service_Launch.md')`**
  - cPanel을 이용한 웹 호스팅, Proxmox 템플릿을 이용한 VPS 호스팅 상품을 만들고, 백업 정책 수립 및 서비스 웹사이트를 준비하여 실제 출시 준비를 마칩니다.

---

## 4. 기술 심층 분석 (Technical Deep Dive)

Phase 1 계획을 엔지니어 관점에서 극도로 상세하게 기술한 전문가용 가이드입니다.

#### 4.1. 하드웨어 및 가상화
- **`[Tech_Deep_Dive_1_Hardware_and_Virtualization.md]('./Tech_Deep_Dive_1_Hardware_and_Virtualization.md')`**
  - Dell R730xd 서버 선정 이유, RAID 컨트롤러 HBA 모드 전환, ZFS를 이용한 스토리지 아키텍처, 커널 튜닝(IOMMU), 네트워크 본딩(LACP) 등 하드웨어 및 가상화 플랫폼 최적화 방법을 다룹니다.

#### 4.2. 네트워크 및 핵심 서비스
- **`[Tech_Deep_Dive_2_Network_and_Core_Services.md]('./Tech_Deep_Dive_2_Network_and_Core_Services.md')`**
  - OPNsense 방화벽 기반의 VLAN 네트워크 분리, HAProxy를 이용한 리버스 프록시 및 SSL 오프로딩, WHMCS와 Proxmox API 연동을 통한 서비스 프로비저닝 자동화 방법을 기술합니다.

#### 4.3. 안정성 및 신뢰성
- **`[Tech_Deep_Dive_3_Backup_HA_and_Monitoring.md]('./Tech_Deep_Dive_3_Backup_HA_and_Monitoring.md')`**
  - Proxmox Backup Server의 고급 기능(동기화, 검증, 암호화), 2노드 클러스터의 고가용성(HA) 구성, Zabbix를 이용한 통합 모니터링 시스템 구축 방법을 안내합니다.

---

## 5. 부록: 구매 목록

- **`[Procurement_List_and_Links.md]('./Procurement_List_and_Links.md')`**
  - 프로젝트 구축에 필요한 주요 하드웨어 및 소프트웨어에 대한 2025년 11월 기준 현실적인 최저가 구매처와 링크를 정리한 목록입니다.

---

## 6. 중장기 계획 (Phase 2 & 3)

초기 시장 안착 이후, 사업의 지속적인 성장과 글로벌 확장을 위한 중장기 로드맵입니다.

#### 6.1. Phase 2: 서비스 확장 및 법인화
- **`[Phase2_Service_Expansion.md]('./Phase2_Service_Expansion.md')`**
  - PaaS/SaaS 등 서비스 고도화, 마케팅 강화, 개인사업자에서 주식회사로의 법인 전환, 전문 인력 충원 계획을 다룹니다.

#### 6.2. Phase 3: 글로벌 최적화 및 확장
- **`[Phase3_Global_Optimization.md]('./Phase3_Global_Optimization.md')`**
  - 두바이 자유무역지대(Free Zone) 법인 설립을 통한 세금 구조 최적화, 글로벌 PoP 확장, 이전가격 관리, 장기적인 투자 유치 및 IPO 준비 계획을 기술합니다.