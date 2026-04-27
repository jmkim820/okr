import type { User, UserDataMap } from '../types';


export const SEED_USERS: User[] = [
  { id: 'u1', name: '김민준', email: 'minjun@axissoft.co.kr', team: '개발팀', role: 'admin' },
  { id: 'u2', name: '이수연', email: 'suyeon@axissoft.co.kr', team: '개발팀', role: 'user' },
  { id: 'u3', name: '박지훈', email: 'jihoon@axissoft.co.kr', team: '개발팀', role: 'user' },
  { id: 'u4', name: '정하은', email: 'haeun@axissoft.co.kr', team: '기획팀', role: 'admin' },
  { id: 'u5', name: '최서윤', email: 'seoyun@axissoft.co.kr', team: '기획팀', role: 'user' },
  { id: 'u6', name: '한도윤', email: 'doyun@axissoft.co.kr', team: '디자인팀', role: 'user' },
];


export const ALLOWED_DOMAINS = ['axissoft.co.kr', 'starplayer.net', 'gmail.com'];

// 휴가 전용 팀 — OKR/주간우선순위/간트 등 안 보이고 휴가 관리만 표시
export const LEAVE_ONLY_TEAMS = ['관리팀'];

export const SEED_TEAMS = ['개발팀', '기획팀', '디자인팀'];

