interface LoadingSkeletonProps {
  className?: string
  label?: string
}

export function LoadingSkeleton({ className = 'h-24 w-full', label }: LoadingSkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-sm border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] ${className}`}
      role="status"
      aria-label={label ?? 'Loading'}
    />
  )
}
