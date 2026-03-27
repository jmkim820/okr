import { useState, useEffect } from 'react';
import type { User, UserData, OKR } from '../../types';
import { levelColor, isQuarterEnded } from '../../lib/utils';
import Card from '../ui/Card';
import HelpBubble from '../ui/HelpBubble';

interface Props {
  user: User;
  data: UserData;
  onSaveOkr?: (okr: OKR) => void;
  onArchive?: () => void;
}

const inputCls = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-[13px] text-slate-800 bg-white outline-none focus:border-primary transition-colors';
const disabledCls = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-[13px] text-slate-800 bg-slate-100 outline-none cursor-not-allowed';

export default function OKRPanel({ user, data, onSaveOkr, onArchive }: Props) {
  const [form, setForm] = useState<OKR>(data.current.okr);
  const readOnly = !onSaveOkr;

  useEffect(() => {
    setForm(data.current.okr);
  }, [user.id, data.current.okr]);

  const setKr = (i: number, field: string, value: string | number) =>
    setForm((p) => {
      const krs = [...p.krs];
      krs[i] = { ...krs[i], [field]: value };
      return { ...p, krs };
    });

  const ended = isQuarterEnded(form.endDate);
  const cls = readOnly ? disabledCls : inputCls;

  return (
    <div className="max-w-[720px]">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-2 mb-1">
        <div>
          <h2 className="text-slate-800 font-bold text-lg md:text-xl mb-0.5">{user.name}의 OKR</h2>
          <p className="text-slate-500 text-[13px]">
            {readOnly ? 'OKR 현황을 확인합니다.' : 'Objective와 Key Results를 설정하세요.'}
          </p>
        </div>
        {ended && onArchive && (
          <div className="bg-amber-50 border border-amber-300 rounded-[10px] px-3.5 py-2 text-xs text-amber-800 text-right shrink-0">
            <div className="font-bold mb-1">⚠️ 분기가 종료되었습니다</div>
            <button
              onClick={onArchive}
              className="bg-amber-500 text-white border-none rounded-md px-3 py-1 cursor-pointer text-xs font-semibold hover:bg-amber-600 transition-colors"
            >
              📦 분기 보관 & 새 OKR 시작
            </button>
          </div>
        )}
      </div>

      <Card
        title={
          <span className="flex items-center gap-2">
            🎯 Objective
            <HelpBubble text={`구성원에게 자신이 하고 있는 일에 대한\n의미와 내적동기를 자극하는 분기목표 "O"\n\n회사를 더 발전시키기 위해 소속팀이\n집중하고 싶은 가치있는 '한가지'`} />
          </span>
        }
      >
        <div className="flex flex-col sm:flex-row gap-3 items-start">
          <input
            value={form.objective}
            onChange={(e) => setForm((p) => ({ ...p, objective: e.target.value }))}
            placeholder="Objective 입력..."
            disabled={readOnly}
            className={`flex-1 ${cls}`}
          />
          <div className="flex flex-col items-center shrink-0">
            <label className="text-[11px] text-slate-500 mb-1 font-semibold">현수준</label>
            <input
              type="number"
              min={0}
              max={10}
              value={form.level}
              onChange={(e) => setForm((p) => ({ ...p, level: +e.target.value }))}
              disabled={readOnly}
              className={`w-[60px] text-center ${cls}`}
              style={{ background: levelColor(form.level) + '22', borderColor: levelColor(form.level) }}
            />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 mt-3">
          <div className="flex-1">
            <label className="text-[11px] text-slate-500 block mb-1 font-semibold">시작일</label>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => {
                const s = e.target.value;
                if (!s) { setForm((p) => ({ ...p, startDate: '' })); return; }
                const [y, m] = s.split('-').map(Number);
                const em = Math.ceil(m / 3) * 3;
                const ld = new Date(y, em, 0).getDate();
                setForm((p) => ({
                  ...p,
                  startDate: s,
                  endDate: `${y}-${String(em).padStart(2, '0')}-${String(ld).padStart(2, '0')}`,
                }));
              }}
              disabled={readOnly}
              className={cls}
            />
          </div>
          <div className="flex-1">
            <label className="text-[11px] text-slate-500 block mb-1 font-semibold">
              종료일 <span className="text-slate-400 font-normal">(분기말 자동입력)</span>
            </label>
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
              disabled={readOnly}
              className={`${cls} ${readOnly ? '' : 'bg-slate-50'}`}
            />
          </div>
        </div>
      </Card>

      <Card
        title={
          <span className="flex items-center gap-2">
            🔑 Key Results
            <HelpBubble text={`목표가 실현될 수 있도록 구체적으로\n측정하고 피드백할 수 있게 도와주는 "KR"\n\n밀어붙이고 싶은 것들과 지키고 싶은 것들\n\n"우리가 목표를 달성했는지\n어떻게 알 수 있을까?" 라는 질문으로 작성`} />
          </span>
        }
        className="mt-4"
      >
        {form.krs.map((kr, i) => (
          <div key={kr.id} className={i < 2 ? 'mb-3' : ''}>
            <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center mb-1.5">
              <span className="w-10 text-center text-[13px] font-bold text-primary shrink-0">KR{i + 1}</span>
              <input
                value={kr.text}
                onChange={(e) => setKr(i, 'text', e.target.value)}
                placeholder={`KR${i + 1} 제목 입력...`}
                disabled={readOnly}
                className={`flex-1 w-full ${cls} font-semibold`}
              />
              <div className="flex flex-col items-center shrink-0">
                <span className="text-[10px] text-slate-400 mb-0.5">현수준</span>
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={kr.level}
                  onChange={(e) => setKr(i, 'level', +e.target.value)}
                  disabled={readOnly}
                  className={`w-[60px] text-center ${cls}`}
                  style={{ background: levelColor(kr.level) + '22', borderColor: levelColor(kr.level) }}
                />
              </div>
            </div>
            <div className="sm:pl-12">
              <textarea
                value={kr.detail || ''}
                onChange={(e) => setKr(i, 'detail', e.target.value)}
                placeholder="세부 내용, 측정 방법, 참고사항 등..."
                rows={2}
                disabled={readOnly}
                className={`${cls} resize-y text-xs text-slate-500 leading-relaxed`}
              />
            </div>
          </div>
        ))}
      </Card>

      {onSaveOkr && (
        <button
          onClick={() => onSaveOkr(form)}
          className="mt-4 w-full sm:w-auto bg-primary text-white border-none rounded-lg px-7 py-2.5 cursor-pointer font-semibold text-sm hover:bg-primary-dark transition-colors"
        >
          저장
        </button>
      )}
    </div>
  );
}
