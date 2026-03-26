import { useStore } from '../../stores/useStore';
import { teamColor } from '../../lib/utils';

export default function Header() {
  const currentUser = useStore((s) => s.currentUser);
  const logout = useStore((s) => s.logout);

  if (!currentUser) return null;

  const isSuperAdmin = currentUser.role === 'superadmin';
  const isAdmin = currentUser.role === 'admin' || isSuperAdmin;

  return (
    <header className="bg-sidebar text-white px-6 flex items-center justify-between h-14 shrink-0">
      <div className="flex items-center gap-3">
        <span className="text-lg font-bold text-primary-light">◆ Axissoft</span>
        <span className="text-[13px] text-slate-400">OKR 관리</span>
        <span className="text-[11px] bg-slate-700 text-slate-500 px-2 py-0.5 rounded-[10px]">
          💾 자동저장
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span
          className="text-[13px] px-2.5 py-0.5 rounded-[20px] font-semibold"
          style={{
            background: isSuperAdmin ? '#6366f1' : isAdmin ? '#8b5cf6' : teamColor(currentUser.team),
          }}
        >
          {currentUser.name} {isSuperAdmin ? '👑' : isAdmin ? '🧑‍💼' : ''}
        </span>
        <button
          onClick={logout}
          className="bg-transparent border border-slate-600 text-slate-400 rounded-md px-3 py-1 cursor-pointer text-xs hover:border-slate-400 transition-colors"
        >
          로그아웃
        </button>
      </div>
    </header>
  );
}
