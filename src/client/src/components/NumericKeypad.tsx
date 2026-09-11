import React from 'react';
import { Delete, X } from 'lucide-react';

interface NumericKeypadProps {
  pin: string;
  onChange: (pin: string) => void;
  onSubmit?: (pin: string) => void;
  disabled?: boolean;
}

export const NumericKeypad: React.FC<NumericKeypadProps> = ({
  pin,
  onChange,
  onSubmit,
  disabled = false,
}) => {
  const handleDigit = (digit: string) => {
    if (disabled || pin.length >= 6) return;
    const newPin = pin + digit;
    onChange(newPin);
    if (newPin.length === 6 && onSubmit) {
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
    <div className="w-full max-w-xs mx-auto flex flex-col items-center">
      {/* Indicadores de 6 dígitos */}
      <div className="flex gap-4 mb-8 justify-center items-center h-8">
        {[0, 1, 2, 3, 4, 5].map((idx) => {
          const filled = idx < pin.length;
          return (
            <div
              key={idx}
              className={`w-3.5 h-3.5 rounded-full border transition-all duration-150 ease-out ${
                filled
                  ? 'bg-neutral-100 border-neutral-100 scale-110'
                  : 'bg-transparent border-neutral-700'
              }`}
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
            className="h-14 rounded-lg bg-neutral-900 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-850 active:scale-95 text-xl font-mono text-neutral-100 font-medium transition-all duration-150 ease-out disabled:opacity-50 disabled:pointer-events-none select-none"
          >
            {digit}
          </button>
        ))}

        {/* Botón Borrar Todo */}
        <button
          type="button"
          disabled={disabled || pin.length === 0}
          onClick={handleClear}
          className="h-14 rounded-lg bg-neutral-950 border border-neutral-900 hover:border-neutral-800 hover:bg-neutral-900 active:scale-95 text-neutral-400 hover:text-neutral-200 flex items-center justify-center transition-all duration-150 ease-out disabled:opacity-30 disabled:pointer-events-none select-none"
          title="Limpiar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Dígito 0 */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => handleDigit('0')}
          className="h-14 rounded-lg bg-neutral-900 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-850 active:scale-95 text-xl font-mono text-neutral-100 font-medium transition-all duration-150 ease-out disabled:opacity-50 disabled:pointer-events-none select-none"
        >
          0
        </button>

        {/* Botón Retroceso (Backspace) */}
        <button
          type="button"
          disabled={disabled || pin.length === 0}
          onClick={handleDelete}
          className="h-14 rounded-lg bg-neutral-950 border border-neutral-900 hover:border-neutral-800 hover:bg-neutral-900 active:scale-95 text-neutral-400 hover:text-neutral-200 flex items-center justify-center transition-all duration-150 ease-out disabled:opacity-30 disabled:pointer-events-none select-none"
          title="Retroceso"
        >
          <Delete className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
