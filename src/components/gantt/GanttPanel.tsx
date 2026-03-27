import { useState } from 'react';
import type { User, UserDataMap } from '../../types';
import { teamColor, fmtDate } from '../../lib/utils';

interface Props {
  users: User[];
  userData: UserDataMap;
}

const DAYS = ['월', '화', '수', '목', '금', '토', '일'];

const USER_COLORS = [
  '#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4',
];

export default function GanttPanel({ users, userData }: Props) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const userColorMap = new Map<string, string>();
  users.forEach((u, i) => userColorMap.set(u.id, USER_COLORS[i % USER_COLORS.length]));

  // 팀 그룹
  const teamGroups: Record<string, User[]> = {};
  users.forEach((u) => {
    if (!userData[u.id]) return;
    const t = u.team || '미배정';
    if (!teamGroups[t]) teamGroups[t] = [];
    teamGroups[t].push(u);
  });

  const prevMonth = () => { if (viewMonth === 0) { setViewYear(viewYear - 1); setViewMonth(11); } else setViewMonth(viewMonth - 1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewYear(viewYear + 1); setViewMonth(0); } else setViewMonth(viewMonth + 1); };
  const goToday = () => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); };

  // 캘린더 그리드
  const firstDay = new Date(viewYear, viewMonth, 1);
  const lastDay = new Date(viewYear, viewMonth + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const calStart = new Date(firstDay);
  calStart.setDate(calStart.getDate() - startOffset);

  const weeks: Date[][] = [];
  const d = new Date(calStart);
  while (d <= lastDay || weeks.length === 0 || weeks[weeks.length - 1].length < 7) {
    if (weeks.length === 0 || weeks[weeks.length - 1].length === 7) weeks.push([]);
    weeks[weeks.length - 1].push(new Date(d));
    d.setDate(d.getDate() + 1);
    if (weeks.length > 6) break;
  }

  const toStr = (dt: Date) => dt.toISOString().slice(0, 10);
  const todayStr = toStr(today);
  const inMonth = (dt: Date) => dt.getMonth() === viewMonth && dt.getFullYear() === viewYear;
  const inRange = (date: string, start: string, end: string) => date >= start && date <= end;

  return (
    <div>
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-slate-800 font-bold text-lg md:text-xl mb-0.5">📊 간트 차트</h2>
          <p className="text-slate-500 text-[13px]">OKR 기간 + 주간 우선순위</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-500 cursor-pointer hover:bg-slate-50 flex items-center justify-center text-sm">←</button>
          <button onClick={goToday} className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 cursor-pointer hover:bg-slate-50 text-xs font-semibold">오늘</button>
          <span className="text-base md:text-lg font-bold text-slate-800 min-w-[100px] md:min-w-[120px] text-center">{viewYear}년 {viewMonth + 1}월</span>
          <button onClick={nextMonth} className="w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-500 cursor-pointer hover:bg-slate-50 flex items-center justify-center text-sm">→</button>
        </div>
      </div>

      {Object.keys(teamGroups).length === 0 && (
        <div className="text-center py-15 text-slate-400 text-sm">데이터가 없습니다.</div>
      )}

      {Object.entries(teamGroups).map(([team, members]) => {
        const tColor = teamColor(team);
        return (
          <div key={team} className="mb-8">
            {/* 팀 헤더 + 범례 */}
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ background: tColor }} />
                <span className="font-bold" style={{ color: tColor }}>{team}</span>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {members.map((u) => {
                  const c = userColorMap.get(u.id) || '#64748b';
                  return (
                    <div key={u.id} className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded" style={{ background: c }} />
                      <span className="text-xs text-slate-600">{u.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 캘린더 — 모바일에서 가로 스크롤 */}
            <div className="overflow-x-auto -mx-3 px-3 md:mx-0 md:px-0">
              <div className="min-w-[640px]">
                <div className="bg-white rounded-xl border border-slate-200">
                  {/* 요일 헤더 */}
                  <div className="grid grid-cols-7 border-b-2 border-slate-200 bg-slate-50">
                    {DAYS.map((day) => (
                      <div key={day} className="text-center text-xs font-semibold text-slate-500 py-2.5 border-r border-slate-100 last:border-r-0">{day}</div>
                    ))}
                  </div>

                  {/* 주 행 */}
                  {weeks.map((weekDates, wi) => {
                    const monday = toStr(weekDates[0]);

                    // 이 주의 우선순위 수집 (week가 이 주 월~일 범위에 포함되는지 체크)
                    const sundayStr = toStr(weekDates[6] || weekDates[weekDates.length - 1]);

                    const weekP = members
                      .map((u) => {
                        const p = userData[u.id]?.current?.priorities?.find((p) => p.week >= monday && p.week <= sundayStr);
                        return p ? { user: u, color: userColorMap.get(u.id) || '#64748b', p } : null;
                      })
                      .filter(Boolean) as { user: User; color: string; p: any }[];

                    return (
                      <div key={wi} className="border-b border-slate-100 last:border-b-0">
                        {/* 날짜 행 */}
                        <div className="grid grid-cols-7">
                          {weekDates.map((dt) => {
                            const dStr = toStr(dt);
                            const im = inMonth(dt);
                            const isToday = dStr === todayStr;

                            const okrUsers = members.filter((u) => {
                              const okr = userData[u.id]?.current?.okr;
                              return okr?.startDate && okr?.endDate && inRange(dStr, okr.startDate, okr.endDate);
                            });

                            const markers = members.flatMap((u) => {
                              const okr = userData[u.id]?.current?.okr;
                              if (!okr?.startDate || !okr?.endDate) return [];
                              const c = userColorMap.get(u.id) || '#64748b';
                              const out = [];
                              if (dStr === okr.startDate) out.push({ u, c, type: 'start' as const, okr });
                              if (dStr === okr.endDate) out.push({ u, c, type: 'end' as const, okr });
                              return out;
                            });

                            let bg = im ? '#fff' : '#fafbfc';
                            if (okrUsers.length === 1) bg = (userColorMap.get(okrUsers[0].id) || '#64748b') + '0d';
                            else if (okrUsers.length > 1) bg = (userColorMap.get(okrUsers[0].id) || '#64748b') + '0a';

                            return (
                              <div
                                key={dStr}
                                className={`border-r border-slate-100 last:border-r-0 px-1 pt-1 pb-0.5 ${isToday ? '' : ''}`}
                                style={{ background: bg }}
                              >
                                <div className="flex items-center gap-0.5 flex-wrap">
                                  <span className={`text-[12px] leading-none ${
                                    isToday ? 'w-6 h-6 rounded-full bg-primary text-white font-bold flex items-center justify-center'
                                    : im ? 'text-slate-800 font-medium' : 'text-slate-300'
                                  }`}>{dt.getDate()}</span>
                                  {/* OKR 기간 중인 유저 점 */}
                                  {okrUsers.map((u) => (
                                    <div key={u.id} className="w-[5px] h-[5px] rounded-full" style={{ background: userColorMap.get(u.id) || '#64748b' }} />
                                  ))}
                                  {markers.length > 0 && (
                                    <div className="flex gap-0.5">
                                      {markers.map((m, mi) => (
                                        <div key={mi} className="group relative">
                                          <div className="text-[8px] font-bold px-1 py-0.5 rounded cursor-default text-white" style={{ background: m.c }}>
                                            {m.type === 'start' ? '시작' : '마감'}
                                          </div>
                                          <div className="hidden group-hover:block absolute right-0 bottom-full mb-1 bg-slate-800 text-slate-200 text-[11px] rounded-lg p-2.5 w-48 z-50 shadow-xl border border-slate-600 whitespace-normal">
                                            <div className="font-bold mb-1" style={{ color: m.c }}>{m.u.name} OKR {m.type === 'start' ? '시작' : '마감'}</div>
                                            <div>🎯 {m.okr.objective}</div>
                                            <div className="text-slate-400 mt-1">Lv.{m.okr.level} · {m.okr.startDate} ~ {m.okr.endDate}</div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* 주간 우선순위 바 — 날짜 바로 아래, 캘린더 배경 위 */}
                        <div className="relative grid grid-cols-7" style={{ minHeight: weekP.length > 0 ? weekP.length * 28 + 8 : 40 }}>
                          {/* 배경 (OKR 기간 색상 이어짐) */}
                          {weekDates.map((dt) => {
                            const dStr = toStr(dt);
                            const okrU = members.filter((u) => {
                              const okr = userData[u.id]?.current?.okr;
                              return okr?.startDate && okr?.endDate && inRange(dStr, okr.startDate, okr.endDate);
                            });
                            let bg = inMonth(dt) ? '#fff' : '#fafbfc';
                            if (okrU.length >= 1) bg = (userColorMap.get(okrU[0].id) || '#64748b') + '0d';
                            return <div key={dStr} className="border-r border-slate-100 last:border-r-0" style={{ background: bg }} />;
                          })}
                          {/* 바 오버레이 */}
                          {weekP.length > 0 && (
                            <div className="absolute inset-0 px-1 py-1 flex flex-col gap-0.5">
                              {weekP.map(({ user: u, color: c, p }) => {
                                const pItems = p.p1.filter(Boolean);
                                return (
                                  <div key={u.id} className="group relative">
                                    <div
                                      className="flex items-center gap-2 rounded-md px-2.5 py-1 text-[11px]"
                                      style={{ background: c + '22', borderLeft: `3px solid ${c}` }}
                                    >
                                      <span className="font-bold shrink-0" style={{ color: c }}>{u.name}</span>
                                      <div className="flex-1 flex flex-wrap items-center gap-x-2 min-w-0 text-slate-700 text-[11px]">
                                        {pItems.map((t: string, i: number) => (
                                          <span key={i} className="flex items-center gap-0.5">
                                            <span className="font-bold text-indigo-500">P1</span>
                                            <span className="truncate max-w-[120px]">{t}</span>
                                          </span>
                                        ))}
                                        {p.p2 && (
                                          <span className="flex items-center gap-0.5">
                                            <span className="font-bold text-amber-500">P2</span>
                                            <span className="truncate max-w-[120px]">{p.p2}</span>
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="hidden group-hover:block absolute left-0 bottom-full mb-1 bg-slate-800 text-slate-200 text-[11px] rounded-lg p-3 w-64 z-[100] shadow-xl border border-slate-600">
                                      <div className="font-bold mb-2" style={{ color: c }}>{u.name} · {fmtDate(p.week)} 주차</div>
                                      {p.p1.map((t: string, i: number) => t && (
                                        <div key={i} className="flex gap-1.5 mb-1">
                                          <span className="text-[10px] font-bold text-indigo-400 shrink-0">P1-{i + 1}</span>
                                          <span>{t}</span>
                                        </div>
                                      ))}
                                      {p.p2 && (
                                        <div className="flex gap-1.5 mt-1">
                                          <span className="text-[10px] font-bold text-amber-400 shrink-0">P2</span>
                                          <span>{p.p2}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
