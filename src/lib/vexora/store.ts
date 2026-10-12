// App state (banks, pads, library, settings) persisted to localStorage; audio blobs live in IndexedDB.
import { useSyncExternalStore } from "react";
import { ALL_CODES, type LayoutId } from "./layout";

export type PlayMode = "once" | "loop";
export type Retrigger = "restart" | "stop" | "overlap" | "ignore";
export type LedEffect = "glow" | "pulse" | "border" | "flash";
export type WallFit = "fill" | "fit" | "center" | "zoom";

export interface Pad {
  name: string;
  fileId: string | null;
  color: string;
  playColor: string;
  volume: number;
  mode: PlayMode;
  retrigger: Retrigger;
  group: string;
  fadeIn: number;
  fadeOut: number;
  startAt: number;
  led: LedEffect;
  brightness: number;
  speed: number;
  size: 1 | 2;
}
export interface Bank {
  id: string;
  name: string;
  pads: Record<string, Pad>;
}
export interface LibItem {
  id: string;
  name: string;
  format: string;
  duration: number;
  size: number;
  folder: string;
  peaks: number[];
  missing?: boolean;
}
export interface Settings {
  master: number;
  muted: boolean;
  maxVoices: number;
  layout: LayoutId;
  view: "keyboard" | "grid";
  animations: boolean;
  reserved: string[];
  stopAllKey: string;
  nextBankKey: string;
  prevBankKey: string;
  latency: "interactive" | "balanced" | "playback";
  sinkId: string;
  gridCols: number;
  padScale: number;
  show: { fn: boolean; nav: boolean; numpad: boolean; library: boolean; editor: boolean };
  bankSwitchStops: boolean;
  globalShortcuts: boolean;
  wallpaper: { enabled: boolean; target: "full" | "header"; fit: WallFit; x: number; y: number; dim: number; panelOpacity: number };
}
export interface State {
  projectName: string;
  banks: Bank[];
  activeBank: string;
  library: LibItem[];
  settings: Settings;
}

export const PAD_COLORS = ["#39ff88", "#22d3ee", "#3b82f6", "#ff3b5c", "#ff8a1f", "#facc15", "#e879f9", "#f8fafc"];

export function defaultPad(i = 0): Pad {
  return {
    name: "", fileId: null, color: PAD_COLORS[i % 5], playColor: PAD_COLORS[i % 5], volume: 1, mode: "once",
    retrigger: "restart", group: "", fadeIn: 0, fadeOut: 0, startAt: 0, led: "glow", brightness: 1, speed: 0.8, size: 1,
  };
}
export function defaultSettings(layout: LayoutId = "abnt2"): Settings {
  return {
    master: 0.9, muted: false, maxVoices: 16, layout, view: "keyboard", animations: true, reserved: [],
    stopAllKey: "Escape", nextBankKey: "", prevBankKey: "", latency: "interactive", sinkId: "",
    gridCols: 8, padScale: 1, show: { fn: true, nav: true, numpad: true, library: true, editor: true },
    bankSwitchStops: false, globalShortcuts: false,
    wallpaper: { enabled: false, target: "full", fit: "fill", x: 50, y: 50, dim: 0.6, panelOpacity: 85 },
  };
}
export function defaultState(): State {
  return {
    projectName: "Meu Projeto",
    banks: ["A", "B", "C"].map((n) => ({ id: "bank-" + n, name: "Banco " + n, pads: {} })),
    activeBank: "bank-A",
    library: [],
    settings: defaultSettings(),
  };
}

