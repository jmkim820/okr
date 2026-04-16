import type { User, UserDataMap } from '../../types';
import { roleColor, levelColor } from '../../lib/utils';
import Card from '../ui/Card';

interface Props {
  users: User[];
  teams: string[];
  userData: UserDataMap;
}

export default function TeamPanel({ users, teams, userData }: Props) {
  return (
    <div>
      <h2 className="text-slate-800 font-bold text-xl mb-1">👥 팀 현황</h2>
      <p className="text-slate-500 text-[13px] mb-5">팀별 OKR 달성 현황을 확인합니다.</p>

      {teams.map((team) => {
        const members = users.filter((u) => u.team === team).sort((a, b) => (a.role === 'admin' ? 0 : 1) - (b.role === 'admin' ? 0 : 1));
        return (
          <Card key={team} title={`${team} (${members.length}명)`} className="mb-4">
            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
              {members.map((u) => {
                const d = userData[u.id];
                const okr = d?.current?.okr;
                const pList = d?.current?.priorities || [];
                const total = pList.reduce(
                  (s, r) => s + r.p1.filter(Boolean).length + (r.p2 ? 1 : 0),
                  0
                );
                return (
                  <div key={u.id} className="bg-slate-50 rounded-[10px] border border-slate-200 p-3.5">
                    <div className="flex items-center gap-2 mb-2.5">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white"
                        style={{ background: roleColor(u.role) }}
                      >
                        {u.name[0]}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-800">
                          {u.name} {u.role === 'admin' && <span className="text-[11px]">🧑‍💼</span>}
                        </div>
                        <div className="text-[11px] text-slate-500">{u.email}</div>
                      </div>
                    </div>
                    {okr?.objective ? (
                      <>
                        <div className="text-xs text-slate-700 font-semibold mb-1.5">🎯 {okr.objective}</div>
                        <div className="flex gap-1.5 flex-wrap">
                          {okr.krs.filter((k) => k.text).map((k) => (
                            <div key={k.id} className="bg-indigo-100 rounded-md px-2 py-0.5 text-[11px] text-indigo-800">
                              {k.id.toUpperCase()}{' '}
                              <span className="font-bold" style={{ color: levelColor(k.level) }}>{k.level}</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-2 text-xs text-slate-500">
                          📋 {pList.length}주 · {total}개 작업
                        </div>
                      </>
                    ) : (
                      <div className="text-xs text-slate-400">OKR 미설정</div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
