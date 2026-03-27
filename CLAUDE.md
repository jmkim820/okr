# AxisOKR - OKR 관리 웹 솔루션

## 프로젝트 개요
Axissoft 사내 OKR(Objective and Key Results) 관리 웹 솔루션.
기존 엑셀 기반 OKR 시트를 대체하여, 간결한 입력/관리 + 시계열 추적 + 간트차트 시각화를 제공한다.

## 기술 스택
- **Frontend**: React 18 + TypeScript, Vite 8
- **UI**: Tailwind CSS 4 (Vite 플러그인 방식), 반응형 (모바일 대응)
- **상태관리**: Zustand (단일 스토어: `useStore`)
- **간트**: 자체 구현 (노션 스타일 캘린더 + OKR 기간 배경 + 주간 우선순위 바)
- **인증**: Google OAuth 2.0 (Firebase Auth) + 도메인 제한 (@axissoft.co.kr, @starplayer.net)
- **데이터**: Firebase Firestore (`.env` 미설정 시 인메모리 시드 데이터로 폴백)
- **배포**: Apache (httpd) / S3 / Vercel

## 핵심 도메인 모델

### User
- role: `superadmin` | `admin` | `user`
- team (소속 팀 이름)
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

## 권한 체계

| | 대시보드 | OKR 열람 | OKR 수정 | 간트차트 | 팀관리/멤버관리 |
|---|---|---|---|---|---|
| **superadmin** | O (기본 화면) | 전체 | 전체 | 전체 | O |
| **admin** | X | 전체 (읽기전용) | 같은 팀만 | 전체 | X |
| **user** | X | 같은 팀 (읽기전용) | 본인만 | 같은 팀 | X |

## 현재 구현된 탭/기능
- **대시보드**: (superadmin 전용) 전체 요약 카드, 팀별 현황, 미등록자/저레벨 알림, 멤버 OKR 테이블
- **OKR 설정**: O + KR 입력/편집, 현수준 레벨, 분기 자동 계산, 분기 보관
- **주간 우선순위**: P1 3개 + P2 1개 입력, 주간 선택 드롭다운, KR 연결, 주간 메모, 미등록 알림
- **분기 히스토리**: 보관된 분기별 OKR/우선순위 기록 열람
- **간트 차트**: 노션 스타일 월간 캘린더, OKR 기간 배경색 + 시작/마감 마커, 주간 P 바
- **팀 현황**: (관리자 전용) 팀별 멤버 OKR 요약

## 프로젝트 구조

```
src/
├── types/index.ts              # 도메인 타입 (User, OKR, KeyResult, WeeklyPriority 등)
├── lib/
│   ├── firebase.ts             # Firebase 앱 초기화 + Auth + Firestore 인스턴스
│   ├── db.ts                   # Firestore CRUD 어댑터 (okr_users, okr_config, okr_userData)
│   ├── utils.ts                # 날짜/색상/팩토리 유틸
│   └── seed.ts                 # 시드 데이터, SUPERADMIN_EMAILS, ALLOWED_DOMAINS
├── stores/useStore.ts          # Zustand 단일 스토어 (전체 앱 상태 + 액션)
├── components/
│   ├── layout/
│   │   ├── Header.tsx          # 상단 헤더 (로고, 햄버거 메뉴, 사용자 정보, 로그아웃)
│   │   └── Sidebar.tsx         # 사이드바 (탭 네비, 운영진 목록, 팀별 유저, 유저 관리)
│   ├── okr/
│   │   ├── OKRPanel.tsx        # OKR 입력/편집 패널 (읽기전용 모드 지원)
│   │   └── HistoryPanel.tsx    # 분기 히스토리 열람
│   ├── weekly/
│   │   └── PriorityPanel.tsx   # 주간 P1/P2 입력/관리 (주간 선택 드롭다운)
│   ├── gantt/
│   │   └── GanttPanel.tsx      # 간트 차트 (노션 캘린더 스타일)
│   ├── admin/
│   │   ├── Dashboard.tsx       # superadmin 대시보드 (전체 현황 요약)
│   │   ├── TeamManager.tsx     # 팀 CRUD + 색상 지정 (사이드바 내 접이식)
│   │   └── TeamPanel.tsx       # 팀별 OKR 현황 대시보드
│   └── ui/
│       ├── Card.tsx            # 공통 카드 레이아웃
│       ├── HelpBubble.tsx      # 풍선 도움말 (마우스오버)
│       └── Toast.tsx           # 토스트 알림
├── pages/
│   └── LoginPage.tsx           # Google OAuth 로그인
├── App.tsx                     # 메인 앱 (인증 분기 + 탭 라우팅 + 권한 제어)
├── main.tsx                    # 엔트리포인트 + 콘솔 유틸 (seedDB, injectMockData)
└── index.css                   # Tailwind 임포트 + 테마 변수
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
npm run dev        # 개발 서버 (http://localhost:5173)
npm run build      # 프로덕션 빌드 (tsc + vite build)
npm run preview    # 빌드 미리보기
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

### Firestore 컬렉션 구조
```
okr_users/{userId}       → { name, email, team, role }
okr_config/teams         → { list: [...], colors: {...} }
okr_userData/{userId}    → { current: { okr, priorities }, history: [] }
```

### 설정 방법
1. Firebase 콘솔에서 프로젝트 생성 + 웹 앱 등록
2. Authentication → Google 로그인 활성화 + 승인된 도메인 추가
3. Firestore Database 생성 (테스트 모드)
4. `.env` 파일에 설정값 입력 (`.env.example` 참고)
5. 앱 시작 시 Firestore가 비어있으면 시드 데이터 자동 업로드

## 배포
- `npm run build` → `dist/` 폴더를 서버에 업로드
- Apache: `AllowOverride All` + `.htaccess` (SPA 라우팅)
- S3: 정적 웹사이트 호스팅 + 버킷 정책
- Firebase Auth 승인된 도메인에 배포 도메인 추가 필수

## 향후 작업
- [ ] Firestore Security Rules 프로덕션 설정
- [ ] 간트차트 드래그 일정 조정
- [ ] 알림 기능 (이메일/슬랙)
