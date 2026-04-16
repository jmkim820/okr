import type { ReactNode } from 'react';

interface CardProps {
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}

export default function Card({ title, children, className = '' }: CardProps) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 p-5 shadow-sm ${className}`}>
      {title && <div className="font-bold text-slate-700 text-[15px] mb-3.5">{title}</div>}
      {children}
    </div>
  );
}
