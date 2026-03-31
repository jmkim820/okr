import { useState } from 'react';
import type { User, ArchivedQuarter } from '../../types';
import { fmtWeek, levelColor, quarterLabel } from '../../lib/utils';
import Card from '../ui/Card';

interface Props {
  user: User;
  history: ArchivedQuarter[];
}

export default function HistoryPanel({ user, history }: Props) {
  const [selected, setSelected] = useState<ArchivedQuarter | null>(null);
  const [showGantt, setShowGantt] = useState(false);
  const sorted = [...history].sort((a, b) => b.quarter.localeCompare(a.quarter));

  if (!history.length) {
    return (
      <div>
        <h2 className="text-slate-800 font-bold text-xl mb-1">🗂 분기 히스토리</h2>
        <div className="text-center py-15 text-slate-400 text-sm">저장된 분기 기록이 없습니다.</div>
      </div>
    );
  }

  return (
    <div className="max-w-[860px]">
      <h2 className="text-slate-800 font-bold text-xl mb-1">🗂 {user.name}의 분기 히스토리</h2>
      <p className="text-slate-500 text-[13px] mb-5">종료된 분기 OKR과 주간 우선순위 기록입니다.</p>

      <div className="flex gap-2.5 flex-wrap mb-5">
        {sorted.map((h) => (
          <button
            key={h.quarter}
            onClick={() => { setSelected(selected?.quarter === h.quarter ? null : h); setShowGantt(false); }}
            className={`rounded-[10px] px-5 py-2.5 cursor-pointer font-bold text-sm transition-colors ${
              selected?.quarter === h.quarter
                ? 'bg-primary text-white border-2 border-primary'
                : 'bg-white text-slate-700 border-2 border-slate-200 hover:border-primary'
            }`}
          >
            {quarterLabel(h.quarter)}
            <div className="text-[11px] font-normal mt-0.5">{h.priorities.length}주 기록</div>
          </button>
        ))}
      </div>

      {selected && (
        <div>
          <Card title={`🎯 ${quarterLabel(selected.quarter)} Objective`} className="mb-4">
            <div className="flex justify-between items-center mb-3">
              <span className="text-base font-bold text-slate-800">{selected.okr.objective}</span>
              <span
                className="text-[13px] font-bold px-3 py-0.5 rounded-[20px]"
                style={{ color: levelColor(selected.okr.level), background: levelColor(selected.okr.level) + '22' }}
              >
                Lv.{selected.okr.level}
              </span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {selected.okr.krs.filter((k) => k.text).map((k, i) => (
                <div key={k.id} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 min-w-[180px] flex-1">
                  <div className="text-[11px] font-bold text-primary mb-1">KR{i + 1}</div>
                  <div className="text-[13px] text-slate-700 mb-1">{k.text}</div>
                  <div className="text-xs font-bold" style={{ color: levelColor(k.level) }}>
                    Lv.{k.level} ({Math.round((k.level / 10) * 100)}%)
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* 간트차트 보기 토글 */}
          <div className="mb-4">
            <button
              onClick={() => setShowGantt(!showGantt)}
              className={`rounded-lg px-4 py-2 cursor-pointer text-sm font-semibold transition-colors border-none ${
                showGantt ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
              }`}
            >
              📊 {showGantt ? '간트차트 닫기' : '간트차트 보기'}
            </button>
          </div>

          {showGantt && (
            <Card className="mb-4">
              {(() => {
                const weeks = [...selected.priorities].sort((a, b) => a.week.localeCompare(b.week));
                if (weeks.length === 0) return <div className="text-center text-slate-400 text-sm py-4">주간 데이터가 없습니다.</div>;

                const getMonth = (w: string) => parseInt(w.slice(5, 7));
                const okr = selected.okr;
                const pct = Math.round((okr.level / 10) * 100);

                return (
                  <div className="overflow-x-auto">
                    <div style={{ minWidth: Math.max(weeks.length * 68 + 200, 400) }}>
                      {/* 헤더 */}
                      <div className="flex border-b-2 border-slate-200 bg-slate-50 rounded-t-lg">
                        <div className="w-[200px] shrink-0 px-3 py-2 text-xs font-bold text-slate-500 border-r border-slate-200">
                          OKR / 주간
                        </div>
                        {weeks.map((p, wi) => {
                          const isMonthBorder = wi > 0 && getMonth(p.week) !== getMonth(weeks[wi - 1].week);
                          return (
                            <div key={p.week} className={`flex-1 min-w-[68px] text-center text-[10px] font-semibold text-slate-500 py-2 border-r border-slate-100 last:border-r-0 ${isMonthBorder ? '!border-l-2 !border-l-slate-300' : ''}`}>
                              {fmtWeek(p.week)}
                            </div>
                          );
                        })}
                      </div>

                      {/* OKR 행 */}
                      <div className="flex border-b border-slate-100">
                        <div className="w-[200px] shrink-0 px-3 py-2 border-r border-slate-100">
                          <div className="text-[11px] font-bold text-slate-800 truncate mb-1">{okr.objective}</div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: levelColor(okr.level) }} />
                            </div>
                            <span className="text-[10px] font-bold" style={{ color: levelColor(okr.level) }}>{pct}%</span>
                          </div>
                        </div>
                        {weeks.map((p, wi) => {
                          const count = p.p1.filter(Boolean).length + (p.p2 ? 1 : 0);
                          const isMonthBorder = wi > 0 && getMonth(p.week) !== getMonth(weeks[wi - 1].week);
                          return (
                            <div key={p.week} className={`flex-1 min-w-[68px] border-r border-slate-100 last:border-r-0 p-1.5 flex flex-col items-center justify-center ${isMonthBorder ? '!border-l-2 !border-l-slate-300' : ''}`}>
                              <div className="text-[11px] font-bold text-primary">P×{count}</div>
                              <div className="flex gap-0.5 mt-0.5">
                                {p.p1.map((t, i) => (
                                  <div key={i} className={`w-2 h-2 rounded-full ${t ? 'bg-indigo-400' : 'bg-slate-200'}`} />
                                ))}
                                <div className={`w-2 h-2 rounded-full ${p.p2 ? 'bg-amber-400' : 'bg-slate-200'}`} />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* KR 행 */}
                      {okr.krs.filter((k) => k.text).map((kr, ki) => {
                        const krPct = Math.round((kr.level / 10) * 100);
                        return (
                          <div key={kr.id} className="flex bg-slate-50/50 border-b border-slate-100 last:border-b-0">
                            <div className="w-[200px] shrink-0 px-3 py-1.5 pl-10 border-r border-slate-100 flex items-center gap-2">
                              <span className="text-[10px] font-bold text-primary bg-indigo-100 px-1.5 py-0.5 rounded-full shrink-0">KR{ki + 1}</span>
                              <span className="text-[10px] text-slate-600 truncate flex-1">{kr.text}</span>
                              <span className="text-[10px] font-bold shrink-0" style={{ color: levelColor(kr.level) }}>{krPct}%</span>
                            </div>
                            {weeks.map((p, wi) => {
                              const isMonthBorder = wi > 0 && getMonth(p.week) !== getMonth(weeks[wi - 1].week);
                              return (
                                <div key={p.week} className={`flex-1 min-w-[68px] border-r border-slate-100 last:border-r-0 ${isMonthBorder ? '!border-l-2 !border-l-slate-300' : ''}`} />
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </Card>
          )}

          <Card title="✅ 주간 우선순위 기록">
            <div className="flex flex-col gap-2.5">
              {[...selected.priorities].reverse().map((row) => (
                <div key={row.week} className="bg-slate-50 rounded-[10px] border border-slate-200 px-3.5 py-2.5">
                  <div className="font-bold text-slate-600 text-[13px] mb-2">📅 {fmtWeek(row.week)}</div>
                  <div className="flex gap-1.5 flex-wrap">
                    {row.p1.map((t, i) =>
                      t ? (
                        <span key={i} className="bg-blue-50 border border-blue-200 rounded-md px-2.5 py-1 text-xs">
                          <b className="text-primary">P1-{i + 1}</b> {t}
                        </span>
                      ) : null
                    )}
                    {row.p2 && (
                      <span className="bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1 text-xs">
                        <b className="text-amber-600">P2</b> {row.p2}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
