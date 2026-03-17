# ⬡ WebMonitor

웹사이트 URL을 입력하면 **실시간 서버 상태**, **SSL 인증서**, **응답 시간**, **글로벌 서버 위치** 등을 한눈에 확인할 수 있는 모니터링 대시보드입니다.

---

## 스크린샷

> 검색 → 지도 핀 → 메트릭 카드 → 히스토리 차트

---

## 주요 기능

| 기능 | 설명 |
|------|------|
| 🔍 URL 검색 | 도메인 입력 시 자동으로 Prometheus 모니터링 대상 추가 |
| 🗺️ 글로벌 지도 | 서버 IP 위치를 실시간 핀으로 표시, 클릭으로 전환 |
| 📋 사이트 목록 | 좌측 사이드바에 누적 목록, X 버튼으로 제거 |
| 📊 메트릭 대시보드 | 상태·HTTP 코드·응답시간·DNS·TCP·SSL·TLS 카드 |
| 📈 히스토리 차트 | 지난 1시간 응답 시간 추이 (30초 간격) |
| 🔄 자동 갱신 | 30초마다 메트릭 자동 새로고침 |

---

## 아키텍처

```
Browser (React, :5173)
    │
    ├── GET/POST /api/*  ──►  Backend (Express, :4000)
    │                              │
    │                              ├── prometheus.yml 수정
    │                              ├── Prometheus API (:9090)
    │                              └── ip-api.com (IP 지오로케이션)
    │
    └── 지도 타일  ──►  CartoDB (OpenStreetMap 기반, 무료)

Docker Compose
  ├── prometheus        :9090   메트릭 수집
  ├── grafana           :3000   Grafana 대시보드 (선택)
  ├── blackbox-exporter :9115   HTTP/SSL 프로브
  └── node-exporter     :9100   로컬 시스템 메트릭
```

---

## 기술 스택

**Frontend**
- React 18 + Vite
- react-leaflet / Leaflet.js (지도)
- Recharts (히스토리 차트)
- CartoDB Dark Matter 타일 (무료)

**Backend**
- Node.js + Express
- js-yaml (prometheus.yml 동적 수정)
- ip-api.com (무료 IP 지오로케이션, 하루 45,000회)

**Monitoring Stack**
- Prometheus (메트릭 수집)
- Blackbox Exporter (HTTP/SSL 프로브)
- Node Exporter (서버 리소스)
- Grafana (선택적 사용)

---

## 시작하기

### 요구 사항

- [Docker](https://www.docker.com/) & Docker Compose
- [Node.js](https://nodejs.org/) 18 이상

### 1. 저장소 클론

```bash
git clone https://gitlab.com/<your-username>/webmonitor.git
cd webmonitor
```

### 2. 모니터링 스택 실행 (Docker)

```bash
docker compose up -d
```

| 서비스 | 주소 |
|--------|------|
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3000 |
| Blackbox Exporter | http://localhost:9115 |

### 3. 백엔드 실행

```bash
cd backend
npm install --cache /tmp/npm-cache
node server.js
```

백엔드가 `http://localhost:4000` 에서 실행됩니다.

### 4. 프론트엔드 실행

```bash
cd frontend
npm install --cache /tmp/npm-cache
npm run dev
```

브라우저에서 `http://localhost:5173` 으로 접속합니다.

---

## 사용 방법

1. 상단 검색창에 URL 입력 (`naver.com` 또는 `https://github.com`)
2. **모니터링 추가** 클릭 또는 Enter
3. 좌측 사이드바에 사이트가 추가되고 지도에 핀이 표시됨
4. 하단 대시보드에서 실시간 메트릭 확인
5. 사이드바 **×** 버튼으로 모니터링 제거

---

## API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/targets` | 모니터링 중인 URL 목록 |
| POST | `/api/targets` | URL 추가 및 Prometheus 리로드 |
| DELETE | `/api/targets` | URL 제거 및 Prometheus 리로드 |
| GET | `/api/metrics?target=<url>` | Prometheus 메트릭 조회 |
| GET | `/api/geoip?target=<url>` | 서버 IP 위치 조회 |

---

## 환경 변수

백엔드는 별도 `.env` 없이 동작합니다. 포트 변경이 필요한 경우 `backend/server.js` 하단의 `4000`을 수정하세요.

---

## 라이선스

MIT
