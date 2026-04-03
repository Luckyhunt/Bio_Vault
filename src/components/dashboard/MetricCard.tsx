'use client';

import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string;
  unit: string;
  icon: LucideIcon;
  isLoading?: boolean;
}

export default function MetricCard({ label, value, unit, icon: Icon, isLoading }: MetricCardProps) {
  if (isLoading) {
    return (
      <div className="sharp-card flex flex-col justify-between h-48">
        <div className="skeleton w-24 h-3 mb-2" />
        <div className="skeleton w-32 h-10" />
        <div className="skeleton w-full h-1 mt-8" />
      </div>
    );
  }

  return (
    <div className="sharp-card group flex flex-col justify-between h-48 hover:bg-[var(--muted)] transition-all">
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--muted-fg)]">{label}</p>
          <h2 className="text-4xl font-outfit font-black tracking-tighter">
            {value}
            <span className="text-xl text-[var(--muted-fg)] ml-2 font-medium uppercase tracking-tight">{unit}</span>
          </h2>
        </div>
        <div className="p-3 border border-[var(--border)] group-hover:border-[var(--border-strong)] transition-all">
          <Icon className="w-5 h-5" />
        </div>
      </div>
      
      <div className="w-full h-[1px] bg-[var(--border)] group-hover:bg-[var(--border-strong)] transition-all" />
      
      <div className="text-[9px] font-bold uppercase tracking-widest text-[var(--muted-fg)] group-hover:text-[var(--foreground)]">
        Live Network Data
      </div>
    </div>
  );
}
