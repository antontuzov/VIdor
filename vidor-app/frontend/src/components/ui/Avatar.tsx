import { forwardRef, HTMLAttributes } from 'react'

export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  name: string
  src?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showStatus?: boolean
  isOnline?: boolean
}

const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({ name, src, size = 'md', showStatus = false, isOnline = false, className = '', ...props }, ref) => {
    const sizeClasses = {
      sm: 'avatar-sm',
      md: 'avatar-md',
      lg: 'avatar-lg',
      xl: 'avatar-xl',
    }

    const initials = name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)

    return (
      <div
        ref={ref}
        className={`avatar ${sizeClasses[size]} ${className} relative`}
        {...props}
      >
        {src ? (
          <img src={src} alt={name} className="w-full h-full object-cover" />
        ) : (
          <span>{initials}</span>
        )}

        {showStatus && (
          <span
            className={`absolute bottom-0 right-0 w-1/3 h-1/3 rounded-full border-2 border-white dark:border-bg-primary ${
              isOnline ? 'bg-green-500' : 'bg-gray-400'
            }`}
          />
        )}
      </div>
    )
  }
)

Avatar.displayName = 'Avatar'

export default Avatar
