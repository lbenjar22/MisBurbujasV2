
class SoundService {
  private ctx: AudioContext | null = null;

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private createGain(startTime: number, duration: number, startVolume: number) {
    const gain = this.ctx!.createGain();
    gain.gain.setValueAtTime(startVolume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    gain.connect(this.ctx!.destination);
    return gain;
  }

  playCreate() {
    this.init();
    const now = this.ctx!.currentTime;
    const osc = this.ctx!.createOscillator();
    const gain = this.createGain(now, 0.4, 0.1);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.3);
    
    osc.connect(gain);
    osc.start();
    osc.stop(now + 0.4);
  }

  playPop() {
    this.init();
    const now = this.ctx!.currentTime;
    const osc = this.ctx!.createOscillator();
    
    // Creamos un gain con un ataque muy rápido y decaimiento suave para el efecto "PLOP"
    const gain = this.ctx!.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    gain.connect(this.ctx!.destination);
    
    osc.type = 'sine';
    // Un "PLOP" clásico tiene un barrido descendente de frecuencia media a baja
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.12);
    
    osc.connect(gain);
    osc.start();
    osc.stop(now + 0.2);
  }

  playShatter() {
    this.init();
    const now = this.ctx!.currentTime;
    const osc = this.ctx!.createOscillator();
    const gain = this.createGain(now, 0.3, 0.1);
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.2);
    
    osc.connect(gain);
    osc.start();
    osc.stop(now + 0.3);
  }

  playDragStart() {
    this.init();
    const now = this.ctx!.currentTime;
    const osc = this.ctx!.createOscillator();
    const gain = this.createGain(now, 0.05, 0.05);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1500, now);
    
    osc.connect(gain);
    osc.start();
    osc.stop(now + 0.05);
  }

  playDragEnd() {
    this.init();
    const now = this.ctx!.currentTime;
    const osc = this.ctx!.createOscillator();
    const gain = this.createGain(now, 0.1, 0.05);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.08);
    
    osc.connect(gain);
    osc.start();
    osc.stop(now + 0.1);
  }
}

export const sounds = new SoundService();
