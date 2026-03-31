import {
  doc, setDoc, getDoc, getDocs, deleteDoc,
  collection, writeBatch, onSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import type { User, UserData, UserDataMap, LeaveRequest, LeaveAllocation } from '../types';

// ── Firestore 활성화 여부 ────────────────────────────────
// .env에 projectId가 없으면 인메모리 모드(시드 데이터)로 동작
export const isFirestoreEnabled = (): boolean =>
  !!import.meta.env.VITE_FIREBASE_PROJECT_ID;

// ── Collections ──────────────────────────────────────────
const USERS_COL = 'okr_users';
const TEAMS_DOC = 'okr_config/teams';
const USER_DATA_COL = 'okr_userData';
const LEAVES_COL = 'okr_leaves';
const LEAVE_ALLOC_COL = 'okr_leaveAllocations';

// ── Users ────────────────────────────────────────────────
export async function loadUsers(): Promise<User[]> {
  const snap = await getDocs(collection(db, USERS_COL));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as User);
}

export async function saveUser(user: User): Promise<void> {
  const { id, ...data } = user;
  await setDoc(doc(db, USERS_COL, id), data);
}

export async function deleteUser(userId: string): Promise<void> {
  await deleteDoc(doc(db, USERS_COL, userId));
}

// ── Teams ────────────────────────────────────────────────
export async function loadTeams(): Promise<string[]> {
  const snap = await getDoc(doc(db, TEAMS_DOC));
  return snap.exists() ? (snap.data().list as string[]) : [];
}

export async function saveTeams(teams: string[]): Promise<void> {
  await setDoc(doc(db, TEAMS_DOC), { list: teams }, { merge: true });
}

export async function loadTeamColors(): Promise<Record<string, string>> {
  const snap = await getDoc(doc(db, TEAMS_DOC));
  return snap.exists() ? (snap.data().colors as Record<string, string>) || {} : {};
}

export async function saveTeamColors(colors: Record<string, string>): Promise<void> {
  await setDoc(doc(db, TEAMS_DOC), { colors }, { merge: true });
}

// ── UserData (OKR + Priorities + History) ────────────────
export async function loadUserData(userId: string): Promise<UserData | null> {
  const snap = await getDoc(doc(db, USER_DATA_COL, userId));
  return snap.exists() ? (snap.data() as UserData) : null;
}

export async function loadAllUserData(): Promise<UserDataMap> {
  const snap = await getDocs(collection(db, USER_DATA_COL));
  const map: UserDataMap = {};
  snap.docs.forEach((d) => {
    map[d.id] = d.data() as UserData;
  });
  return map;
}

export async function saveUserData(userId: string, data: UserData): Promise<void> {
  await setDoc(doc(db, USER_DATA_COL, userId), data);
}

// ── Leave Requests ──────────────────────────────────────
export async function loadLeaveRequests(): Promise<LeaveRequest[]> {
  const snap = await getDocs(collection(db, LEAVES_COL));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as LeaveRequest);
}

export async function saveLeaveRequest(req: LeaveRequest): Promise<void> {
  const { id, ...data } = req;
  await setDoc(doc(db, LEAVES_COL, id), data);
}

export async function deleteLeaveRequest(id: string): Promise<void> {
  await deleteDoc(doc(db, LEAVES_COL, id));
}

// 실시간 리스너
export function onLeaveRequestsChange(callback: (requests: LeaveRequest[]) => void): () => void {
  return onSnapshot(collection(db, LEAVES_COL), (snap) => {
    const requests = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as LeaveRequest);
    callback(requests);
  });
}

export function onUsersChange(callback: (users: User[]) => void): () => void {
  return onSnapshot(collection(db, USERS_COL), (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as User));
  });
}

export function onUserDataChange(callback: (data: UserDataMap) => void): () => void {
  return onSnapshot(collection(db, USER_DATA_COL), (snap) => {
    const map: UserDataMap = {};
    snap.docs.forEach((d) => { map[d.id] = d.data() as UserData; });
    callback(map);
  });
}

export function onLeaveAllocationsChange(callback: (allocs: LeaveAllocation[]) => void): () => void {
  return onSnapshot(collection(db, LEAVE_ALLOC_COL), (snap) => {
    callback(snap.docs.map((d) => d.data() as LeaveAllocation));
  });
}

// ── Leave Allocations ───────────────────────────────────
export async function loadLeaveAllocations(): Promise<LeaveAllocation[]> {
  const snap = await getDocs(collection(db, LEAVE_ALLOC_COL));
  return snap.docs.map((d) => d.data() as LeaveAllocation);
}

export async function saveLeaveAllocation(alloc: LeaveAllocation): Promise<void> {
  const docId = `${alloc.userId}_${alloc.year}`;
  await setDoc(doc(db, LEAVE_ALLOC_COL, docId), alloc);
}

// ── 시드 데이터 일괄 업로드 ──────────────────────────────
export async function seedFirestore(
  users: User[],
  teams: string[],
  userData: UserDataMap,
): Promise<void> {
  const batch = writeBatch(db);

  // teams
  batch.set(doc(db, TEAMS_DOC), { list: teams });

  // users
  for (const user of users) {
    const { id, ...data } = user;
    batch.set(doc(db, USERS_COL, id), data);
  }

  // userData
  for (const [uid, data] of Object.entries(userData)) {
    batch.set(doc(db, USER_DATA_COL, uid), data);
  }

  await batch.commit();
}
