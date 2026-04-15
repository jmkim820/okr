// NHN Cloud 알림톡 발송 유틸

const NHN_APPKEY = import.meta.env.VITE_NHN_APPKEY || '';
const NHN_SECRET_KEY = import.meta.env.VITE_NHN_SECRET_KEY || '';
const NHN_SENDER_KEY = import.meta.env.VITE_NHN_SENDER_KEY || '';
const TEMPLATE_CODE = import.meta.env.VITE_NHN_TEMPLATE_CODE || '';

const API_URL = `https://api-alimtalk.cloud.toast.com/alimtalk/v2.3/appkeys/${NHN_APPKEY}/messages`;

// 경영진 알림 대상 (변원섭)
const EXEC_NOTIFY_PHONE = '01084414649';

export function isAlimtalkEnabled(): boolean {
  return !!(NHN_APPKEY && NHN_SECRET_KEY && NHN_SENDER_KEY && TEMPLATE_CODE);
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

// 알림톡 발송 (템플릿 변수: name, message)
export async function sendLeaveNotification(params: {
  name: string;
  message: string;
  recipientPhones: string[];
}): Promise<void> {
  const { name, message, recipientPhones } = params;
  if (!isAlimtalkEnabled() || recipientPhones.length === 0) return;

  const body = {
    senderKey: NHN_SENDER_KEY,
    templateCode: TEMPLATE_CODE,
    recipientList: recipientPhones.map((phone) => ({
      recipientNo: phone,
      templateParameter: { name, message },
    })),
  };

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'X-Secret-Key': NHN_SECRET_KEY,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok || data.header?.resultCode !== 0) {
      console.error('알림톡 발송 실패:', data);
    }
  } catch (err) {
    console.error('알림톡 발송 오류:', err);
  }
}
