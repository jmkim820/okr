import { useStore } from '../../stores/useStore';

export default function Toast() {
  const toast = useStore((s) => s.toast);
  if (!toast) return null;

  return (
    <div
      className={`fixed bottom-6 right-6 px-5 py-2.5 rounded-[10px] font-semibold text-sm text-white shadow-lg z-[9999] ${
        toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
      }`}
    >
      {toast.msg}
    </div>
  );
}
