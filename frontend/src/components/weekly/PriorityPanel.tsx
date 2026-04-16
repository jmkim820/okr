import { useState, useEffect } from 'react';
import type { User, UserData, WeeklyPriority } from '../../types';
import { getMondayStr, fmtWeek } from '../../lib/utils';
import { useStore } from '../../stores/useStore';
import HelpBubble from '../ui/HelpBubble';

interface Props {
  user: User;
  data: UserData;
  canEdit: boolean;
  onSave: (priorities: WeeklyPriority[]) => void;
}

const inputCls = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-[13px] text-slate-800 bg-white outline-none focus:border-primary transition-colors';
const btnSec = 'bg-white border border-slate-200 text-slate-500 rounded-md px-3 py-1 cursor-pointer text-xs hover:bg-slate-50 transition-colors';

// 날짜를 해당 주의 월요일로 변환
const toMonday = (dateStr: string): string => {
  const d = new Date(dateStr);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d.toISOString().slice(0, 10);
};

export default function PriorityPanel({ user, data, canEdit, onSave }: Props) {
  const [list, setList] = useState<WeeklyPriority[]>(data.current.priorities);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<WeeklyPriority | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addDate, setAddDate] = useState(getMondayStr());
  const krs = data.current.okr?.krs || [];
  const showToast = useStore((s) => s.showToast);

  // 값 기반 비교로 다른 유저의 변경에 의한 불필요한 폼 리셋 방지
  const prioritiesJson = JSON.stringify(data.current.priorities);
  useEffect(() => {
    setList(data.current.priorities);
    setEditing(null);
    setShowAddForm(false);
  }, [user.id, prioritiesJson]);

  const startEdit = (row: WeeklyPriority) => {
    setEditing(row.week);
    setDraft({ ...row, p1: [...row.p1] as [string, string, string], krTags: [...row.krTags] as [string, string, string] });
  };

  const addWeek = () => {
    const week = toMonday(addDate);
    if (list.find((r) => r.week === week)) {
      showToast(`${fmtWeek(week)} 주차가 이미 등록되어 있습니다.`, 'error');
      return;
    }
    const prev = list.length > 0 ? list[list.length - 1] : null;
    const row: WeeklyPriority = prev
      ? { week, p1: [...prev.p1] as [string, string, string], p2: prev.p2, krTags: [...prev.krTags] as [string, string, string], note: '' }
      : { week, p1: ['', '', ''], p2: '', krTags: ['', '', ''], note: '' };
    const updated = [...list, row].sort((a, b) => a.week.localeCompare(b.week));
    setList(updated);
    setShowAddForm(false);
    setAddDate(getMondayStr());
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-5">
        <div>
          <h2 className="text-slate-800 font-bold text-lg md:text-xl mb-0.5 flex items-center gap-2">
            {user.name}의 주간 우선순위
            <HelpBubble text={`(Priority)\n\nP1 반드시 실행해야 하는 일\n     최대 3가지만 기재\n\nP2 언제나 할 일\n     중요한 것 1가지만 기재`} />
          </h2>
          <p className="text-slate-500 text-[13px]">매주 월요일 기준으로 입력합니다.</p>
        </div>
        {canEdit && !showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-primary text-white border-none rounded-lg px-4 py-2 cursor-pointer font-semibold text-[13px] hover:bg-primary-dark transition-colors shrink-0"
          >
            + 추가
          </button>
        )}
      </div>

      {/* 이번 주 미등록 알림 */}
      {canEdit && !list.some((r) => r.week === getMondayStr()) && (
        <div className="bg-red-50 border border-red-300 rounded-xl px-4 py-3 mb-4 flex items-center gap-2 text-sm text-red-700">
          <span className="text-base">⚠️</span>
          <span className="font-semibold">이번 주 우선순위가 아직 등록되지 않았습니다.</span>
        </div>
      )}

      {/* 주간 선택 폼 */}
      {showAddForm && (() => {
        // 과거 8주 ~ 미래 4주 범위의 월요일 목록 생성
        const weeks: string[] = [];
        const today = new Date();
        for (let i = -8; i <= 4; i++) {
          const d = new Date(today);
          d.setDate(d.getDate() + i * 7);
          const mon = toMonday(d.toISOString().slice(0, 10));
          if (!weeks.includes(mon)) weeks.push(mon);
        }
        const existing = new Set(list.map((r) => r.week));

        return (
          <div className="bg-white rounded-xl border border-slate-200 mb-4 p-4 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <label className="text-sm text-slate-600 font-semibold shrink-0">주간 선택</label>
            <select
              value={addDate}
              onChange={(e) => setAddDate(e.target.value)}
              className={`${inputCls} sm:!w-[200px]`}
            >
              {weeks.map((w) => (
                <option key={w} value={w} disabled={existing.has(w)}>
                  {fmtWeek(w)} 주차{w === getMondayStr() ? ' (이번 주)' : ''}{existing.has(w) ? ' — 등록됨' : ''}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                onClick={addWeek}
                className="flex-1 sm:flex-none bg-primary text-white border-none rounded-lg px-4 py-2 cursor-pointer font-semibold text-[13px] hover:bg-primary-dark transition-colors shrink-0"
              >
                추가
              </button>
              <button
                onClick={() => { setShowAddForm(false); setAddDate(getMondayStr()); }}
                className={`flex-1 sm:flex-none ${btnSec} shrink-0`}
              >
                취소
              </button>
            </div>
          </div>
        );
      })()}

      {list.length === 0 && !showAddForm && (
        <div className="text-center py-15 text-slate-400 text-sm">등록된 항목이 없습니다.</div>
      )}

      {[...list].reverse().map((row) => (
        <div key={row.week} className="bg-white rounded-xl border border-slate-200 mb-3 overflow-hidden shadow-sm">
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex justify-between items-center">
            <span className="font-bold text-slate-700 text-base">📅 {fmtWeek(row.week)}</span>
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
                  <div key={i} className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-start mb-2">
                    <span className="w-8 text-xs font-bold text-white bg-primary rounded-md px-1.5 py-0.5 text-center shrink-0 self-start sm:mt-2">P1</span>
                    <textarea
                      value={draft.p1[i]}
                      onChange={(e) => {
                        const a = [...draft.p1] as [string, string, string];
                        a[i] = e.target.value;
                        setDraft({ ...draft, p1: a });
                      }}
                      placeholder={`P1-${i + 1} 항목`}
                      rows={2}
                      className={`flex-1 ${inputCls} resize-y`}
                    />
                    <select
                      value={draft.krTags[i]}
                      onChange={(e) => {
                        const a = [...draft.krTags] as [string, string, string];
                        a[i] = e.target.value;
                        setDraft({ ...draft, krTags: a });
                      }}
                      className={`${inputCls} sm:!w-[90px] text-xs sm:mt-2`}
                    >
                      <option value="">KR 연결</option>
                      {krs.filter((k) => k.text).map((k) => (
                        <option key={k.id} value={k.id}>{k.id.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>
                ))}
                <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-start mb-2">
                  <span className="w-8 text-xs font-bold text-white bg-amber-500 rounded-md px-1.5 py-0.5 text-center shrink-0 self-start sm:mt-2">P2</span>
                  <textarea
                    value={draft.p2}
                    onChange={(e) => setDraft({ ...draft, p2: e.target.value })}
                    placeholder="P2 항목"
                    rows={2}
                    className={`flex-1 ${inputCls} resize-y`}
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-start">
                  <span className="w-8 text-xs text-slate-500 text-center shrink-0 self-start sm:mt-2">📝</span>
                  <textarea
                    value={draft.note}
                    onChange={(e) => setDraft({ ...draft, note: e.target.value })}
                    placeholder="주간 메모 (선택)"
                    rows={2}
                    className={`flex-1 ${inputCls} resize-y`}
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3 items-start">
                  {row.p1.map((t, i) =>
                    t ? (
                      <div key={i} className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-3">
                        <div className="text-xs font-bold text-primary mb-1">
                          P1-{i + 1}{' '}
                          {row.krTags?.[i] && (
                            <span className="bg-indigo-100 px-1.5 py-0.5 rounded-[10px] text-[11px]">{row.krTags[i].toUpperCase()}</span>
                          )}
                        </div>
                        <div className="text-[15px] text-blue-900 leading-snug whitespace-pre-wrap">{t}</div>
                      </div>
                    ) : null
                  )}
                </div>
                {row.p2 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-3 mb-3">
                    <span className="text-xs font-bold text-amber-600">P2 </span>
                    <div className="text-[15px] text-amber-900 leading-snug whitespace-pre-wrap mt-1">{row.p2}</div>
                  </div>
                )}
                {row.note && !row.note.includes('이전 분기') && (
                  <div className="text-sm text-slate-500 mt-1 whitespace-pre-wrap">📝 {row.note}</div>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
