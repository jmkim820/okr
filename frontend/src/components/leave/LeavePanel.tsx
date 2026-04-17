import { useState, useMemo } from 'react';
import { useStore } from '../../stores/useStore';
import Card from '../ui/Card';
import * as XLSX from 'xlsx';
import type { LeaveRequest } from '../../types';
import { isAlimtalkEnabled, getNotifyPhones, sendLeaveNotification } from '../../lib/alimtalk';

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export default function LeavePanel() {
  const {
    currentUser, users,
    leaveRequests, leaveAllocations, leaveLogs,
    addLeaveRequest, updateLeaveRequest,
    approveLeave, rejectLeave, deleteLeaveRequest,
    requestDeleteLeave, approveDeleteRequest,
    setLeaveAllocation, setSpecialLeave, batchSetLeaveAllocations, showToast,
  } = useStore();

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [search, setSearch] = useState('');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [showBatchAllocModal, setShowBatchAllocModal] = useState(false);
  const [editAllocUserId, setEditAllocUserId] = useState<string | null>(null);
  const [editAllocValue, setEditAllocValue] = useState('');
  const [editSpecialUserId, setEditSpecialUserId] = useState<string | null>(null);
  const [editSpecialValue, setEditSpecialValue] = useState('');
  const [editingLeave, setEditingLeave] = useState<{ id: string; year: number; month: number; reason: string; dates: Map<string, 'full' | 'am' | 'pm'>; calYear: number; calMonth: number } | null>(null);
  const [showLogModal, setShowLogModal] = useState(false);

  type LogFilterType = 'action' | 'date' | 'name';
  type LogFilterOp = 'is' | 'is_not' | 'before' | 'after' | 'between' | 'contains';
  interface LogFilter { id: number; type: LogFilterType; op: LogFilterOp; value: string; value2?: string; values?: Set<string> }
  const [logFilters, setLogFilters] = useState<LogFilter[]>([]);
  const [logFilterCounter, setLogFilterCounter] = useState(0);
  const [openFilterPopup, setOpenFilterPopup] = useState<number | null>(null);

  // New request form
  const [reqTargetUserId, setReqTargetUserId] = useState('');
  const [reqCalYear, setReqCalYear] = useState(now.getFullYear());
  const [reqCalMonth, setReqCalMonth] = useState(now.getMonth()); // 0-based for Date
  // key: 'YYYY-MM-DD', value: 'full' | 'am' | 'pm'
  const [reqSelectedDates, setReqSelectedDates] = useState<Map<string, 'full' | 'am' | 'pm'>>(new Map());
  const [reqReason, setReqReason] = useState('');

  // 자동 계산: 연차=1, 반차=0.5
  const reqTotalAmount = useMemo(() => {
    let total = 0;
    reqSelectedDates.forEach((type) => { total += type === 'full' ? 1 : 0.5; });
    return total;
  }, [reqSelectedDates]);

  // Batch allocation form
  const [batchYear, setBatchYear] = useState(now.getFullYear() + 1);
  const [batchValues, setBatchValues] = useState<Record<string, string>>({});

  if (!currentUser) return null;

  const isSuperAdmin = currentUser.role === 'superadmin';
  const isAdmin = currentUser.role === 'admin' || isSuperAdmin;

  // Visible users based on role
  const visibleUsers = useMemo(() => {
    if (isSuperAdmin) return users.filter((u) => u.role !== 'superadmin');
    if (isAdmin) return users.filter((u) => u.team === currentUser.team && u.role !== 'superadmin');
    return users.filter((u) => u.id === currentUser.id);
  }, [users, currentUser, isSuperAdmin, isAdmin]);

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return visibleUsers;
    const q = search.toLowerCase();
    return visibleUsers.filter(
      (u) => u.name.toLowerCase().includes(q) || u.team.toLowerCase().includes(q),
    );
  }, [visibleUsers, search]);

  // Year leaves
  const yearLeaves = useMemo(
    () => leaveRequests.filter((r) => r.year === selectedYear),
    [leaveRequests, selectedYear],
  );

  // 입사일로부터 기준일까지 만근 월수 (월차 누적 계산용)
  const getAccruedMonths = (joinDate: Date, refDate: Date): number => {
    let months = (refDate.getFullYear() - joinDate.getFullYear()) * 12
               + (refDate.getMonth() - joinDate.getMonth());
    if (refDate.getDate() < joinDate.getDate()) months--;
    return Math.max(0, months);
  };

  // 발생휴가 자동 계산
  // - 월차: 입사일 기준 매월 1일씩. 현재 시점 기준 실제 발생분만 표시
  // - 연차: 입사 1주년 이후 첫 1/1부터 15일, 근속 2년 이상 16일, 이후 2년마다 +1일 (최대 25일)
  const getDefaultAllocation = (userId: string, year: number): number => {
    const user = users.find((u) => u.id === userId);
    if (!user?.joinDate) return 15;

    const join = new Date(user.joinDate);
    const joinYear = join.getFullYear();
    const joinMonth = join.getMonth();

    // 1년 기념일
    const anniversary = new Date(joinYear + 1, joinMonth, join.getDate());

    // 연차 시작: 1년 기념일 이후 첫 1월 1일
    const jan1OfAnnivYear = new Date(anniversary.getFullYear(), 0, 1);
    const annualStartYear = jan1OfAnnivYear >= anniversary ? anniversary.getFullYear() : anniversary.getFullYear() + 1;

    if (year < joinYear) return 0;

    if (year < annualStartYear) {
      // 월차 기간: 현재 시점 기준으로 실제 발생분 계산
      const today = new Date();
      const currentYear = today.getFullYear();

      // 기준일: 과거 연도면 12/31, 올해면 오늘, 미래면 12/31(예상)
      const refDate = year < currentYear
        ? new Date(year, 11, 31)
        : year === currentYear
          ? today
          : new Date(year, 11, 31);

      // 전년도 말 기준 누적
      const prevEnd = year > joinYear ? new Date(year - 1, 11, 31) : join;
      const accruedToRef = getAccruedMonths(join, refDate);
      const accruedToPrev = year > joinYear ? getAccruedMonths(join, prevEnd) : 0;

      return Math.max(0, accruedToRef - accruedToPrev);
    }

    // 연차: 해당 연도 1/1 기준 근속연수
    const jan1 = new Date(year, 0, 1);
    const diffMs = jan1.getTime() - join.getTime();
    const fullYears = Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000));

    if (fullYears < 2) return 15;
    return Math.min(25, 16 + Math.floor((fullYears - 2) / 2));
  };

  const getAllocation = (userId: string) => {
    const alloc = leaveAllocations.find((a) => a.userId === userId && a.year === selectedYear);
    if (alloc) return alloc.total; // 수동 설정된 값 우선
    return getDefaultAllocation(userId, selectedYear);
  };

  const getSpecialDays = (userId: string) => {
    const alloc = leaveAllocations.find((a) => a.userId === userId && a.year === selectedYear);
    return alloc?.special || 0;
  };

  const getUsedDays = (userId: string) =>
    yearLeaves
      .filter((r) => r.userId === userId && r.status === 'approved')
      .reduce((sum, r) => sum + r.amount, 0);

  const getPendingDays = (userId: string) =>
    yearLeaves
      .filter((r) => r.userId === userId && r.status === 'pending')
      .reduce((sum, r) => sum + r.amount, 0);

  const getMonthLeaves = (userId: string, month: number) =>
    yearLeaves.filter((r) => r.userId === userId && r.month === month);

  // 승인 체계: 팀원→팀장/경영진 승인, 팀장→경영진만 승인 (자기 승인 방지)
  const pendingLeaves = useMemo(() => {
    if (isSuperAdmin) {
      return yearLeaves.filter((r) => r.status === 'pending' && r.userId !== currentUser.id);
    }
    if (currentUser.role === 'admin') {
      return yearLeaves.filter((r) => {
        if (r.status !== 'pending' || r.userId === currentUser.id) return false;
        const reqUser = users.find((u) => u.id === r.userId);
        return reqUser?.team === currentUser.team && reqUser?.role === 'user';
      });
    }
    return [];
  }, [yearLeaves, isSuperAdmin, currentUser, users]);

  // 수정/삭제 요청 건 (관리자용)
  const changeRequests = useMemo(() => {
    if (isSuperAdmin) {
      return yearLeaves.filter((r) => r.deleteRequested && r.userId !== currentUser.id);
    }
    if (currentUser.role === 'admin') {
      return yearLeaves.filter((r) => {
        if (!r.deleteRequested || r.userId === currentUser.id) return false;
        const reqUser = users.find((u) => u.id === r.userId);
        return reqUser?.team === currentUser.team && reqUser?.role === 'user';
      });
    }
    return [];
  }, [yearLeaves, isSuperAdmin, currentUser, users]);

  // Stats
  const totalEmployees = visibleUsers.length;
  const totalAllocation = visibleUsers.reduce((s, u) => s + getAllocation(u.id), 0);
  const totalSpecial = visibleUsers.reduce((s, u) => s + getSpecialDays(u.id), 0);
  const totalUsed = visibleUsers.reduce((s, u) => s + getUsedDays(u.id), 0);
  const totalRemaining = totalAllocation + totalSpecial - totalUsed;

  // My stats (for user view)
  const myAllocation = getAllocation(currentUser.id);
  const mySpecial = getSpecialDays(currentUser.id);
  const myUsed = getUsedDays(currentUser.id);
  const myPending = getPendingDays(currentUser.id);
  const myRemaining = myAllocation + mySpecial - myUsed;

  // 지난 해 여부
  const isArchived = selectedYear < now.getFullYear();

  const handleSubmitRequest = () => {
    if (reqSelectedDates.size === 0) { showToast('날짜를 선택해주세요.', 'error'); return; }

    const targetId = (isSuperAdmin && reqTargetUserId) ? reqTargetUserId : currentUser.id;
    const isByProxy = isSuperAdmin && targetId !== currentUser.id;

    // 선택된 날짜를 월별로 그룹핑
    const byMonth: Record<number, { day: string; type: 'full' | 'am' | 'pm'; year: number }[]> = {};
    const sorted = [...reqSelectedDates.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    for (const [dateKey, type] of sorted) {
      const yr = parseInt(dateKey.slice(0, 4));
      const month = parseInt(dateKey.slice(5, 7));
      const day = dateKey.slice(8, 10);
      if (!byMonth[month]) byMonth[month] = [];
      byMonth[month].push({ day, type, year: yr });
    }

    for (const [monthStr, entries] of Object.entries(byMonth)) {
      const typeLabel = (t: 'full' | 'am' | 'pm') => t === 'full' ? '' : t === 'am' ? '(오전)' : '(오후)';
      const daysStr = entries.map((e) => `${parseInt(e.day)}${typeLabel(e.type)}`).join(', ');
      const monthAmount = entries.reduce((s, e) => s + (e.type === 'full' ? 1 : 0.5), 0);

      const req: LeaveRequest = {
        id: 'lv' + Date.now() + '_' + monthStr,
        userId: targetId,
        year: entries[0].year,
        month: parseInt(monthStr),
        days: daysStr,
        amount: monthAmount,
        reason: reqReason.trim(),
        status: isByProxy ? 'approved' : 'pending',
        requestedAt: new Date().toISOString(),
        approvedBy: isByProxy ? currentUser.id : null,
        approvedByName: isByProxy ? `${currentUser.name} (경영진)` : null,
      };
      addLeaveRequest(req);
    }

    // 알림톡 발송 (대리 신청이 아닌 경우만)
    if (!isByProxy && isAlimtalkEnabled()) {
      const applicant = users.find((u) => u.id === targetId) || currentUser;
      const teamAdminPhones = users
        .filter((u) => u.role === 'admin' && u.team === applicant.team && u.phone)
        .map((u) => u.phone!);
      const phones = getNotifyPhones(teamAdminPhones);
      sendLeaveNotification({
        name: applicant.name,
        message: '신청',
        recipientPhones: phones,
      }).catch(console.error);
    }

    setShowRequestModal(false);
    setReqTargetUserId('');
    setReqSelectedDates(new Map());
    setReqReason('');
  };

  const getUserName = (id: string) => {
    const user = users.find((u) => u.id === id);
    if (user) return user.name;
    if (currentUser && currentUser.id === id) return currentUser.name;
    return id;
  };

  const handleExportExcel = () => {
    const rows = filteredUsers.map((u) => {
      const alloc = getAllocation(u.id);
      const special = getSpecialDays(u.id);
      const used = getUsedDays(u.id);
      const row: Record<string, string | number> = {
        '이름': u.name,
        '입사일': u.joinDate || '-',
        '발생휴가': alloc,
        '특별휴가': special,
        '사용일': used,
        '잔여': alloc + special - used,
      };
      MONTHS.forEach((m) => {
        const ml = getMonthLeaves(u.id, m);
        const approved = ml.filter((r) => r.status === 'approved').reduce((s, r) => s + r.amount, 0);
        const pending = ml.filter((r) => r.status === 'pending').reduce((s, r) => s + r.amount, 0);
        row[`${m}월`] = approved ? (pending ? `${approved}(+${pending}대기)` : approved) : (pending ? `${pending}(대기)` : '');
      });
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${selectedYear}년 휴가현황`);
    XLSX.writeFile(wb, `휴가현황_${selectedYear}.xlsx`);
    showToast('엑셀 다운로드 완료');
  };

  const handleStartEditAlloc = (userId: string) => {
    setEditAllocUserId(userId);
    setEditAllocValue(String(getAllocation(userId)));
  };

  const handleSaveAlloc = () => {
    if (!editAllocUserId) return;
    const val = parseFloat(editAllocValue);
    if (isNaN(val) || val < 0) { showToast('올바른 숫자를 입력해주세요.', 'error'); return; }
    setLeaveAllocation(editAllocUserId, selectedYear, val);
    setEditAllocUserId(null);
  };

  const handleStartEditSpecial = (userId: string) => {
    setEditSpecialUserId(userId);
    setEditSpecialValue(String(getSpecialDays(userId)));
  };

  const handleSaveSpecial = () => {
    if (!editSpecialUserId) return;
    const val = parseFloat(editSpecialValue);
    if (isNaN(val) || val < 0) { showToast('올바른 숫자를 입력해주세요.', 'error'); return; }
    // allocation 레코드가 없으면 먼저 발생 값을 확정 (자동 계산값 보존)
    const exists = leaveAllocations.find((a) => a.userId === editSpecialUserId && a.year === selectedYear);
    if (!exists) {
      setLeaveAllocation(editSpecialUserId, selectedYear, getDefaultAllocation(editSpecialUserId, selectedYear));
    }
    setSpecialLeave(editSpecialUserId, selectedYear, val);
    setEditSpecialUserId(null);
  };

  const handleOpenBatchAlloc = () => {
    const vals: Record<string, string> = {};
    users.forEach((u) => {
      const existing = leaveAllocations.find((a) => a.userId === u.id && a.year === batchYear);
      vals[u.id] = String(existing?.total ?? getDefaultAllocation(u.id, batchYear));
    });
    setBatchValues(vals);
    setShowBatchAllocModal(true);
  };

  const handleSaveBatchAlloc = () => {
    const allocations = Object.entries(batchValues).map(([userId, val]) => ({
      userId,
      total: parseFloat(val) || 0,
    }));
    batchSetLeaveAllocations(batchYear, allocations);
    setShowBatchAllocModal(false);
  };

  // Tooltip state
  const [tooltip, setTooltip] = useState<{ x: number; y: number; r: LeaveRequest } | null>(null);

  const handleCellMouseEnter = (e: React.MouseEvent, r: LeaveRequest) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({ x: rect.left + rect.width / 2, y: rect.bottom + 4, r });
  };

  // Month cell renderer
  const renderMonthCell = (userId: string, month: number) => {
    const leaves = getMonthLeaves(userId, month).filter((r) => r.status !== 'rejected');
    if (leaves.length === 0) return <span className="text-slate-300">-</span>;

    return (
      <div className="flex flex-wrap gap-0.5 justify-center">
        {leaves.map((r) => (
          <span
            key={r.id}
            onMouseEnter={(e) => handleCellMouseEnter(e, r)}
            onMouseLeave={() => setTooltip(null)}
            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold cursor-default ${
              r.status === 'approved'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-red-100 text-red-600'
            }`}
          >
            {r.amount}
          </span>
        ))}
      </div>
    );
  };

  // ─── User view ──────────────────────────────────────────
  if (!isAdmin) {
    const myLeaves = yearLeaves.filter((r) => r.userId === currentUser.id);

    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-800">휴가 관리</h2>
            {isArchived && (
              <span className="text-xs bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full font-semibold">보관됨</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm"
            >
              {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
                <option key={y} value={y}>{y}년</option>
              ))}
            </select>
            {isAdmin && (
              <button
                onClick={() => setShowLogModal(true)}
                className="bg-slate-600 text-white border-none rounded-lg px-4 py-1.5 text-sm font-semibold cursor-pointer hover:bg-slate-700 transition-colors"
              >
                📋 로그
              </button>
            )}
            {!isArchived && (
              <button
                onClick={() => setShowRequestModal(true)}
                className="bg-blue-600 text-white border-none rounded-lg px-4 py-1.5 text-sm font-semibold cursor-pointer hover:bg-blue-700 transition-colors"
              >
                + 휴가 신청
              </button>
            )}
          </div>
        </div>

        {/* Stats cards */}
        <div className={`grid grid-cols-2 ${mySpecial > 0 ? 'sm:grid-cols-5' : 'sm:grid-cols-4'} gap-3`}>
          <Card className="!p-4 text-center">
            <div className="text-[11px] text-slate-500 mb-1">발생휴가</div>
            <div className="text-2xl font-bold text-slate-800">{myAllocation}<span className="text-sm text-slate-400">일</span></div>
          </Card>
          {mySpecial > 0 && (
            <Card className="!p-4 text-center">
              <div className="text-[11px] text-slate-500 mb-1">특별휴가</div>
              <div className="text-2xl font-bold text-slate-800">+{mySpecial}<span className="text-sm text-slate-400">일</span></div>
            </Card>
          )}
          <Card className="!p-4 text-center">
            <div className="text-[11px] text-slate-500 mb-1">사용일</div>
            <div className="text-2xl font-bold text-blue-600">{myUsed}<span className="text-sm text-slate-400">일</span></div>
          </Card>
          <Card className="!p-4 text-center">
            <div className="text-[11px] text-slate-500 mb-1">잔여</div>
            <div className={`text-2xl font-bold ${myRemaining < 0 ? 'text-red-500' : 'text-green-600'}`}>{myRemaining}<span className="text-sm text-slate-400">일</span></div>
          </Card>
          <Card className="!p-4 text-center">
            <div className="text-[11px] text-slate-500 mb-1">승인 대기</div>
            <div className="text-2xl font-bold text-orange-500">{myPending}<span className="text-sm text-slate-400">일</span></div>
          </Card>
        </div>

        {/* My leave requests table */}
        <Card title="내 휴가 신청 내역">
          {myLeaves.length === 0 ? (
            <div className="text-center text-slate-400 py-8 text-sm">신청 내역이 없습니다.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-xs">
                    <th className="text-left py-2 px-2 font-medium">월</th>
                    <th className="text-left py-2 px-2 font-medium">날짜</th>
                    <th className="text-center py-2 px-2 font-medium">일수</th>
                    <th className="text-left py-2 px-2 font-medium">사유</th>
                    <th className="text-center py-2 px-2 font-medium">상태</th>
                    <th className="text-center py-2 px-2 font-medium">승인자</th>
                    <th className="text-center py-2 px-2 font-medium">신청일</th>
                    <th className="text-center py-2 px-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {myLeaves
                    .sort((a, b) => b.month - a.month || b.requestedAt.localeCompare(a.requestedAt))
                    .map((r) => (
                    <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2 px-2">{r.month}월</td>
                      <td className="py-2 px-2">{r.days}일</td>
                      <td className="py-2 px-2 text-center">{r.amount}</td>
                      <td className="py-2 px-2 text-slate-600">{r.reason || '-'}</td>
                      <td className="py-2 px-2 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          r.deleteRequested ? 'bg-orange-100 text-orange-600' :
                          r.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                          r.status === 'pending' ? 'bg-red-100 text-red-600' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {r.deleteRequested ? '삭제 대기' : r.status === 'approved' ? '승인' : r.status === 'pending' ? '대기' : '반려'}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-center text-slate-400 text-xs">
                        {r.approvedByName || (r.approvedBy ? getUserName(r.approvedBy) : '-')}
                      </td>
                      <td className="py-2 px-2 text-center text-slate-400 text-xs">
                        {r.requestedAt.slice(0, 10)}
                      </td>
                      <td className="py-2 px-2 text-center">
                        {!isArchived && (
                          <div className="flex gap-1 justify-center">
                            {r.status === 'pending' && (
                              <>
                                <button onClick={() => {
                                  // days 문자열을 Map으로 파싱
                                  const dates = new Map<string, 'full' | 'am' | 'pm'>();
                                  const pad = (n: number) => String(n).padStart(2, '0');
                                  r.days.split(',').map((s) => s.trim()).forEach((s) => {
                                    const dayNum = parseInt(s);
                                    if (isNaN(dayNum)) return;
                                    const type: 'full' | 'am' | 'pm' = s.includes('오전') ? 'am' : s.includes('오후') ? 'pm' : 'full';
                                    const key = `${r.year}-${pad(r.month)}-${pad(dayNum)}`;
                                    dates.set(key, type);
                                  });
                                  setEditingLeave({ id: r.id, year: r.year, month: r.month, reason: r.reason, dates, calYear: r.year, calMonth: r.month - 1 });
                                }} className="text-blue-500 bg-transparent border-none cursor-pointer text-xs hover:text-blue-700">수정</button>
                                <button onClick={() => deleteLeaveRequest(r.id)} className="text-red-500 bg-transparent border-none cursor-pointer text-xs hover:text-red-700">삭제</button>
                              </>
                            )}
                            {r.status === 'approved' && !r.deleteRequested && (
                              <>
                                <button onClick={() => {
                                  const dates = new Map<string, 'full' | 'am' | 'pm'>();
                                  const pad3 = (n: number) => String(n).padStart(2, '0');
                                  r.days.split(',').map((s) => s.trim()).forEach((s) => {
                                    const dayNum = parseInt(s);
                                    if (isNaN(dayNum)) return;
                                    const type: 'full' | 'am' | 'pm' = s.includes('오전') ? 'am' : s.includes('오후') ? 'pm' : 'full';
                                    dates.set(`${r.year}-${pad3(r.month)}-${pad3(dayNum)}`, type);
                                  });
                                  setEditingLeave({ id: r.id, year: r.year, month: r.month, reason: r.reason, dates, calYear: r.year, calMonth: r.month - 1 });
                                }} className="text-blue-500 bg-transparent border-none cursor-pointer text-xs hover:text-blue-700">수정</button>
                                <button onClick={() => requestDeleteLeave(r.id)} className="text-red-500 bg-transparent border-none cursor-pointer text-xs hover:text-red-700">삭제</button>
                              </>
                            )}
                            {r.deleteRequested && <span className="text-[10px] text-orange-500 font-semibold">삭제 승인 대기</span>}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Request Modal */}
        {showRequestModal && renderRequestModal()}
        {editingLeave && renderEditModal()}
      </div>
    );
  }

  // ─── Admin / SuperAdmin view ────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-slate-800">휴가 관리</h2>
          {isArchived && (
            <span className="text-xs bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full font-semibold">보관됨</span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm"
          >
            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
              <option key={y} value={y}>{y}년</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="이름 또는 팀 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm w-48"
          />
          {isSuperAdmin && (
            <button
              onClick={handleOpenBatchAlloc}
              className="bg-purple-600 text-white border-none rounded-lg px-4 py-1.5 text-sm font-semibold cursor-pointer hover:bg-purple-700 transition-colors"
            >
              발생휴가 일괄 설정
            </button>
          )}
          {isSuperAdmin && (
            <button
              onClick={handleExportExcel}
              className="bg-green-600 text-white border-none rounded-lg px-4 py-1.5 text-sm font-semibold cursor-pointer hover:bg-green-700 transition-colors"
            >
              엑셀 내보내기
            </button>
          )}
          <button
            onClick={() => setShowLogModal(true)}
            className="bg-slate-600 text-white border-none rounded-lg px-4 py-1.5 text-sm font-semibold cursor-pointer hover:bg-slate-700 transition-colors"
          >
            📋 로그
          </button>
          {!isArchived && (
            <button
              onClick={() => setShowRequestModal(true)}
              className="bg-blue-600 text-white border-none rounded-lg px-4 py-1.5 text-sm font-semibold cursor-pointer hover:bg-blue-700 transition-colors"
            >
              + 휴가 신청
            </button>
          )}
          {(pendingLeaves.length + changeRequests.length) > 0 && (
            <button
              onClick={() => setShowPendingModal(true)}
              className="relative bg-orange-500 text-white border-none rounded-lg px-4 py-1.5 text-sm font-semibold cursor-pointer hover:bg-orange-600 transition-colors"
            >
              처리 대기
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {pendingLeaves.length + changeRequests.length}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="!p-4 text-center">
          <div className="text-[11px] text-slate-500 mb-1">전체 직원</div>
          <div className="text-2xl font-bold text-slate-800">{totalEmployees}<span className="text-sm text-slate-400">명</span></div>
        </Card>
        <Card className="!p-4 text-center">
          <div className="text-[11px] text-slate-500 mb-1">총 발생휴가</div>
          <div className="text-2xl font-bold text-slate-800">{totalAllocation}<span className="text-sm text-slate-400">일</span></div>
        </Card>
        <Card className="!p-4 text-center">
          <div className="text-[11px] text-slate-500 mb-1">총 사용일</div>
          <div className="text-2xl font-bold text-blue-600">{totalUsed}<span className="text-sm text-slate-400">일</span></div>
        </Card>
        <Card className="!p-4 text-center">
          <div className="text-[11px] text-slate-500 mb-1">총 잔여</div>
          <div className="text-2xl font-bold text-green-600">{totalRemaining}<span className="text-sm text-slate-400">일</span></div>
        </Card>
      </div>

      {/* Main table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b-2 border-slate-200 text-slate-500 text-xs">
                <th className="text-left py-2 px-2 font-medium sticky left-0 bg-white z-10">이름</th>
                <th className="text-center py-2 px-2 font-medium">입사일</th>
                <th className="text-center py-2 px-2 font-medium">발생</th>
                <th className="text-center py-2 px-2 font-medium">특별</th>
                <th className="text-center py-2 px-2 font-medium">사용</th>
                <th className="text-center py-2 px-2 font-medium">잔여</th>
                {MONTHS.map((m) => (
                  <th key={m} className="text-center py-2 px-2 font-medium min-w-[50px]">{m}월</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => {
                const alloc = getAllocation(u.id);
                const special = getSpecialDays(u.id);
                const used = getUsedDays(u.id);
                const remaining = alloc + special - used;
                return (
                  <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2 px-2 font-semibold text-slate-800 sticky left-0 bg-white z-10">{u.name}</td>
                    <td className="py-2 px-2 text-center text-slate-400 text-xs">{u.joinDate || '-'}</td>
                    <td className="py-2 px-2 text-center">
                      {editAllocUserId === u.id ? (
                        <div className="flex items-center gap-1 justify-center">
                          <input
                            type="number"
                            value={editAllocValue}
                            onChange={(e) => setEditAllocValue(e.target.value)}
                            className="w-14 border border-slate-300 rounded px-1 py-0.5 text-center text-xs"
                            step="0.5"
                            min="0"
                          />
                          <button onClick={handleSaveAlloc} className="text-blue-600 bg-transparent border-none cursor-pointer text-xs font-semibold">확인</button>
                          <button onClick={() => setEditAllocUserId(null)} className="text-slate-400 bg-transparent border-none cursor-pointer text-xs">취소</button>
                        </div>
                      ) : (
                        <span
                          className={isSuperAdmin ? 'cursor-pointer hover:text-blue-600 underline decoration-dashed' : ''}
                          onClick={() => isSuperAdmin && handleStartEditAlloc(u.id)}
                          title={isSuperAdmin ? '클릭하여 수정' : ''}
                        >
                          {alloc}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-center">
                      {editSpecialUserId === u.id ? (
                        <div className="flex items-center gap-1 justify-center">
                          <input
                            type="number"
                            value={editSpecialValue}
                            onChange={(e) => setEditSpecialValue(e.target.value)}
                            className="w-14 border border-slate-300 rounded px-1 py-0.5 text-center text-xs"
                            step="0.5"
                            min="0"
                          />
                          <button onClick={handleSaveSpecial} className="text-blue-600 bg-transparent border-none cursor-pointer text-xs font-semibold">확인</button>
                          <button onClick={() => setEditSpecialUserId(null)} className="text-slate-400 bg-transparent border-none cursor-pointer text-xs">취소</button>
                        </div>
                      ) : (
                        <span
                          className={isSuperAdmin ? 'cursor-pointer hover:text-blue-600 underline decoration-dashed' : ''}
                          onClick={() => isSuperAdmin && handleStartEditSpecial(u.id)}
                          title={isSuperAdmin ? '클릭하여 수정' : ''}
                        >
                          {special > 0 ? `+${special}` : '-'}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-center text-blue-600 font-semibold">{used}</td>
                    <td className={`py-2 px-2 text-center font-semibold ${remaining < 0 ? 'text-red-500' : 'text-green-600'}`}>
                      {remaining}
                    </td>
                    {MONTHS.map((m) => (
                      <td key={m} className="py-2 px-2 text-center">
                        {renderMonthCell(u.id, m)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 내 휴가 신청 내역 (관리자 본인) */}
      {(() => {
        const myLeaves = yearLeaves.filter((r) => r.userId === currentUser.id);
        if (myLeaves.length === 0 && isArchived) return null;
        return (
          <Card title="내 휴가 신청 내역">
            {myLeaves.length === 0 ? (
              <div className="text-center text-slate-400 py-6 text-sm">신청 내역이 없습니다.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 text-xs">
                      <th className="text-left py-2 px-2 font-medium">월</th>
                      <th className="text-left py-2 px-2 font-medium">날짜</th>
                      <th className="text-center py-2 px-2 font-medium">일수</th>
                      <th className="text-left py-2 px-2 font-medium">사유</th>
                      <th className="text-center py-2 px-2 font-medium">상태</th>
                      <th className="text-center py-2 px-2 font-medium">승인자</th>
                      <th className="text-center py-2 px-2 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {myLeaves
                      .sort((a, b) => b.month - a.month || b.requestedAt.localeCompare(a.requestedAt))
                      .map((r) => (
                      <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-2 px-2">{r.month}월</td>
                        <td className="py-2 px-2">{r.days}일</td>
                        <td className="py-2 px-2 text-center">{r.amount}</td>
                        <td className="py-2 px-2 text-slate-600">{r.reason || '-'}</td>
                        <td className="py-2 px-2 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            r.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                            r.status === 'pending' ? 'bg-red-100 text-red-600' :
                            'bg-slate-100 text-slate-500'
                          }`}>
                            {r.status === 'approved' ? '승인' : r.status === 'pending' ? '대기' : '반려'}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-center text-slate-400 text-xs">
                          {r.approvedByName || (r.approvedBy ? getUserName(r.approvedBy) : '-')}
                        </td>
                        <td className="py-2 px-2 text-center">
                          {!isArchived && (
                            <div className="flex gap-1 justify-center">
                              {r.status === 'pending' && (
                                <>
                                  <button onClick={() => {
                                    const dates = new Map<string, 'full' | 'am' | 'pm'>();
                                    const pad2 = (n: number) => String(n).padStart(2, '0');
                                    r.days.split(',').map((s) => s.trim()).forEach((s) => {
                                      const dayNum = parseInt(s);
                                      if (isNaN(dayNum)) return;
                                      const type: 'full' | 'am' | 'pm' = s.includes('오전') ? 'am' : s.includes('오후') ? 'pm' : 'full';
                                      dates.set(`${r.year}-${pad2(r.month)}-${pad2(dayNum)}`, type);
                                    });
                                    setEditingLeave({ id: r.id, year: r.year, month: r.month, reason: r.reason, dates, calYear: r.year, calMonth: r.month - 1 });
                                  }} className="text-blue-500 bg-transparent border-none cursor-pointer text-xs hover:text-blue-700">수정</button>
                                  <button onClick={() => deleteLeaveRequest(r.id)} className="text-red-500 bg-transparent border-none cursor-pointer text-xs hover:text-red-700">삭제</button>
                                </>
                              )}
                              {r.status === 'approved' && (
                                <>
                                  <button onClick={() => {
                                    const dates = new Map<string, 'full' | 'am' | 'pm'>();
                                    const pad2 = (n: number) => String(n).padStart(2, '0');
                                    r.days.split(',').map((s) => s.trim()).forEach((s) => {
                                      const dayNum = parseInt(s);
                                      if (isNaN(dayNum)) return;
                                      const type: 'full' | 'am' | 'pm' = s.includes('오전') ? 'am' : s.includes('오후') ? 'pm' : 'full';
                                      dates.set(`${r.year}-${pad2(r.month)}-${pad2(dayNum)}`, type);
                                    });
                                    setEditingLeave({ id: r.id, year: r.year, month: r.month, reason: r.reason, dates, calYear: r.year, calMonth: r.month - 1 });
                                  }} className="text-blue-500 bg-transparent border-none cursor-pointer text-xs hover:text-blue-700">수정</button>
                                  <button onClick={() => deleteLeaveRequest(r.id)} className="text-red-500 bg-transparent border-none cursor-pointer text-xs hover:text-red-700">삭제</button>
                                </>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        );
      })()}

      {/* Modals */}
      {showRequestModal && renderRequestModal()}
      {showPendingModal && renderPendingModal()}
      {showBatchAllocModal && renderBatchAllocModal()}
      {editingLeave && renderEditModal()}

      {/* 로그 모달 */}
      {showLogModal && (() => {
        const actionDefs = [
          { key: 'request', text: '신청', color: 'bg-blue-100 text-blue-700' },
          { key: 'modify', text: '수정', color: 'bg-amber-100 text-amber-700' },
          { key: 'approve', text: '승인', color: 'bg-green-100 text-green-700' },
          { key: 'reject', text: '반려', color: 'bg-red-100 text-red-700' },
          { key: 'delete', text: '삭제', color: 'bg-slate-100 text-slate-600' },
          { key: 'delete_request', text: '삭제요청', color: 'bg-orange-100 text-orange-700' },
          { key: 'delete_approve', text: '삭제승인', color: 'bg-slate-100 text-slate-600' },
        ];
        const actionLabel: Record<string, { text: string; color: string }> = {};
        actionDefs.forEach((d) => { actionLabel[d.key] = { text: d.text, color: d.color }; });

        const typeLabel: Record<LogFilterType, string> = { action: '상태', date: '날짜', name: '이름' };
        const opsByType: Record<LogFilterType, { key: LogFilterOp; label: string }[]> = {
          action: [{ key: 'is', label: '=' }, { key: 'is_not', label: '≠' }],
          date: [{ key: 'is', label: '=' }, { key: 'before', label: '이전' }, { key: 'after', label: '이후' }, { key: 'between', label: '범위' }],
          name: [{ key: 'contains', label: '포함' }],
        };

        const addFilter = (type: LogFilterType) => {
          const defaultOp = opsByType[type][0].key;
          const id = logFilterCounter;
          setLogFilterCounter((c) => c + 1);
          setLogFilters((f) => [...f, { id, type, op: defaultOp, value: '', ...(type === 'action' ? { values: new Set<string>() } : {}) }]);
          setOpenFilterPopup(id);
        };
        const updateFilter = (id: number, patch: Partial<LogFilter>) => {
          setLogFilters((f) => f.map((r) => r.id === id ? { ...r, ...patch } : r));
        };
        const removeFilter = (id: number) => {
          setLogFilters((f) => f.filter((r) => r.id !== id));
        };

        // 필터 적용
        const filtered = [...leaveLogs]
          .filter((log) => {
            for (const f of logFilters) {
              if (f.type === 'action') {
                if (!f.values || f.values.size === 0) continue;
                if (f.op === 'is' && !f.values.has(log.action)) return false;
                if (f.op === 'is_not' && f.values.has(log.action)) return false;
              } else if (f.type === 'date') {
                if (!f.value) continue;
                const logDate = log.timestamp.slice(0, 10);
                if (f.op === 'is' && logDate !== f.value) return false;
                if (f.op === 'before' && logDate >= f.value) return false;
                if (f.op === 'after' && logDate <= f.value) return false;
                if (f.op === 'between') {
                  if (f.value && logDate < f.value) return false;
                  if (f.value2 && logDate > f.value2) return false;
                }
              } else if (f.type === 'name') {
                const kw = f.value.trim().toLowerCase();
                if (kw && !log.detail.toLowerCase().includes(kw) && !log.actorName.toLowerCase().includes(kw)) return false;
              }
            }
            return true;
          })
          .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

        const closeLog = () => {
          setShowLogModal(false);
          setLogFilters([]);
          setOpenFilterPopup(null);
        };

        const filterSummary = (f: LogFilter): string => {
          if (f.type === 'action') {
            if (!f.values || f.values.size === 0) return `${f.op === 'is' ? '=' : '≠'} …`;
            const labels = [...f.values].map((v) => actionDefs.find((d) => d.key === v)?.text || v).join(', ');
            return `${f.op === 'is' ? '=' : '≠'} ${labels}`;
          }
          if (f.type === 'date') {
            const opLabel = opsByType.date.find((o) => o.key === f.op)?.label || '';
            if (f.op === 'between') return `${f.value || '…'} ~ ${f.value2 || '…'}`;
            return `${opLabel} ${f.value || '…'}`;
          }
          return `포함 "${f.value || '…'}"`;
        };

        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]" onClick={closeLog}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              {/* 헤더 */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                <h3 className="font-bold text-slate-800 text-base">📋 휴가 로그</h3>
                <button onClick={closeLog} className="text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer text-lg">✕</button>
              </div>

              {/* 필터 바 */}
              <div className="px-6 py-3 border-b border-slate-100">
                <div className="flex flex-wrap items-center gap-2">
                  {/* 필터 칩들 */}
                  {logFilters.map((f) => (
                    <div key={f.id} className="relative">
                      <button
                        onClick={() => setOpenFilterPopup(openFilterPopup === f.id ? null : f.id)}
                        className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs cursor-pointer transition-colors"
                      >
                        <span className="font-semibold text-slate-600">{typeLabel[f.type]}</span>
                        <span className="text-slate-400">{filterSummary(f)}</span>
                        <span onClick={(e) => { e.stopPropagation(); removeFilter(f.id); }} className="ml-1 text-slate-400 hover:text-red-500">×</span>
                      </button>

                      {/* 필터 팝오버 */}
                      {openFilterPopup === f.id && (
                        <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl p-3 z-10 min-w-[260px]" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-semibold text-slate-500 w-10">{typeLabel[f.type]}</span>
                            <select
                              value={f.op}
                              onChange={(e) => updateFilter(f.id, { op: e.target.value as LogFilterOp })}
                              className="border border-slate-200 rounded-md px-2 py-1 text-xs outline-none"
                            >
                              {opsByType[f.type].map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                            </select>
                          </div>
                          {f.type === 'action' && (
                            <div className="flex flex-wrap gap-1.5">
                              {actionDefs.map((d) => {
                                const checked = f.values?.has(d.key) || false;
                                return (
                                  <label key={d.key} className={`flex items-center gap-1 px-2 py-1 rounded-md cursor-pointer transition-colors ${checked ? 'ring-2 ring-blue-400 ' + d.color : d.color + ' opacity-50 hover:opacity-80'}`}>
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => {
                                        const next = new Set(f.values || []);
                                        next.has(d.key) ? next.delete(d.key) : next.add(d.key);
                                        updateFilter(f.id, { values: next });
                                      }}
                                      className="w-3 h-3 accent-blue-600 cursor-pointer"
                                    />
                                    <span className="text-[11px] font-semibold">{d.text}</span>
                                  </label>
                                );
                              })}
                            </div>
                          )}
                          {f.type === 'date' && (
                            <div className="flex items-center gap-2">
                              <input type="date" value={f.value} onChange={(e) => updateFilter(f.id, { value: e.target.value })} className="border border-slate-200 rounded-md px-2 py-1 text-xs outline-none flex-1" />
                              {f.op === 'between' && (
                                <>
                                  <span className="text-slate-400 text-xs">~</span>
                                  <input type="date" value={f.value2 || ''} onChange={(e) => updateFilter(f.id, { value2: e.target.value })} className="border border-slate-200 rounded-md px-2 py-1 text-xs outline-none flex-1" />
                                </>
                              )}
                            </div>
                          )}
                          {f.type === 'name' && (
                            <input
                              value={f.value}
                              onChange={(e) => updateFilter(f.id, { value: e.target.value })}
                              placeholder="이름 입력..."
                              className="w-full border border-slate-200 rounded-md px-2 py-1 text-xs outline-none"
                              autoFocus
                            />
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* + 필터 추가 버튼 */}
                  <div className="relative">
                    <button
                      onClick={() => setOpenFilterPopup(openFilterPopup === -1 ? null : -1)}
                      className="flex items-center gap-1 bg-transparent hover:bg-slate-100 border border-dashed border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-500 cursor-pointer transition-colors"
                    >
                      + 필터 추가
                    </button>
                    {openFilterPopup === -1 && (
                      <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-10 min-w-[120px]">
                        {(['action', 'date', 'name'] as LogFilterType[]).map((type) => (
                          <button
                            key={type}
                            onClick={() => addFilter(type)}
                            className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 bg-transparent border-none cursor-pointer"
                          >
                            {typeLabel[type]}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {logFilters.length > 0 && (
                    <button
                      onClick={() => setLogFilters([])}
                      className="text-[11px] text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer"
                    >
                      모두 지우기
                    </button>
                  )}
                </div>
              </div>

              {/* 결과 */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <div className="text-[11px] text-slate-400 mb-3">{filtered.length}건</div>
                {filtered.length === 0 ? (
                  <div className="text-center text-slate-400 py-10">
                    {leaveLogs.length === 0 ? '로그가 없습니다.' : '조건에 맞는 로그가 없습니다.'}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filtered.map((log) => {
                      const badge = actionLabel[log.action] || { text: log.action, color: 'bg-slate-100 text-slate-600' };
                      const date = new Date(log.timestamp);
                      const timeStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
                      return (
                        <div key={log.id} className="flex items-start gap-3 py-2.5 border-b border-slate-100 last:border-none">
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md shrink-0 mt-0.5 ${badge.color}`}>{badge.text}</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-slate-700">{log.detail}</div>
                            <div className="text-[11px] text-slate-400 mt-0.5">처리: {log.actorName} · {timeStr}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Fixed tooltip */}
      {tooltip && (
        <div
          className="fixed z-[200] bg-slate-800 text-slate-200 text-[11px] rounded-lg p-2.5 w-fit max-w-xs shadow-xl pointer-events-none whitespace-nowrap"
          style={{ left: tooltip.x, top: tooltip.y, transform: 'translateX(-50%)' }}
        >
          <div className="font-bold mb-1">{tooltip.r.days}일</div>
          <div className="flex justify-between">
            <span>사용 일수</span>
            <span className="font-bold">{tooltip.r.amount}일</span>
          </div>
          {tooltip.r.reason && <div className="text-slate-400 mt-1">사유: {tooltip.r.reason}</div>}
          <div className="mt-1 text-[10px]">
            <span className={tooltip.r.status === 'approved' ? 'text-blue-400' : 'text-red-400'}>
              {tooltip.r.status === 'approved' ? '승인' : '대기'}
            </span>
            {tooltip.r.approvedByName && <span className="text-slate-500 ml-1">({tooltip.r.approvedByName})</span>}
          </div>
        </div>
      )}
    </div>
  );

  // ─── Request Modal ──────────────────────────────────────
  function renderRequestModal() {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]" onClick={() => setShowRequestModal(false)}>
        <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <h3 className="font-bold text-slate-800 text-base mb-4">휴가 신청</h3>

          {isSuperAdmin && (
            <>
              <label className="block text-xs text-slate-500 mb-1">대상 직원</label>
              <select
                value={reqTargetUserId}
                onChange={(e) => setReqTargetUserId(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-3"
              >
                <option value="">본인 (직접 신청)</option>
                {visibleUsers.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </>
          )}

          {/* 캘린더 */}
          {(() => {
            const y = reqCalYear;
            const m = reqCalMonth; // 0-based
            const firstDay = new Date(y, m, 1).getDay();
            const daysInMonth = new Date(y, m + 1, 0).getDate();
            const weeks: (number | null)[][] = [];
            let week: (number | null)[] = Array(firstDay).fill(null);
            for (let d = 1; d <= daysInMonth; d++) {
              week.push(d);
              if (week.length === 7) { weeks.push(week); week = []; }
            }
            if (week.length > 0) { while (week.length < 7) week.push(null); weeks.push(week); }

            const pad = (n: number) => String(n).padStart(2, '0');
            const toKey = (day: number) => `${y}-${pad(m + 1)}-${pad(day)}`;
            const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

            // 클릭: 미선택 → 연차 → 오전반차 → 오후반차 → 미선택
            const cycleDate = (day: number) => {
              const key = toKey(day);
              setReqSelectedDates((prev) => {
                const next = new Map(prev);
                const cur = next.get(key);
                if (!cur) next.set(key, 'full');
                else if (cur === 'full') next.set(key, 'am');
                else if (cur === 'am') next.set(key, 'pm');
                else next.delete(key);
                return next;
              });
            };

            const goMonth = (dir: number) => {
              let nm = m + dir;
              let ny = y;
              if (nm < 0) { nm = 11; ny--; }
              if (nm > 11) { nm = 0; ny++; }
              setReqCalMonth(nm);
              setReqCalYear(ny);
            };

            const sortedEntries = [...reqSelectedDates.entries()].sort((a, b) => a[0].localeCompare(b[0]));
            const typeLabel = (t: 'full' | 'am' | 'pm') => t === 'full' ? '연차' : t === 'am' ? '오전' : '오후';
            const typeShort = (t: 'full' | 'am' | 'pm') => t === 'full' ? '' : t === 'am' ? '午前' : '午後';

            return (
              <>
                <div className="flex items-center justify-between mb-2">
                  <button onClick={() => goMonth(-1)} className="bg-transparent border-none cursor-pointer text-slate-500 text-lg px-2 hover:text-slate-800">&lt;</button>
                  <span className="font-bold text-slate-800 text-sm">{y}년 {m + 1}월</span>
                  <button onClick={() => goMonth(1)} className="bg-transparent border-none cursor-pointer text-slate-500 text-lg px-2 hover:text-slate-800">&gt;</button>
                </div>
                <div className="text-[10px] text-slate-400 text-center mb-2">클릭: 연차 → 오전반차 → 오후반차 → 해제</div>
                <div className="grid grid-cols-7 text-center text-[11px] text-slate-400 mb-1">
                  {['일', '월', '화', '수', '목', '금', '토'].map((d) => <div key={d} className="py-1 font-semibold">{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-0.5 mb-3">
                  {weeks.flat().map((day, i) => {
                    if (day === null) return <div key={`e${i}`} />;
                    const key = toKey(day);
                    const sel = reqSelectedDates.get(key);
                    const isToday = key === today;
                    const isSun = i % 7 === 0;
                    const isSat = i % 7 === 6;
                    return (
                      <button
                        key={key}
                        onClick={() => cycleDate(day)}
                        className={`w-full aspect-square rounded-lg border-none cursor-pointer text-[10px] font-semibold transition-colors flex flex-col items-center justify-center leading-tight ${
                          sel === 'full'
                            ? 'bg-blue-600 text-white'
                            : sel === 'am'
                              ? 'bg-amber-500 text-white'
                              : sel === 'pm'
                                ? 'bg-purple-500 text-white'
                                : isToday
                                  ? 'bg-blue-50 text-blue-600'
                                  : isSun ? 'bg-transparent text-red-400 hover:bg-red-50'
                                  : isSat ? 'bg-transparent text-blue-400 hover:bg-blue-50'
                                  : 'bg-transparent text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span className="text-xs">{day}</span>
                        {sel && <span className="text-[8px] mt-px">{typeShort(sel)}</span>}
                      </button>
                    );
                  })}
                </div>
                {/* 범례 + 잔여일 */}
                {(() => {
                  const tid = (isSuperAdmin && reqTargetUserId) ? reqTargetUserId : currentUser!.id;
                  const tAlloc = getAllocation(tid);
                  const tSpecial = getSpecialDays(tid);
                  const tUsed = getUsedDays(tid);
                  const tRemaining = tAlloc + tSpecial - tUsed;
                  const afterUse = tRemaining - reqTotalAmount;
                  return (
                    <div className="bg-slate-50 rounded-lg px-3 py-2 mb-3 text-[11px]">
                      <div className="flex gap-3 justify-center mb-1.5">
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-600 inline-block" /> 연차(1일)</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-500 inline-block" /> 오전반차(0.5)</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-purple-500 inline-block" /> 오후반차(0.5)</span>
                      </div>
                      <div className="flex justify-between text-slate-500 border-t border-slate-200 pt-1.5">
                        <span>발생 <strong className="text-slate-800">{tAlloc}</strong>일</span>
                        <span>사용 <strong className="text-blue-600">{tUsed}</strong>일</span>
                        <span>잔여 <strong className="text-green-600">{tRemaining}</strong>일</span>
                      </div>
                      {reqTotalAmount > 0 && (
                        <div className="flex justify-between border-t border-slate-200 pt-1.5 mt-1.5 text-slate-500">
                          <span>신청 <strong className="text-blue-600">{reqTotalAmount}</strong>일</span>
                          <span>신청 후 잔여 <strong className={afterUse < 0 ? 'text-red-500' : 'text-green-600'}>{afterUse}</strong>일</span>
                        </div>
                      )}
                    </div>
                  );
                })()}
                {sortedEntries.length > 0 && (
                  <div className="text-xs text-slate-600 mb-3 bg-slate-50 rounded-lg px-3 py-2">
                    {sortedEntries.map(([d, t]) => (
                      <span key={d} className="inline-block mr-2">
                        <span className={`inline-block w-1.5 h-1.5 rounded-full mr-0.5 ${t === 'full' ? 'bg-blue-600' : t === 'am' ? 'bg-amber-500' : 'bg-purple-500'}`} />
                        {parseInt(d.slice(5, 7))}/{parseInt(d.slice(8, 10))} {typeLabel(t)}
                      </span>
                    ))}
                  </div>
                )}
              </>
            );
          })()}

          <label className="block text-xs text-slate-500 mb-1">사유</label>
          <input
            type="text"
            value={reqReason}
            onChange={(e) => setReqReason(e.target.value)}
            placeholder="사유 입력 (선택)"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-4"
          />

          <div className="flex gap-2">
            <button
              onClick={handleSubmitRequest}
              className="flex-1 bg-blue-600 text-white border-none rounded-lg py-2.5 cursor-pointer font-semibold text-sm hover:bg-blue-700 transition-colors"
            >
              신청
            </button>
            <button
              onClick={() => setShowRequestModal(false)}
              className="flex-1 bg-slate-100 text-slate-600 border-none rounded-lg py-2.5 cursor-pointer text-sm hover:bg-slate-200 transition-colors"
            >
              취소
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Pending Modal ──────────────────────────────────────
  function renderPendingModal() {
    const totalCount = pendingLeaves.length + changeRequests.length;
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]" onClick={() => setShowPendingModal(false)}>
        <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <h3 className="font-bold text-slate-800 text-base mb-4">
            처리 대기 ({totalCount}건)
          </h3>

          {/* 신규 승인 대기 */}
          {pendingLeaves.length > 0 && (
            <>
              <p className="text-xs text-slate-500 font-bold mb-2">휴가 승인 대기 ({pendingLeaves.length}건)</p>
              <div className="space-y-3 mb-4">
                {pendingLeaves.map((r) => (
                  <div key={r.id} className="border border-slate-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-slate-800">{getUserName(r.userId)}</span>
                      <span className="text-xs text-slate-400">{r.requestedAt.slice(0, 10)}</span>
                    </div>
                    {/* 수정 전/후 비교 */}
                    {r.originalDays ? (
                      <div className="text-sm mb-2 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">수정 전</span>
                          <span className="text-slate-400 line-through">{r.year}년 {r.month}월 {r.originalDays}일 ({r.originalAmount}일)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded shrink-0">수정 후</span>
                          <span className="text-slate-800 font-semibold">{r.year}년 {r.month}월 {r.days}일 ({r.amount}일)</span>
                        </div>
                        {r.reason && <div className="text-slate-400 text-xs mt-0.5">사유: {r.reason}</div>}
                      </div>
                    ) : (
                      <div className="text-sm text-slate-600 mb-2">
                        {r.year}년 {r.month}월 {r.days}일 ({r.amount}일)
                        {r.reason && <span className="text-slate-400 ml-2">- {r.reason}</span>}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button onClick={() => approveLeave(r.id, currentUser!.id)} className="flex-1 bg-blue-600 text-white border-none rounded-lg py-1.5 cursor-pointer text-xs font-semibold hover:bg-blue-700 transition-colors">승인</button>
                      <button onClick={() => rejectLeave(r.id)} className="flex-1 bg-slate-100 text-slate-600 border-none rounded-lg py-1.5 cursor-pointer text-xs hover:bg-slate-200 transition-colors">반려</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* 수정/삭제 요청 */}
          {changeRequests.length > 0 && (
            <>
              <p className="text-xs text-slate-500 font-bold mb-2">삭제 요청 ({changeRequests.length}건)</p>
              <div className="space-y-3 mb-4">
                {changeRequests.map((r) => (
                  <div key={r.id} className="border border-red-200 rounded-xl p-4 bg-red-50/50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800">{getUserName(r.userId)}</span>
                        <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-semibold">삭제 요청</span>
                      </div>
                    </div>
                    <div className="text-sm text-slate-600 mb-2">
                      {r.year}년 {r.month}월 {r.days}일 ({r.amount}일)
                      {r.reason && <span className="text-slate-400 ml-2">- {r.reason}</span>}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => approveDeleteRequest(r.id)} className="flex-1 bg-red-500 text-white border-none rounded-lg py-1.5 cursor-pointer text-xs font-semibold hover:bg-red-600 transition-colors">삭제 승인</button>
                      <button
                        onClick={() => updateLeaveRequest(r.id, { deleteRequested: false })}
                        className="flex-1 bg-slate-100 text-slate-600 border-none rounded-lg py-1.5 cursor-pointer text-xs hover:bg-slate-200 transition-colors"
                      >거부</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {totalCount === 0 && (
            <div className="text-center text-slate-400 py-8 text-sm">대기 중인 건이 없습니다.</div>
          )}

          <button
            onClick={() => setShowPendingModal(false)}
            className="w-full mt-4 bg-slate-100 text-slate-600 border-none rounded-lg py-2.5 cursor-pointer text-sm hover:bg-slate-200 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    );
  }

  // ─── Edit Modal (pending 건 수정) ─────────────────────────
  function renderEditModal() {
    if (!editingLeave) return null;

    const editTotalAmount = (() => {
      let t = 0;
      editingLeave.dates.forEach((type) => { t += type === 'full' ? 1 : 0.5; });
      return t;
    })();

    const handleSaveEdit = () => {
      if (editingLeave.dates.size === 0) { showToast('날짜를 선택해주세요.', 'error'); return; }
      const sorted = [...editingLeave.dates.entries()].sort((a, b) => a[0].localeCompare(b[0]));
      const typeLabel = (t: 'full' | 'am' | 'pm') => t === 'full' ? '' : t === 'am' ? '(오전)' : '(오후)';

      // 월별로 그룹핑
      const byMonth: Record<string, { year: number; month: number; entries: [string, 'full' | 'am' | 'pm'][] }> = {};
      for (const [dateKey, type] of sorted) {
        const yr = parseInt(dateKey.slice(0, 4));
        const mon = parseInt(dateKey.slice(5, 7));
        const key = `${yr}-${mon}`;
        if (!byMonth[key]) byMonth[key] = { year: yr, month: mon, entries: [] };
        byMonth[key].entries.push([dateKey, type]);
      }
      const monthGroups = Object.values(byMonth);

      const req = leaveRequests.find((r) => r.id === editingLeave.id);
      const wasApproved = req?.status === 'approved';

      // 첫 번째 월: 기존 레코드 업데이트
      const first = monthGroups[0];
      const firstDaysStr = first.entries.map(([d, t]) => `${parseInt(d.slice(8, 10))}${typeLabel(t)}`).join(', ');
      const firstAmount = first.entries.reduce((s, [, t]) => s + (t === 'full' ? 1 : 0.5), 0);
      updateLeaveRequest(editingLeave.id, {
        year: first.year,
        month: first.month,
        days: firstDaysStr,
        amount: firstAmount,
        reason: editingLeave.reason.trim(),
        ...(wasApproved ? { status: 'pending' as const, approvedBy: null, approvedByName: null, originalDays: req.days, originalAmount: req.amount } : {}),
      });

      // 나머지 월: 새 레코드로 추가
      for (let i = 1; i < monthGroups.length; i++) {
        const grp = monthGroups[i];
        const daysStr = grp.entries.map(([d, t]) => `${parseInt(d.slice(8, 10))}${typeLabel(t)}`).join(', ');
        const amount = grp.entries.reduce((s, [, t]) => s + (t === 'full' ? 1 : 0.5), 0);
        const newReq: LeaveRequest = {
          id: 'lv' + Date.now() + '_' + grp.month,
          userId: req?.userId || currentUser!.id,
          year: grp.year,
          month: grp.month,
          days: daysStr,
          amount,
          reason: editingLeave.reason.trim(),
          status: 'pending',
          requestedAt: new Date().toISOString(),
          approvedBy: null,
          approvedByName: null,
        };
        addLeaveRequest(newReq);
      }

      // 수정 알림톡 발송
      if (req && isAlimtalkEnabled()) {
        const applicant = users.find((u) => u.id === req.userId);
        if (applicant) {
          const teamAdminPhones = users
            .filter((u) => u.role === 'admin' && u.team === applicant.team && u.phone)
            .map((u) => u.phone!);
          const phones = getNotifyPhones(teamAdminPhones);
          sendLeaveNotification({
            name: applicant.name,
            message: '수정',
            recipientPhones: phones,
          }).catch(console.error);
        }
      }

      setEditingLeave(null);
    };

    const y = editingLeave.calYear;
    const m = editingLeave.calMonth;
    const firstDay = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const weeks: (number | null)[][] = [];
    let week: (number | null)[] = Array(firstDay).fill(null);
    for (let d = 1; d <= daysInMonth; d++) {
      week.push(d);
      if (week.length === 7) { weeks.push(week); week = []; }
    }
    if (week.length > 0) { while (week.length < 7) week.push(null); weeks.push(week); }

    const pad = (n: number) => String(n).padStart(2, '0');
    const toKey = (day: number) => `${y}-${pad(m + 1)}-${pad(day)}`;
    const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    const cycleDate = (day: number) => {
      const key = toKey(day);
      const next = new Map(editingLeave.dates);
      const cur = next.get(key);
      if (!cur) next.set(key, 'full');
      else if (cur === 'full') next.set(key, 'am');
      else if (cur === 'am') next.set(key, 'pm');
      else next.delete(key);
      setEditingLeave({ ...editingLeave, dates: next });
    };

    const goMonth = (dir: number) => {
      let nm = m + dir;
      let ny = y;
      if (nm < 0) { nm = 11; ny--; }
      if (nm > 11) { nm = 0; ny++; }
      setEditingLeave({ ...editingLeave, calYear: ny, calMonth: nm });
    };

    const sortedEntries = [...editingLeave.dates.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    const typeLabelFull = (t: 'full' | 'am' | 'pm') => t === 'full' ? '연차' : t === 'am' ? '오전' : '오후';
    const typeShort = (t: 'full' | 'am' | 'pm') => t === 'full' ? '' : t === 'am' ? '午前' : '午後';

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]" onClick={() => setEditingLeave(null)}>
        <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <h3 className="font-bold text-slate-800 text-base mb-4">휴가 수정</h3>

          {/* 캘린더 */}
          <div className="flex items-center justify-between mb-2">
            <button onClick={() => goMonth(-1)} className="bg-transparent border-none cursor-pointer text-slate-500 text-lg px-2 hover:text-slate-800">&lt;</button>
            <span className="font-bold text-slate-800 text-sm">{y}년 {m + 1}월</span>
            <button onClick={() => goMonth(1)} className="bg-transparent border-none cursor-pointer text-slate-500 text-lg px-2 hover:text-slate-800">&gt;</button>
          </div>
          <div className="text-[10px] text-slate-400 text-center mb-2">클릭: 연차 → 오전반차 → 오후반차 → 해제</div>
          <div className="grid grid-cols-7 text-center text-[11px] text-slate-400 mb-1">
            {['일', '월', '화', '수', '목', '금', '토'].map((d) => <div key={d} className="py-1 font-semibold">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-0.5 mb-3">
            {weeks.flat().map((day, i) => {
              if (day === null) return <div key={`e${i}`} />;
              const key = toKey(day);
              const sel = editingLeave.dates.get(key);
              const isToday = key === today;
              const isSun = i % 7 === 0;
              const isSat = i % 7 === 6;
              return (
                <button
                  key={key}
                  onClick={() => cycleDate(day)}
                  className={`w-full aspect-square rounded-lg border-none cursor-pointer text-[10px] font-semibold transition-colors flex flex-col items-center justify-center leading-tight ${
                    sel === 'full' ? 'bg-blue-600 text-white'
                    : sel === 'am' ? 'bg-amber-500 text-white'
                    : sel === 'pm' ? 'bg-purple-500 text-white'
                    : isToday ? 'bg-blue-50 text-blue-600'
                    : isSun ? 'bg-transparent text-red-400 hover:bg-red-50'
                    : isSat ? 'bg-transparent text-blue-400 hover:bg-blue-50'
                    : 'bg-transparent text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-xs">{day}</span>
                  {sel && <span className="text-[8px] mt-px">{typeShort(sel)}</span>}
                </button>
              );
            })}
          </div>

          {/* 범례 */}
          <div className="flex gap-3 justify-center mb-3 text-[10px]">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-600 inline-block" /> 연차(1일)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-500 inline-block" /> 오전반차(0.5)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-purple-500 inline-block" /> 오후반차(0.5)</span>
          </div>

          {sortedEntries.length > 0 && (
            <div className="text-xs text-slate-600 mb-3 bg-slate-50 rounded-lg px-3 py-2">
              {sortedEntries.map(([d, t]) => (
                <span key={d} className="inline-block mr-2">
                  <span className={`inline-block w-1.5 h-1.5 rounded-full mr-0.5 ${t === 'full' ? 'bg-blue-600' : t === 'am' ? 'bg-amber-500' : 'bg-purple-500'}`} />
                  {parseInt(d.slice(5, 7))}/{parseInt(d.slice(8, 10))} {typeLabelFull(t)}
                </span>
              ))}
              <div className="mt-1 font-semibold text-blue-600">총 {editTotalAmount}일</div>
            </div>
          )}

          <label className="block text-xs text-slate-500 mb-1">사유</label>
          <input
            type="text"
            value={editingLeave.reason}
            onChange={(e) => setEditingLeave({ ...editingLeave, reason: e.target.value })}
            placeholder="사유 입력 (선택)"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-4"
          />

          <div className="flex gap-2">
            <button onClick={handleSaveEdit} className="flex-1 bg-blue-600 text-white border-none rounded-lg py-2.5 cursor-pointer font-semibold text-sm hover:bg-blue-700 transition-colors">저장</button>
            <button onClick={() => setEditingLeave(null)} className="flex-1 bg-slate-100 text-slate-600 border-none rounded-lg py-2.5 cursor-pointer text-sm hover:bg-slate-200 transition-colors">취소</button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Batch Allocation Modal ─────────────────────────────
  function renderBatchAllocModal() {
    // 팀별로 그룹핑
    const teamGroups: Record<string, typeof users> = {};
    users.forEach((u) => {
      const t = u.team || '미배정';
      if (!teamGroups[t]) teamGroups[t] = [];
      teamGroups[t].push(u);
    });

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]" onClick={() => setShowBatchAllocModal(false)}>
        <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <h3 className="font-bold text-slate-800 text-base mb-2">발생휴가 일괄 설정</h3>
          <p className="text-xs text-slate-400 mb-4">
            매년 12월에 다음 해 발생휴가를 일괄 설정합니다. 신규 입사자는 입사월 기준 자동 계산됩니다.
          </p>

          <label className="block text-xs text-slate-500 mb-1">대상 연도</label>
          <select
            value={batchYear}
            onChange={(e) => {
              const y = Number(e.target.value);
              setBatchYear(y);
              const vals: Record<string, string> = {};
              users.forEach((u) => {
                const existing = leaveAllocations.find((a) => a.userId === u.id && a.year === y);
                vals[u.id] = String(existing?.total ?? getDefaultAllocation(u.id, y));
              });
              setBatchValues(vals);
            }}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-4"
          >
            {[now.getFullYear(), now.getFullYear() + 1, now.getFullYear() + 2].map((y) => (
              <option key={y} value={y}>{y}년</option>
            ))}
          </select>

          <div className="space-y-4">
            {Object.entries(teamGroups).map(([team, members]) => (
              <div key={team}>
                <div className="text-xs font-bold text-slate-500 mb-2">{team}</div>
                <div className="space-y-2">
                  {members.map((u) => (
                    <div key={u.id} className="flex items-center gap-3">
                      <span className="text-sm text-slate-700 w-24 truncate">{u.name}</span>
                      {u.joinDate && parseInt(u.joinDate.slice(0, 4)) === batchYear && (
                        <span className="text-[10px] text-orange-500 shrink-0">신규</span>
                      )}
                      <input
                        type="number"
                        value={batchValues[u.id] || '15'}
                        onChange={(e) => setBatchValues((v) => ({ ...v, [u.id]: e.target.value }))}
                        step="0.5"
                        min="0"
                        className="w-20 border border-slate-300 rounded px-2 py-1 text-sm text-center"
                      />
                      <span className="text-xs text-slate-400">일</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2 mt-6">
            <button
              onClick={handleSaveBatchAlloc}
              className="flex-1 bg-purple-600 text-white border-none rounded-lg py-2.5 cursor-pointer font-semibold text-sm hover:bg-purple-700 transition-colors"
            >
              일괄 저장
            </button>
            <button
              onClick={() => setShowBatchAllocModal(false)}
              className="flex-1 bg-slate-100 text-slate-600 border-none rounded-lg py-2.5 cursor-pointer text-sm hover:bg-slate-200 transition-colors"
            >
              취소
            </button>
          </div>
        </div>
      </div>
    );
  }
}
