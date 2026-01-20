
import React, { useState } from 'react';
import { Reminder, ReminderPriority } from '../types';
import { X, Maximize2, Check, Bell } from 'lucide-react';

interface FloatingOverlayProps {
  reminders: Reminder[];
  onComplete: (id: string) => void;
  onExit: () => void;
}

const FloatingOverlay: React.FC<FloatingOverlayProps> = ({ reminders, onComplete, onExit }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isPoppingId, setIsPoppingId] = useState<string | null>(null);

  const pendingReminders = reminders.filter(r => !r.isCompleted);
  const highPriorityCount = pendingReminders.filter(r => r.priority === ReminderPriority.HIGH).length;

  const handlePop = (id: string) => {
    setIsPoppingId(id);
    setTimeout(() => {
      onComplete(id);
      setIsPoppingId(null);
    }, 400);
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] flex items-end justify-end p-8">
      <div className="pointer-events-auto flex flex-col items-end gap-6">
        {/* Expanded View */}
        {isOpen && (
          <div className="w-72 max-h-[450px] bg-white/40 backdrop-blur-xl rounded-[40px] overflow-hidden flex flex-col animate-in slide-in-from-bottom-10 fade-in duration-300 mb-4 border border-white/60 shadow-2xl shadow-blue-900/10">
            <div className="p-5 bg-white/20 flex justify-between items-center border-b border-white/20">
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Bubble Master</span>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {pendingReminders.length === 0 ? (
                <div className="py-12 text-center opacity-40">
                  <p className="text-[11px] font-bold uppercase tracking-widest">Nada pendiente</p>
                </div>
              ) : (
                pendingReminders.map(r => (
                  <div 
                    key={r.id} 
                    className={`flex items-center justify-between p-4 rounded-3xl bg-white/50 border border-white/40 shadow-sm transition-all ${isPoppingId === r.id ? 'animate-pop' : ''}`}
                  >
                    <div className="flex flex-col min-w-0 pr-3">
                      <span className="text-sm font-bold text-slate-700 truncate">{r.text}</span>
                      <span className="text-[9px] font-bold text-blue-400 uppercase tracking-tighter">{r.category}</span>
                    </div>
                    <button 
                      onClick={() => handlePop(r.id)}
                      className="p-2 bg-green-500/60 text-white rounded-full hover:bg-green-600 transition-all shadow-sm shrink-0"
                    >
                      <Check size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="p-3 bg-white/10 text-center border-t border-white/10">
              <p className="text-[9px] font-medium text-slate-400">Toca el ícono para minimizar</p>
            </div>
          </div>
        )}

        {/* Master Bubble Realista */}
        <div className="flex items-center gap-4">
          <button 
            onClick={onExit}
            className="w-12 h-12 bg-slate-800 text-white rounded-full flex items-center justify-center shadow-xl transition-all hover:bg-slate-900 active:scale-90"
            title="Salir del Modo Superpuesto"
          >
            <Maximize2 size={20} />
          </button>
          
          <div className="relative">
            {/* Sombra de contacto de la Master Bubble */}
            <div className="bubble-contact-shadow !bottom-[-15px] !w-16" />
            
            <button 
              onClick={() => setIsOpen(!isOpen)}
              className={`
                w-20 h-20 rounded-full bubble-realistic flex items-center justify-center relative transition-all duration-500 active:scale-95
                ${highPriorityCount > 0 ? 'animate-float ring-2 ring-rose-300 ring-offset-4 ring-offset-blue-50' : 'animate-float'}
              `}
            >
              <div className="bubble-highlight" />
              <div className="bubble-glow" />
              
              <Bell size={28} className={pendingReminders.length > 0 ? 'text-blue-500 drop-shadow-md' : 'text-slate-400'} />
              
              {pendingReminders.length > 0 && (
                <span className="absolute -top-1 -right-1 w-7 h-7 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-lg">
                  {pendingReminders.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FloatingOverlay;
