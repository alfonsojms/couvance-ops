import React from 'react';
import { MessageSquare, Copy } from 'lucide-react';
import { handleWhatsAppOrCopy } from '../lib/utils';

interface WhatsAppButtonProps {
  phone?: string | null;
  message: string;
  label?: string;
  className?: string;
  size?: 'sm' | 'md';
}

export const WhatsAppButton: React.FC<WhatsAppButtonProps> = ({
  phone,
  message,
  label = 'Cobrar por WhatsApp',
  className = '',
  size = 'md',
}) => {
  const hasPhone = Boolean(phone && phone.trim().length > 0);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleWhatsAppOrCopy(phone, message);
  };

  const sizeClasses = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-2 text-sm';

  return (
    <button
      type="button"
      onClick={handleClick}
      title={hasPhone ? `Enviar a WhatsApp (${phone})` : 'Cliente sin teléfono: copiar mensaje'}
      className={`inline-flex items-center gap-2 rounded-md font-medium border transition-all duration-150 ease-out active:scale-95 select-none ${
        hasPhone
          ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/80 hover:bg-emerald-900/50 hover:border-emerald-700'
          : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:bg-neutral-800 hover:text-neutral-100'
      } ${sizeClasses} ${className}`}
    >
      {hasPhone ? <MessageSquare className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-neutral-400" />}
      <span>{hasPhone ? label : 'Copiar Mensaje'}</span>
    </button>
  );
};
