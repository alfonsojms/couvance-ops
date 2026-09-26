import React from 'react';
import { Delete, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface NumericKeypadProps {
  pin: string;
  onChange: (pin: string) => void;
  onSubmit?: (pin: string) => void;
  disabled?: boolean;
  isShaking?: boolean;
}

export const NumericKeypad: React.FC<NumericKeypadProps> = ({
  pin,
  onChange,
  onSubmit,
  disabled = false,
  isShaking = false,
}) => {
  const handleDigit = (digit: string) => {
    if (disabled || pin.length >= 8) return;
    const newPin = pin + digit;
    onChange(newPin);
    if (newPin.length === 8 && onSubmit) {
      onSubmit(newPin);
    }
  };

  const handleDelete = () => {
    if (disabled || pin.length === 0) return;
    onChange(pin.slice(0, -1));
  };

  const handleClear = () => {
    if (disabled) return;
    onChange('');
  };

  return (
    <div className="w-full max-w-xs mx-auto flex flex-col items-center select-none">
      {/* Indicadores de 8 dígitos con animación de sacudida (shake) sin CLS */}
      <div
        className={cn(
          'flex gap-2.5 sm:gap-3 mb-8 justify-center items-center h-8 transition-transform will-change-transform',
          isShaking && 'animate-shake'
        )}
        aria-label={`${pin.length} de 8 dígitos ingresados`}
      >
        {[0, 1, 2, 3, 4, 5, 6, 7].map((idx) => {
          const filled = idx < pin.length;
          return (
            <div
              key={idx}
              className={cn(
                'w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full border transition-all duration-150 ease-out',
                filled
                  ? 'bg-[#BDEF00] border-[#BDEF00] scale-110 shadow-[0_0_12px_rgba(189,239,0,0.6)]'
                  : 'bg-neutral-900/80 border-neutral-800'
              )}
            />
          );
        })}
      </div>

      {/* Teclado numérico 3x4 */}
      <div className="grid grid-cols-3 gap-3 w-full">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
          <button
            key={digit}
            type="button"
            disabled={disabled}
            onClick={() => handleDigit(digit)}
            aria-label={`Dígito ${digit}`}
            className="h-14 rounded-xl bg-neutral-900/80 border border-neutral-800 hover:border-[#004BFF]/50 hover:bg-neutral-850 active:scale-95 text-xl font-mono text-white font-medium transition-all duration-150 ease-out disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BFF] focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 touch-manipulation shadow-sm"
          >
            {digit}
          </button>
        ))}

        {/* Botón Borrar Todo */}
        <button
          type="button"
          disabled={disabled || pin.length === 0}
          onClick={handleClear}
          aria-label="Borrar todo el PIN"
          title="Borrar todo"
          className="h-14 rounded-xl bg-neutral-950 border border-neutral-900 hover:border-neutral-800 hover:bg-neutral-900 active:scale-95 text-neutral-400 hover:text-white flex items-center justify-center transition-all duration-150 ease-out disabled:opacity-30 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BFF] focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 touch-manipulation"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Dígito 0 */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => handleDigit('0')}
          aria-label="Dígito 0"
          className="h-14 rounded-xl bg-neutral-900/80 border border-neutral-800 hover:border-[#004BFF]/50 hover:bg-neutral-850 active:scale-95 text-xl font-mono text-white font-medium transition-all duration-150 ease-out disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BFF] focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 touch-manipulation shadow-sm"
        >
          0
        </button>

        {/* Botón Retroceso (Backspace) */}
        <button
          type="button"
          disabled={disabled || pin.length === 0}
          onClick={handleDelete}
          aria-label="Retroceso / Borrar último dígito"
          title="Retroceso"
          className="h-14 rounded-xl bg-neutral-950 border border-neutral-900 hover:border-neutral-800 hover:bg-neutral-900 active:scale-95 text-neutral-400 hover:text-white flex items-center justify-center transition-all duration-150 ease-out disabled:opacity-30 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BFF] focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 touch-manipulation"
        >
          <Delete className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
