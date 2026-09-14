import React from 'react';
import { cn } from '../../lib/utils';

export interface MetricCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    label: string;
    positive?: boolean;
  };
}

export const MetricCard = React.forwardRef<HTMLDivElement, MetricCardProps>(
  ({ className, title, value, subtitle, icon, trend, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'bg-neutral-900/60 border border-neutral-800 rounded-xl p-4 sm:p-5 flex flex-col justify-between transition-colors hover:border-neutral-700/80',
          className
        )}
        {...props}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-neutral-400">{title}</span>
          {icon && <div className="shrink-0 text-neutral-400">{icon}</div>}
        </div>

        <div className="text-2xl sm:text-3xl font-mono font-bold text-neutral-100 tracking-tight my-0.5">
          {value}
        </div>

        {(subtitle || trend) && (
          <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-1 mt-1 border-t border-neutral-800/40">
            {subtitle && <span>{subtitle}</span>}
            {trend && (
              <span
                className={cn(
                  'font-medium font-mono',
                  trend.positive ? 'text-emerald-400' : 'text-amber-400'
                )}
              >
                {trend.label}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }
);

MetricCard.displayName = 'MetricCard';
