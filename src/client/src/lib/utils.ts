import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { toast } from 'sonner';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    maximumFractionDigits: 2,
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);
}

export function formatDate(dateString?: string | null): string {
  if (!dateString) return 'Sin fecha';
  try {
    const [year, month, day] = dateString.split('-');
    if (year && month && day) {
      return `${day}/${month}/${year}`;
    }
    const d = new Date(dateString);
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateString;
  }
}

// Normaliza el teléfono eliminando espacios, guiones y signos más redundantes
export function cleanPhoneNumber(phone?: string | null): string {
  if (!phone) return '';
  return phone.replace(/[^0-9]/g, '');
}

// Genera enlace wa.me o ejecuta fallback al portapapeles con toast Sonner (RN-09)
export function handleWhatsAppOrCopy(
  phone: string | null | undefined,
  message: string,
  onCopiedSuccessMessage?: string
): void {
  const cleanedPhone = cleanPhoneNumber(phone);

  if (cleanedPhone) {
    const encodedMessage = encodeURIComponent(message);
    const waUrl = `https://wa.me/${cleanedPhone}?text=${encodedMessage}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  } else {
    // Fallback: copiar cordial mensaje al portapapeles y notificar al socio
    navigator.clipboard.writeText(message).then(
      () => {
        toast.info(
          onCopiedSuccessMessage ||
            'El cliente no tiene teléfono guardado. El mensaje fue copiado al portapapeles para pegarlo donde prefieras.'
        );
      },
      () => {
        toast.error('No se pudo copiar el mensaje al portapapeles.');
      }
    );
  }
}

export async function copyToClipboard(text: string, successMessage: string = 'Copiado al portapapeles'): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(successMessage);
  } catch {
    toast.error('Error al copiar al portapapeles');
  }
}
