// 알림톡 발송 (NestJS 백엔드 경유 → NHN Cloud)

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

// 경영진 알림 대상 (변원섭)
const EXEC_NOTIFY_PHONE = '01084414649';

export function isAlimtalkEnabled(): boolean {
  return !!API_BASE;
}

// 전화번호에서 하이픈 제거
function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9]/g, '');
}

// 알림 대상 전화번호 수집: 팀 admin + 경영진(변원섭)
export function getNotifyPhones(teamAdminPhones: string[]): string[] {
  const phones = new Set<string>();
  teamAdminPhones.forEach((p) => {
    const n = normalizePhone(p);
    if (n) phones.add(n);
  });
  phones.add(EXEC_NOTIFY_PHONE);
  return Array.from(phones);
}

// 알림톡 발송
export async function sendLeaveNotification(params: {
  name: string;
  message: string;
  recipientPhones: string[];
}): Promise<void> {
  if (params.recipientPhones.length === 0) return;

  try {
    const res = await fetch(`${API_BASE}/alimtalk/leave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      console.error('알림톡 발송 실패:', res.status, data);
    }
  } catch (err) {
    console.error('알림톡 발송 오류:', err);
  }
}
