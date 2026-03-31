import { useEffect } from 'react';
import { useStore } from './stores/useStore';
import LoginPage from './pages/LoginPage';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import OKRPanel from './components/okr/OKRPanel';
import PriorityPanel from './components/weekly/PriorityPanel';
import HistoryPanel from './components/okr/HistoryPanel';
import GanttPanel from './components/gantt/GanttPanel';
import Dashboard from './components/admin/Dashboard';
import LeavePanel from './components/leave/LeavePanel';
import Toast from './components/ui/Toast';

export default function App() {
  const {
    loading, initApp,
    currentUser, users, teams, userData,
    activeTab, viewUserId,
    saveOkr, savePriorities, archiveQuarter,
  } = useStore();

  useEffect(() => {
    initApp();
  }, [initApp]);

  const isSuperAdmin = currentUser?.role === 'superadmin';
  const isAdmin = currentUser?.role === 'admin' || isSuperAdmin;

  const viewingOther = isSuperAdmin && viewUserId && viewUserId !== currentUser?.id;
  const showSelectPrompt = isSuperAdmin && !viewingOther && (activeTab === 'okr' || activeTab === 'priority');

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-primary-light text-lg font-bold">
        <img src="/logo.png" alt="logo" className="w-8 h-8 mr-2 inline" /> Axissoft OKR 로딩 중...
      </div>
    );
  }

  if (!currentUser) return <LoginPage />;

  const myTeam = currentUser.team;

  // 전체 열람 가능 (읽기전용)
  const canView = (_userId: string) => true;

  // superadmin: 전체 수정, admin: 같은 팀만 수정, user: 본인만
  const canEdit = (userId: string) => {
    if (isSuperAdmin) return true;
    if (isAdmin) {
      const target = users.find((u) => u.id === userId);
      return target?.team === myTeam;
    }
    return userId === currentUser.id;
  };

  const rawTargetId = viewUserId || currentUser.id;
  const targetId = canView(rawTargetId) ? rawTargetId : currentUser.id;
  const targetUser = users.find((u) => u.id === targetId) || currentUser;
  const targetData = userData[targetId] || { current: { okr: { objective: '', level: 0, startDate: '', endDate: '', krs: [] }, priorities: [] }, history: [] };

  // 간트차트: admin 이상 전체, user 같은 팀
  const teamUsers = (isAdmin ? users : users.filter((u) => u.team === myTeam)).filter((u) => u.role !== 'superadmin');

  return (
    <div className="font-sans min-h-screen bg-slate-50">
      <Header />
      <div className="flex" style={{ height: 'calc(100vh - 56px)' }}>
        <Sidebar />
        <div className="flex-1 overflow-auto p-3 md:p-6 w-full min-w-0">
          {activeTab === 'okr' && (
            showSelectPrompt ? (
              <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                <div className="text-5xl mb-4">👈</div>
                <div className="text-lg font-bold text-slate-500 mb-2">팀원을 선택해주세요</div>
                <div className="text-sm">왼쪽 사이드바에서 팀원을 클릭하면 OKR을 확인할 수 있습니다.</div>
              </div>
            ) : (
              <OKRPanel
                user={targetUser}
                data={targetData}
                onSaveOkr={canEdit(targetId) ? (okr) => saveOkr(targetId, okr) : undefined}
                onArchive={canEdit(targetId) ? () => archiveQuarter(targetId) : undefined}
              />
            )
          )}
          {activeTab === 'priority' && (
            showSelectPrompt ? (
              <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                <div className="text-5xl mb-4">👈</div>
                <div className="text-lg font-bold text-slate-500 mb-2">팀원을 선택해주세요</div>
                <div className="text-sm">왼쪽 사이드바에서 팀원을 클릭하면 주간 우선순위를 확인할 수 있습니다.</div>
              </div>
            ) : (
              <PriorityPanel
                user={targetUser}
                data={targetData}
                canEdit={canEdit(targetId)}
                onSave={(priorities) => savePriorities(targetId, priorities)}
              />
            )
          )}
          {activeTab === 'history' && (
            <HistoryPanel user={targetUser} history={targetData.history} />
          )}
          {activeTab === 'gantt' && (
            <GanttPanel
              users={teamUsers}
              userData={userData}
            />
          )}
          {activeTab === 'dashboard' && isSuperAdmin && (
            <Dashboard users={users.filter((u) => u.role !== 'superadmin')} teams={teams} userData={userData} />
          )}
          {activeTab === 'leave' && (
            <LeavePanel />
          )}
        </div>
      </div>
      <Toast />
    </div>
  );
}
