import { create } from 'zustand';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';
import type { User, UserData, UserDataMap, OKR, WeeklyPriority, LeaveRequest, LeaveAllocation } from '../types';
import { makeUserData, makeOkr, getMondayStr, getQuarter, setCustomTeamColors } from '../lib/utils';
import { SEED_USERS, SEED_TEAMS, SEED_USER_DATA, SUPERADMIN, SUPERADMIN_EMAILS } from '../lib/seed';
import * as DB from '../lib/db';

interface AppState {
  // Loading
  loading: boolean;
  initialized: boolean;
  initApp: () => Promise<void>;

  // Auth
  currentUser: User | null;
  login: (user: User) => void;
  logout: () => void;

  // Data
  users: User[];
  teams: string[];
  teamColors: Record<string, string>;
  userData: UserDataMap;

  // View
  activeTab: string;
  viewUserId: string | null;
  sidebarOpen: boolean;
  setActiveTab: (tab: string) => void;
  setViewUserId: (id: string) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  // Toast
  toast: { msg: string; type: 'success' | 'error' } | null;
  showToast: (msg: string, type?: 'success' | 'error') => void;

  // User management
  addUser: (user: Omit<User, 'id'>) => void;
  registerUser: (user: User) => void;
  removeUser: (id: string) => void;
  updateUser: (user: User) => void;
  toggleAdmin: (id: string) => void;
  assignTeam: (userIds: string[], team: string) => void;

  // Team management
  addTeam: (name: string) => void;
  renameTeam: (oldName: string, newName: string) => void;
  deleteTeam: (name: string) => boolean;
  setTeamColor: (team: string, color: string) => void;

  // OKR
  saveOkr: (userId: string, okr: OKR) => void;
  savePriorities: (userId: string, priorities: WeeklyPriority[]) => void;
  archiveQuarter: (userId: string) => void;

  // Leave
  leaveRequests: LeaveRequest[];
  leaveAllocations: LeaveAllocation[];
  addLeaveRequest: (req: LeaveRequest) => void;
  approveLeave: (id: string, approvedBy: string) => void;
  rejectLeave: (id: string) => void;
  deleteLeaveRequest: (id: string) => void;
  setLeaveAllocation: (userId: string, year: number, total: number) => void;

  // Bulk leave allocation
  batchSetLeaveAllocations: (year: number, allocations: { userId: string; total: number }[]) => void;

  // Helpers
  getTargetData: (userId: string) => UserData;
  getSuperAdmin: () => User;
}

// Firestore에 데이터를 저장하는 헬퍼 (에러 시 토스트만, UI 블로킹 안 함)
const persistUsers = (users: User[]) => {
  if (!DB.isFirestoreEnabled()) return;
  for (const u of users) DB.saveUser(u).catch(console.error);
};

const persistTeams = (teams: string[]) => {
  if (!DB.isFirestoreEnabled()) return;
  DB.saveTeams(teams).catch(console.error);
};

const persistTeamColors = (colors: Record<string, string>) => {
  if (!DB.isFirestoreEnabled()) return;
  DB.saveTeamColors(colors).catch(console.error);
};

const persistUserData = (userId: string, data: UserData) => {
  if (!DB.isFirestoreEnabled()) return;
  DB.saveUserData(userId, data).catch(console.error);
};

