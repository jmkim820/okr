import type { User, UserDataMap } from '../../types';
import { roleColor, levelColor, getMondayStr, fmtWeek } from '../../lib/utils';
import Card from '../ui/Card';

interface Props {
  users: User[];
  teams: string[];
  userData: UserDataMap;
}

export default function Dashboard({ users, teams, userData }: Props) {
  const thisMonday = getMondayStr();

  // 전체 통계
  const totalUsers = users.length;
  const okrSet = users.filter((u) => userData[u.id]?.current?.okr?.objective).length;
  const thisWeekDone = users.filter((u) =>
    userData[u.id]?.current?.priorities?.some((p) => p.week === thisMonday)
  ).length;
  const avgLevel = users.reduce((sum, u) => sum + (userData[u.id]?.current?.okr?.level || 0), 0) / (totalUsers || 1);

  // 팀별 평균 레벨
  const teamStats = teams.map((team) => {
    const members = users.filter((u) => u.team === team);
    const avg = members.reduce((s, u) => s + (userData[u.id]?.current?.okr?.level || 0), 0) / (members.length || 1);
    const weekDone = members.filter((u) =>
      userData[u.id]?.current?.priorities?.some((p) => p.week === thisMonday)
    ).length;
    return { team, members: members.length, avg: Math.round(avg * 10) / 10, weekDone };
  });

  // 이번 주 우선순위 미등록자
  const missingWeek = users.filter((u) =>
    userData[u.id] && !userData[u.id].current.priorities.some((p) => p.week === thisMonday)
  );

  // 레벨 낮은 OKR (level <= 4)
  const lowOkrs = users
    .filter((u) => {
      const okr = userData[u.id]?.current?.okr;
      return okr?.objective && okr.level <= 4;
    })
    .map((u) => ({ user: u, okr: userData[u.id].current.okr }));

  return (
    <div>
      <h2 className="text-slate-800 font-bold text-lg md:text-xl mb-1">📊 대시보드</h2>
      <p className="text-slate-500 text-[13px] mb-5">전체 OKR 현황 · {fmtWeek(thisMonday)} 기준</p>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <div className="text-2xl font-bold text-primary">{totalUsers}</div>
          <div className="text-xs text-slate-500 mt-1">전체 인원</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <div className="text-2xl font-bold text-green-500">{okrSet}</div>
          <div className="text-xs text-slate-500 mt-1">OKR 설정 완료</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <div className="text-2xl font-bold" style={{ color: levelColor(Math.round(avgLevel)) }}>{avgLevel.toFixed(1)}</div>
          <div className="text-xs text-slate-500 mt-1">평균 OKR 레벨</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <div className="text-2xl font-bold" style={{ color: thisWeekDone === totalUsers ? '#22c55e' : '#f59e0b' }}>{thisWeekDone}/{totalUsers}</div>
          <div className="text-xs text-slate-500 mt-1">이번 주 P 등록</div>
        </div>
      </div>

      {/* 팀별 현황 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        {teamStats.map(({ team, members, avg, weekDone }) => (
          <div key={team} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full" style={{ background: '#64748b' }} />
              <span className="font-bold text-sm" style={{ color: '#64748b' }}>{team}</span>
              <span className="text-xs text-slate-400">{members}명</span>
            </div>
            <div className="flex justify-between items-end">
              <div>
                <div className="text-[11px] text-slate-500 mb-0.5">평균 레벨</div>
                <div className="text-xl font-bold" style={{ color: levelColor(Math.round(avg)) }}>{avg}</div>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-slate-500 mb-0.5">주간 P 등록</div>
                <div className="text-xl font-bold" style={{ color: weekDone === members ? '#22c55e' : '#f59e0b' }}>{weekDone}/{members}</div>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-slate-500 mb-0.5">달성률</div>
                <div className="text-xl font-bold" style={{ color: levelColor(Math.round(avg)) }}>{Math.round(avg * 10)}%</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 이번 주 미등록자 */}
        <Card title={`⚠️ 이번 주 우선순위 미등록 (${missingWeek.length}명)`}>
          {missingWeek.length === 0 ? (
            <div className="text-sm text-green-500 font-semibold">모든 인원이 등록 완료!</div>
          ) : (
            <div className="flex flex-col gap-2">
              {teams.map((team) => {
                const members = missingWeek.filter((u) => u.team === team);
                if (!members.length) return null;
                return (
                  <div key={team}>
                    <div className="flex items-center gap-1 mb-1">
                      <div className="w-2 h-2 rounded-full" style={{ background: '#64748b' }} />
                      <span className="text-[11px] font-bold" style={{ color: '#64748b' }}>{team}</span>
                    </div>
                    {members.map((u) => (
                      <div key={u.id} className="flex items-center gap-2 text-sm ml-3 mb-1">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                          style={{ background: roleColor(u.role) }}
                        >
                          {u.name[0]}
                        </div>
                        <span className="text-slate-700">{u.name}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
              {/* 미배정 */}
              {missingWeek.filter((u) => !teams.includes(u.team)).length > 0 && (
                <div>
                  <div className="text-[11px] font-bold text-slate-400 mb-1">미배정</div>
                  {missingWeek.filter((u) => !teams.includes(u.team)).map((u) => (
                    <div key={u.id} className="flex items-center gap-2 text-sm ml-3 mb-1">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 bg-slate-400">
                        {u.name[0]}
                      </div>
                      <span className="text-slate-700">{u.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>

        {/* 주의 필요 OKR */}
        <Card title={`🔻 레벨 낮은 OKR (Lv.4 이하, ${lowOkrs.length}건)`}>
          {lowOkrs.length === 0 ? (
            <div className="text-sm text-green-500 font-semibold">모든 OKR이 양호합니다!</div>
          ) : (
            <div className="flex flex-col gap-2">
              {lowOkrs.map(({ user: u, okr }) => (
                <div key={u.id} className="flex items-start gap-2">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5"
                    style={{ background: roleColor(u.role) }}
                  >
                    {u.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-slate-700 font-medium">{u.name} <span className="text-[11px] text-slate-400">{u.team}</span></div>
                    <div className="text-xs text-slate-500 truncate">🎯 {okr.objective}</div>
                  </div>
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0"
                    style={{ color: levelColor(okr.level), background: levelColor(okr.level) + '18' }}
                  >
                    Lv.{okr.level}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* 전체 멤버 OKR 요약 */}
      <Card title="📋 전체 멤버 OKR 요약" className="mt-4">
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-2 px-2 font-semibold">이름</th>
                <th className="py-2 px-2 font-semibold">팀</th>
                <th className="py-2 px-2 font-semibold">Objective</th>
                <th className="py-2 px-2 font-semibold text-center">레벨</th>
                <th className="py-2 px-2 font-semibold text-center">KR</th>
                <th className="py-2 px-2 font-semibold text-center">주간 P</th>
              </tr>
            </thead>
            <tbody>
              {teams.flatMap((team) =>
                users
                  .filter((u) => u.team === team)
                  .sort((a, b) => (a.role === 'admin' ? 0 : 1) - (b.role === 'admin' ? 0 : 1))
                  .map((u) => {
                    const d = userData[u.id];
                    const okr = d?.current?.okr;
                    const pLen = d?.current?.priorities?.length || 0;
                    const hasThisWeek = d?.current?.priorities?.some((p) => p.week === thisMonday);
                    return (
                      <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-2 px-2 font-medium text-slate-800">
                          {u.name} {u.role === 'admin' && <span className="text-[10px]">🧑‍💼</span>}
                        </td>
                        <td className="py-2 px-2">
                          <span className="text-[11px] font-semibold" style={{ color: '#64748b' }}>{u.team}</span>
                        </td>
                        <td className="py-2 px-2 text-slate-600 max-w-[200px] truncate">{okr?.objective || <span className="text-slate-300">미설정</span>}</td>
                        <td className="py-2 px-2 text-center">
                          {okr?.objective ? (
                            <span className="font-bold" style={{ color: levelColor(okr.level) }}>{okr.level}</span>
                          ) : '-'}
                        </td>
                        <td className="py-2 px-2 text-center">
                          {okr?.krs?.filter((k) => k.text).map((k) => (
                            <span key={k.id} className="inline-block mx-0.5 font-bold" style={{ color: levelColor(k.level) }}>{k.level}</span>
                          ))}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <span className={`text-[11px] font-semibold ${hasThisWeek ? 'text-green-500' : 'text-red-400'}`}>
                            {pLen}주 {hasThisWeek ? '✓' : '✗'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
