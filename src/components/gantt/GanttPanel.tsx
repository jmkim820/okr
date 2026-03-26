import type { User, UserDataMap } from '../../types';
import { teamColor } from '../../lib/utils';

interface Props {
  users: User[];
  userData: UserDataMap;
}

export default function GanttPanel({ users, userData }: Props) {
  const items = users.filter(
    (u) => userData[u.id]?.current?.okr?.startDate && userData[u.id]?.current?.okr?.endDate
  );

  if (!items.length) {
    return <div className="text-center py-15 text-slate-400">OKR에 일정이 설정된 항목이 없습니다.</div>;
  }

  const allDates = items.flatMap((u) => [
    userData[u.id].current.okr.startDate,
    userData[u.id].current.okr.endDate,
  ]);
  const minD = new Date(allDates.reduce((a, b) => (a < b ? a : b)));
  const maxD = new Date(allDates.reduce((a, b) => (a > b ? a : b)));
  const totalDays = Math.max((maxD.getTime() - minD.getTime()) / 86400000, 1);

  const months: Date[] = [];
  const cur = new Date(minD);
  cur.setDate(1);
  while (cur <= maxD) {
    months.push(new Date(cur));
    cur.setMonth(cur.getMonth() + 1);
  }

  const teamGroups: Record<string, User[]> = {};
  items.forEach((u) => {
    const t = u.team || '미배정';
    if (!teamGroups[t]) teamGroups[t] = [];
    teamGroups[t].push(u);
  });

  const pct = (n: number) => Math.round((n / 10) * 100);

  const renderBar = (u: User, isKR = false, kr?: { level: number } | null, rowH = 44) => {
    const okr = userData[u.id].current.okr;
    const level = isKR ? (kr?.level ?? 0) : okr.level;
    const progress = pct(level);
    const start = new Date(okr.startDate);
    const end = new Date(okr.endDate);
    const left = ((start.getTime() - minD.getTime()) / 86400000 / totalDays) * 100;
    const width = Math.max(((end.getTime() - start.getTime()) / 86400000 / totalDays) * 100, 1);
    const color = isKR ? '#818cf8' : teamColor(u.team);
    const barH = isKR ? 18 : 26;

    return (
      <div className="flex-1 relative flex items-center" style={{ height: rowH }}>
        <div
          className="absolute overflow-hidden"
          style={{
            left: `${left}%`,
            width: `${width}%`,
            height: barH,
            borderRadius: barH,
            background: color + '22',
            border: `2px solid ${color}`,
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: '100%',
              background: color + '99',
              borderRadius: barH,
            }}
          />
          <span
            className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold whitespace-nowrap"
            style={{ color }}
          >
            Lv.{level} ({progress}%)
          </span>
        </div>
      </div>
    );
  };

  return (
    <div>
      <h2 className="text-slate-800 font-bold text-xl mb-1">📊 간트 차트</h2>
      <p className="text-slate-500 text-[13px] mb-5">OKR 레벨 기반 달성률 · 팀별 그룹 표시</p>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex border-b-2 border-slate-200 bg-slate-50">
          <div className="w-[220px] shrink-0 px-4 py-2.5 text-xs font-bold text-slate-500 border-r border-slate-200">
            담당자 / OKR
          </div>
          <div className="flex-1 relative h-9">
            {months.map((m, i) => {
              const mS = new Date(Math.max(m.getTime(), minD.getTime()));
              const mE = new Date(Math.min(new Date(m.getFullYear(), m.getMonth() + 1, 0).getTime(), maxD.getTime()));
              const l = ((mS.getTime() - minD.getTime()) / 86400000 / totalDays) * 100;
              const w = ((mE.getTime() - mS.getTime()) / 86400000 / totalDays) * 100;
              return (
                <div
                  key={i}
                  className="absolute h-full border-r border-dashed border-slate-200 flex items-center pl-1.5 text-[11px] text-slate-400 font-semibold"
                  style={{ left: `${l}%`, width: `${w}%`, boxSizing: 'border-box' }}
                >
                  {m.getMonth() + 1}월
                </div>
              );
            })}
          </div>
        </div>

        {/* Body */}
        {Object.entries(teamGroups).map(([team, members]) => (
          <div key={team}>
            <div className="flex items-center border-b" style={{ background: teamColor(team) + '18', borderColor: teamColor(team) + '44' }}>
              <div className="w-[220px] shrink-0 px-4 py-1.5 border-r border-slate-200 flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: teamColor(team) }} />
                <span className="text-xs font-bold" style={{ color: teamColor(team) }}>{team}</span>
                <span className="text-[11px] text-slate-400">({members.length}명)</span>
              </div>
              <div className="flex-1" />
            </div>

            {members.map((u) => {
              const okr = userData[u.id].current.okr;
              const krs = (okr?.krs || []).filter((k) => k.text);
              return (
                <div key={u.id} className="border-b border-slate-100">
                  <div className="flex items-center min-h-12">
                    <div className="w-[220px] shrink-0 px-4 py-1.5 border-r border-slate-100 flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                        style={{ background: teamColor(u.team) }}
                      >
                        {u.name[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[13px] font-bold text-slate-800">{u.name}</div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[130px]">🎯 {okr.objective}</div>
                      </div>
                    </div>
                    {renderBar(u, false, null, 48)}
                  </div>

                  {krs.map((kr, i) => (
                    <div key={kr.id} className="flex items-center min-h-8 bg-indigo-50/30">
                      <div className="w-[220px] shrink-0 py-1 pl-13 pr-4 border-r border-slate-100 flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-primary-light bg-indigo-100 px-1.5 py-0.5 rounded-[10px] shrink-0">KR{i + 1}</span>
                        <span className="text-[11px] text-slate-600 truncate max-w-[110px]">{kr.text}</span>
                      </div>
                      {renderBar(u, true, kr, 32)}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
