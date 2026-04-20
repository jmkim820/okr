# AxisOKR - OKR 관리 웹 솔루션

## 프로젝트 개요
Axissoft 사내 OKR(Objective and Key Results) 관리 웹 솔루션.
기존 엑셀 기반 OKR 시트를 대체하여, 간결한 입력/관리 + 시계열 추적 + 간트차트 시각화를 제공한다.

## 기술 스택
- **Frontend**: React 18 + TypeScript, Vite 8, Tailwind CSS 4, Zustand
- **Backend**: NestJS 10 + TypeScript, Docker
- **UI**: Tailwind CSS 4 (Vite 플러그인 방식), 반응형 (모바일 대응)
- **상태관리**: Zustand (단일 스토어: `useStore`)
- **간트**: 자체 구현 (노션 스타일 캘린더 + OKR 기간 배경 + 주간 우선순위 바)
- **인증**: Google OAuth 2.0 (Firebase Auth) + 도메인 제한 (@axissoft.co.kr, @starplayer.net)
- **데이터**: Firebase Firestore (`.env` 미설정 시 인메모리 시드 데이터로 폴백)
- **알림톡**: NHN Cloud 카카오 알림톡 (백엔드 경유)
- **배포**: Frontend → Apache (httpd), Backend → Docker (EC2 self-hosted runner)

## 핵심 도메인 모델

### User
- role: `superadmin` | `admin` | `user`
- team (소속 팀 이름), phone (알림톡용)
- superadmin은 `SUPERADMIN_EMAILS` 목록으로 관리 (대표/이사 구분)
- 허용 도메인 Google 계정으로 로그인 시 자동 등록

### OKR
- **Objective (O)**: 목표 텍스트, 현수준(level 0~10), 분기 기간(startDate~endDate)
- **Key Result (KR)**: O에 종속, 최대 3개, 각각 level + detail
- 사용자별, 분기별 관리. 분기 종료 시 히스토리로 보관

### Weekly Priority (P)
- OKR에 입각하여 매주 월요일 기준 입력
- P1 x 3개 (최우선), P2 x 1개 (차순위)
- 각 P1은 KR에 태그 연결 가능
- week (월요일 날짜 문자열)로 시계열 추적
- textarea로 줄바꿈 지원

### Leave (휴가)
- **LeaveRequest**: 신청/수정/승인/반려/삭제, 월별 관리
- **LeaveAllocation**: 연간 발생휴가 + 특별휴가(출산/결혼 등)
- **LeaveLog**: 모든 휴가 이벤트 자동 기록 (Firestore 저장)
- 잔여 계산: 발생 + 특별 - 사용

## 권한 체계

| | 대시보드 | OKR 열람 | OKR 수정 | 간트차트 | 팀관리/멤버관리 |
|---|---|---|---|---|---|
| **superadmin** | O (기본 화면) | 전체 | 전체 | 전체 | O |
| **admin** | X | 전체 (읽기전용) | 같은 팀만 | 전체 | X |
| **user** | X | 같은 팀 (읽기전용) | 본인만 | 같은 팀 | X |

## 현재 구현된 탭/기능
- **대시보드**: (superadmin 전용) 전체 요약 카드, 팀별 현황, 미등록자/저레벨 알림, 멤버 OKR 테이블
- **OKR 설정**: O + KR 입력/편집, 현수준 레벨, 분기 자동 계산, 분기 보관
- **주간 우선순위**: P1 3개 + P2 1개 입력, 주간 선택 드롭다운, KR 연결, 주간 메모, 미등록 알림, 줄바꿈 지원
- **발표 모드**: 팀원별 슬라이드 발표 (키보드 ←→ 팀원 이동, ↑↓ 주차 이동, ESC 닫기), 주차 미리보기 패널, 지난주 토글
- **분기 히스토리**: 보관된 분기별 OKR/우선순위 기록 열람
- **간트 차트**: 노션 스타일 월간 캘린더, OKR 기간 배경색 + 시작/마감 마커, 주간 P 바
- **휴가 관리**: 휴가 신청/수정/승인/반려, 연차 자동 계산, 특별휴가, 엑셀 내보내기
- **휴가 로그**: 모든 휴가 이벤트 자동 기록, 노션 스타일 필터 (상태 다중선택/날짜 범위/이름 검색)
- **알림톡**: 휴가 신청/수정 시 팀 관리자 + 경영진에게 카카오 알림톡 발송 (NestJS 백엔드 경유)
- **사이드바**: 팀 토글 접기/펼치기, 팀/멤버 고정 순서

## 프로젝트 구조

