import React from 'react';
import { MessageSquare, Copy } from 'lucide-react';
import { handleWhatsAppOrCopy } from '../lib/utils';
import { Button } from './ui/Button';

export interface WhatsAppButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'size'> {
  phone?: string | null;
  message: string;
  label?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  touchFriendly?: boolean;
}

export const WhatsAppButton: React.FC<WhatsAppButtonProps> = ({
  phone,
  message,
  label = 'Cobrar por WhatsApp',
  className = '',
  size = 'md',
  touchFriendly = true,
  onClick,
  ...props
}) => {
  const hasPhone = Boolean(phone && phone.trim().length > 0);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    handleWhatsAppOrCopy(phone, message);
    onClick?.(e);
  };

  return (
    <Button
      type="button"
      variant={hasPhone ? 'whatsapp' : 'secondary'}
      size={size}
      touchFriendly={touchFriendly}
      onClick={handleClick}
      title={
        hasPhone
          ? `Enviar a WhatsApp (${phone})`
          : 'Cliente sin teléfono registrado: copiar mensaje al portapapeles'
      }
      className={className}
      {...props}
    >
      {hasPhone ? (
        <MessageSquare className="w-4 h-4 shrink-0 text-neutral-950" />
      ) : (
        <Copy className="w-4 h-4 shrink-0 text-neutral-400" />
      )}
      <span>{hasPhone ? label : 'Copiar Mensaje'}</span>
    </Button>
  );
};