// ---------- validation (used for localStorage, backups and imported project files) ----------
const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);
const num = (v: unknown, d: number, min: number, max: number) => (typeof v === "number" && isFinite(v) ? Math.min(max, Math.max(min, v)) : d);
const str = (v: unknown, d: string, max = 120) => (typeof v === "string" ? v.slice(0, max) : d);
const bool = (v: unknown, d: boolean) => (typeof v === "boolean" ? v : d);
const oneOf = <T,>(v: unknown, arr: readonly T[], d: T): T => (arr.includes(v as T) ? (v as T) : d);
const color = (v: unknown, d: string) => (typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) ? v : d);
export const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const code = (v: unknown) => (typeof v === "string" && ALL_CODES.has(v) ? v : "");

function vPad(r: unknown): Pad {
  const d = defaultPad();
  if (!isObj(r)) return d;
  return {
    name: str(r.name, ""), fileId: typeof r.fileId === "string" && ID_RE.test(r.fileId) ? r.fileId : null,
    color: color(r.color, d.color), playColor: color(r.playColor, d.playColor), volume: num(r.volume, 1, 0, 1.5),
    mode: oneOf(r.mode, ["once", "loop"] as const, "once"), retrigger: oneOf(r.retrigger, ["restart", "stop", "overlap", "ignore"] as const, "restart"),
    group: str(r.group, "", 20), fadeIn: num(r.fadeIn, 0, 0, 10), fadeOut: num(r.fadeOut, 0, 0, 10), startAt: num(r.startAt, 0, 0, 36000),
    led: oneOf(r.led, ["glow", "pulse", "border", "flash"] as const, "glow"), brightness: num(r.brightness, 1, 0.2, 2),
    speed: num(r.speed, 0.8, 0.2, 3), size: r.size === 2 ? 2 : 1,
  };
}

export function validateState(raw: unknown): State | null {
  if (!isObj(raw) || !Array.isArray(raw.banks)) return null;
  const banks: Bank[] = [];
  for (const b of raw.banks.slice(0, 64)) {
    if (!isObj(b) || typeof b.id !== "string" || !ID_RE.test(b.id)) continue;
    const pads: Record<string, Pad> = {};
    if (isObj(b.pads)) for (const [c, p] of Object.entries(b.pads)) if (ALL_CODES.has(c)) pads[c] = vPad(p);
    banks.push({ id: b.id, name: str(b.name, "Banco"), pads });
  }
  if (!banks.length) return null;
  const library: LibItem[] = Array.isArray(raw.library)
    ? raw.library.filter(isObj).filter((l) => typeof l.id === "string" && ID_RE.test(l.id)).map((l) => ({
        id: l.id as string, name: str(l.name, "áudio", 200), format: str(l.format, "", 10), duration: num(l.duration, 0, 0, 1e6),
        size: num(l.size, 0, 0, 1e12), folder: str(l.folder, "Arquivos avulsos", 300),
        peaks: Array.isArray(l.peaks) ? l.peaks.slice(0, 200).map((p) => num(p, 0, 0, 1)) : [],
      }))
    : [];
  const d = defaultSettings();
  const s = isObj(raw.settings) ? raw.settings : {};
  const show = isObj(s.show) ? s.show : {};
  const w = isObj(s.wallpaper) ? s.wallpaper : {};
  const settings: Settings = {
    master: num(s.master, d.master, 0, 1), muted: bool(s.muted, false), maxVoices: num(s.maxVoices, 16, 1, 64),
    layout: oneOf(s.layout, ["abnt2", "us"] as const, "abnt2"), view: oneOf(s.view, ["keyboard", "grid"] as const, "keyboard"),
    animations: bool(s.animations, true), reserved: Array.isArray(s.reserved) ? s.reserved.map(code).filter(Boolean) : [],
    stopAllKey: code(s.stopAllKey) || (s.stopAllKey === "" ? "" : "Escape"), nextBankKey: code(s.nextBankKey), prevBankKey: code(s.prevBankKey),
    latency: oneOf(s.latency, ["interactive", "balanced", "playback"] as const, "interactive"), sinkId: str(s.sinkId, "", 200),
    gridCols: num(s.gridCols, 8, 2, 16), padScale: num(s.padScale, 1, 0.6, 1.8),
    show: { fn: bool(show.fn, true), nav: bool(show.nav, true), numpad: bool(show.numpad, true), library: bool(show.library, true), editor: bool(show.editor, true) },
    bankSwitchStops: bool(s.bankSwitchStops, false), globalShortcuts: bool(s.globalShortcuts, false),
    wallpaper: {
      enabled: bool(w.enabled, false), target: oneOf(w.target, ["full", "header"] as const, "full"),
      fit: oneOf(w.fit, ["fill", "fit", "center", "zoom"] as const, "fill"), x: num(w.x, 50, 0, 100), y: num(w.y, 50, 0, 100),
      dim: num(w.dim, 0.6, 0, 0.95), panelOpacity: num(w.panelOpacity, 85, 20, 100),
    },
  };
  const activeBank = banks.some((b) => b.id === raw.activeBank) ? (raw.activeBank as string) : banks[0].id;
  return { projectName: str(raw.projectName, "Meu Projeto"), banks, activeBank, library, settings };
}

