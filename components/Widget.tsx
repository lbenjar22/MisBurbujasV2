
import React from 'react';
import { Reminder, ReminderPriority } from '../types';
import { Check, Trash2, Bell, Clock } from 'lucide-react';

interface WidgetProps {
  reminders: Reminder[];
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

const Widget: React.FC<WidgetProps> = ({ reminders, onComplete, onDelete, onClose }) => {
  const pendingReminders = reminders
    .filter(r => !r.isCompleted)
    .sort((a, b) => {
      const priorityMap = { [ReminderPriority.HIGH]: 0, [ReminderPriority.MEDIUM]: 1, [ReminderPriority.LOW]: 2 };
      return priorityMap[a.priority] - priorityMap[b.priority];
    });

  return (
    <div className="fixed bottom-24 right-6 w-80 max-h-[400px] glass bubble-shadow rounded-[32px] overflow-hidden flex flex-col z-40 animate-in slide-in-from-bottom-4 fade-in duration-300 border-white/40">
      <div className="p-5 border-b border-white/20 bg-white/10 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <h3 className="font-bold text-gray-800 text-sm tracking-tight uppercase">Active Bubbles</h3>
        </div>
        <span className="text-[10px] font-bold bg-blue-500 text-white px-2 py-0.5 rounded-full">
          {pendingReminders.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {pendingReminders.length === 0 ? (
          <div className="py-8 text-center">
            <Bell className="mx-auto text-gray-400/50 mb-2" size={24} />
            <p className="text-xs text-gray-500 font-medium">All bubbles popped!</p>
          </div>
        ) : (
          pendingReminders.map((reminder) => (
            <div 
              key={reminder.id}
              className="group flex items-center justify-between p-3 bg-white/40 hover:bg-white/60 rounded-2xl transition-all border border-transparent hover:border-white/50"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className={`w-2 h-2 rounded-full shrink-0 ${
                  reminder.priority === ReminderPriority.HIGH ? 'bg-rose-400' :
                  reminder.priority === ReminderPriority.MEDIUM ? 'bg-amber-400' : 'bg-emerald-400'
                }`} />
                <div className="flex flex-col overflow-hidden">
                  <span className="text-xs font-bold text-gray-800 truncate">{reminder.text}</span>
                  <div className="flex items-center gap-1 opacity-50">
                    <Clock size={10} />
                    <span className="text-[9px] font-medium uppercase">{reminder.category}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => onComplete(reminder.id)}
                  className="p-1.5 bg-green-500/80 text-white rounded-full hover:bg-green-600 transition-colors"
                >
                  <Check size={12} />
                </button>
                <button 
                  onClick={() => onDelete(reminder.id)}
                  className="p-1.5 bg-red-500/80 text-white rounded-full hover:bg-red-600 transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-3 bg-white/10 text-center">
        <button 
          onClick={onClose}
          className="text-[10px] font-bold text-blue-600/60 uppercase tracking-widest hover:text-blue-600 transition-colors"
        >
          Dismiss Widget
        </button>
      </div>
    </div>
  );
};

export default Widget;
