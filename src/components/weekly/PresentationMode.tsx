import { useState, useEffect, useCallback } from 'react';
import type { User, UserDataMap, WeeklyPriority } from '../../types';
import { getMondayStr, fmtWeek, roleColor } from '../../lib/utils';

interface Props {
  users: User[];
  userData: UserDataMap;
  onClose: () => void;
}

const TEAM_ORDER = ['앱개발팀', '웹개발팀', '고객지원팀', '컨설팅팀'];

const MEMBER_ORDER: Record<string, string[]> = {
  '앱개발팀': ['인동용', '홍원주', '장인성', '박정우'],
  '웹개발팀': ['김재엽', '정우진', '김재민', '김은별'],
  '고객지원팀': ['김준수', '강지현', '강채연'],
  '컨설팅팀': ['김정민', '천지'],
};

function orderUsers(users: User[]): User[] {
  const grouped: Record<string, User[]> = {};
  users.forEach((u) => {
    const t = u.team || '미배정';
    if (!grouped[t]) grouped[t] = [];
    grouped[t].push(u);
  });

  for (const t of Object.keys(grouped)) {
    const order = MEMBER_ORDER[t];
    if (order) {
      grouped[t].sort((a, b) => {
        const ai = order.indexOf(a.name);
        const bi = order.indexOf(b.name);
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      });
    }
  }

  const ordered: User[] = [];
  const teamKeys = [
    ...TEAM_ORDER.filter((t) => grouped[t]),
    ...Object.keys(grouped).filter((t) => !TEAM_ORDER.includes(t)),
  ];
  teamKeys.forEach((t) => ordered.push(...grouped[t]));
  return ordered;
}

