import React, { useId } from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', hasError, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          'w-full px-3 py-2 text-xs sm:text-sm bg-neutral-950 border rounded-md text-neutral-100 placeholder:text-neutral-500 transition-colors focus:outline-none focus:ring-1 disabled:opacity-50 disabled:cursor-not-allowed',
          hasError
            ? 'border-rose-500/80 focus:border-rose-500 focus:ring-rose-500/30'
            : 'border-neutral-800 focus:border-neutral-600 focus:ring-neutral-400',
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  hasError?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, hasError, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          'w-full px-3 py-2 text-xs sm:text-sm bg-neutral-950 border rounded-md text-neutral-100 transition-colors focus:outline-none focus:ring-1 disabled:opacity-50 disabled:cursor-not-allowed',
          hasError
            ? 'border-rose-500/80 focus:border-rose-500 focus:ring-rose-500/30'
            : 'border-neutral-800 focus:border-neutral-600 focus:ring-neutral-400',
          className
        )}
        {...props}
      >
        {children}
      </select>
    );
  }
);
Select.displayName = 'Select';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, hasError, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          'w-full px-3 py-2 text-xs sm:text-sm bg-neutral-950 border rounded-md text-neutral-100 placeholder:text-neutral-500 transition-colors focus:outline-none focus:ring-1 disabled:opacity-50 disabled:cursor-not-allowed resize-y',
          hasError
            ? 'border-rose-500/80 focus:border-rose-500 focus:ring-rose-500/30'
            : 'border-neutral-800 focus:border-neutral-600 focus:ring-neutral-400',
          className
        )}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export interface FormFieldProps {
  id?: string;
  label?: React.ReactNode;
  error?: string | null;
  hint?: string | null;
  required?: boolean;
  className?: string;
  children: React.ReactNode | ((props: { id: string; hasError: boolean }) => React.ReactNode);
}

export const FormField: React.FC<FormFieldProps> = ({
  id: customId,
  label,
  error,
  hint,
  required = false,
  className,
  children,
}) => {
  const generatedId = useId();
  const id = customId || generatedId;
  const hasError = Boolean(error);

  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-medium text-neutral-300"
        >
          {label}
          {required && <span className="text-rose-400 ml-1">*</span>}
        </label>
      )}

      {typeof children === 'function' ? (
        children({ id, hasError })
      ) : React.isValidElement(children) ? (
        React.cloneElement(children as React.ReactElement<any>, {
          id: (children.props as any).id || id,
          hasError: (children.props as any).hasError ?? hasError,
        })
      ) : (
        children
      )}

      {error ? (
        <p className="text-[11px] text-rose-400 font-medium">{error}</p>
      ) : hint ? (
        <p className="text-[11px] text-neutral-500">{hint}</p>
      ) : null}
    </div>
  );
};
