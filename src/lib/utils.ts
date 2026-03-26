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
  return `${y}년 ${n}`;
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
