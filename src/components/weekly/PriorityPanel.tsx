import { useState, useEffect } from 'react';
import type { User, UserData, WeeklyPriority } from '../../types';
import { getMondayStr, fmtDate } from '../../lib/utils';
import HelpBubble from '../ui/HelpBubble';

interface Props {
  user: User;
  data: UserData;
  canEdit: boolean;
  onSave: (priorities: WeeklyPriority[]) => void;
}

const inputCls = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-[13px] text-slate-800 bg-white outline-none focus:border-primary transition-colors';
const btnSec = 'bg-white border border-slate-200 text-slate-500 rounded-md px-3 py-1 cursor-pointer text-xs hover:bg-slate-50 transition-colors';

export default function PriorityPanel({ user, data, canEdit, onSave }: Props) {
  const [list, setList] = useState<WeeklyPriority[]>(data.current.priorities);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<WeeklyPriority | null>(null);
  const krs = data.current.okr?.krs || [];

  useEffect(() => {
    setList(data.current.priorities);
    setEditing(null);
  }, [user.id, data.current.priorities]);

  const startEdit = (row: WeeklyPriority) => {
    setEditing(row.week);
    setDraft({ ...row, p1: [...row.p1] as [string, string, string], krTags: [...row.krTags] as [string, string, string] });
  };

  const addWeek = () => {
    const week = getMondayStr();
    if (list.find((r) => r.week === week)) return;
    const prev = list.length > 0 ? list[list.length - 1] : null;
    const row: WeeklyPriority = prev
      ? { week, p1: [...prev.p1] as [string, string, string], p2: prev.p2, krTags: [...prev.krTags] as [string, string, string], note: '' }
      : { week, p1: ['', '', ''], p2: '', krTags: ['', '', ''], note: '' };
    const updated = [...list, row];
    setList(updated);
    startEdit(row);
  };

  const saveRow = () => {
    if (!draft) return;
    const u = list.map((r) => (r.week === editing ? draft : r));
    setList(u);
    onSave(u);
    setEditing(null);
  };

  const deleteRow = (week: string) => {
    const u = list.filter((r) => r.week !== week);
    setList(u);
    onSave(u);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <div>
          <h2 className="text-slate-800 font-bold text-xl mb-0.5 flex items-center gap-2">
            {user.name}의 주간 우선순위
            <HelpBubble text={`(Priority)\n\nP1 반드시 실행해야 하는 일\n     최대 3가지만 기재\n\nP2 언제나 할 일\n     중요한 것 1가지만 기재`} />
          </h2>
          <p className="text-slate-500 text-[13px]">매주 월요일 기준으로 입력합니다.</p>
        </div>
        {canEdit && (
          <button
            onClick={addWeek}
            className="bg-primary text-white border-none rounded-lg px-4 py-2 cursor-pointer font-semibold text-[13px] hover:bg-primary-dark transition-colors"
          >
            + 이번 주 추가
          </button>
        )}
      </div>

      {list.length === 0 && (
        <div className="text-center py-15 text-slate-400 text-sm">등록된 항목이 없습니다.</div>
      )}

      {[...list].reverse().map((row) => (
        <div key={row.week} className="bg-white rounded-xl border border-slate-200 mb-3 overflow-hidden shadow-sm">
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex justify-between items-center">
            <span className="font-bold text-slate-700 text-sm">📅 {fmtDate(row.week)} 주차</span>
            <div className="flex gap-1.5">
              {canEdit && editing !== row.week && (
                <>
                  <button onClick={() => startEdit(row)} className={btnSec}>수정</button>
                  <button onClick={() => deleteRow(row.week)} className={`${btnSec} !text-red-500 !border-red-300`}>삭제</button>
                </>
              )}
              {editing === row.week && (
                <>
                  <button onClick={saveRow} className={`${btnSec} !bg-primary !text-white !border-primary`}>저장</button>
                  <button onClick={() => setEditing(null)} className={btnSec}>취소</button>
                </>
              )}
            </div>
          </div>

          <div className="p-4">
            {editing === row.week && draft ? (
              <div>
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex gap-2 items-center mb-2">
                    <span className="w-8 text-xs font-bold text-white bg-primary rounded-md px-1.5 py-0.5 text-center shrink-0">P1</span>
                    <input
                      value={draft.p1[i]}
                      onChange={(e) => {
                        const a = [...draft.p1] as [string, string, string];
                        a[i] = e.target.value;
                        setDraft({ ...draft, p1: a });
                      }}
                      placeholder={`P1-${i + 1} 항목`}
                      className={`flex-1 ${inputCls}`}
                    />
                    <select
                      value={draft.krTags[i]}
                      onChange={(e) => {
                        const a = [...draft.krTags] as [string, string, string];
                        a[i] = e.target.value;
                        setDraft({ ...draft, krTags: a });
                      }}
                      className={`${inputCls} !w-[90px] text-xs`}
                    >
                      <option value="">KR 연결</option>
                      {krs.filter((k) => k.text).map((k) => (
                        <option key={k.id} value={k.id}>{k.id.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>
                ))}
                <div className="flex gap-2 items-center mb-2">
                  <span className="w-8 text-xs font-bold text-white bg-amber-500 rounded-md px-1.5 py-0.5 text-center shrink-0">P2</span>
                  <input
                    value={draft.p2}
                    onChange={(e) => setDraft({ ...draft, p2: e.target.value })}
                    placeholder="P2 항목"
                    className={`flex-1 ${inputCls}`}
                  />
                </div>
                <div className="flex gap-2 items-center">
                  <span className="w-8 text-xs text-slate-500 text-center shrink-0">📝</span>
                  <input
                    value={draft.note}
                    onChange={(e) => setDraft({ ...draft, note: e.target.value })}
                    placeholder="주간 메모 (선택)"
                    className={`flex-1 ${inputCls}`}
                  />
                </div>
              </div>
            ) : (
              <div>
                {row.note?.includes('이전 분기') && (
                  <div className="bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1 text-[11px] text-amber-800 mb-2">
                    📋 이전 분기에서 복사된 항목입니다. 검토 후 수정하세요.
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {row.p1.map((t, i) =>
                    t ? (
                      <div key={i} className="bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-2">
                        <div className="text-[11px] font-bold text-primary mb-0.5">
                          P1-{i + 1}{' '}
                          {row.krTags?.[i] && (
                            <span className="bg-indigo-100 px-1.5 py-0.5 rounded-[10px]">{row.krTags[i].toUpperCase()}</span>
                          )}
                        </div>
                        <div className="text-[13px] text-blue-900">{t}</div>
                      </div>
                    ) : null
                  )}
                </div>
                {row.p2 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2 mb-2 inline-block">
                    <span className="text-[11px] font-bold text-amber-600">P2 </span>
                    <span className="text-[13px] text-amber-900">{row.p2}</span>
                  </div>
                )}
                {row.note && !row.note.includes('이전 분기') && (
                  <div className="text-xs text-slate-500 mt-1">📝 {row.note}</div>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
