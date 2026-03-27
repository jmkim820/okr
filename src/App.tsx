import { useEffect } from 'react';
import { useStore } from './stores/useStore';
import { SUPERADMIN } from './lib/seed';
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
    activeTab, viewUserId, setActiveTab,
    saveOkr, savePriorities, archiveQuarter,
  } = useStore();

  useEffect(() => {
    initApp();
  }, [initApp]);

  const isSuperAdmin = currentUser?.role === 'superadmin';
  const isAdmin = currentUser?.role === 'admin' || isSuperAdmin;

  // superadmin이 본인 상태에서 OKR/priority 탭이면 dashboard로 이동
  const viewingOther = isSuperAdmin && viewUserId && viewUserId !== currentUser?.id;
  useEffect(() => {
    if (isSuperAdmin && !viewingOther && (activeTab === 'okr' || activeTab === 'priority')) {
      setActiveTab('dashboard');
    }
  }, [isSuperAdmin, viewingOther, activeTab, setActiveTab]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-primary-light text-lg font-bold">
        ◆ Axissoft OKR 로딩 중...
      </div>
    );
  }

  if (!currentUser) return <LoginPage />;

  const myTeam = currentUser.team;

  // superadmin/admin: 전체 열람, user: 같은 팀만 열람
  const canView = (userId: string) => {
    if (isAdmin) return true;
    const target = users.find((u) => u.id === userId);
    return target?.team === myTeam;
  };

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
  const targetUser = [...users, SUPERADMIN].find((u) => u.id === targetId) || currentUser;
  const targetData = userData[targetId] || { current: { okr: { objective: '', level: 0, startDate: '', endDate: '', krs: [] }, priorities: [] }, history: [] };

  // 간트차트: admin 이상 전체, user 같은 팀
  const teamUsers = isAdmin ? users : users.filter((u) => u.team === myTeam);

  return (
    <div className="font-sans min-h-screen bg-slate-50">
      <Header />
      <div className="flex" style={{ height: 'calc(100vh - 56px)' }}>
        <Sidebar />
        <div className="flex-1 overflow-auto p-3 md:p-6 w-full min-w-0">
          {activeTab === 'okr' && (
            <OKRPanel
              user={targetUser}
              data={targetData}
              onSaveOkr={canEdit(targetId) ? (okr) => saveOkr(targetId, okr) : undefined}
              onArchive={canEdit(targetId) ? () => archiveQuarter(targetId) : undefined}
            />
          )}
          {activeTab === 'priority' && (
            <PriorityPanel
              user={targetUser}
              data={targetData}
              canEdit={canEdit(targetId)}
              onSave={(priorities) => savePriorities(targetId, priorities)}
            />
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
            <Dashboard users={users} teams={teams} userData={userData} />
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
