import React from 'react'

export function Skeleton({ className = '' }) {
  return <div className={`skeleton rounded-xl ${className}`} aria-hidden />
}

export function CarCardSkeleton() {
  return (
    <div className="min-w-[86%] sm:min-w-[420px] lg:min-w-[440px] rounded-[20px] overflow-hidden flex flex-col" style={{ background: 'rgba(13,26,42,0.5)', border: '1px solid rgba(255,255,255,0.04)' }}>
      <Skeleton className="h-[260px] w-full rounded-none" />
      <div className="p-7 space-y-3.5">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-8 w-2/3" />
        <div className="flex gap-2">
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-7 w-16" />
        </div>
        <div className="flex justify-between items-center pt-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-28" />
        </div>
      </div>
    </div>
  )
}

export function AdminCardSkeleton() {
  return <Skeleton className="h-28 w-full rounded-2xl" />
}