// ---------- store ----------
const KEY = "vexora:state:v1";
let state: State = defaultState();
const ls = new Set<() => void>();
let saveT: ReturnType<typeof setTimeout> | undefined;
let hydrated = false;

export const store = {
  get: () => state,
  set(fn: (s: State) => State) {
    state = fn(state);
    ls.forEach((l) => l());
    if (hydrated) {
      clearTimeout(saveT);
      saveT = setTimeout(() => {
        try {
          localStorage.setItem(KEY, JSON.stringify(state));
        } catch {
          /* quota */
        }
      }, 300);
    }
  },
  replace(s: State) {
    store.set(() => s);
  },
  subscribe(l: () => void) {
    ls.add(l);
    return () => {
      ls.delete(l);
    };
  },
  hydrate(fallbackLayout: LayoutId) {
    try {
      const raw = localStorage.getItem(KEY);
      const p = raw ? validateState(JSON.parse(raw)) : null;
      state = p ?? { ...defaultState(), settings: defaultSettings(fallbackLayout) };
    } catch {
      /* corrupt → defaults */
    }
    hydrated = true;
    ls.forEach((l) => l());
  },
};

export function useAppState(): State {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}

// ---------- actions ----------
export const activeBank = (s: State) => s.banks.find((b) => b.id === s.activeBank) ?? s.banks[0];
export function setSettings(p: Partial<Settings>) {
  store.set((s) => ({ ...s, settings: { ...s.settings, ...p } }));
}
export function setWallpaper(p: Partial<Settings["wallpaper"]>) {
  store.set((s) => ({ ...s, settings: { ...s.settings, wallpaper: { ...s.settings.wallpaper, ...p } } }));
}
export function updatePad(bankId: string, c: string, patch: Partial<Pad>) {
  store.set((s) => ({
    ...s,
    banks: s.banks.map((b) => {
      if (b.id !== bankId) return b;
      const idx = Object.keys(b.pads).length;
      return { ...b, pads: { ...b.pads, [c]: { ...(b.pads[c] ?? defaultPad(idx)), ...patch } } };
    }),
  }));
}
export function clearPad(bankId: string, c: string) {
  store.set((s) => ({
    ...s,
    banks: s.banks.map((b) => {
      if (b.id !== bankId) return b;
      const pads = { ...b.pads };
      delete pads[c];
      return { ...b, pads };
    }),
  }));
}
export function swapPads(bankId: string, a: string, b2: string) {
  store.set((s) => ({
    ...s,
    banks: s.banks.map((b) => {
      if (b.id !== bankId) return b;
      const pads = { ...b.pads };
      const pa = pads[a], pb = pads[b2];
      delete pads[a];
      delete pads[b2];
      if (pa) pads[b2] = pa;
      if (pb) pads[a] = pb;
      return { ...b, pads };
    }),
  }));
}
export function newId() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 20);
}
