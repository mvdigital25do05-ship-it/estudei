/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  GraduationCap, 
  Home, 
  BookOpen, 
  FileText, 
  Calendar, 
  RefreshCw,
  NotebookPen, 
  HelpCircle,
  LogOut,
  Settings,
  UserPlus,
  X,
  GraduationCap as SchoolIcon
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onLogout?: () => void;
}

export default function Sidebar({ activeTab, setActiveTab, isOpen, setIsOpen, onLogout }: SidebarProps) {
  const menuItems = [
    { id: 'inicio', label: 'Início', icon: Home },
    { id: 'planos', label: 'Planos', icon: FileText },
    { id: 'disciplinas', label: 'Disciplinas', icon: BookOpen },
    { id: 'planejamento', label: 'Planejamento', icon: Calendar },
    { id: 'erros', label: 'Caderno de Erros', icon: NotebookPen },
    { id: 'revisoes', label: 'Revisões', icon: RefreshCw, disabled: true },
    { id: 'simulados', label: 'Simulados', icon: GraduationCap },
  ];

  const handleSelectItem = (id: string, disabled?: boolean) => {
    if (disabled) return;
    setActiveTab(id);
    setIsOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <nav className={`
        fixed inset-y-0 left-0 w-[240px] bg-gradient-to-b from-secondary to-primary shadow-xl 
        flex flex-col py-6 z-50 transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0
      `}>
        {/* Header Branding */}
        <div className="px-6 mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center text-white">
              <SchoolIcon size={24} className="fill-white/20" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold text-white tracking-tight leading-tight">Estudei</h1>
              <p className="font-sans text-[10px] uppercase tracking-wider text-white/70 font-semibold">Dashboard de Sucesso</p>
            </div>
          </div>
          <button 
            type="button" 
            className="md:hidden text-white/80 hover:text-white"
            onClick={() => setIsOpen(false)}
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 scrollbar-thin">
          <ul className="space-y-[4px]">
            {menuItems.map((item) => {
              const IconComp = item.icon;
              const isActive = activeTab === item.id;
              
              if (item.disabled) {
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-white/50 cursor-pointer hover:bg-white/5 transition-all text-left"
                      onClick={() => handleSelectItem(item.id, true)}
                    >
                      <div className="flex items-center gap-3">
                        <IconComp size={18} className="opacity-60" />
                        <span className="text-[13px] font-medium">{item.label}</span>
                      </div>
                      <span className="text-[9px] bg-white/10 px-1.5 py-0.5 rounded text-white/60 uppercase">Em breve</span>
                    </button>
                  </li>
                );
              }

              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`
                      w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left transition-all cursor-pointer
                      ${isActive 
                        ? 'bg-white/15 text-white shadow-shadow' 
                        : 'text-white/80 hover:text-white hover:bg-white/5'
                      }
                    `}
                    onClick={() => handleSelectItem(item.id)}
                  >
                    <IconComp size={18} className={isActive ? 'opacity-100' : 'opacity-80'} />
                    <span className="text-[14px] font-semibold">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Footer actions and dynamic links */}
        <div className="px-4 mt-auto pt-6 border-t border-white/10">
          
          <div className="flex items-center justify-center gap-6 mt-1 text-white/60">
            <button 
              type="button" 
              onClick={() => alert('Configurações da conta: recurso em desenvolvimento.')} 
              className="hover:text-white transition-colors cursor-pointer p-1" 
              title="Configurações"
            >
              <Settings size={18} />
            </button>
            <button 
              type="button" 
              onClick={() => {
                if (onLogout) {
                  onLogout();
                } else {
                  alert('Sessão encerrada com sucesso.');
                }
              }} 
              className="hover:text-white transition-colors cursor-pointer p-1" 
              title="Sair"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}
