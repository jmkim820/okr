export type Role = 'superadmin' | 'admin' | 'user';

export interface User {
  id: string;
  name: string;
  email: string;
  team: string;
  role: Role;
  pw?: string;
  joinDate?: string; // 입사일 (YYYY-MM-DD)
  phone?: string; // 전화번호 (알림톡용)
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

export interface LeaveRequest {
  id: string;
  userId: string;
  year: number;
  month: number;
  days: string; // "5, 6, 15" 형태
  amount: number; // 사용 일수 (0.5 단위)
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  approvedBy: string | null;
  approvedByName?: string | null;
  deleteRequested?: boolean; // 삭제 승인 대기
  originalDays?: string | null; // 수정 전 원본 (비교 표시용)
  originalAmount?: number | null;
}

export interface LeaveAllocation {
  userId: string;
  year: number;
  total: number; // 연간 발생휴가 일수
}

export interface LeaveLog {
  id: string;
  action: 'request' | 'modify' | 'approve' | 'reject' | 'delete' | 'delete_request' | 'delete_approve';
  leaveId: string;
  userId: string;       // 대상 (휴가 신청자)
  actorId: string;      // 행위자
  actorName: string;
  detail: string;       // 요약 메시지
  timestamp: string;    // ISO string
}
