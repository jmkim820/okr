import type { OKR, UserData } from '../types';

export const getMondayStr = (d = new Date()): string => {
  const dt = new Date(d);
  const day = dt.getDay();
  dt.setDate(dt.getDate() - (day === 0 ? 6 : day - 1));
  return dt.toISOString().slice(0, 10);
};

export const fmtDate = (s: string): string => {
  if (!s) return '';
  const [, m, d] = s.split('-');
  return `${+m}월 ${+d}일`;
};

// 월요일 날짜 → "3월 1주차" 형태
export const fmtWeek = (s: string): string => {
  if (!s) return '';
  const [y, m, d] = s.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const month = date.getMonth() + 1;
  // 해당 월의 1일
  const firstOfMonth = new Date(y, m - 1, 1);
  // 1일이 속한 주의 월요일 기준으로 주차 계산
  const firstMonday = new Date(firstOfMonth);
  const dayOfWeek = firstOfMonth.getDay(); // 0=Sun
  const diff = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : 8 - dayOfWeek;
  firstMonday.setDate(1 + diff);
  // 해당 날짜가 첫 번째 월요일 이전이면 1주차
  if (date < firstMonday) return `${month}월 1주차`;
  const weekNum = Math.floor((date.getTime() - firstMonday.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 2;
  return `${month}월 ${weekNum}주차`;
};

export const DEFAULT_TEAM_COLORS: Record<string, string> = {
  개발팀: '#0ea5e9',
  기획팀: '#10b981',
};
export const DEFAULT_TEAM_COLOR = '#f59e0b';

// 커스텀 색상 저장소 (스토어에서 주입)
let _customColors: Record<string, string> = {};
export const setCustomTeamColors = (colors: Record<string, string>) => {
  _customColors = colors;
};

export const teamColor = (t: string): string =>
  _customColors[t] || DEFAULT_TEAM_COLORS[t] || DEFAULT_TEAM_COLOR;

// 역할별 아바타 색상
export const roleColor = (role: string): string =>
  role === 'superadmin' ? '#8b5cf6' : role === 'admin' ? '#22c55e' : '#f59e0b';

export const levelColor = (n: number): string =>
  n >= 8 ? '#22c55e' : n >= 5 ? '#f59e0b' : '#ef4444';

export const getQuarter = (s: string): string | null => {
  if (!s) return null;
  const [y, m] = s.split('-');
  return `${y}-Q${Math.ceil(+m / 3)}`;
};

export const quarterLabel = (q: string): string => {
  if (!q) return '';
  const [y, n] = q.split('-');
  // "2025-Q4" → "2025년 4Q"
  const num = n.replace('Q', '');
  return `${y}년 ${num}Q`;
};

export const isQuarterEnded = (e: string): boolean =>
  !!e && new Date(e) < new Date();

export const makeOkr = (): OKR => ({
  objective: '',
  level: 0,
  startDate: '',
  endDate: '',
  krs: [
    { id: 'kr1', text: '', level: 0, detail: '' },
    { id: 'kr2', text: '', level: 0, detail: '' },
    { id: 'kr3', text: '', level: 0, detail: '' },
  ],
});

export const makeUserData = (): UserData => ({
  current: { okr: makeOkr(), priorities: [] },
  history: [],
});
