import { useState, useMemo } from 'react';
import { useStore } from '../../stores/useStore';
import Card from '../ui/Card';
import * as XLSX from 'xlsx';
import type { LeaveRequest } from '../../types';

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export default function LeavePanel() {
  const {
    currentUser, users,
    leaveRequests, leaveAllocations,
    addLeaveRequest, approveLeave, rejectLeave, deleteLeaveRequest,
    setLeaveAllocation, batchSetLeaveAllocations, showToast,
  } = useStore();

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [search, setSearch] = useState('');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [showBatchAllocModal, setShowBatchAllocModal] = useState(false);
  const [editAllocUserId, setEditAllocUserId] = useState<string | null>(null);
  const [editAllocValue, setEditAllocValue] = useState('');

  // New request form
  const [reqMonth, setReqMonth] = useState(now.getMonth() + 1);
  const [reqDays, setReqDays] = useState('');
  const [reqAmount, setReqAmount] = useState('1');
  const [reqReason, setReqReason] = useState('');

  // Batch allocation form
  const [batchYear, setBatchYear] = useState(now.getFullYear() + 1);
  const [batchValues, setBatchValues] = useState<Record<string, string>>({});

  if (!currentUser) return null;

  const isSuperAdmin = currentUser.role === 'superadmin';
  const isAdmin = currentUser.role === 'admin' || isSuperAdmin;

  // Visible users based on role
  const visibleUsers = useMemo(() => {
    if (isSuperAdmin) return users;
    if (isAdmin) return users.filter((u) => u.team === currentUser.team);
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

  // 신규 사용자 월별 발생휴가 계산 (1달 만근 시 1일씩 추가)
  const getProratedAllocation = (userId: string, year: number): number => {
    const user = users.find((u) => u.id === userId);
    if (!user?.joinDate) return 15; // 입사일 없으면 기본값
    const joinYear = parseInt(user.joinDate.slice(0, 4));
    const joinMonth = parseInt(user.joinDate.slice(5, 7));
    if (joinYear < year) return 15; // 입사 연도 이전이면 기본값
    if (joinYear > year) return 0; // 입사 연도 이후면 0
    // 입사 연도와 같으면 프로레이션: 입사월 이후 만근 월 수
    const monthsWorked = 12 - joinMonth; // 입사월 다음달부터 카운트 (1달 만근 후)
    return Math.max(0, monthsWorked);
  };

  const getAllocation = (userId: string) => {
    const alloc = leaveAllocations.find((a) => a.userId === userId && a.year === selectedYear);
    if (alloc) return alloc.total; // 수동 설정된 값 우선
    return getProratedAllocation(userId, selectedYear);
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
      // 경영진: 전체 대기 건 (본인 제외)
      return yearLeaves.filter((r) => r.status === 'pending' && r.userId !== currentUser.id);
    }
    if (currentUser.role === 'admin') {
      // 팀장: 같은 팀 팀원(user)의 대기 건만 (본인 제외, 다른 admin 제외)
      return yearLeaves.filter((r) => {
        if (r.status !== 'pending' || r.userId === currentUser.id) return false;
        const reqUser = users.find((u) => u.id === r.userId);
        return reqUser?.team === currentUser.team && reqUser?.role === 'user';
      });
    }
    return [];
  }, [yearLeaves, isSuperAdmin, currentUser, users]);

  // Stats
  const totalEmployees = visibleUsers.length;
  const totalAllocation = visibleUsers.reduce((s, u) => s + getAllocation(u.id), 0);
  const totalUsed = visibleUsers.reduce((s, u) => s + getUsedDays(u.id), 0);
  const totalRemaining = totalAllocation - totalUsed;

  // My stats (for user view)
  const myAllocation = getAllocation(currentUser.id);
  const myUsed = getUsedDays(currentUser.id);
  const myPending = getPendingDays(currentUser.id);
  const myRemaining = myAllocation - myUsed;

  // 지난 해 여부
  const isArchived = selectedYear < now.getFullYear();

  const handleSubmitRequest = () => {
    const days = reqDays.trim();
    const amount = parseFloat(reqAmount);
    if (!days) { showToast('날짜를 입력해주세요.', 'error'); return; }
    if (isNaN(amount) || amount <= 0) { showToast('사용 일수를 올바르게 입력해주세요.', 'error'); return; }
    if (amount % 0.5 !== 0) { showToast('사용 일수는 0.5 단위로 입력해주세요.', 'error'); return; }

    const req: LeaveRequest = {
      id: 'lv' + Date.now(),
      userId: currentUser.id,
      year: selectedYear,
      month: reqMonth,
      days,
      amount,
      reason: reqReason.trim(),
      status: 'pending',
      requestedAt: new Date().toISOString(),
      approvedBy: null,
    };
    addLeaveRequest(req);
    setShowRequestModal(false);
    setReqDays('');
    setReqAmount('1');
    setReqReason('');
  };

  const getUserName = (id: string) => users.find((u) => u.id === id)?.name || id;

  const handleExportExcel = () => {
    const rows = filteredUsers.map((u) => {
      const alloc = getAllocation(u.id);
      const used = getUsedDays(u.id);
      const row: Record<string, string | number> = {
        '이름': u.name,
        '팀': u.team,
        '직급': u.role === 'admin' ? '관리자' : '팀원',
        '입사일': u.joinDate || '-',
        '발생휴가': alloc,
        '사용일': used,
        '잔여': alloc - used,
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

  const handleOpenBatchAlloc = () => {
    const vals: Record<string, string> = {};
    users.forEach((u) => {
      const existing = leaveAllocations.find((a) => a.userId === u.id && a.year === batchYear);
      vals[u.id] = String(existing?.total ?? getProratedAllocation(u.id, batchYear));
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

  // Month cell renderer
  const renderMonthCell = (userId: string, month: number) => {
    const leaves = getMonthLeaves(userId, month);
    if (leaves.length === 0) return <span className="text-slate-300">-</span>;

    return (
      <div className="flex flex-wrap gap-0.5 justify-center">
        {leaves.map((r) => (
          <span
            key={r.id}
            title={`${r.days}일 (${r.amount}일) ${r.reason} [${r.status === 'approved' ? '승인' : r.status === 'pending' ? '대기' : '반려'}]`}
            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold cursor-default ${
              r.status === 'approved'
                ? 'bg-blue-100 text-blue-700'
                : r.status === 'pending'
                  ? 'bg-red-100 text-red-600'
                  : 'bg-slate-100 text-slate-400 line-through'
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="!p-4 text-center">
            <div className="text-[11px] text-slate-500 mb-1">발생휴가</div>
            <div className="text-2xl font-bold text-slate-800">{myAllocation}<span className="text-sm text-slate-400">일</span></div>
          </Card>
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
                          r.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                          r.status === 'pending' ? 'bg-red-100 text-red-600' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {r.status === 'approved' ? '승인' : r.status === 'pending' ? '대기' : '반려'}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-center text-slate-400 text-xs">
                        {r.approvedBy ? getUserName(r.approvedBy) : '-'}
                      </td>
                      <td className="py-2 px-2 text-center text-slate-400 text-xs">
                        {r.requestedAt.slice(0, 10)}
                      </td>
                      <td className="py-2 px-2 text-center">
                        {r.status === 'pending' && !isArchived && (
                          <button
                            onClick={() => deleteLeaveRequest(r.id)}
                            className="text-red-500 bg-transparent border-none cursor-pointer text-xs hover:text-red-700"
                          >
                            취소
                          </button>
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
          {!isArchived && (
            <button
              onClick={() => setShowRequestModal(true)}
              className="bg-blue-600 text-white border-none rounded-lg px-4 py-1.5 text-sm font-semibold cursor-pointer hover:bg-blue-700 transition-colors"
            >
              + 휴가 신청
            </button>
          )}
          {pendingLeaves.length > 0 && (
            <button
              onClick={() => setShowPendingModal(true)}
              className="relative bg-orange-500 text-white border-none rounded-lg px-4 py-1.5 text-sm font-semibold cursor-pointer hover:bg-orange-600 transition-colors"
            >
              승인 대기
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {pendingLeaves.length}
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
                <th className="text-left py-2 px-2 font-medium">팀</th>
                <th className="text-center py-2 px-2 font-medium">입사일</th>
                <th className="text-center py-2 px-2 font-medium">발생</th>
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
                const used = getUsedDays(u.id);
                const remaining = alloc - used;
                return (
                  <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2 px-2 font-semibold text-slate-800 sticky left-0 bg-white z-10">
                      {u.name}
                      {u.role === 'admin' && <span className="ml-1 text-[10px] text-green-600">관리자</span>}
                    </td>
                    <td className="py-2 px-2 text-slate-500">{u.team}</td>
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

      {/* Modals */}
      {showRequestModal && renderRequestModal()}
      {showPendingModal && renderPendingModal()}
      {showBatchAllocModal && renderBatchAllocModal()}
    </div>
  );

  // ─── Request Modal ──────────────────────────────────────
  function renderRequestModal() {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]" onClick={() => setShowRequestModal(false)}>
        <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <h3 className="font-bold text-slate-800 text-base mb-4">휴가 신청</h3>

          <label className="block text-xs text-slate-500 mb-1">연도</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-3"
          >
            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
              <option key={y} value={y}>{y}년</option>
            ))}
          </select>

          <label className="block text-xs text-slate-500 mb-1">월</label>
          <select
            value={reqMonth}
            onChange={(e) => setReqMonth(Number(e.target.value))}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-3"
          >
            {MONTHS.map((m) => (
              <option key={m} value={m}>{m}월</option>
            ))}
          </select>

          <label className="block text-xs text-slate-500 mb-1">날짜 (쉼표로 구분, 예: 5, 6, 15)</label>
          <input
            type="text"
            value={reqDays}
            onChange={(e) => setReqDays(e.target.value)}
            placeholder="5, 6, 15"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-3"
          />

          <label className="block text-xs text-slate-500 mb-1">사용 일수 (0.5 단위)</label>
          <input
            type="number"
            value={reqAmount}
            onChange={(e) => setReqAmount(e.target.value)}
            step="0.5"
            min="0.5"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-3"
          />

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
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]" onClick={() => setShowPendingModal(false)}>
        <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <h3 className="font-bold text-slate-800 text-base mb-4">
            승인 대기 ({pendingLeaves.length}건)
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            {isSuperAdmin ? '전체 직원의 휴가 요청을 승인/반려합니다.' : '같은 팀 팀원의 휴가 요청을 승인/반려합니다.'}
          </p>

          {pendingLeaves.length === 0 ? (
            <div className="text-center text-slate-400 py-8 text-sm">대기 중인 건이 없습니다.</div>
          ) : (
            <div className="space-y-3">
              {pendingLeaves.map((r) => {
                const reqUser = users.find((u) => u.id === r.userId);
                return (
                  <div key={r.id} className="border border-slate-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="font-semibold text-slate-800">{getUserName(r.userId)}</span>
                        <span className="text-slate-400 text-xs ml-2">{reqUser?.team}</span>
                        {reqUser?.role === 'admin' && (
                          <span className="text-green-600 text-[10px] ml-1 font-semibold">관리자</span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400">{r.requestedAt.slice(0, 10)}</span>
                    </div>
                    <div className="text-sm text-slate-600 mb-2">
                      {r.year}년 {r.month}월 {r.days}일 ({r.amount}일)
                      {r.reason && <span className="text-slate-400 ml-2">- {r.reason}</span>}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { approveLeave(r.id, currentUser!.id); }}
                        className="flex-1 bg-blue-600 text-white border-none rounded-lg py-1.5 cursor-pointer text-xs font-semibold hover:bg-blue-700 transition-colors"
                      >
                        승인
                      </button>
                      <button
                        onClick={() => { rejectLeave(r.id); }}
                        className="flex-1 bg-slate-100 text-slate-600 border-none rounded-lg py-1.5 cursor-pointer text-xs hover:bg-slate-200 transition-colors"
                      >
                        반려
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
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
                vals[u.id] = String(existing?.total ?? getProratedAllocation(u.id, y));
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
