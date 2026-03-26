import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { loadUsers, loadAllUserData, saveUserData } from './lib/db'
import type { UserData } from './types'

// 브라우저 콘솔에서 사용 가능한 유틸
;(window as any).listUsers = async () => {
  const users = await loadUsers()
  console.table(users.map(u => ({ id: u.id, name: u.name, email: u.email, team: u.team, role: u.role })))
  return users
}

;(window as any).listUserData = async () => {
  const data = await loadAllUserData()
  for (const [uid, d] of Object.entries(data)) {
    console.log(`\n📋 ${uid}:`, d.current.okr.objective || '(OKR 미설정)', `| 우선순위 ${d.current.priorities.length}주 | 히스토리 ${d.history.length}분기`)
  }
  return data
}

;(window as any).injectMockData = async () => {
  const users = await loadUsers()
  if (users.length === 0) { console.error('유저가 없습니다. 먼저 로그인해주세요.'); return; }

  console.log(`👥 ${users.length}명 유저 발견:`, users.map(u => u.name).join(', '))

  const mockOkrs = [
    { objective: 'OVP 스트리밍 품질 고도화', level: 7, start: '2026-01-01', end: '2026-03-31', krs: [
      { text: '4K 트랜스코딩 성공률 99% 달성', level: 8, detail: 'FFmpeg 파이프라인 최적화' },
      { text: 'CDN 비용 20% 절감', level: 6, detail: '캐시 히트율 개선' },
      { text: '평균 버퍼링 시간 2초 이하', level: 5, detail: 'ABR 알고리즘 개선' },
    ]},
    { objective: 'SCMS 백엔드 마이그레이션', level: 6, start: '2026-01-01', end: '2026-03-31', krs: [
      { text: 'Firestore → PostgreSQL 전환 완료', level: 7, detail: '데이터 무결성 검증' },
      { text: 'API 응답시간 200ms 이하', level: 5, detail: '쿼리 최적화' },
      { text: '테스트 커버리지 80%', level: 4, detail: '' },
    ]},
    { objective: 'LMS 프론트엔드 리뉴얼', level: 5, start: '2026-01-01', end: '2026-03-31', krs: [
      { text: 'React 18 마이그레이션 완료', level: 6, detail: '' },
      { text: '페이지 로딩 속도 50% 개선', level: 4, detail: 'Lighthouse 기준' },
      { text: '', level: 0, detail: '' },
    ]},
    { objective: '신규 서비스 기획 및 베타 런칭', level: 6, start: '2026-01-01', end: '2026-03-31', krs: [
      { text: '서비스 기획서 v2 완성', level: 7, detail: '' },
      { text: '베타 사용자 100명 확보', level: 5, detail: '' },
      { text: 'NPS 점수 40 이상', level: 4, detail: '' },
    ]},
    { objective: '콘텐츠 마케팅 체계화', level: 5, start: '2026-01-01', end: '2026-03-31', krs: [
      { text: '블로그 콘텐츠 월 8건 발행', level: 6, detail: '' },
      { text: '오가닉 트래픽 30% 증가', level: 4, detail: 'GA4 기준' },
      { text: '', level: 0, detail: '' },
    ]},
    { objective: '디자인 시스템 구축', level: 4, start: '2026-01-15', end: '2026-03-31', krs: [
      { text: 'Figma 컴포넌트 50개 완성', level: 5, detail: '' },
      { text: '디자인 가이드 문서 v1 배포', level: 3, detail: '' },
      { text: '', level: 0, detail: '' },
    ]},
  ]

  const weekSets = [
    [
      { week: '2026-01-05', p1: ['FFmpeg 업그레이드 테스트', '트랜스코딩 벤치마크', 'CDN 비용 분석'] as [string,string,string], p2: '기술 문서 정리', krTags: ['kr1','kr1','kr2'] as [string,string,string], note: '' },
      { week: '2026-01-12', p1: ['4K 파이프라인 리팩토링', 'CloudFront 캐시 정책', ''] as [string,string,string], p2: 'QA 환경 구성', krTags: ['kr1','kr2',''] as [string,string,string], note: '' },
      { week: '2026-01-19', p1: ['ABR 프로토타입', '모니터링 대시보드', '캐시 측정 스크립트'] as [string,string,string], p2: '', krTags: ['kr3','kr1','kr2'] as [string,string,string], note: '긴급 대응 필요' },
      { week: '2026-02-02', p1: ['ABR A/B 테스트', '성공률 모니터링 자동화', 'CDN 리포트'] as [string,string,string], p2: '코드 리뷰', krTags: ['kr3','kr1','kr2'] as [string,string,string], note: '' },
      { week: '2026-02-16', p1: ['CDN 멀티 리전', '4K HDR 지원 검토', '버퍼링 메트릭'] as [string,string,string], p2: '', krTags: ['kr2','kr1','kr3'] as [string,string,string], note: '' },
      { week: '2026-03-02', p1: ['성공률 99% 검증', 'CDN 절감 집계', 'ABR 최종 튜닝'] as [string,string,string], p2: '회고 준비', krTags: ['kr1','kr2','kr3'] as [string,string,string], note: '' },
      { week: '2026-03-23', p1: ['분기 성과 정리', 'Q2 OKR 초안', ''] as [string,string,string], p2: '', krTags: ['','',''] as [string,string,string], note: '분기 마무리' },
    ],
    [
      { week: '2026-01-05', p1: ['PostgreSQL 스키마 설계', 'Firestore 덤프 스크립트', ''] as [string,string,string], p2: '레거시 분석', krTags: ['kr1','kr1',''] as [string,string,string], note: '' },
      { week: '2026-01-19', p1: ['사용자 테이블 마이그레이션', 'API 인증 전환', '단위 테스트 20개'] as [string,string,string], p2: '코드 리뷰', krTags: ['kr1','kr2','kr3'] as [string,string,string], note: '' },
      { week: '2026-02-02', p1: ['콘텐츠 테이블 전환', 'N+1 쿼리 최적화', '통합 테스트'] as [string,string,string], p2: '문서화', krTags: ['kr1','kr2','kr3'] as [string,string,string], note: '' },
      { week: '2026-02-16', p1: ['정합성 검증 도구', 'API 캐싱 레이어', ''] as [string,string,string], p2: '', krTags: ['kr1','kr2',''] as [string,string,string], note: '' },
      { week: '2026-03-02', p1: ['스테이징 마이그레이션', 'API 벤치마크', '커버리지 리포트'] as [string,string,string], p2: 'QA', krTags: ['kr1','kr2','kr3'] as [string,string,string], note: '' },
    ],
    [
      { week: '2026-01-05', p1: ['React 18 호환성 체크', '번들 사이즈 분석', ''] as [string,string,string], p2: 'Figma 검토', krTags: ['kr1','kr2',''] as [string,string,string], note: '' },
      { week: '2026-01-19', p1: ['Router v6 마이그레이션', 'Tree shaking', 'Lazy loading'] as [string,string,string], p2: '', krTags: ['kr1','kr2','kr2'] as [string,string,string], note: '' },
      { week: '2026-02-02', p1: ['Suspense 적용', '코드 스플리팅', '이미지 최적화'] as [string,string,string], p2: '', krTags: ['kr1','kr2','kr2'] as [string,string,string], note: '' },
      { week: '2026-03-02', p1: ['Lighthouse 측정', 'SSR 검토', ''] as [string,string,string], p2: 'E2E 테스트', krTags: ['kr2','kr2',''] as [string,string,string], note: '' },
    ],
    [
      { week: '2026-01-05', p1: ['경쟁사 분석', '사용자 인터뷰 설계', '기획서 초안'] as [string,string,string], p2: '일정 수립', krTags: ['kr1','kr2','kr1'] as [string,string,string], note: '' },
      { week: '2026-01-19', p1: ['인터뷰 진행(5명)', '기획서 v1', '와이어프레임'] as [string,string,string], p2: '', krTags: ['kr2','kr1','kr1'] as [string,string,string], note: '' },
      { week: '2026-02-02', p1: ['기획서 v2 반영', '베타 모집 기획', 'KPI 정의'] as [string,string,string], p2: '개발팀 미팅', krTags: ['kr1','kr2','kr3'] as [string,string,string], note: '' },
      { week: '2026-02-16', p1: ['베타 모집 시작', '온보딩 가이드', '데이터 수집 설계'] as [string,string,string], p2: '', krTags: ['kr2','kr2','kr3'] as [string,string,string], note: '' },
      { week: '2026-03-02', p1: ['베타 운영', 'NPS 설문 배포', '피드백 분석'] as [string,string,string], p2: '런칭 체크리스트', krTags: ['kr2','kr3','kr3'] as [string,string,string], note: '' },
      { week: '2026-03-23', p1: ['분기 성과 리포트', 'Q2 방향 수립', ''] as [string,string,string], p2: '', krTags: ['','',''] as [string,string,string], note: '' },
    ],
    [
      { week: '2026-01-05', p1: ['콘텐츠 캘린더', 'SEO 키워드 리서치', '블로그 2건'] as [string,string,string], p2: 'SNS 분석', krTags: ['kr1','kr2','kr1'] as [string,string,string], note: '' },
      { week: '2026-02-02', p1: ['블로그 3건', 'GA4 리포트', '뉴스레터 발송'] as [string,string,string], p2: '', krTags: ['kr1','kr2','kr1'] as [string,string,string], note: '' },
      { week: '2026-03-02', p1: ['블로그 3건', '트래픽 분석', 'Q2 전략'] as [string,string,string], p2: '협업 콘텐츠', krTags: ['kr1','kr2',''] as [string,string,string], note: '' },
    ],
    [
      { week: '2026-01-20', p1: ['UI 인벤토리 정리', '컬러 시스템', '타이포 스케일'] as [string,string,string], p2: '', krTags: ['kr1','kr2','kr2'] as [string,string,string], note: '' },
      { week: '2026-02-03', p1: ['버튼 컴포넌트(6종)', '입력 필드(4종)', '아이콘 세트'] as [string,string,string], p2: '개발팀 싱크', krTags: ['kr1','kr1','kr1'] as [string,string,string], note: '' },
      { week: '2026-03-03', p1: ['테이블/리스트', '가이드 문서 초안', '컴포넌트 QA'] as [string,string,string], p2: '', krTags: ['kr1','kr2','kr1'] as [string,string,string], note: '' },
    ],
  ]

  const historyPool = [
    { quarter: '2025-Q4', objective: 'OVP 인코딩 안정화', level: 8, krs: [{ text: '인코딩 실패율 1% 이하', level: 9 }, { text: '인코딩 속도 30% 개선', level: 7 }] },
    { quarter: '2025-Q4', objective: 'LMS 결제 시스템 안정화', level: 7, krs: [{ text: '결제 오류율 0.1% 이하', level: 8 }, { text: '환불 자동처리 구현', level: 6 }] },
    { quarter: '2025-Q4', objective: '서비스 사용성 개선', level: 8, krs: [{ text: '이탈률 15% 감소', level: 9 }, { text: 'CS 문의 30% 감소', level: 7 }] },
  ]

  for (let i = 0; i < users.length; i++) {
    const u = users[i]
    const okrIdx = i % mockOkrs.length
    const mock = mockOkrs[okrIdx]

    const data: UserData = {
      current: {
        okr: {
          objective: mock.objective,
          level: mock.level,
          startDate: mock.start,
          endDate: mock.end,
          krs: mock.krs.map((kr, j) => ({ id: `kr${j+1}`, text: kr.text, level: kr.level, detail: kr.detail })),
        },
        priorities: weekSets[okrIdx] || weekSets[0],
      },
      history: i < historyPool.length ? [{
        quarter: historyPool[i].quarter,
        okr: {
          objective: historyPool[i].objective,
          level: historyPool[i].level,
          startDate: '2025-10-01',
          endDate: '2025-12-31',
          krs: historyPool[i].krs.map((kr, j) => ({ id: `kr${j+1}`, text: kr.text, level: kr.level, detail: '' })).concat([{ id: 'kr3', text: '', level: 0, detail: '' }]),
        },
        priorities: [
          { week: '2025-10-06', p1: ['분석 작업', '개선 작업', ''] as [string,string,string], p2: '문서화', krTags: ['kr1','kr1',''] as [string,string,string], note: '' },
          { week: '2025-11-03', p1: ['구현 작업', 'QA 테스트', ''] as [string,string,string], p2: '', krTags: ['kr2','kr2',''] as [string,string,string], note: '' },
          { week: '2025-12-01', p1: ['최종 검증', '성과 집계', 'Q1 계획'] as [string,string,string], p2: '', krTags: ['kr1','kr1',''] as [string,string,string], note: '' },
        ],
      }] : [],
    }

    await saveUserData(u.id, data)
    console.log(`✅ ${u.name} (${u.team}) — OKR: ${mock.objective}, 우선순위 ${data.current.priorities.length}주, 히스토리 ${data.history.length}분기`)
  }

  console.log('\n🎉 모든 유저에 mock 데이터 주입 완료! 새로고침하세요.')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
