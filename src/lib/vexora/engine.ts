// Web Audio engine: real voices drive every LED, meter and progress bar in the UI.
import { getFile } from "./db";

export interface PlayOpts {
  key: string; // `${bankId}:${code}` or "preview"
  fileId: string;
  name: string;
  volume: number;
  loop: boolean;
  fadeIn: number;
  startAt: number;
  group: string;
}
export interface Voice extends PlayOpts {
  id: number;
  src: AudioBufferSourceNode;
  gain: GainNode;
  ctxStart: number;
  duration: number;
}

class AudioEngine {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private aL!: AnalyserNode;
  private aR!: AnalyserNode;
  private buf = new Float32Array(512);
  buffers = new Map<string, AudioBuffer>();
  voices = new Map<number, Voice>();
  private ls = new Set<() => void>();
  private version = 0;
  private nid = 1;
  maxVoices = 16;
  private vol = 1;
  private muted = false;
  paused = false;
  latency: AudioContextLatencyCategory = "interactive";

  private emit() {
    this.version++;
    this.ls.forEach((l) => l());
  }
  subscribe = (l: () => void) => {
    this.ls.add(l);
    return () => {
      this.ls.delete(l);
    };
  };
  getVersion = () => this.version;

  context(): AudioContext {
    if (!this.ctx) {
      const ctx = new AudioContext({ latencyHint: this.latency });
      this.master = ctx.createGain();
      this.master.channelCount = 2;
      this.master.channelCountMode = "explicit";
      this.master.channelInterpretation = "speakers";
      const split = ctx.createChannelSplitter(2);
      this.aL = ctx.createAnalyser();
      this.aR = ctx.createAnalyser();
      this.aL.fftSize = this.aR.fftSize = 512;
      this.master.connect(ctx.destination);
      this.master.connect(split);
      split.connect(this.aL, 0);
      split.connect(this.aR, 1);
      this.ctx = ctx;
      this.applyMaster();
    }
    if (this.ctx.state === "suspended" && !this.paused) void this.ctx.resume();
    return this.ctx;
  }

  decode(data: ArrayBuffer) {
    return this.context().decodeAudioData(data);
  }

  async load(fileId: string): Promise<AudioBuffer> {
    const c = this.buffers.get(fileId);
    if (c) return c;
    const f = await getFile(fileId);
    if (!f) throw new Error("Arquivo não encontrado no armazenamento local");
    const b = await this.decode(await f.blob.arrayBuffer());
    this.buffers.set(fileId, b);
    return b;
  }

  play(buffer: AudioBuffer, o: PlayOpts): number {
    const ctx = this.context();
    if (this.paused) this.resume();
    if (o.group) for (const v of [...this.voices.values()]) if (v.group === o.group && v.key !== o.key) this.stopVoice(v.id, 0.05);
    while (this.voices.size >= this.maxVoices) {
      const oldest = this.voices.keys().next().value;
      if (oldest === undefined) break;
      this.stopVoice(oldest, 0);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const gain = ctx.createGain();
    const t = ctx.currentTime;
    const offset = Math.max(0, Math.min(o.startAt, buffer.duration - 0.01));
    if (o.fadeIn > 0) {
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(o.volume, t + o.fadeIn);
    } else gain.gain.value = o.volume;
    src.loop = o.loop;
    if (o.loop) {
      src.loopStart = offset;
      src.loopEnd = buffer.duration;
    }
    src.connect(gain).connect(this.master);
    src.start(t, offset);
    const id = this.nid++;
    this.voices.set(id, { ...o, startAt: offset, id, src, gain, ctxStart: t, duration: buffer.duration });
    src.onended = () => {
      gain.disconnect();
      if (this.voices.get(id)?.src === src) {
        this.voices.delete(id);
        this.emit();
      }
    };
    this.emit();
    return id;
  }

  stopVoice(id: number, fade = 0) {
    const v = this.voices.get(id);
    if (!v || !this.ctx) return;
    this.voices.delete(id);
    const now = this.ctx.currentTime;
    try {
      if (fade > 0 && !this.paused) {
        v.gain.gain.cancelScheduledValues(now);
        v.gain.gain.setValueAtTime(v.gain.gain.value, now);
        v.gain.gain.linearRampToValueAtTime(0, now + fade);
        v.src.stop(now + fade);
      } else v.src.stop();
    } catch {
      /* already stopped */
    }
    this.emit();
  }
  stopKey(key: string, fade = 0) {
    for (const v of [...this.voices.values()]) if (v.key === key) this.stopVoice(v.id, fade);
  }
  stopAll(fade = 0) {
    for (const id of [...this.voices.keys()]) this.stopVoice(id, fade);
    if (this.paused) this.resume();
  }
  isPlaying(key: string) {
    for (const v of this.voices.values()) if (v.key === key) return true;
    return false;
  }
  latestVoice(key: string): Voice | undefined {
    let r: Voice | undefined;
    for (const v of this.voices.values()) if (v.key === key) r = v;
    return r;
  }
  pause() {
    if (!this.ctx || this.voices.size === 0) return;
    void this.ctx.suspend();
    this.paused = true;
    this.emit();
  }
  resume() {
    if (!this.ctx) return;
    void this.ctx.resume();
    this.paused = false;
    this.emit();
  }
  setMaster(vol: number, muted: boolean) {
    this.vol = vol;
    this.muted = muted;
    this.applyMaster();
  }
  private applyMaster() {
    if (this.ctx) this.master.gain.setTargetAtTime(this.muted ? 0 : this.vol, this.ctx.currentTime, 0.01);
  }
  elapsed(v: Voice): number {
    if (!this.ctx) return 0;
    const t = this.ctx.currentTime - v.ctxStart;
    if (v.loop) {
      const span = v.duration - v.startAt;
      return span > 0 ? v.startAt + (t % span) : 0;
    }
    return Math.min(v.duration, v.startAt + t);
  }
  levels(): [number, number] {
    if (!this.ctx) return [0, 0];
    const peak = (a: AnalyserNode) => {
      a.getFloatTimeDomainData(this.buf);
      let m = 0;
      for (let i = 0; i < this.buf.length; i++) m = Math.max(m, Math.abs(this.buf[i]));
      return m;
    };
    return [peak(this.aL), peak(this.aR)];
  }
  canSetSink() {
    return typeof AudioContext !== "undefined" && "setSinkId" in AudioContext.prototype;
  }
  async setSink(id: string) {
    const ctx = this.context() as AudioContext & { setSinkId?: (id: string) => Promise<void> };
    await ctx.setSinkId?.(id);
  }
}

export const engine = new AudioEngine();

export function computePeaks(b: AudioBuffer, n = 120): number[] {
  const d = b.getChannelData(0);
  const step = Math.max(1, Math.floor(d.length / n));
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    let m = 0;
    for (let j = i * step; j < Math.min(d.length, (i + 1) * step); j += 8) m = Math.max(m, Math.abs(d[j]));
    out.push(Math.round(m * 100) / 100);
  }
  return out;
}

export function fmtTime(s: number) {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, "0")}`;
}
