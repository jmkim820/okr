import { useState } from 'react';
import type { User, WeeklyPriority } from '../../types';
import { fmtWeek, roleColor, levelColor } from '../../lib/utils';
import { useStore } from '../../stores/useStore';

interface Props {
  users: User[];
}

interface GanttTooltip {
  x: number;
  y: number;
  user: User;
  week: string;
  p: WeeklyPriority;
}

interface TextTooltip {
  x: number;
  y: number;
  text: string;
  label?: string;
}

export default function GanttPanel({ users }: Props) {
  const userData = useStore((s) => s.userData);
  const [tooltip, setTooltip] = useState<GanttTooltip | null>(null);
  const [textTip, setTextTip] = useState<TextTooltip | null>(null);
  const [compact, setCompact] = useState(false);
  const [collapsedTeams, setCollapsedTeams] = useState<Set<string>>(new Set());
  const [expandedKr, setExpandedKr] = useState<Set<string>>(new Set());

  const allWeeks = new Set<string>();
  users.forEach((u) => {
    userData[u.id]?.current?.priorities?.forEach((p) => allWeeks.add(p.week));
  });
  const weeks = [...allWeeks].sort();

  const getMonth = (w: string) => parseInt(w.slice(5, 7));

  const teamGroups: Record<string, User[]> = {};
  users.forEach((u) => {
    if (!userData[u.id]) return;
    const t = u.team || '미배정';
    if (!teamGroups[t]) teamGroups[t] = [];
    teamGroups[t].push(u);
  });

  const getOkrPct = (u: User) => {
    const okr = userData[u.id]?.current?.okr;
    if (!okr?.objective) return 0;
    return Math.round((okr.level / 10) * 100);
  };

  const getWeekP = (u: User, week: string) => {
    const p = userData[u.id]?.current?.priorities?.find((p) => p.week === week);
    if (!p) return null;
    return { count: p.p1.filter(Boolean).length + (p.p2 ? 1 : 0), p };
  };

  const handleTextHover = (e: React.MouseEvent, text: string, label?: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTextTip({ x: rect.left + rect.width / 2, y: rect.bottom + 4, text, label });
  };

  const toggleTeam = (team: string) => {
    setCollapsedTeams((prev) => {
      const next = new Set(prev);
      if (next.has(team)) next.delete(team); else next.add(team);
      return next;
    });
  };

  const toggleKr = (userId: string) => {
    setExpandedKr((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId); else next.add(userId);
      return next;
    });
  };

  if (Object.keys(teamGroups).length === 0) {
    return <div className="text-center py-15 text-slate-400 text-sm">데이터가 없습니다.</div>;
  }

  const leftW = compact ? 180 : 220;
  const cellW = compact ? 56 : 68;
  const pySm = compact ? 'py-1' : 'py-1.5';

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-slate-800 font-bold text-lg md:text-xl mb-0.5">📊 간트 차트</h2>
          <p className="text-slate-500 text-[13px]">OKR 달성률 + 주간 우선순위 시계열</p>
        </div>
        <button
          onClick={() => setCompact(!compact)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border-none transition-colors ${
            compact ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          {compact ? '기본 보기' : '컴팩트 보기'}
        </button>
      </div>

      {Object.entries(teamGroups).map(([team, members]) => {
        const isCollapsed = collapsedTeams.has(team);
        return (
          <div key={team} className="mb-4">
            {/* 팀 헤더 — 클릭으로 접기/펼치기 */}
            <div
              className="flex items-center gap-2 mb-2 cursor-pointer select-none group"
              onClick={() => toggleTeam(team)}
            >
              <span className="text-[11px] text-slate-400 group-hover:text-slate-600 transition-colors">
                {isCollapsed ? '▶' : '▼'}
              </span>
              <span className="font-bold text-slate-600">{team}</span>
              <span className="text-xs text-slate-400">{members.length}명</span>
              {isCollapsed && (
                <span className="text-[10px] text-slate-400 ml-1">
                  (평균 {Math.round(members.reduce((s, u) => s + getOkrPct(u), 0) / members.length)}%)
                </span>
              )}
            </div>

            {!isCollapsed && (
              <div className="overflow-x-auto -mx-3 px-3 md:mx-0 md:px-0">
                <div style={{ minWidth: Math.max(weeks.length * cellW + leftW, 400) }}>
                  <div className="bg-white rounded-xl border border-slate-200">
                    {/* 헤더 */}
                    <div className="flex border-b-2 border-slate-200 bg-slate-50">
                      <div className={`w-[${leftW}px] shrink-0 px-2 ${pySm} text-[10px] font-bold text-slate-500 border-r border-slate-200`} style={{ width: leftW }}>
                        멤버 / OKR
                      </div>
                      {weeks.map((w, wi) => {
                        const isMonthBorder = wi > 0 && getMonth(w) !== getMonth(weeks[wi - 1]);
                        return (
                          <div
                            key={w}
                            className={`flex-1 text-center text-[9px] font-semibold text-slate-500 ${pySm} border-r border-slate-100 last:border-r-0 ${
                              isMonthBorder ? '!border-l-2 !border-l-slate-300' : ''
                            }`}
                            style={{ minWidth: cellW }}
                          >
                            {fmtWeek(w)}
                          </div>
                        );
                      })}
                    </div>

                    {/* 멤버 행 */}
                    {members
                      .sort((a, b) => (a.role === 'admin' ? 0 : 1) - (b.role === 'admin' ? 0 : 1))
                      .map((u) => {
                        const okr = userData[u.id]?.current?.okr;
                        const pct = getOkrPct(u);
                        const hasKr = okr?.krs?.some((k) => k.text);
                        const krExpanded = expandedKr.has(u.id);

                        return (
                          <div key={u.id} className="border-b border-slate-100 last:border-b-0">
                            <div className="flex">
                              <div className="shrink-0 px-2 border-r border-slate-100" style={{ width: leftW, padding: compact ? '6px 8px' : '8px 12px' }}>
                                <div className="flex items-center gap-1.5 mb-1">
                                  <div
                                    className={`${compact ? 'w-5 h-5 text-[9px]' : 'w-6 h-6 text-[10px]'} rounded-full flex items-center justify-center font-bold text-white shrink-0`}
                                    style={{ background: roleColor(u.role) }}
                                  >
                                    {u.name[0]}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className={`${compact ? 'text-[10px]' : 'text-[11px]'} font-bold text-slate-800 truncate`}>
                                      {u.name} {u.role === 'admin' && '🧑‍💼'}
                                    </div>
                                    <div
                                      className={`${compact ? 'text-[9px]' : 'text-[10px]'} text-slate-500 truncate font-semibold cursor-default`}
                                      onMouseEnter={(e) => okr?.objective && handleTextHover(e, okr.objective, 'Objective')}
                                      onMouseLeave={() => setTextTip(null)}
                                    >
                                      {okr?.objective || 'OKR 미설정'}
                                    </div>
                                  </div>
                                  {/* KR 펼치기 버튼 */}
                                  {hasKr && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); toggleKr(u.id); }}
                                      className="bg-transparent border-none cursor-pointer text-[9px] text-slate-400 hover:text-slate-600 shrink-0 px-0.5"
                                      title={krExpanded ? 'KR 숨기기' : 'KR 보기'}
                                    >
                                      {krExpanded ? '▲' : '▼'}
                                    </button>
                                  )}
                                </div>
                                {okr?.objective && (
                                  <div className="flex items-center gap-1.5">
                                    <div className={`flex-1 ${compact ? 'h-1.5' : 'h-2'} bg-slate-100 rounded-full overflow-hidden`}>
                                      <div
                                        className="h-full rounded-full transition-all"
                                        style={{ width: `${pct}%`, background: levelColor(okr.level) }}
                                      />
                                    </div>
                                    <span className={`${compact ? 'text-[9px]' : 'text-[10px]'} font-bold shrink-0`} style={{ color: levelColor(okr.level) }}>{pct}%</span>
                                  </div>
                                )}
                              </div>

                              {/* 주간별 셀 */}
                              {weeks.map((w, wi) => {
                                const wp = getWeekP(u, w);
                                const isMonthBorder = wi > 0 && getMonth(w) !== getMonth(weeks[wi - 1]);
                                return (
                                  <div
                                    key={w}
                                    className={`flex-1 border-r border-slate-100 last:border-r-0 p-1 flex flex-col items-center justify-center ${
                                      isMonthBorder ? '!border-l-2 !border-l-slate-300' : ''
                                    }`}
                                    style={{ minWidth: cellW }}
                                    onMouseEnter={(e) => {
                                      if (!wp) return;
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      setTooltip({ x: rect.left + rect.width / 2, y: rect.bottom + 4, user: u, week: w, p: wp.p });
                                    }}
                                    onMouseLeave={() => setTooltip(null)}
                                  >
                                    {wp ? (
                                      <>
                                        <div className={`${compact ? 'text-[9px]' : 'text-[10px]'} font-bold text-primary`}>P×{wp.count}</div>
                                        {!compact && (
                                          <div className="flex gap-0.5 mt-0.5">
                                            {wp.p.p1.map((t: string, i: number) => (
                                              <div key={i} className={`w-1.5 h-1.5 rounded-full ${t ? 'bg-indigo-400' : 'bg-slate-200'}`} />
                                            ))}
                                            <div className={`w-1.5 h-1.5 rounded-full ${wp.p.p2 ? 'bg-amber-400' : 'bg-slate-200'}`} />
                                          </div>
                                        )}
                                      </>
                                    ) : (
                                      <div className={`${compact ? 'text-[8px]' : 'text-[10px]'} text-slate-300`}>—</div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {/* KR 행 — 펼쳤을 때만 표시 */}
                            {krExpanded && okr?.krs?.filter((k) => k.text).map((kr, ki) => {
                              const krPct = Math.round((kr.level / 10) * 100);
                              return (
                                <div key={kr.id} className="flex bg-slate-50/50">
                                  <div className="shrink-0 px-2 pl-8 border-r border-slate-100 flex items-center gap-1.5" style={{ width: leftW, padding: compact ? '3px 8px 3px 28px' : '4px 12px 4px 40px' }}>
                                    <span className="text-[9px] font-bold text-primary bg-indigo-100 px-1 py-0.5 rounded-full shrink-0">KR{ki + 1}</span>
                                    <span
                                      className="text-[9px] text-slate-600 truncate flex-1 cursor-default"
                                      onMouseEnter={(e) => handleTextHover(e, kr.text, `KR${ki + 1}`)}
                                      onMouseLeave={() => setTextTip(null)}
                                    >
                                      {kr.text}
                                    </span>
                                    <span className="text-[9px] font-bold shrink-0" style={{ color: levelColor(kr.level) }}>{krPct}%</span>
                                  </div>
                                  {weeks.map((w, wi) => {
                                    const isMonthBorder = wi > 0 && getMonth(w) !== getMonth(weeks[wi - 1]);
                                    return (
                                      <div key={w} className={`flex-1 border-r border-slate-100 last:border-r-0 ${isMonthBorder ? '!border-l-2 !border-l-slate-300' : ''}`} style={{ minWidth: cellW }} />
                                    );
                                  })}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Weekly tooltip (fixed) */}
      {tooltip && (
        <div
          className="fixed z-[200] bg-slate-800 text-slate-200 text-[11px] rounded-lg p-2.5 w-fit max-w-xs shadow-xl border border-slate-600 pointer-events-none whitespace-nowrap"
          style={{ left: tooltip.x, top: tooltip.y, transform: 'translateX(-50%)' }}
        >
          <div className="font-bold mb-1.5 text-primary">{tooltip.user.name} · {fmtWeek(tooltip.week)}</div>
          {tooltip.p.p1.map((t: string, i: number) => t && (
            <div key={i} className="flex gap-1 mb-0.5">
              <span className="text-[10px] font-bold text-indigo-400 shrink-0">P1-{i + 1}</span>
              <span>{t}</span>
            </div>
          ))}
          {tooltip.p.p2 && (
            <div className="flex gap-1 mt-0.5">
              <span className="text-[10px] font-bold text-amber-400 shrink-0">P2</span>
              <span>{tooltip.p.p2}</span>
            </div>
          )}
        </div>
      )}

      {/* Text tooltip (fixed) — O/KR hover */}
      {textTip && (
        <div
          className="fixed z-[200] bg-slate-800 text-slate-200 text-[12px] rounded-lg p-2.5 w-fit max-w-sm shadow-xl border border-slate-600 pointer-events-none"
          style={{ left: textTip.x, top: textTip.y, transform: 'translateX(-50%)' }}
        >
          {textTip.label && <div className="text-[10px] font-bold text-primary mb-1">{textTip.label}</div>}
          {textTip.text}
        </div>
      )}
    </div>
  );
}
