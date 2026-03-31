import { useStore } from '../../stores/useStore';
import { roleColor } from '../../lib/utils';

export default function Header() {
  const currentUser = useStore((s) => s.currentUser);
  const logout = useStore((s) => s.logout);
  const toggleSidebar = useStore((s) => s.toggleSidebar);

  if (!currentUser) return null;

  const isSuperAdmin = currentUser.role === 'superadmin';
  const isAdmin = currentUser.role === 'admin' || isSuperAdmin;

  return (
    <header className="bg-sidebar text-white px-4 md:px-6 flex items-center justify-between h-14 shrink-0">
      <div className="flex items-center gap-2 md:gap-3">
        {/* 햄버거 메뉴 — 모바일 전용 */}
        <button
          onClick={toggleSidebar}
          className="md:hidden bg-transparent border-none text-slate-300 cursor-pointer p-1 text-xl leading-none"
          aria-label="메뉴 열기"
        >
          ☰
        </button>
        <span className="text-lg font-bold text-primary-light flex items-center gap-1.5"><img src="/logo.png" alt="logo" className="w-6 h-6" /> Axissoft</span>
        <span className="text-[13px] text-slate-400 hidden sm:inline">OKR 관리</span>
        <span className="text-[11px] bg-slate-700 text-slate-500 px-2 py-0.5 rounded-[10px] hidden sm:inline">
          💾 자동저장
        </span>
      </div>
      <div className="flex items-center gap-2 md:gap-3">
        <span
          className="text-[12px] md:text-[13px] px-2 md:px-2.5 py-0.5 rounded-[20px] font-semibold"
          style={{
            background: roleColor(currentUser.role),
          }}
        >
          {currentUser.name} {isSuperAdmin ? '👑' : isAdmin ? '🧑‍💼' : ''}
        </span>
        <button
          onClick={logout}
          className="bg-transparent border border-slate-600 text-slate-400 rounded-md px-2 md:px-3 py-1 cursor-pointer text-xs hover:border-slate-400 transition-colors"
        >
          로그아웃
        </button>
      </div>
    </header>
  );
}
