import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Sparkles, X, LayoutGrid, Zap, Clock, Calendar, Hourglass } from 'lucide-react';
import { Reminder, ReminderPriority } from './types';
import { BUBBLE_COLORS, CATEGORIES } from './constants';
import Bubble from './components/Bubble';
import Widget from './components/Widget';
import { enhanceReminder, getSmartSuggestions } from './services/geminiService';
import { sounds } from './services/soundService';

interface PhysicsObject {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

const App: React.FC = () => {
  const [reminders, setReminders] = useState<Reminder[]>(() => {
    const saved = localStorage.getItem('bubble-reminders');
    return saved ? JSON.parse(saved) : [];
  });
  const [suggestions, setSuggestions] = useState<{text: string, category: string}[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isWidgetVisible, setIsWidgetVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingSuggestions, setFetchingSuggestions] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const physicsState = useRef<Record<string, PhysicsObject>>({});
  const [, setTick] = useState(0); 

  // Modal Form States
  const [text, setText] = useState('');
  const [category, setCategory] = useState('General');
  const [priority, setPriority] = useState<ReminderPriority>(ReminderPriority.MEDIUM);
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [duration, setDuration] = useState<number | undefined>(undefined); 

  const getRadiusByPriority = (priority: ReminderPriority) => {
    switch(priority) {
      case ReminderPriority.HIGH: return 100; // 67 * 1.5
      case ReminderPriority.LOW: return 60;  // 39 * 1.5
      default: return 75;                   // 50 * 1.5
    }
  };

  useEffect(() => {
    localStorage.setItem('bubble-reminders', JSON.stringify(reminders));
    
    const currentIds = reminders.map(r => r.id);
    const state = physicsState.current;

    Object.keys(state).forEach(id => {
      if (!currentIds.includes(id)) delete state[id];
    });

    reminders.forEach(r => {
      const radius = getRadiusByPriority(r.priority);
      if (!state[r.id]) {
        state[r.id] = {
          id: r.id,
          x: r.position?.x || 150 + Math.random() * (window.innerWidth - 300),
          y: r.position?.y || 150 + Math.random() * (window.innerHeight - 300),
          vx: (Math.random() - 0.5) * (r.priority === ReminderPriority.HIGH ? 4 : 2),
          vy: (Math.random() - 0.5) * (r.priority === ReminderPriority.HIGH ? 4 : 2),
          radius: radius 
        };
      } else {
        state[r.id].radius = radius;
      }
    });
  }, [reminders]);

  const updatePhysics = useCallback(() => {
    const state = physicsState.current;
    const ids = Object.keys(state);
    const width = window.innerWidth;
    const height = window.innerHeight;
    const DAMPING = 0.985;
    const BOUNCE = 0.6;

    ids.forEach(id => {
      const p = state[id];
      if (id === draggingId) return;

      const reminder = reminders.find(r => r.id === id);
      const priority = reminder?.priority || ReminderPriority.MEDIUM;
      const energy = priority === ReminderPriority.HIGH ? 0.15 : priority === ReminderPriority.LOW ? 0.02 : 0.05;

      p.vx += (Math.random() - 0.5) * energy;
      p.vy += (Math.random() - 0.5) * energy;

      p.x += p.vx;
      p.y += p.vy;

      p.vx *= DAMPING;
      p.vy *= DAMPING;

      if (p.x < p.radius) { p.x = p.radius; p.vx = Math.abs(p.vx) * BOUNCE; }
      if (p.x > width - p.radius) { p.x = width - p.radius; p.vx = -Math.abs(p.vx) * BOUNCE; }
      if (p.y < p.radius) { p.y = p.radius; p.vy = Math.abs(p.vy) * BOUNCE; }
      if (p.y > height - p.radius) { p.y = height - p.radius; p.vy = -Math.abs(p.vy) * BOUNCE; }
    });

    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const b1 = state[ids[i]];
        const b2 = state[ids[j]];
        
        const dx = b2.x - b1.x;
        const dy = b2.y - b1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = b1.radius + b2.radius;

        if (dist < minDist) {
          const angle = Math.atan2(dy, dx);
          const tx = b1.x + Math.cos(angle) * minDist;
          const ty = b1.y + Math.sin(angle) * minDist;
          const ax = (tx - b2.x) * 0.2;
          const ay = (ty - b2.y) * 0.2;

          if (ids[i] !== draggingId) {
            b1.vx -= ax;
            b1.vy -= ay;
          }
          if (ids[j] !== draggingId) {
            b2.vx += ax;
            b2.vy += ay;
          }
        }
      }
    }
    
    setTick(t => t + 1);
  }, [draggingId, reminders]);

  useEffect(() => {
    let raf: number;
    const loop = () => {
      updatePhysics();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [updatePhysics]);

  useEffect(() => {
    loadSuggestions();
    const refreshInterval = setInterval(loadSuggestions, 15 * 60 * 1000);
    const timeInterval = setInterval(() => setCurrentTime(Date.now()), 1000); 
    return () => {
      clearInterval(refreshInterval);
      clearInterval(timeInterval);
    };
  }, []);

  const loadSuggestions = async () => {
    setFetchingSuggestions(true);
    const data = await getSmartSuggestions();
    setSuggestions(data);
    setFetchingSuggestions(false);
  };

  const handleAddReminder = async (e?: React.FormEvent, customText?: string, customCategory?: string) => {
    if (e) e.preventDefault();
    const finalSubmitedText = customText || text;
    if (!finalSubmitedText.trim()) return;

    if (customText) {
      setSuggestions(prev => prev.filter(s => s.text !== customText));
    }

    const radius = getRadiusByPriority(priority);
    const randomPos = {
      x: radius + Math.random() * (window.innerWidth - radius * 2),
      y: radius + Math.random() * (window.innerHeight - radius * 2)
    };

    const newId = crypto.randomUUID();
    sounds.playCreate();

    physicsState.current[newId] = {
      id: newId,
      x: randomPos.x,
      y: randomPos.y,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 6,
      radius: radius
    };

    const scheduledTimestamp = new Date(`${date}T${time}`).getTime();

    const newReminder: Reminder = {
      id: newId,
      text: finalSubmitedText,
      category: customCategory || category,
      priority: priority,
      createdAt: Date.now(),
      scheduledAt: scheduledTimestamp,
      duration: duration,
      color: BUBBLE_COLORS[Math.floor(Math.random() * BUBBLE_COLORS.length)],
      isCompleted: false,
      position: randomPos,
    };

    setReminders(prev => [...prev, newReminder]);
    resetForm();

    if (!customText && finalSubmitedText.length > 5) {
      setLoading(true);
      const enhanced = await enhanceReminder(finalSubmitedText);
      if (enhanced) {
        setReminders(prev => prev.map(r => r.id === newId ? {
          ...r,
          category: enhanced.category,
          priority: enhanced.priority as ReminderPriority,
          color: enhanced.color
        } : r));
      }
      setLoading(false);
    }
  };

  const handleZapClick = async () => {
    sounds.playDragStart();
    loadSuggestions();
  };

  const handlePositionUpdate = (id: string, x: number, y: number, isDragging: boolean) => {
    if (isDragging) {
      setDraggingId(id);
      if (physicsState.current[id]) {
        const p = physicsState.current[id];
        p.vx = (x - p.x); 
        p.vy = (y - p.y);
        p.x = x;
        p.y = y;
      }
    } else {
      setDraggingId(null);
      setReminders(prev => prev.map(r => r.id === id ? { ...r, position: { x, y } } : r));
    }
  };

  const popReminder = (id: string) => setReminders(prev => prev.filter(r => r.id !== id));
  const snoozeReminder = (id: string, durationMinutes: number) => {
    setReminders(prev => prev.map(r => 
      r.id === id ? { ...r, snoozedUntil: Date.now() + durationMinutes * 60000 } : r
    ));
  };
  const deleteReminder = (id: string) => setReminders(prev => prev.filter(r => r.id !== id));

  const resetForm = () => {
    setText('');
    setCategory('General');
    setPriority(ReminderPriority.MEDIUM);
    setIsModalOpen(false);
    setDate(new Date().toISOString().split('T')[0]);
    const now = new Date();
    setTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    setDuration(undefined); 
  };

  const activeReminders = reminders.filter(r => {
    const isSnoozed = r.snoozedUntil && currentTime < r.snoozedUntil;
    if (isSnoozed) return false;
    if (r.scheduledAt && currentTime < r.scheduledAt) return false;
    if (r.scheduledAt && r.duration) {
      const expirationTime = r.scheduledAt + (r.duration * 60000);
      if (currentTime > expirationTime) return false;
    }
    return true;
  });

  const filteredReminders = activeCategory === 'All' 
    ? activeReminders 
    : activeReminders.filter(r => r.category === activeCategory);

  return (
    <div className="min-h-screen bg-transparent select-none overflow-hidden relative font-fredoka text-slate-100">
      <header className="fixed top-0 left-0 right-0 p-0 z-[60] pointer-events-none">
        <div className="w-full flex flex-col p-6 gap-3">
          <div className="flex justify-between items-start pointer-events-auto">
            <div className="flex flex-col group gap-0.5">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-medium text-blue-400/80 drop-shadow-sm transition-colors hover:text-blue-500">
                  Bubble
                </h1>
                <div 
                  className="relative w-6 h-6 shrink-0 transition-all duration-700 group-hover:scale-125 group-active:scale-90 cursor-pointer pointer-events-auto"
                  onClick={() => {
                    sounds.playPop();
                    setIsModalOpen(true);
                  }}
                >
                  <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-blue-500/10 to-white/5 blur-[2px]"></div>
                  <div className="absolute inset-0 rounded-full border border-white/20 shadow-sm shadow-blue-500/5 overflow-hidden"
                    style={{
                      background: 'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.05) 0%, rgba(59,130,246,0.1) 45%, rgba(37,99,235,0.2) 100%)',
                      backdropFilter: 'blur(2px)'
                    }}>
                  </div>
                </div>
              </div>
              {/* Tagline: Aligned 'k' with 'B', normal weight, white color, discreet size */}
              <p className="text-[10px] text-white/70 font-normal tracking-tight animate-in fade-in slide-in-from-left-2 duration-1000 pl-0.5">
                keep your thoughts floating.
              </p>
            </div>
            
            <button 
              onClick={() => setIsWidgetVisible(!isWidgetVisible)} 
              className={`p-2 rounded-full backdrop-blur-md transition-all border border-white/5 shadow-sm pointer-events-auto ${isWidgetVisible ? 'bg-blue-600/20 text-blue-300' : 'bg-white/5 text-gray-500/50'}`}
            >
              <LayoutGrid size={16} />
            </button>
          </div>

          <div className="flex items-center gap-2 pointer-events-auto w-full">
            <button 
              onClick={handleZapClick}
              className={`w-7 h-7 shrink-0 flex items-center justify-center rounded-full transition-all border shadow-sm ${fetchingSuggestions ? 'animate-pulse' : ''} bg-white/5 backdrop-blur-md text-blue-300/40 border-white/5 hover:bg-white/10 hover:scale-105 active:scale-95`}
            >
              <Zap size={12} fill="currentColor" />
            </button>

            <div className="flex gap-2 flex-1 overflow-x-auto no-scrollbar py-0.5">
              {!fetchingSuggestions && suggestions.slice(0, 3).map((s, i) => (
                <button 
                  key={i} 
                  onClick={() => handleAddReminder(undefined, s.text, s.category)} 
                  className="shrink-0 px-3 h-[24px] rounded-full border border-white/5 text-[11px] font-medium text-blue-100/60 backdrop-blur-md bg-white/5 hover:bg-white/10 transition-all flex items-center justify-center gap-1.5 group whitespace-nowrap animate-in slide-in-from-left-2 duration-300"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <Sparkles size={10} className="shrink-0 group-hover:rotate-12 transition-transform opacity-40 text-blue-300" /> 
                  <span>{s.text}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Footer bar miniaturized and more transparent */}
      <footer className="fixed bottom-8 left-0 right-0 px-6 z-[60] pointer-events-none flex justify-center items-center">
        <div className="flex gap-1 p-1 bg-white/5 backdrop-blur-2xl rounded-full border border-white/5 shadow-xl items-center pointer-events-auto max-w-full overflow-hidden">
          <div className="flex gap-0.5 overflow-x-auto no-scrollbar py-0.5 px-1.5">
            {['All', ...CATEGORIES].map(cat => (
              <button 
                key={cat} 
                onClick={() => setActiveCategory(cat)} 
                className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${activeCategory === cat ? 'bg-blue-600/50 text-white' : 'text-gray-500/60 hover:text-blue-300/60'}`}
              >
                {cat}
              </button>
            ))}
          </div>
          <button 
            onClick={() => setIsModalOpen(true)} 
            className="w-8 h-8 flex items-center justify-center bg-blue-600/60 text-white rounded-full shadow-lg hover:scale-105 transition-all active:scale-95 border border-white/10 shrink-0 ml-1"
          >
            <Plus size={16} />
          </button>
        </div>
      </footer>

      <main className="absolute inset-0 w-full h-full pointer-events-none z-10">
        {filteredReminders.map((r, i) => (
          <Bubble 
            key={r.id} 
            reminder={r}
            physicsPos={physicsState.current[r.id]}
            onComplete={popReminder} 
            onDelete={deleteReminder} 
            onSnooze={snoozeReminder}
            onPositionUpdate={handlePositionUpdate}
            isDragging={draggingId === r.id}
            index={i} 
          />
        ))}
      </main>

      {isWidgetVisible && <Widget reminders={reminders} onComplete={popReminder} onDelete={deleteReminder} onClose={() => setIsWidgetVisible(false)} />}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xl flex items-end sm:items-center justify-center z-[100] p-6 sm:p-6 animate-in fade-in duration-500">
          <div className="bg-[#0f172a]/95 backdrop-blur-3xl rounded-[40px] w-full max-w-[400px] shadow-[0_30px_60px_rgba(0,0,0,0.6)] overflow-hidden animate-in slide-in-from-bottom-10 sm:zoom-in duration-300 border border-white/10">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-[13px] font-bold text-gray-500 tracking-[0.15em] uppercase">New Bubble</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white transition-colors p-2"><X size={18} /></button>
              </div>
              
              <form onSubmit={handleAddReminder} className="space-y-6">
                <div className="relative">
                  <input 
                    autoFocus 
                    type="text" 
                    value={text} 
                    onChange={(e) => setText(e.target.value)} 
                    placeholder="Type..." 
                    className="w-full px-0 py-1 bg-transparent border-b border-white/5 focus:border-blue-500/30 focus:outline-none transition-all text-xl font-medium text-gray-100 placeholder:text-gray-700" 
                  />
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Context</label>
                      <select 
                        value={category} 
                        onChange={(e) => setCategory(e.target.value)} 
                        className="w-full px-3 py-2 bg-white/5 rounded-xl border border-white/5 text-gray-400 text-[13px] outline-none"
                      >
                        {CATEGORIES.map(c => <option key={c} value={c} className="bg-[#0f172a]">{c}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Urgency</label>
                      <div className="flex gap-0.5 p-0.5 bg-white/5 rounded-xl border border-white/5 h-[36px]">
                        {Object.values(ReminderPriority).map(p => (
                          <button 
                            key={p} 
                            type="button" 
                            onClick={() => setPriority(p)} 
                            className={`flex-1 rounded-lg text-[10px] font-bold transition-all ${priority === p ? 'bg-blue-600/50 text-white' : 'text-gray-600'}`}
                          >
                            {p[0]}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Day</label>
                      <input 
                        type="date" 
                        value={date} 
                        onChange={(e) => setDate(e.target.value)} 
                        className="w-full px-3 py-2 bg-white/5 rounded-xl border border-white/5 text-gray-400 text-[13px] outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Time</label>
                      <input 
                        type="time" 
                        value={time} 
                        onChange={(e) => setTime(e.target.value)} 
                        className="w-full px-3 py-2 bg-white/5 rounded-xl border border-white/5 text-gray-400 text-[13px] outline-none"
                      />
                    </div>
                  </div>
                </div>

                <button 
                  disabled={loading} 
                  type="submit" 
                  className="w-full py-3.5 bg-blue-600/70 text-white rounded-2xl font-bold shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 transition-all active:scale-95 text-sm"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Plus size={16} strokeWidth={3} />
                      <span>Create Bubble</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;