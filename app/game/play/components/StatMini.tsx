'use client';

import { ReactNode } from 'react';

interface StatMiniProps {
  icon: ReactNode;
  value: number;
  max?: number;
  onMinus: () => void;
  onPlus: () => void;
}

export default function StatMini({ icon, value, onMinus, onPlus }: StatMiniProps) {
  return (
    <div className="flex items-center justify-between bg-slate-800/50 rounded px-1.5 py-1">
      <button onClick={(e) => { e.stopPropagation(); onMinus(); }} className="text-slate-500 hover:text-white">-</button>
      <span className="flex items-center gap-1">
        {icon}
        <span className="font-mono text-white">{value}</span>
      </span>
      <button onClick={(e) => { e.stopPropagation(); onPlus(); }} className="text-slate-500 hover:text-white">+</button>
    </div>
  );
}

