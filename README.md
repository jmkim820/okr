# AxisOKR

Axissoft 사내 OKR(Objective and Key Results) 관리 웹 솔루션.

## 프로젝트 구조

```
ORK/
├── frontend/   # React + Vite (Apache로 정적 배포)
└── backend/    # NestJS (Docker 컨테이너 배포)
```

## 주요 기능

- **Google OAuth 로그인** — 회사 도메인 계정만 허용, 미등록 시 자동 등록
- **OKR 설정** — Objective + Key Results 입력, 현수준 레벨(0~10), 분기 자동 계산
- **주간 우선순위** — P1 3개 + P2 1개, KR 연결, 주간 선택 드롭다운, 줄바꿈 지원
- **발표 모드** — 팀원별 슬라이드 발표, 키보드 조작, 주차 미리보기 패널, 지난주 토글
- **분기 히스토리** — 종료된 분기 OKR/우선순위 보관 및 열람
- **간트 차트** — 노션 스타일 월간 캘린더, OKR 기간 + 주간 P 바
- **휴가 관리** — 휴가 신청/수정/승인/반려, 연차 할당, 엑셀 내보내기
- **휴가 로그** — 모든 휴가 이벤트 자동 기록, 노션 스타일 필터 (상태/날짜/이름)
- **알림톡** — NHN Cloud 연동, 휴가 신청/수정 시 관리자에게 카카오 알림톡 발송 (백엔드 경유)
- **대시보드** — (superadmin) 전체 현황, 팀별 수치, 미등록자/저레벨 알림
- **팀 관리** — 팀 CRUD, 색상 지정, 멤버 관리, 사이드바 팀 토글
- **반응형** — 모바일/태블릿 대응

## 권한

| 역할 | 대시보드 | OKR 수정 | 팀 관리 |
|------|---------|---------|--------|
| superadmin | O | 전체 | O |
| admin | X | 같은 팀 | X |
| user | X | 본인만 | X |

## 기술 스택

- **Frontend**: React 18 · TypeScript · Vite 8 · Tailwind CSS 4 · Zustand · Firebase (Auth + Firestore)
- **Backend**: NestJS 10 · Node.js 20 · Docker

## 시작하기

### Frontend
```bash
cd frontend
npm install
cp .env.example .env   # Firebase + API_BASE 설정
npm run dev            # http://localhost:5173
```

### Backend
```bash
cd backend
npm install
cp .env.example .env   # NHN Cloud + CORS 설정
npm run start:dev      # http://localhost:3000
```

## 환경변수

### `frontend/.env`
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_API_BASE=http://localhost:3000
```

### `backend/.env`
```
PORT=3000
CORS_ORIGINS=http://localhost:5173,https://your-prod-domain.com
NHN_APPKEY=
NHN_SECRET_KEY=
NHN_SENDER_KEY=
NHN_TEMPLATE_CODE=
```

## 빌드 & 배포

### Frontend (Apache 정적 배포)
- GitHub Actions 워크플로우: `.github/workflows/deploy-frontend.yml`
- `main` 브랜치 push 시 자동으로 `frontend/`를 빌드해서 `/var/www/html/`로 rsync

수동 빌드:
```bash
cd frontend && npm run build
```

### Backend (Docker)
- GitHub Actions 워크플로우: `.github/workflows/deploy-backend.yml`
- `main` 브랜치 push 시 자동으로 Docker 이미지 빌드 후 컨테이너 재시작

수동 빌드/실행:
```bash
cd backend
docker build -t ork-backend:latest .
docker run -d --name ork-backend -p 3000:3000 --env-file .env ork-backend:latest
```

## GitHub Secrets 설정 필요

### Frontend
- `VITE_FIREBASE_*` (6개)
- `VITE_API_BASE` (백엔드 공인 URL)

### Backend
- `CORS_ORIGINS`
- `NHN_APPKEY`, `NHN_SECRET_KEY`, `NHN_SENDER_KEY`, `NHN_TEMPLATE_CODE`

## 라이선스

Private — Axissoft 내부 사용
