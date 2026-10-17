import React from 'react';
import { NumericKeypad } from '../components/NumericKeypad';
import { UnlockBrand, UnlockErrorAlert } from '../components/unlock/UnlockBrand';
import { RecoveryDialog } from '../components/unlock/RecoveryDialog';
import { useUnlockPin } from '../hooks/useUnlockPin';
import { useUnlockRecovery } from '../hooks/useUnlockRecovery';

interface UnlockProps {
  onUnlockSuccess: () => void;
}

export const Unlock: React.FC<UnlockProps> = ({ onUnlockSuccess }) => {
  const recovery = useUnlockRecovery(onUnlockSuccess);
  const pinEntry = useUnlockPin({ onUnlockSuccess, keyboardPaused: recovery.recoveryOpen });

  const handleOpenRecovery = () => {
    pinEntry.clearError();
    void recovery.openRecovery();
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-4 py-8 overflow-y-auto">
      <div className="w-full max-w-sm flex flex-col items-center my-auto">
        <UnlockBrand />

        {pinEntry.errorMsg ? <UnlockErrorAlert message={pinEntry.errorMsg} /> : null}

        {/* Teclado Numérico con animación shake */}
        <NumericKeypad
          pin={pinEntry.pin}
          onChange={pinEntry.changePin}
          onSubmit={pinEntry.handleUnlock}
          disabled={pinEntry.loading}
          isShaking={pinEntry.isShaking}
        />

        {/* Botón de Recuperación */}
        <button
          type="button"
          onClick={handleOpenRecovery}
          className="mt-8 text-xs text-neutral-500 hover:text-neutral-300 transition-colors duration-150 select-none"
        >
          ¿Olvidaste el PIN de acceso?
        </button>
      </div>

      <RecoveryDialog recovery={recovery} />
    </div>
  );
};
