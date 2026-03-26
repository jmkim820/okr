import { useState } from 'react';
import type { User, ArchivedQuarter } from '../../types';
import { fmtDate, levelColor, quarterLabel } from '../../lib/utils';
import Card from '../ui/Card';

interface Props {
  user: User;
  history: ArchivedQuarter[];
}

export default function HistoryPanel({ user, history }: Props) {
  const [selected, setSelected] = useState<ArchivedQuarter | null>(null);
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
            onClick={() => setSelected(selected?.quarter === h.quarter ? null : h)}
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

          <Card title="✅ 주간 우선순위 기록">
            <div className="flex flex-col gap-2.5">
              {[...selected.priorities].reverse().map((row) => (
                <div key={row.week} className="bg-slate-50 rounded-[10px] border border-slate-200 px-3.5 py-2.5">
                  <div className="font-bold text-slate-600 text-[13px] mb-2">📅 {fmtDate(row.week)} 주차</div>
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
