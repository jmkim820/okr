import { useState } from 'react';
import { signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { useStore } from '../stores/useStore';
import { SUPERADMIN_EMAILS, ALLOWED_DOMAINS } from '../lib/seed';
import type { User } from '../types';

export default function LoginPage() {
  const { users, login, registerUser, showToast } = useStore();
  const [loading, setLoading] = useState(false);

  const handleGoogle = () => {
    if (loading) return;
    setLoading(true);

    signInWithPopup(auth, googleProvider)
      .then(async (result) => {
        const gEmail = result.user.email || '';
        const gName = result.user.displayName || gEmail.split('@')[0];
        const domain = gEmail.split('@')[1];

        if (!ALLOWED_DOMAINS.includes(domain)) {
          await signOut(auth);
          showToast(`@${domain} 도메인은 허용되지 않습니다.`, 'error');
          return;
        }

        // superadmin 체크
        if (SUPERADMIN_EMAILS[gEmail]) {
          login({
            id: result.user.uid,
            name: SUPERADMIN_EMAILS[gEmail].name,
            email: gEmail,
            team: '-',
            role: 'superadmin',
          });
          return;
        }

        const matched = users.find((u) => u.email === gEmail);
        if (matched) {
          login(matched);
          return;
        }

        const newUser: User = {
          id: result.user.uid,
          name: gName,
          email: gEmail,
          team: '',
          role: 'user',
        };
        registerUser(newUser);
        login(newUser);
        showToast(`${gName}님 등록 완료! 관리자가 팀을 배정합니다.`);
      })
      .catch((err) => {
        if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
          showToast('Google 로그인 실패', 'error');
          console.error('[Google Auth]', err);
        }
      })
      .finally(() => setLoading(false));
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="bg-sidebar rounded-2xl p-10 w-[380px] shadow-2xl">
        <div className="text-center mb-8">
          <div className="text-[28px] font-extrabold text-primary-light">◆ Axissoft</div>
          <div className="text-slate-400 text-sm mt-1.5">OKR 관리 시스템</div>
        </div>

        <button
          onClick={handleGoogle}
          disabled={loading}
          className="w-full bg-white text-slate-700 border-none rounded-lg py-3 cursor-pointer font-semibold text-sm flex items-center justify-center gap-3 hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          {loading ? '로그인 중...' : 'Google 계정으로 로그인'}
        </button>

        <div className="text-[11px] text-slate-600 text-center mt-3">
          회사 Google 계정(@axissoft.co.kr, @starplayer.net)으로 로그인하세요
        </div>
      </div>
    </div>
  );
}