export const SEED_USER_DATA: UserDataMap = {
  // ── 개발팀 ──────────────────────────────────────────
  u1: {
    current: {
      okr: {
        objective: 'OVP 스트리밍 품질 고도화',
        level: 7,
        startDate: '2026-01-01',
        endDate: '2026-03-31',
        krs: [
          { id: 'kr1', text: '4K 트랜스코딩 성공률 99% 달성', level: 8, detail: 'FFmpeg 파이프라인 최적화' },
          { id: 'kr2', text: 'CDN 비용 20% 절감', level: 6, detail: '캐시 히트율 개선 + 리전별 최적화' },
          { id: 'kr3', text: '평균 버퍼링 시간 2초 이하', level: 5, detail: 'ABR 알고리즘 개선' },
        ],
      },
      priorities: [
        { week: '2026-01-05', p1: ['FFmpeg 6.0 업그레이드 테스트', '트랜스코딩 벤치마크 작성', 'CDN 리전별 비용 분석'], p2: '기술 문서 정리', krTags: ['kr1', 'kr1', 'kr2'], note: '' },
        { week: '2026-01-12', p1: ['4K 인코딩 파이프라인 리팩토링', 'CloudFront 캐시 정책 변경', ''], p2: 'QA 환경 구성', krTags: ['kr1', 'kr2', ''], note: '' },
        { week: '2026-01-19', p1: ['ABR 알고리즘 프로토타입', '트랜스코딩 모니터링 대시보드', '캐시 히트율 측정 스크립트'], p2: '', krTags: ['kr3', 'kr1', 'kr2'], note: '버퍼링 이슈 긴급 대응 필요' },
        { week: '2026-02-02', p1: ['ABR A/B 테스트 실행', '4K 성공률 모니터링 자동화', 'CDN 비용 리포트 생성'], p2: '코드 리뷰', krTags: ['kr3', 'kr1', 'kr2'], note: '' },
        { week: '2026-02-09', p1: ['ABR 테스트 결과 분석', '트랜스코딩 에러 핸들링 강화', ''], p2: '', krTags: ['kr3', 'kr1', ''], note: '' },
        { week: '2026-02-16', p1: ['CDN 멀티 리전 설정', '4K HDR 지원 검토', '버퍼링 메트릭 수집'], p2: '주간 회의', krTags: ['kr2', 'kr1', 'kr3'], note: '' },
        { week: '2026-03-02', p1: ['트랜스코딩 성공률 99% 검증', 'CDN 절감 효과 집계', 'ABR 최종 튜닝'], p2: '분기 회고 준비', krTags: ['kr1', 'kr2', 'kr3'], note: '' },
        { week: '2026-03-09', p1: ['성능 리포트 작성', 'Q2 로드맵 초안', '기술 부채 정리'], p2: '', krTags: ['', '', ''], note: '' },
        { week: '2026-03-23', p1: ['분기 성과 정리', 'Q2 OKR 초안 작성', '팀 회고 진행'], p2: '', krTags: ['', '', ''], note: '분기 마무리' },
      ],
    },
    history: [
      {
        quarter: '2025-Q4',
        okr: {
          objective: 'OVP 인코딩 파이프라인 안정화',
          level: 8,
          startDate: '2025-10-01',
          endDate: '2025-12-31',
          krs: [
            { id: 'kr1', text: '인코딩 실패율 1% 이하', level: 9, detail: '' },
            { id: 'kr2', text: '인코딩 속도 30% 개선', level: 7, detail: '' },
            { id: 'kr3', text: '', level: 0, detail: '' },
          ],
        },
        priorities: [
          { week: '2025-10-06', p1: ['인코딩 에러 로깅 강화', '실패 재시도 로직 구현', ''], p2: '문서화', krTags: ['kr1', 'kr1', ''], note: '' },
          { week: '2025-10-13', p1: ['에러 패턴 분석', '재시도 큐 구현', '모니터링 알림 설정'], p2: '', krTags: ['kr1', 'kr1', 'kr1'], note: '' },
          { week: '2025-11-03', p1: ['GPU 인코딩 테스트', '병렬 처리 최적화', ''], p2: '', krTags: ['kr2', 'kr2', ''], note: '' },
          { week: '2025-12-01', p1: ['성능 최종 검증', '모니터링 대시보드 완성', 'Q1 계획'], p2: '', krTags: ['kr2', 'kr1', ''], note: '' },
        ],
      },
    ],
  },
  u2: {
    current: {
      okr: {
        objective: 'SCMS 백엔드 마이그레이션',
        level: 6,
        startDate: '2026-01-01',
        endDate: '2026-03-31',
        krs: [
          { id: 'kr1', text: 'Firestore → PostgreSQL 전환 완료', level: 7, detail: '데이터 무결성 검증 포함' },
          { id: 'kr2', text: 'API 응답시간 200ms 이하', level: 5, detail: '쿼리 최적화 + 인덱스 튜닝' },
          { id: 'kr3', text: '테스트 커버리지 80% 달성', level: 4, detail: '' },
        ],
      },
      priorities: [
        { week: '2026-01-05', p1: ['PostgreSQL 스키마 설계', 'Firestore 데이터 덤프 스크립트', ''], p2: '레거시 코드 분석', krTags: ['kr1', 'kr1', ''], note: '' },
        { week: '2026-01-12', p1: ['마이그레이션 스크립트 작성', 'API 엔드포인트 리팩토링 시작', 'Jest 테스트 환경 구성'], p2: '', krTags: ['kr1', 'kr2', 'kr3'], note: '' },
        { week: '2026-01-19', p1: ['사용자 테이블 마이그레이션', 'API 인증 미들웨어 전환', '단위 테스트 20개 작성'], p2: '코드 리뷰', krTags: ['kr1', 'kr2', 'kr3'], note: '' },
        { week: '2026-02-02', p1: ['콘텐츠 테이블 마이그레이션', 'N+1 쿼리 최적화', '통합 테스트 작성'], p2: '문서화', krTags: ['kr1', 'kr2', 'kr3'], note: '' },
        { week: '2026-02-16', p1: ['데이터 정합성 검증 도구 개발', 'API 캐싱 레이어 추가', ''], p2: '', krTags: ['kr1', 'kr2', ''], note: '' },
        { week: '2026-03-02', p1: ['스테이징 환경 마이그레이션', 'API 성능 벤치마크', '커버리지 리포트 생성'], p2: 'QA 테스트', krTags: ['kr1', 'kr2', 'kr3'], note: '' },
        { week: '2026-03-16', p1: ['프로덕션 마이그레이션 계획', '롤백 시나리오 작성', '최종 QA'], p2: '', krTags: ['kr1', 'kr1', 'kr3'], note: '' },
      ],
    },
    history: [],
  },
  u3: {
    current: {
      okr: {
        objective: 'LMS 프론트엔드 리뉴얼',
        level: 5,
        startDate: '2026-01-01',
        endDate: '2026-03-31',
        krs: [
          { id: 'kr1', text: 'React 18 마이그레이션 완료', level: 6, detail: '' },
          { id: 'kr2', text: '페이지 로딩 속도 50% 개선', level: 4, detail: 'Lighthouse 기준' },
          { id: 'kr3', text: '', level: 0, detail: '' },
        ],
      },
      priorities: [
        { week: '2026-01-05', p1: ['React 18 업그레이드 호환성 체크', '번들 사이즈 분석', ''], p2: 'Figma 디자인 검토', krTags: ['kr1', 'kr2', ''], note: '' },
        { week: '2026-01-19', p1: ['React Router v6 마이그레이션', 'Tree shaking 적용', 'Lazy loading 설정'], p2: '', krTags: ['kr1', 'kr2', 'kr2'], note: '' },
        { week: '2026-02-02', p1: ['Suspense 적용', '코드 스플리팅 적용', '이미지 최적화'], p2: '', krTags: ['kr1', 'kr2', 'kr2'], note: '' },
        { week: '2026-02-16', p1: ['상태관리 리팩토링', 'API 호출 최적화', ''], p2: 'E2E 테스트', krTags: ['kr1', 'kr2', ''], note: '' },
        { week: '2026-03-02', p1: ['Lighthouse 성능 측정', 'SSR 검토', '번들 분석 최종'], p2: '', krTags: ['kr2', 'kr2', 'kr2'], note: '' },
        { week: '2026-03-16', p1: ['성능 개선 리포트 작성', 'QA 버그 수정', ''], p2: 'Q2 계획', krTags: ['kr2', 'kr1', ''], note: '' },
      ],
    },
    history: [
      {
        quarter: '2025-Q4',
        okr: {
          objective: 'LMS 구독 결제 시스템 안정화',
          level: 7,
          startDate: '2025-10-01',
          endDate: '2025-12-31',
          krs: [
            { id: 'kr1', text: '결제 오류율 0.1% 이하', level: 8, detail: '' },
            { id: 'kr2', text: '환불 자동처리 구현', level: 6, detail: '' },
            { id: 'kr3', text: '', level: 0, detail: '' },
          ],
        },
        priorities: [
          { week: '2025-10-06', p1: ['결제 에러 로깅 강화', 'PG사 연동 테스트', ''], p2: '', krTags: ['kr1', 'kr1', ''], note: '' },
          { week: '2025-11-03', p1: ['환불 API 개발', '관리자 환불 UI', ''], p2: '문서화', krTags: ['kr2', 'kr2', ''], note: '' },
          { week: '2025-12-01', p1: ['결제 모니터링 대시보드', '오류율 최종 검증', '환불 플로우 QA'], p2: '', krTags: ['kr1', 'kr1', 'kr2'], note: '' },
        ],
      },
    ],
  },

  // ── 기획팀 ──────────────────────────────────────────
  u4: {
    current: {
      okr: {
        objective: '신규 서비스 기획 및 베타 런칭',
        level: 6,
        startDate: '2026-01-01',
        endDate: '2026-03-31',
        krs: [
          { id: 'kr1', text: '서비스 기획서 v2 완성', level: 7, detail: '스테이크홀더 리뷰 통과' },
          { id: 'kr2', text: '베타 사용자 100명 확보', level: 5, detail: '사내 + 외부 베타 테스터' },
          { id: 'kr3', text: 'NPS 점수 40 이상', level: 4, detail: '' },
        ],
      },
      priorities: [
        { week: '2026-01-05', p1: ['경쟁사 분석 리포트', '사용자 인터뷰 설계', '기획서 초안 작성'], p2: '일정 수립', krTags: ['kr1', 'kr2', 'kr1'], note: '' },
        { week: '2026-01-19', p1: ['사용자 인터뷰 진행(5명)', '기획서 v1 작성', '와이어프레임 검토'], p2: '', krTags: ['kr2', 'kr1', 'kr1'], note: '' },
        { week: '2026-02-02', p1: ['기획서 v2 리뷰 반영', '베타 모집 페이지 기획', 'KPI 지표 정의'], p2: '개발팀 미팅', krTags: ['kr1', 'kr2', 'kr3'], note: '' },
        { week: '2026-02-16', p1: ['베타 모집 시작', '온보딩 가이드 작성', '데이터 수집 설계'], p2: '', krTags: ['kr2', 'kr2', 'kr3'], note: '' },
        { week: '2026-03-02', p1: ['베타 테스트 운영', 'NPS 설문 설계 및 배포', '피드백 분석'], p2: '런칭 체크리스트', krTags: ['kr2', 'kr3', 'kr3'], note: '' },
        { week: '2026-03-16', p1: ['베타 피드백 종합 리포트', 'NPS 결과 분석', '개선사항 우선순위 도출'], p2: '', krTags: ['kr2', 'kr3', 'kr3'], note: '' },
        { week: '2026-03-23', p1: ['분기 성과 리포트', 'Q2 기획 방향 수립', ''], p2: '', krTags: ['', '', ''], note: '' },
      ],
    },
    history: [
      {
        quarter: '2025-Q4',
        okr: {
          objective: '기존 서비스 사용성 개선',
          level: 8,
          startDate: '2025-10-01',
          endDate: '2025-12-31',
          krs: [
            { id: 'kr1', text: '사용자 이탈률 15% 감소', level: 9, detail: '' },
            { id: 'kr2', text: 'CS 문의 건수 30% 감소', level: 7, detail: '' },
            { id: 'kr3', text: '', level: 0, detail: '' },
          ],
        },
        priorities: [
          { week: '2025-10-06', p1: ['이탈 구간 분석', 'UX 개선안 도출', '사용자 설문 설계'], p2: '', krTags: ['kr1', 'kr1', 'kr1'], note: '' },
          { week: '2025-11-03', p1: ['FAQ 페이지 리뉴얼', '온보딩 플로우 개선', 'CS 분석 리포트'], p2: '', krTags: ['kr2', 'kr1', 'kr2'], note: '' },
          { week: '2025-12-01', p1: ['개선 효과 측정', '이탈률 최종 집계', 'Q1 계획'], p2: '', krTags: ['kr1', 'kr1', ''], note: '' },
        ],
      },
    ],
  },
  u5: {
    current: {
      okr: {
        objective: '콘텐츠 마케팅 체계화',
        level: 5,
        startDate: '2026-01-01',
        endDate: '2026-03-31',
        krs: [
          { id: 'kr1', text: '블로그 콘텐츠 월 8건 발행', level: 6, detail: '' },
          { id: 'kr2', text: '오가닉 트래픽 30% 증가', level: 4, detail: 'GA4 기준' },
          { id: 'kr3', text: '', level: 0, detail: '' },
        ],
      },
      priorities: [
        { week: '2026-01-05', p1: ['콘텐츠 캘린더 수립', 'SEO 키워드 리서치', '블로그 포스트 2건 작성'], p2: 'SNS 채널 분석', krTags: ['kr1', 'kr2', 'kr1'], note: '' },
        { week: '2026-01-19', p1: ['블로그 포스트 2건 작성', '뉴스레터 템플릿 제작', 'GA4 세팅 확인'], p2: '', krTags: ['kr1', 'kr1', 'kr2'], note: '' },
        { week: '2026-02-02', p1: ['블로그 포스트 3건 작성', 'GA4 트래픽 리포트', '뉴스레터 1호 발송'], p2: '', krTags: ['kr1', 'kr2', 'kr1'], note: '' },
        { week: '2026-02-16', p1: ['블로그 포스트 2건 작성', '소셜 미디어 콘텐츠', 'SEO 성과 분석'], p2: '외부 기고 섭외', krTags: ['kr1', 'kr1', 'kr2'], note: '' },
        { week: '2026-03-02', p1: ['블로그 포스트 3건 작성', '트래픽 성과 분석', 'Q2 콘텐츠 전략'], p2: '협업 콘텐츠 기획', krTags: ['kr1', 'kr2', ''], note: '' },
        { week: '2026-03-16', p1: ['블로그 포스트 2건 작성', '분기 트래픽 종합 리포트', ''], p2: '', krTags: ['kr1', 'kr2', ''], note: '' },
      ],
    },
    history: [],
  },

  // ── 디자인팀 ────────────────────────────────────────
  u6: {
    current: {
      okr: {
        objective: '디자인 시스템 구축',
        level: 4,
        startDate: '2026-01-15',
        endDate: '2026-03-31',
        krs: [
          { id: 'kr1', text: 'Figma 컴포넌트 라이브러리 50개 완성', level: 5, detail: '' },
          { id: 'kr2', text: '디자인 가이드 문서 v1 배포', level: 3, detail: '' },
          { id: 'kr3', text: '', level: 0, detail: '' },
        ],
      },
      priorities: [
        { week: '2026-01-20', p1: ['기존 UI 인벤토리 정리', '컬러 시스템 정의', '타이포그래피 스케일 정의'], p2: '', krTags: ['kr1', 'kr2', 'kr2'], note: '' },
        { week: '2026-02-03', p1: ['버튼 컴포넌트 제작(6종)', '입력 필드 컴포넌트(4종)', '아이콘 세트 정리'], p2: '개발팀 싱크', krTags: ['kr1', 'kr1', 'kr1'], note: '' },
        { week: '2026-02-17', p1: ['카드 컴포넌트 제작(3종)', '모달/다이얼로그(2종)', '네비게이션 컴포넌트'], p2: '', krTags: ['kr1', 'kr1', 'kr1'], note: '' },
        { week: '2026-03-03', p1: ['테이블/리스트 컴포넌트', '디자인 가이드 문서 초안', '컴포넌트 QA'], p2: '', krTags: ['kr1', 'kr2', 'kr1'], note: '' },
        { week: '2026-03-17', p1: ['가이드 문서 리뷰 반영', '컴포넌트 최종 정리', '사용법 예제 작성'], p2: 'Q2 계획', krTags: ['kr2', 'kr1', 'kr2'], note: '' },
      ],
    },
    history: [],
  },
};
