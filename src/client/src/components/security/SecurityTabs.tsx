import React from 'react';
import { KeyRound, HelpCircle } from 'lucide-react';
import type { SecurityTab } from '../../hooks/useSecuritySettings';

interface SecurityTabsProps {
  activeTab: SecurityTab;
  onChange: (tab: SecurityTab) => void;
}

const tabClass = (active: boolean) =>
  `flex-1 flex items-center justify-center gap-2 py-2 px-3 min-h-[40px] rounded-md text-xs font-medium transition-all select-none touch-manipulation ${
    active
      ? 'bg-neutral-800 text-neutral-100 shadow-sm border border-neutral-700'
      : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/50'
  }`;

// Selector de Pestañas con touch targets
export const SecurityTabs: React.FC<SecurityTabsProps> = ({ activeTab, onChange }) => (
  <div className="flex items-center gap-1.5 p-1 bg-neutral-950 rounded-lg border border-neutral-800 my-1">
    <button type="button" onClick={() => onChange('pin')} className={tabClass(activeTab === 'pin')}>
      <KeyRound className="w-3.5 h-3.5" />
      <span>Cambiar PIN</span>
    </button>
    <button type="button" onClick={() => onChange('questions')} className={tabClass(activeTab === 'questions')}>
      <HelpCircle className="w-3.5 h-3.5" />
      <span>Preguntas Secretas</span>
    </button>
  </div>
);
