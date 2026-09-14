import React from 'react';
import { cn } from '../../lib/utils';

export type BadgeStatus =
  | 'PROSPECT'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'DRAFT'
  | 'PENDING'
  | 'PAID'
  | 'ACTIVE'
  | 'INACTIVE';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status?: BadgeStatus;
  variant?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
  showDot?: boolean;
}

const statusStyles: Record<
  BadgeStatus,
  { container: string; dot: string; defaultLabel: string }
> = {
  PROSPECT: {
    container: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
    dot: 'bg-amber-400',
    defaultLabel: 'Prospecto',
  },
  IN_PROGRESS: {
    container: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
    dot: 'bg-blue-400',
    defaultLabel: 'En Progreso',
  },
  COMPLETED: {
    container: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    dot: 'bg-emerald-400',
    defaultLabel: 'Completado',
  },
  CANCELLED: {
    container: 'bg-neutral-900 text-neutral-400 border-neutral-800 line-through',
    dot: 'bg-neutral-500',
    defaultLabel: 'Cancelado',
  },
  DRAFT: {
    container: 'bg-neutral-800/80 text-neutral-300 border-neutral-700',
    dot: 'bg-neutral-400',
    defaultLabel: 'Borrador',
  },
  PENDING: {
    container: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
    dot: 'bg-amber-400',
    defaultLabel: 'Pendiente',
  },
  PAID: {
    container: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    dot: 'bg-emerald-400',
    defaultLabel: 'Cobrado',
  },
  ACTIVE: {
    container: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    dot: 'bg-emerald-400',
    defaultLabel: 'Activa',
  },
  INACTIVE: {
    container: 'bg-neutral-900 text-neutral-500 border-neutral-800',
    dot: 'bg-neutral-600',
    defaultLabel: 'Inactiva',
  },
};

const variantStyles = {
  neutral: 'bg-neutral-800/80 text-neutral-300 border-neutral-700',
  success: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  danger: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
  info: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
};

export const Badge: React.FC<BadgeProps> = ({
  status,
  variant,
  showDot = false,
  className,
  children,
  ...props
}) => {
  let appliedClasses = '';
  let dotClass = '';
  let content = children;

  if (status && statusStyles[status]) {
    const config = statusStyles[status];
    appliedClasses = config.container;
    dotClass = config.dot;
    if (!content) {
      content = config.defaultLabel;
    }
  } else if (variant && variantStyles[variant]) {
    appliedClasses = variantStyles[variant];
  } else {
    appliedClasses = 'bg-neutral-800 text-neutral-300 border-neutral-700';
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border select-none',
        appliedClasses,
        className
      )}
      {...props}
    >
      {showDot && (
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full shrink-0',
            dotClass || 'bg-current'
          )}
        />
      )}
      <span>{content}</span>
    </span>
  );
};
