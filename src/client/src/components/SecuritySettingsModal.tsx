import React from 'react';
import { Shield } from 'lucide-react';
import { useSecuritySettings } from '../hooks/useSecuritySettings';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/Dialog';
import { SecurityTabs } from './security/SecurityTabs';
import { ChangePinForm } from './security/ChangePinForm';
import { SecurityQuestionsForm } from './security/SecurityQuestionsForm';

interface SecuritySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SecuritySettingsModal: React.FC<SecuritySettingsModalProps> = ({ isOpen, onClose }) => {
  const { activeTab, setActiveTab, loading, pinForm, questionsForm } = useSecuritySettings(isOpen, onClose);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[calc(100%-1.5rem)] max-w-md p-4 sm:p-6">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <DialogTitle>Seguridad & Credenciales</DialogTitle>
              <DialogDescription>
                Gestione el PIN maestro y las preguntas de recuperación de Couvance Ops
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <SecurityTabs activeTab={activeTab} onChange={setActiveTab} />

        {activeTab === 'pin' ? <ChangePinForm form={pinForm} loading={loading} onCancel={onClose} /> : null}

        {activeTab === 'questions' ? (
          <SecurityQuestionsForm form={questionsForm} loading={loading} onCancel={onClose} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
