import type { User, UserDataMap } from '../../types';
import { fmtDate, roleColor, levelColor } from '../../lib/utils';

interface Props {
  users: User[];
  userData: UserDataMap;
}

export default function GanttPanel({ users, userData }: Props) {
  // 전체 주간 수집 (모든 유저의 priorities week 값)
  const allWeeks = new Set<string>();
  users.forEach((u) => {
    userData[u.id]?.current?.priorities?.forEach((p) => allWeeks.add(p.week));
  });
  const weeks = [...allWeeks].sort();

  // 팀 그룹
  const teamGroups: Record<string, User[]> = {};
  users.forEach((u) => {
    if (!userData[u.id]) return;
    const t = u.team || '미배정';
    if (!teamGroups[t]) teamGroups[t] = [];
    teamGroups[t].push(u);
  });

  // OKR 달성률 계산
  const getOkrPct = (u: User) => {
    const okr = userData[u.id]?.current?.okr;
    if (!okr?.objective) return 0;
    return Math.round((okr.level / 10) * 100);
  };

  // 주간별 P 완료 수
  const getWeekP = (u: User, week: string) => {
    const p = userData[u.id]?.current?.priorities?.find((p) => p.week === week);
    if (!p) return null;
    return { count: p.p1.filter(Boolean).length + (p.p2 ? 1 : 0), p };
  };

  if (Object.keys(teamGroups).length === 0) {
    return <div className="text-center py-15 text-slate-400 text-sm">데이터가 없습니다.</div>;
  }

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-slate-800 font-bold text-lg md:text-xl mb-0.5">📊 간트 차트</h2>
        <p className="text-slate-500 text-[13px]">OKR 달성률 + 주간 우선순위 시계열</p>
      </div>

      {Object.entries(teamGroups).map(([team, members]) => (
        <div key={team} className="mb-6">
          {/* 팀 헤더 */}
          <div className="flex items-center gap-2 mb-3">
            <span className="font-bold text-slate-600">{team}</span>
            <span className="text-xs text-slate-400">{members.length}명</span>
          </div>

          {/* 테이블 */}
          <div className="overflow-x-auto -mx-3 px-3 md:mx-0 md:px-0">
            <div style={{ minWidth: Math.max(weeks.length * 90 + 220, 500) }}>
              <div className="bg-white rounded-xl border border-slate-200">
                {/* 헤더 */}
                <div className="flex border-b-2 border-slate-200 bg-slate-50">
                  <div className="w-[220px] shrink-0 px-3 py-2.5 text-xs font-bold text-slate-500 border-r border-slate-200">
                    멤버 / OKR
                  </div>
                  {weeks.map((w) => (
                    <div key={w} className="flex-1 min-w-[90px] text-center text-[11px] font-semibold text-slate-500 py-2.5 border-r border-slate-100 last:border-r-0">
                      {fmtDate(w)}
                    </div>
                  ))}
                </div>

                {/* 멤버 행 */}
                {members
                  .sort((a, b) => (a.role === 'admin' ? 0 : 1) - (b.role === 'admin' ? 0 : 1))
                  .map((u) => {
                    const okr = userData[u.id]?.current?.okr;
                    const pct = getOkrPct(u);

                    return (
                      <div key={u.id} className="border-b border-slate-100 last:border-b-0">
                        {/* 유저 정보 + OKR 달성률 바 */}
                        <div className="flex">
                          <div className="w-[220px] shrink-0 px-3 py-2.5 border-r border-slate-100">
                            <div className="flex items-center gap-2 mb-1.5">
                              <div
                                className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                                style={{ background: roleColor(u.role) }}
                              >
                                {u.name[0]}
                              </div>
                              <div className="min-w-0">
                                <div className="text-[12px] font-bold text-slate-800 truncate">{u.name} {u.role === 'admin' && '🧑‍💼'}</div>
                                <div className="text-[10px] text-slate-500 truncate">{okr?.objective || 'OKR 미설정'}</div>
                              </div>
                            </div>
                            {/* OKR 달성률 바 */}
                            {okr?.objective && (
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all"
                                    style={{ width: `${pct}%`, background: levelColor(okr.level) }}
                                  />
                                </div>
                                <span className="text-[11px] font-bold shrink-0" style={{ color: levelColor(okr.level) }}>{pct}%</span>
                              </div>
                            )}
                          </div>

                          {/* 주간별 셀 */}
                          {weeks.map((w) => {
                            const wp = getWeekP(u, w);
                            return (
                              <div key={w} className="flex-1 min-w-[90px] border-r border-slate-100 last:border-r-0 p-1.5 flex flex-col items-center justify-center group relative">
                                {wp ? (
                                  <>
                                    <div className="text-[11px] font-bold text-primary">P×{wp.count}</div>
                                    <div className="flex gap-0.5 mt-0.5">
                                      {wp.p.p1.map((t: string, i: number) => (
                                        <div
                                          key={i}
                                          className={`w-2 h-2 rounded-full ${t ? 'bg-indigo-400' : 'bg-slate-200'}`}
                                        />
                                      ))}
                                      <div className={`w-2 h-2 rounded-full ${wp.p.p2 ? 'bg-amber-400' : 'bg-slate-200'}`} />
                                    </div>
                                    {/* 툴팁 */}
                                    <div className="hidden group-hover:block absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-800 text-slate-200 text-[11px] rounded-lg p-2.5 w-52 z-[100] shadow-xl border border-slate-600">
                                      <div className="font-bold mb-1.5 text-primary">{u.name} · {fmtDate(w)} 주차</div>
                                      {wp.p.p1.map((t: string, i: number) => t && (
                                        <div key={i} className="flex gap-1 mb-0.5">
                                          <span className="text-[10px] font-bold text-indigo-400 shrink-0">P1-{i + 1}</span>
                                          <span>{t}</span>
                                        </div>
                                      ))}
                                      {wp.p.p2 && (
                                        <div className="flex gap-1 mt-0.5">
                                          <span className="text-[10px] font-bold text-amber-400 shrink-0">P2</span>
                                          <span>{wp.p.p2}</span>
                                        </div>
                                      )}
                                    </div>
                                  </>
                                ) : (
                                  <div className="text-[10px] text-slate-300">—</div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* KR 행 */}
                        {okr?.krs?.filter((k) => k.text).map((kr, ki) => {
                          const krPct = Math.round((kr.level / 10) * 100);
                          return (
                            <div key={kr.id} className="flex bg-slate-50/50">
                              <div className="w-[220px] shrink-0 px-3 py-1.5 pl-12 border-r border-slate-100 flex items-center gap-2">
                                <span className="text-[10px] font-bold text-primary bg-indigo-100 px-1.5 py-0.5 rounded-full shrink-0">KR{ki + 1}</span>
                                <span className="text-[10px] text-slate-600 truncate flex-1">{kr.text}</span>
                                <span className="text-[10px] font-bold shrink-0" style={{ color: levelColor(kr.level) }}>{krPct}%</span>
                              </div>
                              {/* KR은 주간 셀 빈칸 */}
                              {weeks.map((w) => (
                                <div key={w} className="flex-1 min-w-[90px] border-r border-slate-100 last:border-r-0" />
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
