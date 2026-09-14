import React from 'react';
import { cn } from '../../lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'whatsapp';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  touchFriendly?: boolean;
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'secondary',
      size = 'md',
      touchFriendly = false,
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseClasses =
      'inline-flex items-center justify-center rounded-md font-medium select-none border transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]';

    const variantClasses = {
      primary:
        'bg-neutral-100 text-neutral-950 border-transparent hover:bg-neutral-200 active:bg-neutral-300 font-semibold shadow-sm',
      secondary:
        'bg-neutral-800 text-neutral-100 border-neutral-700 hover:bg-neutral-700 hover:border-neutral-600',
      danger:
        'bg-rose-950/40 text-rose-300 border-rose-800/80 hover:bg-rose-900/60 hover:border-rose-700',
      ghost:
        'bg-transparent text-neutral-400 border-transparent hover:bg-neutral-900 hover:text-neutral-100',
      whatsapp:
        'bg-[#25D366] text-neutral-950 border-[#25D366]/40 hover:bg-[#20ba5a] active:bg-[#1da851] font-semibold',
    };

    const sizeClasses = {
      sm: 'px-2.5 py-1.5 text-xs gap-1.5',
      md: 'px-3.5 py-2 text-xs sm:text-sm gap-2',
      lg: 'px-4 py-2.5 text-sm sm:text-base gap-2.5',
      icon: 'p-2 text-xs sm:text-sm aspect-square',
    };

    const touchClasses = touchFriendly ? 'min-h-[44px] min-w-[44px]' : '';

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          baseClasses,
          variantClasses[variant],
          sizeClasses[size],
          touchClasses,
          className
        )}
        {...props}
      >
        {isLoading ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <span>{children}</span>
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
