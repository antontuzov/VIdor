import { HTMLAttributes, forwardRef } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'hover' | 'clickable'
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    { className = '', variant = 'default', padding = 'md', children, ...props },
    ref
  ) => {
    const baseStyles = 'bg-bg rounded-notion-lg border border-border'
    
    const variantStyles = {
      default: 'shadow-notion',
      hover: 'shadow-notion hover:shadow-notion-md transition-shadow duration-200',
      clickable: 'shadow-notion hover:shadow-notion-md transition-all duration-200 hover:scale-102 cursor-pointer',
    }
    
    const paddingStyles = {
      none: '',
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6',
    }
    
    return (
      <div
        ref={ref}
        className={`${baseStyles} ${variantStyles[variant]} ${paddingStyles[padding]} ${className}`}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'

export default Card