export default function PresentationMode({ users, userData, onClose }: Props) {
  const orderedUsers = orderUsers(users.filter((u) => u.role !== 'superadmin'));
  const [idx, setIdx] = useState(0);
  const [week, setWeek] = useState(getMondayStr());

  const allWeeks = Array.from(
    new Set(
      Object.values(userData).flatMap((d) =>
        d?.current?.priorities?.map((p) => p.week) || []
      )
    )
  ).sort().reverse();

  const [showPrevWeek, setShowPrevWeek] = useState(false);

  const user = orderedUsers[idx];
  const data = user ? userData[user.id] : null;
  const priority: WeeklyPriority | undefined = data?.current?.priorities?.find(
    (p) => p.week === week
  );

  // 이전 주차 계산
  const prevWeekDate = new Date(week);
  prevWeekDate.setDate(prevWeekDate.getDate() - 7);
  const prevWeekStr = prevWeekDate.toISOString().slice(0, 10);
  const prevPriority: WeeklyPriority | undefined = data?.current?.priorities?.find(
    (p) => p.week === prevWeekStr
  );

  const prev = useCallback(() => setIdx((i) => Math.max(0, i - 1)), []);
  const next = useCallback(() => setIdx((i) => Math.min(orderedUsers.length - 1, i + 1)), [orderedUsers.length]);

  const prevWeek = useCallback(() => {
    setWeek((w) => {
      const i = allWeeks.indexOf(w);
      return i > 0 ? allWeeks[i - 1] : w;
    });
  }, [allWeeks]);

  const nextWeek = useCallback(() => {
    setWeek((w) => {
      const i = allWeeks.indexOf(w);
      return i < allWeeks.length - 1 ? allWeeks[i + 1] : w;
    });
  }, [allWeeks]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight' || e.key === ' ') next();
      else if (e.key === 'ArrowUp') { e.preventDefault(); prevWeek(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); nextWeek(); }
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [prev, next, prevWeek, nextWeek, onClose]);

  if (!user) return null;

  const isNewTeam = idx === 0 || orderedUsers[idx - 1]?.team !== user.team;

  return (
    <div className="fixed inset-0 z-[2000] bg-slate-900 flex">
      {/* Left: 주차 미리보기 패널 */}
      <div className="w-[240px] bg-slate-800 border-r border-slate-700 flex flex-col shrink-0">
        <div className="px-4 py-3 border-b border-slate-700">
          <span className="text-white font-bold text-sm">📅 주차 선택</span>
        </div>
        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-2">
          {allWeeks.map((w) => {
            const wp = data?.current?.priorities?.find((p) => p.week === w);
            return (
              <button
                key={w}
                onClick={() => setWeek(w)}
                className={`w-full text-left rounded-xl p-3 border-2 cursor-pointer transition-colors ${
                  w === week
                    ? 'bg-blue-600/20 border-blue-500'
                    : 'bg-slate-750 border-slate-700 hover:border-slate-500'
                }`}
              >
                <div className={`text-xs font-bold mb-1.5 ${w === week ? 'text-blue-300' : 'text-slate-400'}`}>
                  {fmtWeek(w)}
                  {w === getMondayStr() && <span className="ml-1 opacity-70">(이번 주)</span>}
                </div>
                {wp ? (
                  <div className="space-y-1">
                    {wp.p1.map((t, i) =>
                      t ? (
                        <div key={i} className="flex items-start gap-1.5">
                          <span className="text-[9px] font-bold text-blue-400 bg-blue-500/20 rounded px-1 py-0.5 shrink-0 leading-none mt-0.5">P1</span>
                          <span className="text-[11px] text-slate-300 leading-tight line-clamp-1">{t}</span>
                        </div>
                      ) : null
                    )}
                    {wp.p2 && (
                      <div className="flex items-start gap-1.5">
                        <span className="text-[9px] font-bold text-amber-400 bg-amber-500/20 rounded px-1 py-0.5 shrink-0 leading-none mt-0.5">P2</span>
                        <span className="text-[11px] text-slate-300 leading-tight line-clamp-1">{wp.p2}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-600">미등록</div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: 메인 영역 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-3 bg-slate-800 border-b border-slate-700">
          <div className="flex items-center gap-4">
            <span className="text-white font-bold text-lg">📋 주간 우선순위 발표</span>
            <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-500">
              <span className="bg-slate-700 rounded px-1.5 py-0.5">←→</span> 팀원 이동
              <span className="bg-slate-700 rounded px-1.5 py-0.5 ml-1">↑↓</span> 주차 이동
              <span className="bg-slate-700 rounded px-1.5 py-0.5 ml-1">ESC</span> 닫기
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-slate-400 text-sm">
              {idx + 1} / {orderedUsers.length}
            </span>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white text-xl bg-transparent border-none cursor-pointer px-2"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Slide */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 overflow-y-auto py-6">
          {isNewTeam && (
            <div className="mb-4 px-5 py-1.5 rounded-full bg-slate-700 text-slate-300 text-sm font-semibold">
              {user.team || '미배정'}
            </div>
          )}

          <div className="flex items-center gap-4 mb-8">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold text-white"
              style={{ background: roleColor(user.role) }}
            >
              {user.name[0]}
            </div>
            <div>
              <div className="text-white text-3xl font-bold">{user.name}</div>
              <div className="text-slate-400 text-base">{user.team}</div>
            </div>
          </div>

          {priority ? (
            <div className="w-full max-w-3xl space-y-4">
              {priority.p1.map((text, i) =>
                text ? (
                  <div key={i} className="bg-slate-800 border border-slate-600 rounded-2xl px-6 py-5 flex items-start gap-4">
                    <span className="bg-blue-500 text-white text-sm font-bold rounded-lg px-3 py-1 shrink-0 mt-0.5">
                      P1-{i + 1}
                    </span>
                    <div>
                      <div className="text-white text-xl leading-relaxed whitespace-pre-wrap">{text}</div>
                      {priority.krTags?.[i] && (
                        <span className="inline-block mt-2 bg-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded-md text-sm">
                          {priority.krTags[i].toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                ) : null
              )}

              {priority.p2 && (
                <div className="bg-slate-800 border border-amber-600/40 rounded-2xl px-6 py-5 flex items-start gap-4">
                  <span className="bg-amber-500 text-white text-sm font-bold rounded-lg px-3 py-1 shrink-0 mt-0.5">
                    P2
                  </span>
                  <div className="text-white text-xl leading-relaxed whitespace-pre-wrap">{priority.p2}</div>
                </div>
              )}

              {priority.note && (
                <div className="text-slate-400 text-base mt-2 whitespace-pre-wrap px-2">
                  📝 {priority.note}
                </div>
              )}
            </div>
          ) : (
            <div className="text-slate-500 text-xl">이번 주 우선순위가 등록되지 않았습니다.</div>
          )}

          {/* 지난주 토글 */}
          {prevPriority && (
            <div className="w-full max-w-3xl mt-6">
              <button
                onClick={() => setShowPrevWeek((v) => !v)}
                className="flex items-center gap-2 text-slate-500 hover:text-slate-300 bg-transparent border-none cursor-pointer text-sm font-semibold mb-3 transition-colors"
              >
                <span className="text-xs">{showPrevWeek ? '▼' : '▶'}</span>
                📅 지난주 ({fmtWeek(prevWeekStr)})
              </button>
              {showPrevWeek && (
                <div className="space-y-2 opacity-70">
                  {prevPriority.p1.map((text, i) =>
                    text ? (
                      <div key={i} className="bg-slate-800/60 border border-slate-700 rounded-xl px-5 py-3 flex items-start gap-3">
                        <span className="bg-blue-500/50 text-blue-200 text-xs font-bold rounded-md px-2 py-0.5 shrink-0 mt-0.5">
                          P1-{i + 1}
                        </span>
                        <div className="text-slate-300 text-base leading-relaxed whitespace-pre-wrap">{text}</div>
                      </div>
                    ) : null
                  )}
                  {prevPriority.p2 && (
                    <div className="bg-slate-800/60 border border-amber-700/30 rounded-xl px-5 py-3 flex items-start gap-3">
                      <span className="bg-amber-500/50 text-amber-200 text-xs font-bold rounded-md px-2 py-0.5 shrink-0 mt-0.5">
                        P2
                      </span>
                      <div className="text-slate-300 text-base leading-relaxed whitespace-pre-wrap">{prevPriority.p2}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom nav */}
        <div className="flex items-center justify-between px-8 py-4 bg-slate-800 border-t border-slate-700">
          <button
            onClick={prev}
            disabled={idx === 0}
            className={`px-6 py-2.5 rounded-lg font-semibold text-sm border-none cursor-pointer transition-colors ${
              idx === 0 ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-slate-600 text-white hover:bg-slate-500'
            }`}
          >
            ← 이전
          </button>

          <div className="flex gap-1.5 items-center overflow-x-auto max-w-[60%] py-1">
            {orderedUsers.map((u, i) => (
              <button
                key={u.id}
                onClick={() => setIdx(i)}
                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-[11px] font-bold transition-all cursor-pointer shrink-0 ${
                  i === idx
                    ? 'border-blue-400 text-white scale-110'
                    : 'border-transparent text-slate-400 hover:border-slate-500'
                }`}
                style={{ background: i === idx ? roleColor(u.role) : '#334155' }}
                title={u.name}
              >
                {u.name[0]}
              </button>
            ))}
          </div>

          <button
            onClick={next}
            disabled={idx === orderedUsers.length - 1}
            className={`px-6 py-2.5 rounded-lg font-semibold text-sm border-none cursor-pointer transition-colors ${
              idx === orderedUsers.length - 1 ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-500'
            }`}
          >
            다음 →
          </button>
        </div>
      </div>
    </div>
  );
}
