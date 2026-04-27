import { useState } from 'react';
import { useStore } from '../../stores/useStore';
import { roleColor, getMondayStr } from '../../lib/utils';
import { LEAVE_ONLY_TEAMS } from '../../lib/seed';
import TeamManager from '../admin/TeamManager';

export default function Sidebar() {
  const {
    currentUser, users, teams, userData, viewUserId,
    setViewUserId, activeTab, setActiveTab,
    addUser, removeUser, updateUser, assignTeam,
    sidebarOpen, setSidebarOpen,
  } = useStore();

  const [newUser, setNewUser] = useState({ name: '', email: '', team: '', role: 'user' as const });
  const [showAdd, setShowAdd] = useState(false);
  const [checked, setChecked] = useState<string[]>([]);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [editingUser, setEditingUser] = useState<any>(null);
  const [collapsedTeams, setCollapsedTeams] = useState<Set<string>>(new Set());

  if (!currentUser) return null;

  const isSuperAdmin = currentUser.role === 'superadmin';
  const isAdmin = currentUser.role === 'admin' || isSuperAdmin;

  const toggleCheck = (id: string) =>
    setChecked((p) => (p.includes(id) ? p.filter((c) => c !== id) : [...p, id]));

  const handleAddUser = () => {
    if (!newUser.name || !newUser.email) return;
    addUser(newUser);
    setNewUser({ name: '', email: '', team: '', role: 'user' });
    setShowAdd(false);
  };

  const handleAssignTeam = () => {
    const t = newTeamName.trim();
    if (!t) return;
    assignTeam(checked, t);
    setChecked([]);
    setNewTeamName('');
    setShowTeamModal(false);
  };

  const handleSaveEdit = () => {
    if (!editingUser?.name || !editingUser?.email) return;
    updateUser(editingUser);
    setEditingUser(null);
  };

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    setSidebarOpen(false);
  };

  const handleUserClick = (userId: string) => {
    setViewUserId(userId);
    setSidebarOpen(false);
  };

  const inputCls = 'w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-md px-2 py-1.5 text-xs';

  const myData = userData[currentUser.id];
  const missingThisWeek = currentUser.role !== 'superadmin' && myData
    && !myData.current.priorities.some((p) => p.week === getMondayStr());

  const leaveRequests = useStore((s) => s.leaveRequests);
  const pendingLeaveCount = (() => {
    if (isSuperAdmin) return leaveRequests.filter((r) => r.status === 'pending' || r.deleteRequested).length;
    if (isAdmin) {
      const teamUserIds = users.filter((u) => u.team === currentUser.team).map((u) => u.id);
      return leaveRequests.filter((r) => (r.status === 'pending' || r.deleteRequested) && teamUserIds.includes(r.userId)).length;
    }
    return 0;
  })();

  const isLeaveOnly = LEAVE_ONLY_TEAMS.includes(currentUser.team);

  const tabs = isLeaveOnly ? [] : [
    ...(isSuperAdmin ? [{ id: 'dashboard', label: '📊 대시보드', alert: false, special: false }] : []),
    { id: 'okr', label: '📋 OKR 설정', alert: false, special: false },
    { id: 'priority', label: '✅ 주간 우선순위', alert: !!missingThisWeek && !isSuperAdmin, special: false },
    { id: 'gantt', label: '📅 간트 차트', alert: false, special: false },
    { id: 'history', label: '🗂 분기 히스토리', alert: false, special: false },
  ];

  const sidebarContent = (
    <div className="w-[230px] bg-sidebar border-r border-slate-700 flex flex-col py-4 overflow-y-auto shrink-0 h-full">
      {/* Navigation */}
      <div className="px-3 mb-3">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => handleTabClick(t.id)}
            className={`w-full text-left px-3 py-2 rounded-lg border-none cursor-pointer text-[13px] mb-0.5 transition-colors ${
              t.special
                ? activeTab === t.id
                  ? 'bg-red-600 text-white font-semibold'
                  : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                : activeTab === t.id
                  ? 'bg-sidebar-hover text-slate-200 font-semibold'
                  : 'bg-transparent text-slate-400 hover:bg-slate-700/50'
            }`}
          >
            <span className="flex items-center justify-between">
              {t.label}
              {t.alert && (
                <span className={`shrink-0 rounded-full text-white text-[10px] font-bold flex items-center justify-center ${
                  t.special ? 'bg-white text-red-600 w-5 h-5' : 'bg-red-500 w-2 h-2'
                }`}>
                  {t.special && pendingLeaveCount > 0 ? pendingLeaveCount : ''}
                </span>
              )}
            </span>
          </button>
        ))}
      </div>

      {/* Team Manager — superadmin 전용 */}
      {isSuperAdmin && <TeamManager />}


      {/* User List Header */}
      <div className="border-t border-slate-700 pt-2.5 px-3 pb-1 text-[11px] text-slate-600 font-bold tracking-wider">
        {isAdmin ? '멤버 관리' : '내 정보'}
      </div>

      {/* Bulk team assign button — superadmin 전용 */}
      {isSuperAdmin && checked.length > 0 && (
        <div className="px-3 pb-1.5">
          <button
            onClick={() => setShowTeamModal(true)}
            className="w-full bg-primary text-white border-none rounded-lg py-1.5 cursor-pointer text-xs font-semibold"
          >
            ✅ {checked.length}명 → 팀 배정
          </button>
        </div>
      )}

      {/* User List — 팀별 그룹 */}
      {(() => {
        const teamGroups: Record<string, typeof users> = {};
        users.filter((u) => u.role !== 'superadmin').forEach((u) => {
          const t = u.team || '미배정';
          if (!teamGroups[t]) teamGroups[t] = [];
          teamGroups[t].push(u);
        });
        // 팀 내에서 admin 먼저, 그 다음 일반 사용자
        for (const t of Object.keys(teamGroups)) {
          teamGroups[t].sort((a, b) => {
            const aAdmin = a.role === 'admin' ? 0 : 1;
            const bAdmin = b.role === 'admin' ? 0 : 1;
            return aAdmin - bAdmin;
          });
        }
        const TEAM_ORDER = ['앱개발팀', '웹개발팀', '고객지원팀', '컨설팅팀', '관리팀'];
        const orderedTeams = [
          ...TEAM_ORDER.filter((t) => teamGroups[t]),
          ...Object.keys(teamGroups).filter((t) => !TEAM_ORDER.includes(t)),
        ];

        const toggleTeam = (team: string) => {
          setCollapsedTeams((prev) => {
            const next = new Set(prev);
            next.has(team) ? next.delete(team) : next.add(team);
            return next;
          });
        };

        const renderUser = (u: typeof users[0]) => {
          const canAccess = true; // 전체 열람 가능
          return (
          <div
            key={u.id}
            className={`mx-2 rounded-lg transition-colors ${
              canAccess ? 'cursor-pointer' : 'opacity-40 cursor-not-allowed'
            } ${viewUserId === u.id ? 'bg-sidebar-hover' : canAccess ? 'hover:bg-slate-700/30' : ''}`}
            onClick={() => canAccess && handleUserClick(u.id)}
          >
            {editingUser?.id === u.id ? (
              <div className="p-2 bg-slate-900 rounded-lg" onClick={(e) => e.stopPropagation()}>
                <input value={editingUser.name} onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })} placeholder="이름" className={`${inputCls} mb-1`} />
                <input value={editingUser.email} onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })} placeholder="이메일" className={`${inputCls} mb-1`} />
                <select value={editingUser.team} onChange={(e) => setEditingUser({ ...editingUser, team: e.target.value })} className={`${inputCls} mb-1`}>
                  <option value="">팀 선택</option>
                  {teams.map((t) => <option key={t}>{t}</option>)}
                </select>
                <input type="date" value={editingUser.joinDate || ''} onChange={(e) => setEditingUser({ ...editingUser, joinDate: e.target.value })} className={`${inputCls} mb-1`} title="입사일" />
                {isSuperAdmin && (
                  <select value={editingUser.role} onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })} className={`${inputCls} mb-1.5`}>
                    <option value="user">일반 사용자</option>
                    <option value="admin">관리자</option>
                  </select>
                )}
                <div className="flex gap-1">
                  <button onClick={handleSaveEdit} className="flex-1 bg-primary text-white border-none rounded-md py-1 cursor-pointer text-xs">저장</button>
                  <button onClick={() => setEditingUser(null)} className="flex-1 bg-sidebar-hover text-slate-400 border-none rounded-md py-1 cursor-pointer text-xs">취소</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 py-1.5 px-2">
                {isSuperAdmin && (
                  <input
                    type="checkbox"
                    checked={checked.includes(u.id)}
                    onChange={() => toggleCheck(u.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-3 h-3 accent-primary cursor-pointer shrink-0"
                  />
                )}
                <div
                  className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                  style={{ background: roleColor(u.role) }}
                >
                  {u.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-slate-200 truncate">
                    {u.name} {u.role === 'admin' && <span className="text-[10px]">🧑‍💼</span>}
                  </div>
                </div>
                {isSuperAdmin && (
                  <div className="flex gap-0.5" onClick={(e) => e.stopPropagation()}>
                    <button title="정보 수정" onClick={() => setEditingUser({ ...u })} className="bg-transparent border-none text-slate-400 cursor-pointer text-xs px-0.5">⚙️</button>
                    <button onClick={() => removeUser(u.id)} className="bg-transparent border-none text-red-500 cursor-pointer text-[13px] px-0.5">×</button>
                  </div>
                )}
              </div>
            )}
          </div>
        );};

        return orderedTeams.map((team) => {
          const isCollapsed = collapsedTeams.has(team);
          return (
            <div key={team} className="mb-1">
              <div
                className="flex items-center gap-1.5 px-3 pt-2 pb-1 cursor-pointer hover:bg-slate-700/30 rounded-md mx-1 select-none"
                onClick={() => toggleTeam(team)}
              >
                <span className="text-[10px] text-slate-500 w-3 shrink-0">{isCollapsed ? '▶' : '▼'}</span>
                <div className="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: '#64748b' }} />
                <span className="text-[11px] font-bold tracking-wider" style={{ color: '#64748b' }}>{team}</span>
                <span className="text-[10px] text-slate-600">{teamGroups[team].length}</span>
              </div>
              {!isCollapsed && teamGroups[team].map(renderUser)}
            </div>
          );
        });
      })()}

      {/* Add user — superadmin 전용 */}
      {isSuperAdmin && (
        <div className="px-3 pt-2">
          {showAdd ? (
            <div className="bg-slate-900 rounded-lg p-2.5">
              <input placeholder="이름" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} className={inputCls} />
              <input placeholder="이메일" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} className={`${inputCls} mt-1`} />
              <select value={newUser.team} onChange={(e) => setNewUser({ ...newUser, team: e.target.value })} className={`${inputCls} mt-1`}>
                <option value="">팀 선택</option>
                {teams.map((t) => <option key={t}>{t}</option>)}
              </select>
              <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value as any })} className={`${inputCls} mt-1`}>
                <option value="user">일반 사용자</option>
                <option value="admin">관리자</option>
              </select>
              <div className="flex gap-1 mt-1.5">
                <button onClick={handleAddUser} className="flex-1 bg-primary text-white border-none rounded-md py-1.5 cursor-pointer text-xs">추가</button>
                <button onClick={() => setShowAdd(false)} className="flex-1 bg-sidebar-hover text-slate-400 border-none rounded-md py-1.5 cursor-pointer text-xs">취소</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAdd(true)} className="w-full bg-sidebar-hover border border-dashed border-slate-600 text-slate-400 rounded-lg py-1.5 cursor-pointer text-xs hover:border-slate-400 transition-colors">
              + 멤버 추가
            </button>
          )}
        </div>
      )}

      {/* 휴가관리 버튼 */}
      <div className="px-3 pt-2">
        <button
          onClick={() => handleTabClick('leave')}
          className={`w-full text-left px-3 py-2 rounded-lg border-none cursor-pointer text-[13px] transition-colors flex items-center justify-between ${
            activeTab === 'leave'
              ? 'bg-red-600 text-white font-semibold'
              : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
          }`}
        >
          🏖️ 휴가 관리
          {pendingLeaveCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-white text-red-600 text-[10px] font-bold flex items-center justify-center shrink-0">
              {pendingLeaveCount}
            </span>
          )}
        </button>
      </div>

      {/* Team assign modal */}
      {isSuperAdmin && showTeamModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]">
          <div className="bg-sidebar rounded-2xl p-7 w-80 shadow-2xl">
            <div className="font-bold text-slate-200 text-base mb-1.5">팀 배정</div>
            <div className="text-[13px] text-slate-400 mb-4">
              선택된 멤버: {users.filter((u) => checked.includes(u.id)).map((u) => u.name).join(', ')}
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {teams.map((t) => (
                <button
                  key={t}
                  onClick={() => setNewTeamName(t)}
                  className={`border-none rounded-[20px] px-3 py-1 cursor-pointer text-xs ${
                    newTeamName === t ? 'bg-primary text-white' : 'bg-sidebar-hover text-slate-400'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <input value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} placeholder="새 팀 이름 직접 입력..." className={`${inputCls} mb-3.5`} />
            <div className="flex gap-2">
              <button onClick={handleAssignTeam} className="flex-1 bg-primary text-white border-none rounded-lg py-2 cursor-pointer font-semibold text-[13px]">배정</button>
              <button onClick={() => { setShowTeamModal(false); setNewTeamName(''); }} className="flex-1 bg-sidebar-hover text-slate-400 border-none rounded-lg py-2 cursor-pointer text-[13px]">취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* 데스크탑: 항상 표시 */}
      <div className="hidden md:block">
        {sidebarContent}
      </div>

      {/* 모바일: 오버레이 */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-[900]">
          {/* 배경 오버레이 */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          {/* 사이드바 */}
          <div className="relative z-[901] h-full">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