export const useStore = create<AppState>((set, get) => ({
  loading: true,
  initialized: false,

  initApp: async () => {
    if (get().initialized) return;

    if (!DB.isFirestoreEnabled()) {
      set({ users: SEED_USERS, teams: SEED_TEAMS, userData: SEED_USER_DATA, loading: false, initialized: true });
      return;
    }

    try {
      // Firestore에서 데이터 로드
      const [users, teams, teamColors, userData, leaveRequests, leaveAllocations] = await Promise.all([
        DB.loadUsers(),
        DB.loadTeams(),
        DB.loadTeamColors(),
        DB.loadAllUserData(),
        DB.loadLeaveRequests(),
        DB.loadLeaveAllocations(),
      ]);

      let loadedUsers = users;
      let loadedTeams = teams;
      let loadedUserData = userData;

      if (users.length === 0) {
        await DB.seedFirestore(SEED_USERS, SEED_TEAMS, SEED_USER_DATA);
        loadedUsers = SEED_USERS;
        loadedTeams = SEED_TEAMS;
        loadedUserData = SEED_USER_DATA;
      }

      setCustomTeamColors(teamColors);
      set({ users: loadedUsers, teams: loadedTeams, teamColors, userData: loadedUserData, leaveRequests, leaveAllocations });

      // Firebase Auth 세션 확인 → 자동 로그인
      await new Promise<void>((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
          unsubscribe();
          if (firebaseUser?.email) {
            const email = firebaseUser.email;
            if (SUPERADMIN_EMAILS[email]) {
              const sa: User = { id: firebaseUser.uid, name: SUPERADMIN_EMAILS[email].name, email, team: '-', role: 'superadmin' };
              set({ currentUser: sa, viewUserId: sa.id });
            } else {
              const matched = loadedUsers.find((u) => u.email === email);
              if (matched) {
                set({ currentUser: matched, viewUserId: matched.id });
              }
            }
          }
          resolve();
        });
      });

      set({ loading: false, initialized: true });
    } catch (err) {
      console.error('Firestore 로드 실패, 시드 데이터로 폴백:', err);
      set({ users: SEED_USERS, teams: SEED_TEAMS, userData: SEED_USER_DATA, loading: false, initialized: true });
    }
  },

  currentUser: null,
  users: [],
  teams: [],
  teamColors: {},
  userData: {},
  activeTab: 'okr',
  viewUserId: null,
  sidebarOpen: false,
  toast: null,

  login: (user) => set({ currentUser: user, viewUserId: user.id }),

  logout: () => {
    signOut(auth).catch(console.error);
    set({ currentUser: null, viewUserId: null, activeTab: 'okr' });
  },

  setActiveTab: (tab) => set({ activeTab: tab }),
  setViewUserId: (id) => set({ viewUserId: id }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  showToast: (msg, type = 'success') => {
    set({ toast: { msg, type } });
    setTimeout(() => set({ toast: null }), 2800);
  },

  addUser: (data) => {
    const id = 'u' + Date.now();
    const newUser = { ...data, id, joinDate: new Date().toISOString().slice(0, 10) } as User;
    set((s) => ({
      users: [...s.users, newUser],
      userData: { ...s.userData, [id]: makeUserData() },
    }));
    // Firestore 저장
    DB.saveUser(newUser).catch(console.error);
    persistUserData(id, makeUserData());
    get().showToast('사용자 추가 완료');
  },

  registerUser: (user) => {
    const withJoinDate = { ...user, joinDate: user.joinDate || new Date().toISOString().slice(0, 10) };
    set((s) => ({
      users: [...s.users, withJoinDate],
      userData: { ...s.userData, [withJoinDate.id]: makeUserData() },
    }));
    DB.saveUser(withJoinDate).catch(console.error);
    persistUserData(withJoinDate.id, makeUserData());
  },

  removeUser: (id) => {
    set((s) => ({
      users: s.users.filter((u) => u.id !== id),
    }));
    if (DB.isFirestoreEnabled()) DB.deleteUser(id).catch(console.error);
    get().showToast('사용자 삭제 완료', 'error');
  },

  updateUser: (user) => {
    set((s) => ({
      users: s.users.map((u) => (u.id === user.id ? user : u)),
    }));
    DB.saveUser(user).catch(console.error);
    get().showToast('사용자 정보 수정 완료');
  },

  toggleAdmin: (id) => {
    const { users, showToast } = get();
    const u = users.find((u) => u.id === id);
    if (!u) return;
    const updated = { ...u, role: u.role === 'admin' ? 'user' : 'admin' } as User;
    set({
      users: users.map((u) => (u.id === id ? updated : u)),
    });
    DB.saveUser(updated).catch(console.error);
    showToast(`${u.name} ${u.role === 'admin' ? '일반 사용자' : '관리자'}로 변경`);
  },

  assignTeam: (userIds, team) => {
    set((s) => {
      const updatedUsers = s.users.map((u) => (userIds.includes(u.id) ? { ...u, team } : u));
      const updatedTeams = s.teams.includes(team) ? s.teams : [...s.teams, team];
      // Firestore 저장
      persistUsers(updatedUsers.filter((u) => userIds.includes(u.id)));
      persistTeams(updatedTeams);
      return { users: updatedUsers, teams: updatedTeams };
    });
    get().showToast(`'${team}' 팀으로 배정 완료`);
  },

  addTeam: (name) => {
    const { teams } = get();
    if (!name.trim() || teams.includes(name)) return;
    const updated = [...teams, name];
    set({ teams: updated });
    persistTeams(updated);
    get().showToast(`'${name}' 팀 추가 완료`);
  },

  renameTeam: (oldName, newName) => {
    if (!newName.trim()) return;
    set((s) => {
      const updatedTeams = s.teams.map((t) => (t === oldName ? newName : t));
      const updatedUsers = s.users.map((u) => (u.team === oldName ? { ...u, team: newName } : u));
      persistTeams(updatedTeams);
      persistUsers(updatedUsers.filter((u) => u.team === newName));
      return { teams: updatedTeams, users: updatedUsers };
    });
    get().showToast(`'${newName}' 팀명 수정 완료`);
  },

  deleteTeam: (name) => {
    const { users, showToast } = get();
    const cnt = users.filter((u) => u.team === name).length;
    if (cnt > 0) {
      showToast(`멤버 ${cnt}명을 먼저 이동하세요.`, 'error');
      return false;
    }
    set((s) => {
      const updated = s.teams.filter((t) => t !== name);
      persistTeams(updated);
      return { teams: updated };
    });
    showToast(`'${name}' 팀 삭제`, 'error');
    return true;
  },

  setTeamColor: (team, color) => {
    set((s) => {
      const updated = { ...s.teamColors, [team]: color };
      setCustomTeamColors(updated);
      persistTeamColors(updated);
      return { teamColors: updated };
    });
  },

  saveOkr: (userId, okr) => {
    set((s) => {
      const updated: UserData = {
        ...s.userData[userId],
        current: { ...s.userData[userId]?.current, okr },
      };
      persistUserData(userId, updated);
      return { userData: { ...s.userData, [userId]: updated } };
    });
    get().showToast('OKR 저장 완료');
  },

  savePriorities: (userId, priorities) => {
    set((s) => {
      const updated: UserData = {
        ...s.userData[userId],
        current: { ...s.userData[userId]?.current, priorities },
      };
      persistUserData(userId, updated);
      return { userData: { ...s.userData, [userId]: updated } };
    });
    get().showToast('우선순위 저장 완료');
  },

  archiveQuarter: (userId) => {
    const { userData, showToast } = get();
    const d = userData[userId];
    if (!d) return;
    const okr = d.current.okr;
    if (!okr.objective) {
      showToast('Objective를 먼저 입력하세요.', 'error');
      return;
    }
    const q = getQuarter(okr.endDate) || getQuarter(new Date().toISOString().slice(0, 10));
    if (!q) return;
    const archived = { quarter: q, okr, priorities: [...d.current.priorities] };
    const last = d.current.priorities[d.current.priorities.length - 1];
    const carryOver: WeeklyPriority[] = last
      ? [{ week: getMondayStr(), p1: [...last.p1] as [string, string, string], p2: last.p2, krTags: [...last.krTags] as [string, string, string], note: '[이전 분기에서 복사됨]' }]
      : [];
    const updated: UserData = {
      history: [...d.history, archived],
      current: { okr: makeOkr(), priorities: carryOver },
    };
    set((s) => ({ userData: { ...s.userData, [userId]: updated } }));
    persistUserData(userId, updated);
    showToast(`분기가 보관되었습니다.`);
  },

  // ── Leave ──────────────────────────────────────────────
  leaveRequests: [],
  leaveAllocations: [],

  addLeaveRequest: (req) => {
    set((s) => ({ leaveRequests: [...s.leaveRequests, req] }));
    DB.saveLeaveRequest(req).catch(console.error);
    get().showToast('휴가 신청 완료');
  },

  approveLeave: (id, approvedBy) => {
    set((s) => ({
      leaveRequests: s.leaveRequests.map((r) =>
        r.id === id ? { ...r, status: 'approved' as const, approvedBy } : r,
      ),
    }));
    const updated = get().leaveRequests.find((r) => r.id === id);
    if (updated) DB.saveLeaveRequest(updated).catch(console.error);
    get().showToast('휴가 승인 완료');
  },

  rejectLeave: (id) => {
    set((s) => ({
      leaveRequests: s.leaveRequests.map((r) =>
        r.id === id ? { ...r, status: 'rejected' as const } : r,
      ),
    }));
    const updated = get().leaveRequests.find((r) => r.id === id);
    if (updated) DB.saveLeaveRequest(updated).catch(console.error);
    get().showToast('휴가 반려 완료', 'error');
  },

  deleteLeaveRequest: (id) => {
    set((s) => ({ leaveRequests: s.leaveRequests.filter((r) => r.id !== id) }));
    if (DB.isFirestoreEnabled()) DB.deleteLeaveRequest(id).catch(console.error);
    get().showToast('휴가 신청 삭제', 'error');
  },

  setLeaveAllocation: (userId, year, total) => {
    set((s) => {
      const exists = s.leaveAllocations.find((a) => a.userId === userId && a.year === year);
      const updated = exists
        ? s.leaveAllocations.map((a) => (a.userId === userId && a.year === year ? { ...a, total } : a))
        : [...s.leaveAllocations, { userId, year, total }];
      return { leaveAllocations: updated };
    });
    const alloc = { userId, year, total };
    DB.saveLeaveAllocation(alloc).catch(console.error);
    get().showToast('연차 할당 수정 완료');
  },

  batchSetLeaveAllocations: (year, allocations) => {
    set((s) => {
      let updated = [...s.leaveAllocations];
      for (const { userId, total } of allocations) {
        const idx = updated.findIndex((a) => a.userId === userId && a.year === year);
        if (idx >= 0) {
          updated[idx] = { ...updated[idx], total };
        } else {
          updated.push({ userId, year, total });
        }
        const alloc = { userId, year, total };
        DB.saveLeaveAllocation(alloc).catch(console.error);
      }
      return { leaveAllocations: updated };
    });
    get().showToast(`${year}년 발생휴가 일괄 설정 완료`);
  },

  getTargetData: (userId) => {
    return get().userData[userId] || makeUserData();
  },

  getSuperAdmin: () => SUPERADMIN,
}));
