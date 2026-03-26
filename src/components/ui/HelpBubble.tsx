import { useState } from 'react';

export default function HelpBubble({ text }: { text: string }) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative inline-flex items-center">
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow((p) => !p)}
        className="w-[18px] h-[18px] rounded-full bg-indigo-100 text-primary text-[11px] font-extrabold cursor-pointer border-none leading-none p-0 shrink-0"
      >
        ?
      </button>
      {show && (
        <div className="absolute left-6 top-1/2 -translate-y-1/2 bg-sidebar text-slate-200 text-xs leading-[1.7] rounded-[10px] px-3.5 py-2.5 w-70 z-[200] shadow-lg whitespace-pre-wrap border border-slate-700">
          <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[6px] border-r-sidebar" />
          {text}
        </div>
      )}
    </div>
  );
}
