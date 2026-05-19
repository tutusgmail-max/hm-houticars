import React from 'react'

export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-lg bg-[#1E3353]/40 ${className}`} aria-hidden />
}

export function CarCardSkeleton() {
  return (
    <div className="rounded-[20px] overflow-hidden bg-white border border-black/[0.06]">
      <Skeleton className="h-[200px] w-full rounded-none" />
      <div className="p-5 space-y-3">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  )
}

export function AdminCardSkeleton() {
  return <Skeleton className="h-24 w-full rounded-[14px]" />
}