```
ORK/
├── frontend/                           # React + Vite (Apache로 정적 배포)
│   ├── src/
│   │   ├── types/index.ts              # 도메인 타입 (User, OKR, KeyResult, WeeklyPriority, Leave* 등)
│   │   ├── lib/
│   │   │   ├── firebase.ts             # Firebase 앱 초기화 + Auth + Firestore 인스턴스
│   │   │   ├── db.ts                   # Firestore CRUD 어댑터 + 실시간 리스너 (휴가만)
│   │   │   ├── alimtalk.ts             # 알림톡 발송 (NestJS 백엔드 API 호출)
│   │   │   ├── utils.ts                # 날짜/색상/팩토리 유틸
│   │   │   └── seed.ts                 # 시드 데이터, SUPERADMIN_EMAILS, ALLOWED_DOMAINS
│   │   ├── stores/useStore.ts          # Zustand 단일 스토어 (전체 앱 상태 + 액션)
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Header.tsx          # 상단 헤더
│   │   │   │   └── Sidebar.tsx         # 사이드바 (팀 토글, 멤버 관리)
│   │   │   ├── okr/
│   │   │   │   ├── OKRPanel.tsx        # OKR 입력/편집 패널
│   │   │   │   └── HistoryPanel.tsx    # 분기 히스토리 열람
│   │   │   ├── weekly/
│   │   │   │   ├── PriorityPanel.tsx   # 주간 P1/P2 입력/관리
│   │   │   │   └── PresentationMode.tsx # 발표 모드 (슬라이드)
│   │   │   ├── gantt/
│   │   │   │   └── GanttPanel.tsx      # 간트 차트
│   │   │   ├── leave/
│   │   │   │   └── LeavePanel.tsx      # 휴가 관리 + 로그
│   │   │   ├── admin/
│   │   │   │   ├── Dashboard.tsx       # superadmin 대시보드
│   │   │   │   ├── TeamManager.tsx     # 팀 CRUD
│   │   │   │   └── TeamPanel.tsx       # 팀별 OKR 현황
│   │   │   └── ui/                     # 공통 컴포넌트 (Card, HelpBubble, Toast)
│   │   ├── pages/LoginPage.tsx         # Google OAuth 로그인
│   │   ├── App.tsx                     # 메인 앱 (인증 + 탭 라우팅 + 권한)
│   │   ├── main.tsx                    # 엔트리포인트
│   │   └── index.css                   # Tailwind 임포트 + 테마 변수
│   ├── .env / .env.example             # Firebase + API_BASE 환경변수
│   └── package.json
│
├── backend/                            # NestJS (Docker 컨테이너 배포)
│   ├── src/
│   │   ├── main.ts                     # CORS + 부트스트랩
│   │   ├── app.module.ts
│   │   └── alimtalk/                   # NHN Cloud 알림톡 API
│   │       ├── alimtalk.module.ts
│   │       ├── alimtalk.controller.ts  # POST /alimtalk/leave
│   │       └── alimtalk.service.ts     # NHN API 호출
│   ├── Dockerfile                      # multi-stage 빌드
│   ├── .env / .env.example             # NHN Cloud + CORS 환경변수
│   └── package.json
│
├── .github/workflows/
│   ├── deploy-frontend.yml             # frontend 변경 시 Apache 배포
│   └── deploy-backend.yml              # backend 변경 시 Docker 배포
├── CLAUDE.md
└── README.md
```

## 코딩 컨벤션
- 컴포넌트: PascalCase 함수형 컴포넌트 (`export default function`)
- 파일명: 컴포넌트는 PascalCase.tsx, 유틸/스토어는 camelCase.ts
- CSS: Tailwind utility-first, 인라인 style은 동적 값(색상 등)에만 사용
- 반응형: `sm:` / `md:` 브레이크포인트, 모바일 사이드바 오버레이
- 한국어 UI, 코드 내 변수/함수는 영문
- 상태 관리: Zustand 단일 스토어, 컴포넌트에서 selector로 접근
- 에러 처리: 토스트 알림 (`showToast`)

## 개발 명령어
```bash
# Frontend
cd frontend
npm run dev        # 개발 서버 (http://localhost:5173)
npm run build      # 프로덕션 빌드 (tsc + vite build)

# Backend
cd backend
npm run start:dev  # 개발 서버 (http://localhost:3000)
npm run build      # 프로덕션 빌드
```

## Firebase 연동

### 인증 (Google OAuth)
- Firebase Auth + Google Provider
- `SUPERADMIN_EMAILS`: 대표/이사 이메일 → 자동 superadmin 권한
- `ALLOWED_DOMAINS`: 허용 도메인 외 로그인 차단
- 미등록 사용자 자동 등록 (팀 미배정 상태)
- `onAuthStateChanged`로 세션 유지 + 자동 로그인

### Firestore
- `.env`에 Firebase 설정값을 넣으면 Firestore 사용, 비어있으면 인메모리 시드 데이터로 폴백
- 스토어 액션마다 **낙관적 업데이트** (로컬 즉시 반영 → 백그라운드 Firestore 저장)
- 실시간 리스너는 **휴가 관련만** 등록 (OKR/유저 데이터는 리스너 없음)

### Firestore 컬렉션 구조
```
okr_users/{userId}           → { name, email, team, role, phone?, joinDate? }
okr_config/teams             → { list: [...], colors: {...} }
okr_userData/{userId}        → { current: { okr, priorities }, history: [] }
okr_leaves/{leaveId}         → { userId, year, month, days, amount, status, ... }
okr_leaveAllocations/{id}    → { userId, year, total, special? }
okr_leaveLogs/{logId}        → { action, leaveId, userId, actorId, actorName, detail, timestamp }
```

### 설정 방법
1. Firebase 콘솔에서 프로젝트 생성 + 웹 앱 등록
2. Authentication → Google 로그인 활성화 + 승인된 도메인 추가
3. Firestore Database 생성 (테스트 모드)
4. `frontend/.env` 파일에 Firebase 설정값 입력 (`frontend/.env.example` 참고)
5. `backend/.env` 파일에 NHN Cloud 설정값 입력 (`backend/.env.example` 참고)
6. 앱 시작 시 Firestore가 비어있으면 시드 데이터 자동 업로드

## 배포

### Frontend (Apache)
- GitHub Actions: `.github/workflows/deploy-frontend.yml`
- `main` push 시 자동 빌드 → `/var/www/html/`로 rsync
- Apache에 `/api/` 리버스 프록시 설정 → `http://localhost:3000/`

### Backend (Docker)
- GitHub Actions: `.github/workflows/deploy-backend.yml`
- `main` push 시 Docker 이미지 빌드 → 컨테이너 재시작
- 환경변수는 GitHub Secrets로 주입

### Apache 리버스 프록시 설정
```
# /etc/httpd/conf.d/backend-proxy.conf
ProxyPass /api/ http://localhost:3000/
ProxyPassReverse /api/ http://localhost:3000/
```
