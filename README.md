# AxisOKR

Axissoft 사내 OKR(Objective and Key Results) 관리 웹 솔루션.

## 주요 기능

- **Google OAuth 로그인** — 회사 도메인 계정만 허용, 미등록 시 자동 등록
- **OKR 설정** — Objective + Key Results 입력, 현수준 레벨(0~10), 분기 자동 계산
- **주간 우선순위** — P1 3개 + P2 1개, KR 연결, 주간 선택 드롭다운
- **분기 히스토리** — 종료된 분기 OKR/우선순위 보관 및 열람
- **간트 차트** — 노션 스타일 월간 캘린더, OKR 기간 + 주간 P 바
- **대시보드** — (superadmin) 전체 현황, 팀별 수치, 미등록자/저레벨 알림
- **팀 관리** — 팀 CRUD, 색상 지정, 멤버 관리
- **반응형** — 모바일/태블릿 대응

## 권한

| 역할 | 대시보드 | OKR 수정 | 팀 관리 |
|------|---------|---------|--------|
| superadmin | O | 전체 | O |
| admin | X | 같은 팀 | X |
| user | X | 본인만 | X |

## 기술 스택

React 18 · TypeScript · Vite 8 · Tailwind CSS 4 · Zustand · Firebase (Auth + Firestore)

## 시작하기

```bash
npm install
cp .env.example .env   # Firebase 설정값 입력
npm run dev
```

## 환경변수 (.env)

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

## 빌드 & 배포

```bash
npm run build          # dist/ 생성
```

`dist/` 폴더를 Apache, S3, Vercel 등에 업로드.

## 라이선스

Private — Axissoft 내부 사용
