export type Role = 'superadmin' | 'admin' | 'user';

export interface User {
  id: string;
  name: string;
  email: string;
  team: string;
  role: Role;
  pw?: string;
}

export interface KeyResult {
  id: string;
  text: string;
  level: number;
  detail: string;
}

export interface OKR {
  objective: string;
  level: number;
  startDate: string;
  endDate: string;
  krs: KeyResult[];
}

export interface WeeklyPriority {
  week: string;
  p1: [string, string, string];
  p2: string;
  krTags: [string, string, string];
  note: string;
}

export interface ArchivedQuarter {
  quarter: string;
  okr: OKR;
  priorities: WeeklyPriority[];
}

export interface UserData {
  current: {
    okr: OKR;
    priorities: WeeklyPriority[];
  };
  history: ArchivedQuarter[];
}

export interface UserDataMap {
  [userId: string]: UserData;
}
