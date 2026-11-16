import React from 'react';

export function Skeleton({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`animate-pulse bg-slate-200 dark:bg-slate-700/60 rounded ${className}`}
      {...props}
    />
  );
}

export function CardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white rounded-xl p-5 shadow-sm border border-slate-100 flex flex-col gap-3 ${className}`}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-6 w-6 rounded-full" />
      </div>
      <Skeleton className="h-8 w-36 my-1" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex justify-between items-center">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-9 w-48 rounded-lg" />
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="p-4 flex items-center justify-between gap-4">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className={`h-4 ${c === 0 ? 'w-1/4' : 'w-1/6'}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChartSkeleton({ height = 280 }: { height?: number }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div style={{ height: `${height}px` }} className="w-full flex items-end gap-3 pt-6 pb-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-t"
            style={{ height: `${Math.max(25, (i * 37) % 85 + 15)}%` }}
          />
        ))}
      </div>
    </div>
  );
}

