import { useState } from 'react';
import { useStore } from '../../stores/useStore';
import { teamColor } from '../../lib/utils';

const PALETTE = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#64748b'];

export default function TeamManager() {
  const { teams, users, addTeam, renameTeam, deleteTeam, setTeamColor } = useStore();
  const [open, setOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<{ name: string; newName: string } | null>(null);
  const [newTeamName, setNewTeamName] = useState('');
  const [colorPicking, setColorPicking] = useState<string | null>(null);

  const inputCls = 'w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-md px-2 py-1.5 text-xs';

  const handleRename = () => {
    if (!editingTeam) return;
    const n = editingTeam.newName.trim();
    if (!n || (n !== editingTeam.name && teams.includes(n))) return;
    renameTeam(editingTeam.name, n);
    setEditingTeam(null);
  };

  const handleAdd = () => {
    const t = newTeamName.trim();
    if (!t || teams.includes(t)) return;
    addTeam(t);
    setNewTeamName('');
  };

  return (
    <div className="border-t border-slate-700 px-3 pt-2 pb-1">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full bg-transparent border-none text-slate-400 cursor-pointer text-[11px] font-bold tracking-wider text-left flex justify-between pb-1.5"
      >
        <span>팀 관리</span>
        <span className="text-[10px]">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div>
          {teams.map((t) => (
            <div key={t} className="bg-slate-900 rounded-lg px-1.5 py-1 mb-1">
              {editingTeam?.name === t ? (
                <div className="flex gap-1">
                  <input
                    value={editingTeam.newName}
                    onChange={(e) => setEditingTeam({ ...editingTeam, newName: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                    className={`${inputCls} flex-1`}
                    autoFocus
                  />
                  <button onClick={handleRename} className="bg-primary border-none text-white rounded-[5px] px-1.5 py-0.5 cursor-pointer text-[11px]">✓</button>
                  <button onClick={() => setEditingTeam(null)} className="bg-sidebar-hover border-none text-slate-400 rounded-[5px] px-1.5 py-0.5 cursor-pointer text-[11px]">✕</button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <div className="relative shrink-0">
                    <div
                      className="w-[14px] h-[14px] rounded-full border border-slate-600 cursor-pointer hover:scale-125 transition-transform"
                      style={{ background: teamColor(t) }}
                      onClick={(e) => { e.stopPropagation(); setColorPicking(colorPicking === t ? null : t); }}
                    />
                    {colorPicking === t && (
                      <div className="absolute left-0 top-5 bg-slate-800 border border-slate-600 rounded-lg p-1.5 flex flex-wrap gap-1 w-[130px] z-50">
                        {PALETTE.map((c) => (
                          <div
                            key={c}
                            className={`w-5 h-5 rounded-full cursor-pointer hover:scale-110 transition-transform ${teamColor(t) === c ? 'ring-2 ring-white' : ''}`}
                            style={{ background: c }}
                            onClick={() => { setTeamColor(t, c); setColorPicking(null); }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="flex-1 text-xs text-slate-200">{t}</span>
                  <span className="text-[10px] text-slate-600">{users.filter((u) => u.team === t).length}명</span>
                  <button onClick={() => setEditingTeam({ name: t, newName: t })} className="bg-transparent border-none text-primary-light cursor-pointer text-[11px] px-0.5">✏️</button>
                  <button onClick={() => deleteTeam(t)} className="bg-transparent border-none text-red-500 cursor-pointer text-[13px] px-0.5">×</button>
                </div>
              )}
            </div>
          ))}
          <div className="flex gap-1 mt-1">
            <input
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="새 팀 이름"
              className={`${inputCls} flex-1`}
            />
            <button onClick={handleAdd} className="bg-primary border-none text-white rounded-md px-2 py-1 cursor-pointer text-[13px] font-bold">+</button>
          </div>
        </div>
      )}
    </div>
  );
}
