import React from 'react';
import { Lock, AlertCircle } from 'lucide-react';

// Cabecera / Logo Couvance con el título de la pantalla de acceso
export const UnlockBrand: React.FC = () => (
  <>
    <div className="relative mb-5 sm:mb-6">
      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden border border-[#004BFF]/50 bg-[#004BFF] shadow-[0_0_24px_rgba(0,75,255,0.35)] flex items-center justify-center">
        <img
          src="/logo-couvance.png"
          alt="Couvance Logo"
          className="w-full h-full object-cover select-none pointer-events-none"
        />
      </div>
      <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-neutral-950 border border-neutral-800 flex items-center justify-center shadow-md">
        <Lock className="w-3 h-3 text-[#BDEF00]" />
      </div>
    </div>

    <h1 className="text-xl font-bold tracking-tight text-white mb-1 text-center">Couvance Ops</h1>
    <p className="text-xs text-neutral-400 mb-6 sm:mb-8 text-center">
      Ingresa el PIN maestro de 8 dígitos para acceder
    </p>
  </>
);

// Mensaje de error si falla el PIN
export const UnlockErrorAlert: React.FC<{ message: string }> = ({ message }) => (
  <div className="w-full mb-6 p-3 rounded-lg bg-rose-950/40 border border-rose-900/60 text-rose-300 text-xs flex items-center gap-2">
    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
    <span>{message}</span>
  </div>
);
