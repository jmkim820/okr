import {
  doc, setDoc, getDoc, getDocs, deleteDoc,
  collection, writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import type { User, UserData, UserDataMap } from '../types';

// ── Firestore 활성화 여부 ────────────────────────────────
// .env에 projectId가 없으면 인메모리 모드(시드 데이터)로 동작
export const isFirestoreEnabled = (): boolean =>
  !!import.meta.env.VITE_FIREBASE_PROJECT_ID;

// ── Collections ──────────────────────────────────────────
const USERS_COL = 'okr_users';
const TEAMS_DOC = 'okr_config/teams';
const USER_DATA_COL = 'okr_userData';

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
