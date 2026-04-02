import { useState, useRef, useEffect, ReactNode, forwardRef } from 'react'

export interface DropdownProps {
  trigger: ReactNode
  children: ReactNode
  align?: 'left' | 'right'
  width?: 'sm' | 'md' | 'lg'
  closeOnSelect?: boolean
}

const Dropdown = forwardRef<HTMLDivElement, DropdownProps>(
  (
    { trigger, children, align = 'left', width = 'md', closeOnSelect = true },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const triggerRef = useRef<HTMLDivElement>(null)

    // Close on click outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          dropdownRef.current &&
          !dropdownRef.current.contains(event.target as Node) &&
          !triggerRef.current?.contains(event.target as Node)
        ) {
          setIsOpen(false)
        }
      }

      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Close on escape
    useEffect(() => {
      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          setIsOpen(false)
        }
      }

      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }, [])

    const widthClasses = {
      sm: 'min-w-[160px]',
      md: 'min-w-[200px]',
      lg: 'min-w-[240px]',
    }

    const alignClasses = {
      left: 'left-0',
      right: 'right-0',
    }

    return (
      <div ref={ref} className="relative inline-block">
        <div
          ref={triggerRef}
          onClick={() => setIsOpen(!isOpen)}
          className="cursor-pointer"
        >
          {trigger}
        </div>

        {isOpen && (
          <div
            ref={dropdownRef}
            className={`absolute z-dropdown mt-2 ${alignClasses[align]} ${widthClasses[width]} animate-in fade-in zoom-in`}
          >
            <div className="bg-bg-primary rounded-lg shadow-lg border border-border-primary overflow-hidden">
              {children}
            </div>
          </div>
        )}
      </div>
    )
  }
)

Dropdown.displayName = 'Dropdown'

export interface DropdownItemProps {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  destructive?: boolean
  icon?: ReactNode
}

export function DropdownItem({
  children,
  onClick,
  disabled = false,
  destructive = false,
  icon,
}: DropdownItemProps) {
  const handleClick = () => {
    if (!disabled && onClick) {
      onClick()
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`w-full flex items-center px-4 py-2 text-sm transition-colors ${
        disabled
          ? 'opacity-50 cursor-not-allowed'
          : destructive
          ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
          : 'text-text-primary hover:bg-bg-secondary'
      }`}
    >
      {icon && <span className="mr-3 w-4 h-4 flex-shrink-0">{icon}</span>}
      {children}
    </button>
  )
}

export interface DropdownDividerProps {
  className?: string
}

export function DropdownDivider({ className = '' }: DropdownDividerProps) {
  return (
    <div
      className={`h-px bg-border-primary my-1 ${className}`}
      role="separator"
    />
  )
}

export interface DropdownHeaderProps {
  children: ReactNode
}

export function DropdownHeader({ children }: DropdownHeaderProps) {
  return (
    <div className="px-4 py-2 text-xs font-medium text-text-tertiary uppercase tracking-wider">
      {children}
    </div>
  )
}

export default Dropdown
