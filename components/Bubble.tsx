import React, { useState, useEffect, useRef } from 'react';
import { Reminder, ReminderPriority } from '../types';
import { Check, Trash2, Clock } from 'lucide-react';
import { sounds } from '../services/soundService';

interface BubbleProps {
  reminder: Reminder;
  physicsPos?: { x: number; y: number; radius: number };
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onSnooze: (id: string, durationMinutes: number) => void;
  onPositionUpdate: (id: string, x: number, y: number, isDragging: boolean) => void;
  isDragging?: boolean;
  index: number;
}

const Bubble: React.FC<BubbleProps> = ({ reminder, physicsPos, onComplete, onDelete, onSnooze, onPositionUpdate, isDragging = false, index }) => {
  const [isPopping, setIsPopping] = useState(false);
  const [showSnoozeOptions, setShowSnoozeOptions] = useState(false);
  const [wasDragging, setWasDragging] = useState(false);
  
  const dragOffset = useRef({ x: 0, y: 0 });

  const currentX = physicsPos?.x ?? reminder.position?.x ?? 300;
  const currentY = physicsPos?.y ?? reminder.position?.y ?? 300;
  const radius = physicsPos?.radius ?? 75;

  useEffect(() => {
    if (isDragging) {
      setWasDragging(true);
    } else if (wasDragging) {
      const timer = setTimeout(() => setWasDragging(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isDragging, wasDragging]);

  const triggerPop = (callback: (id: string) => void, soundType: 'pop' | 'shatter') => {
    setIsPopping(true);
    if (soundType === 'pop') sounds.playPop();
    else sounds.playShatter();
    
    setTimeout(() => callback(reminder.id), 500);
  };

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (isPopping) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    dragOffset.current = {
      x: clientX - currentX,
      y: clientY - currentY
    };

    sounds.playDragStart();
    onPositionUpdate(reminder.id, currentX, currentY, true);

    const handleMove = (ev: MouseEvent | TouchEvent) => {
      const moveX = 'touches' in ev ? ev.touches[0].clientX : (ev as MouseEvent).clientX;
      const moveY = 'touches' in ev ? ev.touches[0].clientY : (ev as MouseEvent).clientY;
      onPositionUpdate(reminder.id, moveX - dragOffset.current.x, moveY - dragOffset.current.y, true);
    };

    const handleEnd = () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
      
      sounds.playDragEnd();
      onPositionUpdate(reminder.id, currentX, currentY, false);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);
  };

  const getUrgencyConfig = (priority: ReminderPriority) => {
    switch (priority) {
      case ReminderPriority.HIGH:
        return {
          sizeClass: 'w-[200px] h-[200px]',
          bubbleClass: 'bubble-high animate-urgent-glow',
          floatClass: 'animate-float-high',
          textClass: 'text-[18px] text-white font-bold drop-shadow-md',
          tagClass: 'bg-white/20 text-white border-white/30',
          z: 'z-40'
        };
      case ReminderPriority.LOW:
        return {
          sizeClass: 'w-[120px] h-[120px]',
          bubbleClass: 'bubble-low',
          floatClass: 'animate-float-low',
          textClass: 'text-[14px] opacity-70 text-blue-200/80',
          tagClass: 'bg-blue-500/10 text-blue-300/60 border-blue-500/10',
          z: 'z-10'
        };
      default: // MEDIUM
        return {
          sizeClass: 'w-[150px] h-[150px]',
          bubbleClass: 'bubble-medium',
          floatClass: 'animate-float-medium',
          textClass: 'text-[16px] text-blue-100',
          tagClass: 'bg-blue-500/20 text-blue-200 border-blue-500/20',
          z: 'z-20'
        };
    }
  };

  const cfg = getUrgencyConfig(reminder.priority);
  
  const bubbleTransform = isDragging 
    ? `scale(1.15)` 
    : wasDragging 
      ? `scale(1.05)` 
      : `scale(1)`;

  return (
    <div 
      className={`fixed pointer-events-auto ${cfg.z} ${isDragging ? '!z-[100]' : ''}`}
      style={{ 
        left: 0, 
        top: 0, 
        transform: `translate3d(${currentX - radius}px, ${currentY - radius}px, 0)`,
        touchAction: 'none'
      }}
    >
      <div className={`relative group transition-all duration-300 ${isPopping ? '' : isDragging ? '' : cfg.floatClass}`}>
        
        <div 
          className="bubble-contact-shadow" 
          style={{ 
            transform: `translateX(-50%) scale(${isDragging ? 0.6 : 1})`,
            opacity: isDragging ? 0.05 : 0.15,
            filter: `blur(${isDragging ? '12px' : '4px'})`
          }}
        />
        
        {isPopping && Array.from({ length: 18 }).map((_, i) => {
          const px = Math.cos((i / 18) * Math.PI * 2) * (90 + Math.random() * 60);
          const py = Math.sin((i / 18) * Math.PI * 2) * (90 + Math.random() * 60);
          return (
            <div key={i} className="particle animate-particle" style={{ '--tw-translate-x': `${px}px`, '--tw-translate-y': `${py}px`, width: `${4 + Math.random() * 3}px`, height: `${4 + Math.random() * 3}px`, left: '50%', top: '50%', animationDelay: `${Math.random() * 0.1}s` } as any} />
          );
        })}

        <div 
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
          className={`${cfg.sizeClass} rounded-full bubble-realistic flex flex-col items-center justify-center p-3 text-center cursor-grab active:cursor-grabbing transition-all duration-300 ${isPopping ? 'animate-shatter' : ''} ${cfg.bubbleClass}`}
          style={{ 
            transform: bubbleTransform,
            transition: isDragging ? 'none' : 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}
        >
          <div className="bubble-rainbow opacity-40" />
          <div className="bubble-highlight opacity-90" />
          
          <p className={`${cfg.textClass} font-semibold leading-tight break-words overflow-hidden px-2 z-20 select-none ${isPopping ? 'opacity-0' : 'opacity-100'}`}>
            {reminder.text}
          </p>
          {reminder.priority !== ReminderPriority.LOW && (
            <span className={`text-[11px] mt-3 px-3 py-1 backdrop-blur-md rounded-full uppercase tracking-[0.05em] font-bold z-20 select-none border ${cfg.tagClass} ${isPopping ? 'opacity-0' : 'opacity-100'}`}>
              {reminder.category}
            </span>
          )}

          <div className={`absolute inset-0 flex items-center justify-center gap-1.5 transition-opacity bg-white/5 backdrop-blur-xl rounded-full z-30 ${isPopping || isDragging ? 'opacity-0 pointer-events-none' : 'opacity-0 group-hover:opacity-100'}`}>
            {showSnoozeOptions ? (
              <div className="flex flex-col gap-1.5 items-center">
                <div className="flex gap-1.5">
                  {[5, 60].map(mins => (
                    <button key={mins} onMouseDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onSnooze(reminder.id, mins); }} className="w-10 h-10 bg-blue-600/60 text-white rounded-full text-[11px] font-bold flex items-center justify-center hover:bg-blue-700 transition-all border border-white/10 shadow-sm">{mins >= 60 ? '1h' : '5m'}</button>
                  ))}
                </div>
                <button onMouseDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); setShowSnoozeOptions(false); }} className="text-[10px] font-bold text-white/70 uppercase">Back</button>
              </div>
            ) : (
              <div className="flex gap-2" onMouseDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()}>
                <button onClick={() => triggerPop(onComplete, 'pop')} className="p-2.5 bg-green-500/60 text-white rounded-full hover:bg-green-600/80 border border-white/10 active:scale-90 shadow-sm"><Check size={16} /></button>
                <button onClick={() => setShowSnoozeOptions(true)} className="p-2.5 bg-blue-600/60 text-white rounded-full hover:bg-blue-700/80 border border-white/10 active:scale-90 shadow-sm"><Clock size={16} /></button>
                <button onClick={() => triggerPop(onDelete, 'shatter')} className="p-2.5 bg-rose-500/60 text-white rounded-full hover:bg-rose-600/80 border border-white/10 active:scale-90 shadow-sm"><Trash2 size={16} /></button>
              </div>
            )}
          </div>
        </div>

        <div className="absolute top-[20%] right-[25%] w-[4px] h-[4px] bg-white rounded-full blur-[1px] animate-bubble-blink shadow-[0_0_8px_white] z-30 pointer-events-none"></div>
      </div>
    </div>
  );
};

export default Bubble;