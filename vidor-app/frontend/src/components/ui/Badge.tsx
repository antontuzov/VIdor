import { forwardRef, HTMLAttributes, ReactNode } from 'react'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral'
  size?: 'sm' | 'md'
  children: ReactNode
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    { variant = 'neutral', size = 'md', children, className = '', ...props },
    ref
  ) => {
    const variantClasses = {
      primary: 'badge-primary',
      success: 'badge-success',
      warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
      danger: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
      neutral: 'bg-bg-tertiary text-text-secondary dark:bg-bg-hover dark:text-text-tertiary',
    }

    const sizeClasses = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-2.5 py-0.5 text-xs',
    }

    return (
      <span
        ref={ref}
        className={`badge ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...props}
      >
        {children}
      </span>
    )
  }
)

Badge.displayName = 'Badge'

export default Badge
