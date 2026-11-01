/* soundManager.ts
 * High-performance Web Audio API sound effects engine.
 * - Uses .sfx binary assets decoded in memory to prevent IDM interception
 * - AudioBufferSourceNode for zero-latency concurrent playback
 * - Graceful fallback and volume management
 */

export class SoundManager {
  private static instance: SoundManager | null = null;
  private audioCtx: AudioContext | null = null;
  private audioBuffers: Map<string, AudioBuffer> = new Map();
  private enabled: boolean = true;
  private volume: number = 0.8;
  private isPreloaded: boolean = false;
  private baseUrl: string = './assets/sounds';

  private soundFiles: Record<string, string> = {
    checkerMove: 'checkermove.sfx',
    diceRoll1: 'diceroll01.sfx',
    diceRoll2: 'diceroll02.sfx',
    diceRoll3: 'diceroll03.sfx',
    newGame: 'newgame.sfx',
    victory: 'victory.sfx',
    panelDock: 'paneldock.sfx',
    placementStep: 'placement_step.sfx',
  };

  static shared(): SoundManager {
    if (!this.instance) {
      this.instance = new SoundManager();
    }
    return this.instance;
  }

  constructor() {
    this.initAudioContext();
  }

  setBaseUrl(url: string): void {
    this.baseUrl = url.replace(/\/+$/, '');
  }

  private initAudioContext(): void {
    if (typeof window === 'undefined') return;
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      this.audioCtx = new AudioContextClass();
    }
  }

  async preloadAll(): Promise<void> {
    if (this.isPreloaded || typeof window === 'undefined') return;
    this.initAudioContext();

    const tasks = Object.entries(this.soundFiles).map(async ([key, fileName]) => {
      try {
        const url = `${this.baseUrl}/${fileName}`;
        const res = await fetch(url);
        if (!res.ok) return;
        const arrayBuffer = await res.arrayBuffer();
        if (this.audioCtx) {
          const audioBuffer = await this.audioCtx.decodeAudioData(arrayBuffer);
          this.audioBuffers.set(key, audioBuffer);
        }
      } catch {
        // Silently catch decoding or fetch errors during offline/loading
      }
    });

    await Promise.allSettled(tasks);
    this.isPreloaded = true;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  private playBuffer(key: string): void {
    if (!this.enabled || typeof window === 'undefined') return;

    if (!this.audioCtx) {
      this.initAudioContext();
    }

    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }

    const buffer = this.audioBuffers.get(key);
    if (!buffer || !this.audioCtx) return;

    try {
      const source = this.audioCtx.createBufferSource();
      source.buffer = buffer;

      const gainNode = this.audioCtx.createGain();
      gainNode.gain.value = this.volume;

      source.connect(gainNode);
      gainNode.connect(this.audioCtx.destination);
      source.start(0);
    } catch {
      // ignore
    }
  }

  playMove(): void {
    this.playBuffer('checkerMove');
  }

  playStep(): void {
    this.playBuffer('placementStep');
  }

  playDiceRoll(): void {
    const keys = ['diceRoll1', 'diceRoll2', 'diceRoll3'];
    const pick = keys[Math.floor(Math.random() * keys.length)];
    this.playBuffer(pick);
  }

  playVictory(): void {
    this.playBuffer('victory');
  }

  playNewGame(): void {
    this.playBuffer('newGame');
  }

  playPanel(): void {
    this.playBuffer('panelDock');
  }
}
