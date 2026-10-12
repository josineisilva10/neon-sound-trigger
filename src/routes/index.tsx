import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Toaster } from "sonner";
import { Maximize2, X, Settings as Cog, Play, Square, Repeat2, Scissors, Gauge, Volume2, SlidersHorizontal, Star, Music2 } from "lucide-react";
import { engine } from "@/lib/vexora/engine";
import { getFile, requestPersistence } from "@/lib/vexora/db";
import { detectLayout } from "@/lib/vexora/layout";
import { activeBank, setSettings, store, updatePad, useAppState } from "@/lib/vexora/store";
import { checkLibrary, preloadBank, switchBank, trigger, stopPad, trimPadAudio, normalizePadAudio } from "@/lib/vexora/actions";
import { isDesktop, registerGlobalShortcuts, unregisterGlobalShortcuts, windowControl } from "@/lib/vexora/desktop";
import { KeyboardPanel } from "@/components/vexora/Keyboard";
import { PadEditor } from "@/components/vexora/PadEditor";
import { SidePanel } from "@/components/vexora/SidePanel";
import { SettingsDialog } from "@/components/vexora/Settings";
import { fmtTime } from "@/lib/vexora/engine";
import { Waveform } from "@/components/vexora/Meters";

export const Route = createFileRoute("/")({
  head: () => ({
    links: [{ rel: "icon", type: "image/svg+xml", href: "/vexora-logo.svg" }],
    meta: [
      { title: "VEXORA SAMPLER — Disparo de áudio para DJs" },
      { name: "description", content: "VEXORA SAMPLER: sampler profissional para DJs com bancos, vinhetas, locuções, efeitos e papel de parede personalizado." },
      { property: "og:title", content: "VEXORA SAMPLER" },
      { property: "og:description", content: "VEXORA — painel profissional para disparo de vinhetas, locuções e efeitos para DJs." },
    ],
  }),
  component: App,
});

const FIT = { fill: "cover", fit: "contain", center: "auto", zoom: "160%" } as const;

function AudioInfoPanel({ code, ledActive, onToggleLed }: { code: string | null; ledActive: boolean; onToggleLed: () => void }) {
  const s = useAppState();
  const bank = activeBank(s);
  const pad = code ? bank.pads[code] : undefined;
  const item = pad?.fileId ? s.library.find((l) => l.id === pad.fileId) : undefined;
  const [favorite, setFavorite] = useState(false);
  const [showTrim, setShowTrim] = useState(false);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);

  const toggleLoop = () => {
    if (code) updatePad(bank.id, code, { mode: pad?.mode === "loop" ? "once" : "loop" });
  };
  const cycleSpeed = () => {
    if (!code) return;
    const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
    const current = pad?.speed ?? 1;
    const next = speeds.find((v) => v > current + 0.001) ?? speeds[0];
    updatePad(bank.id, code, { speed: next });
  };

  const actions = [
    { label: "CORTAR", icon: Scissors, color: "text-neon-cyan", border: "border-neon-cyan/50", onClick: () => { setTrimStart(0); setTrimEnd(item?.duration ?? 0); setShowTrim(true); }, title: "Selecionar trecho para cortar" },
    { label: pad?.mode === "loop" ? "REPETIR: ON" : "REPETIR", icon: Repeat2, color: "text-neon-green", border: "border-neon-green/50", onClick: toggleLoop, title: "Alternar repetição" },
    { label: `VELOC. ${(pad?.speed ?? 1).toFixed(2)}×`, icon: Gauge, color: "text-neon-orange", border: "border-neon-orange/50", onClick: cycleSpeed, title: "Alterar velocidade do pad" },
    { label: "NORMALIZAR", icon: Volume2, color: "text-neon-purple", border: "border-neon-purple/50", onClick: () => { if (code) void normalizePadAudio(bank.id, code); }, title: "Normalizar volume do áudio" },
    { label: ledActive ? "LED ATIVO: ON" : "LED ATIVO", icon: SlidersHorizontal, color: "text-neon-cyan", border: "border-neon-cyan/50", onClick: onToggleLed, title: "Ativar visualizador LED durante a reprodução" },
    { label: favorite ? "FAVORITO ★" : "FAVORITO", icon: Star, color: favorite ? "text-neon-orange" : "text-neon-red", border: "border-neon-red/50", onClick: () => setFavorite(!favorite), title: "Marcar como favorito" },
  ];

  return (
    <div className="panel min-w-0 space-y-0.5 p-0.5">
      <div className="flex items-center justify-between gap-1">
        <h2 className="font-display text-[10px] font-bold tracking-wide text-neon-cyan">INFORMAÇÕES DO ÁUDIO</h2>
        <span className="text-[8px] text-muted-foreground">{item ? "SELECIONADO" : "SEM ÁUDIO"}</span>
      </div>
      {!item ? (
        <div className="flex min-h-16 items-center gap-2 rounded-md border border-border bg-background/40 p-2">
          <Music2 className="size-5 text-neon-cyan" />
          <p className="text-[10px] text-muted-foreground">{code ? "Esta tecla ainda não tem áudio." : "Selecione uma tecla com áudio para ver os detalhes."}</p>
        </div>
      ) : (
        <>
          <div className="flex min-w-0 items-center gap-1 rounded-md border border-border bg-background/40 p-0.5">
            <Music2 className="size-4 shrink-0 text-neon-cyan" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[10px] font-semibold">{pad?.name || item.name}</div>
              <div className="text-[8px] text-muted-foreground">{fmtTime(item.duration)} · {item.format} · {(item.size / (1024 * 1024)).toFixed(1)} MB</div>
            </div>
            <button className="btn !p-1" title="Tocar áudio" onClick={() => code && trigger(bank.id, code)}><Play className="size-3" /></button>
            <button className="btn !p-1" title="Parar áudio" onClick={() => code && stopPad(bank.id, code)}><Square className="size-3" /></button>
          </div>
          <div className="rounded-md border border-neon-cyan/30 bg-background/60 px-1 py-0.5">
            <Waveform peaks={item.peaks} color={pad?.color || "#22d3ee"} height={20} />
          </div>
          <div className="grid grid-cols-3 gap-1 text-[7px]">
            <div className="rounded border border-border bg-background/40 p-1"><span className="block text-muted-foreground">FORMATO</span><strong>{item.format}</strong></div>
            <div className="rounded border border-border bg-background/40 p-1"><span className="block text-muted-foreground">DURAÇÃO</span><strong>{fmtTime(item.duration)}</strong></div>
            <div className="rounded border border-border bg-background/40 p-1"><span className="block text-muted-foreground">TAMANHO</span><strong>{(item.size / (1024 * 1024)).toFixed(1)} MB</strong></div>
          </div>
          {showTrim && (
            <div className="space-y-2 rounded-md border border-neon-cyan/50 bg-background/80 p-2">
              <div className="flex items-center justify-between gap-2">
                <strong className="text-[10px] text-neon-cyan">CORTAR ÁUDIO</strong>
                <button className="btn !px-2 !py-1 text-[9px]" onClick={() => setShowTrim(false)}>Fechar</button>
              </div>
              <div className="flex items-center justify-between gap-2 text-[8px] text-muted-foreground">
                <span>{pad?.name || item.name}</span><span>{fmtTime(item.duration)} · {item.format}</span>
              </div>
              <div className="relative overflow-hidden rounded-md border border-border bg-[#080d1b] p-2">
                <div className="mb-1 flex justify-between font-mono text-[8px] text-slate-400"><span>00:00</span><span>{fmtTime(item.duration / 2)}</span><span>{fmtTime(item.duration)}</span></div>
                <div className="relative flex h-20 items-center gap-[1px] overflow-hidden rounded border border-slate-700/70">
                  {item.peaks.map((peak, i) => {
                    const t = (i / Math.max(1, item.peaks.length - 1)) * item.duration;
                    const selectedPeak = t >= trimStart && t <= trimEnd;
                    return <div key={i} className="flex-1 rounded-sm" style={{height: `${Math.max(4, peak * 90)}%`,background: selectedPeak ? "#22d3ee" : "#64748b",opacity:selectedPeak ? 0.95 : 0.4}} />;
                  })}
                  <div className="pointer-events-none absolute inset-y-0 border-x-2 border-cyan-300 bg-cyan-400/15" style={{left:`${(trimStart / Math.max(item.duration,0.01))*100}%`,width:`${Math.max(0,(trimEnd-trimStart)/Math.max(item.duration,0.01)*100)}%`}} />
                </div>
                <div className="mt-1 flex justify-between text-[8px] text-cyan-300"><span>Início: {trimStart.toFixed(2)} s</span><span>Fim: {trimEnd.toFixed(2)} s</span></div>
              </div>
              <label className="block text-[9px]">Ponto inicial
                <input aria-label="Ponto inicial do corte" className="w-full accent-cyan-400" type="range" min={0} max={Math.max(0, item.duration - 0.05)} step={0.01} value={Math.min(trimStart, Math.max(0, item.duration - 0.05))} onChange={(e) => setTrimStart(Math.min(+e.target.value, trimEnd - 0.05))} />
              </label>
              <label className="block text-[9px]">Ponto final
                <input aria-label="Ponto final do corte" className="w-full accent-cyan-400" type="range" min={Math.min(item.duration, trimStart + 0.05)} max={item.duration} step={0.01} value={Math.max(trimEnd, trimStart + 0.05)} onChange={(e) => setTrimEnd(+e.target.value)} />
              </label>
              <div className="grid grid-cols-2 gap-1">
                <button className="btn !py-1.5 text-[9px]" onClick={() => { if (code && trimEnd > trimStart) { void trimPadAudio(bank.id, code, trimStart, trimEnd); setShowTrim(false); } }}>✓ MANTER SELEÇÃO</button>
                <button className="btn !py-1.5 text-[9px]" onClick={() => { setTrimStart(0); setTrimEnd(item.duration); }}>↺ REINICIAR SELEÇÃO</button>
              </div>
            </div>
          )}
          <div className="grid grid-cols-3 gap-0.5">
            {actions.map(({ label, icon: Icon, color, border, onClick, title }) => (
              <button key={label} className={`flex min-h-8 flex-col items-center justify-center gap-0 rounded-md border bg-background/50 px-0.5 py-0.5 transition-colors hover:bg-muted/70 ${border} ${color}`} onClick={onClick} title={title} disabled={!onClick}>
                <Icon className="size-3" />
                <span className="text-center text-[7px] font-bold leading-tight">{label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function LedVisualizer({ onBack }: { onBack: () => void }) {
  useSyncExternalStore(engine.subscribe, engine.getVersion, engine.getVersion);
  const [levels, setLevels] = useState<number[]>(() => Array.from({ length: 48 }, () => 0.08));

  useEffect(() => {
    let raf = 0;
    let lastFrame = 0;
    const draw = (time: number) => {
      // Update the 48-band display at a steady ~30 FPS to keep the interface responsive.
      if (time - lastFrame >= 33) {
        lastFrame = time;
        const active = engine.voices.size > 0 && !engine.paused;
        const spectrum = active ? engine.spectrum(48) : Array.from({ length: 48 }, () => 0.025);
        setLevels((previous) => spectrum.map((v, i) => {
          const target = Math.max(active ? 0.025 : 0.015, v);
          const current = previous[i] ?? 0.025;
          // Fast attack, smooth release: the LEDs rise quickly and fall naturally.
          const response = target > current ? 0.58 : 0.16;
          return current + (target - current) * response;
        }));
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="panel relative flex min-h-[280px] flex-col overflow-hidden border-neon-cyan/60 bg-[#030916] p-3 sm:min-h-[340px] lg:min-h-[42vh]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="size-2 animate-pulse rounded-full bg-neon-green shadow-[0_0_12px_#39ff88]" />
          <h2 className="font-display text-sm font-extrabold tracking-widest text-neon-cyan neon-text sm:text-lg">LED ATIVO</h2>
        </div>
        <button className="btn !px-2 !py-1.5 text-xs" onClick={onBack}>⌨ VOLTAR AO TECLADO</button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-end justify-around gap-[2px] overflow-hidden rounded-md border border-cyan-500/30 bg-gradient-to-b from-slate-950 via-[#071a2b] to-[#020611] px-2 pb-5 pt-4">
        <div className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: "linear-gradient(rgba(34,211,238,.25) 1px, transparent 1px)", backgroundSize: "100% 12px" }} />
        {levels.map((level, i) => {
          const h = Math.max(3, Math.min(100, 7 + level * 115));
          const color = level > 0.68 ? "#ff3b5c" : level > 0.43 ? "#ffb52e" : level > 0.2 ? "#22d3ee" : "#1683ff";
          return <div key={i} className="relative flex h-full max-w-4 flex-1 flex-col-reverse justify-end gap-[3px]" style={{ filter: `drop-shadow(0 0 4px ${color})` }}>
            {Array.from({ length: 16 }, (_, j) => {
              const lit = (j + 1) / 16 <= h / 100;
              return <div key={j} className="min-h-[3px] flex-1 rounded-[1px] transition-colors duration-75" style={{ background: lit ? color : "rgba(30,64,91,.25)", opacity: lit ? 0.95 : 1 }} />;
            })}
          </div>;
        })}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-cyan-400/20 to-transparent" />
      </div>
      <div className="mt-2 flex justify-between font-mono text-[9px] text-cyan-200/70"><span>LOW</span><span>FREQUENCY SPECTRUM</span><span>HIGH</span></div>
    </div>
  );
}

function App() {
  const s = useAppState();
  const st = s.settings;
  const [selected, setSelected] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [armed, setArmed] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [wall, setWall] = useState<string | null>(null);
  const [ledActive, setLedActive] = useState(false);
  useSyncExternalStore(engine.subscribe, engine.getVersion, engine.getVersion);
  const audioPlaying = [...engine.voices.values()].some((v) => v.key.startsWith(`${s.activeBank}:`));

  useEffect(() => {
    store.hydrate(detectLayout());
    engine.latency = store.get().settings.latency;
    void requestPersistence();
    void checkLibrary().then(preloadBank);
  }, []);

  useEffect(() => { engine.setMaster(st.master, st.muted); engine.maxVoices = st.maxVoices; }, [st.master, st.muted, st.maxVoices]);

  useEffect(() => {
    let url: string | null = null;
    const load = async () => {
      const f = await getFile("wallpaper").catch(() => undefined);
      if (url) URL.revokeObjectURL(url);
      url = f ? URL.createObjectURL(f.blob) : null;
      setWall(url);
    };
    void load();
    window.addEventListener("vexora:wallpaper", load);
    return () => window.removeEventListener("vexora:wallpaper", load);
  }, []);

  // Foreground keyboard capture
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (showSettings || t.closest("input,textarea,select,[contenteditable]")) return;
      const cur = store.get();
      const cs = cur.settings;
      if (e.repeat) { if (activeBank(cur).pads[e.code]) e.preventDefault(); return; }
      if (e.code === cs.stopAllKey && cs.stopAllKey) { e.preventDefault(); return engine.stopAll(); }
      if (!armed || (cs.globalShortcuts && isDesktop())) return;
      if (e.code === cs.nextBankKey) { e.preventDefault(); return switchBank(1); }
      if (e.code === cs.prevBankKey) { e.preventDefault(); return switchBank(-1); }
      if (cs.reserved.includes(e.code) || e.ctrlKey || e.metaKey) return;
      if (activeBank(cur).pads[e.code]?.fileId) { e.preventDefault(); trigger(cur.activeBank, e.code); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [armed, showSettings]);

  // Global shortcuts (desktop only)
  const bank = activeBank(s);
  useEffect(() => {
    if (!isDesktop()) return;
    if (!st.globalShortcuts || !armed) { void unregisterGlobalShortcuts(); return; }
    const codes = Object.keys(bank.pads).filter((c) => bank.pads[c].fileId && !st.reserved.includes(c));
    void registerGlobalShortcuts(codes, (c) => trigger(store.get().activeBank, c));
  }, [st.globalShortcuts, armed, bank, st.reserved]);

  const w = st.wallpaper;
  const wallStyle = wall && w.enabled ? { backgroundImage: `url(${wall})`, backgroundSize: FIT[w.fit], backgroundPosition: `${w.x}% ${w.y}%`, backgroundRepeat: "no-repeat" } : undefined;
  // Show the bundled VEXORA wallpaper for every fresh install until the user enables a custom one.
  const bannerWallStyle = wall && w.enabled
    ? { ...wallStyle, backgroundSize: "100% 100%", backgroundPosition: "center", backgroundRepeat: "no-repeat" }
    : { backgroundImage: 'url("/vexora-wallpaper.svg")', backgroundSize: "100% 100%", backgroundPosition: "center", backgroundRepeat: "no-repeat" };

  return (
    <div className="relative min-h-screen" data-anim={st.animations ? "on" : "off"} style={{ ["--panel-alpha" as string]: `${wallStyle ? w.panelOpacity : 85}%` }}>
      {wallStyle && w.target === "full" && <div className="fixed inset-0 -z-10" style={wallStyle}><div className="absolute inset-0 bg-background" style={{ opacity: w.dim }} /></div>}
      <Toaster theme="dark" position="bottom-right" richColors />

      <main className="grid min-w-0 grid-cols-1 items-start gap-1.5 p-1.5 lg:grid-cols-[190px_minmax(0,1fr)]">
        <aside className="flex min-w-0 flex-col gap-1.5">
          <div className="panel flex min-h-[48px] items-center justify-center gap-1.5 overflow-hidden px-1 py-1">
            <img src="/vexora-logo.svg" alt="Símbolo VEXORA" className="size-9 shrink-0 drop-shadow-[0_0_7px_#00d9ff]" />
            <h1 className="text-center font-display text-sm font-extrabold leading-none tracking-[0.12em] text-neon-green neon-text">VEXORA<br /><span className="text-neon-cyan">SAMPLER</span></h1>
          </div>
          <SidePanel selected={selected} />
          {st.show.editor && <AudioInfoPanel code={selected} ledActive={ledActive} onToggleLed={() => setLedActive((v) => !v)} />}
        </aside>
        <section className="flex min-w-0 flex-col gap-1.5">
          <div className="relative aspect-[3/1] min-h-0 w-full overflow-hidden rounded-none border-0" style={bannerWallStyle}>
            {(!wall || !w.enabled) && <div className="absolute inset-0 bg-background" />}
            {wall && w.enabled && <div className="absolute inset-0 bg-background" style={{ opacity: w.dim }} />}
            <div className="absolute right-1 top-1 z-10 flex gap-1">
              <button className="btn !p-1.5" onClick={() => setShowSettings(true)} aria-label="Configurações"><Cog className="size-4" /></button>
              <button className="btn !p-1.5" onClick={() => windowControl("max")} aria-label="Maximizar ou restaurar"><Maximize2 className="size-4" /></button>
              {isDesktop() && <button className="btn !p-1.5 text-neon-red" onClick={() => windowControl("close")} aria-label="Fechar VEXORA SAMPLER"><X className="size-4" /></button>}
            </div>
          </div>
          {ledActive && audioPlaying ? <LedVisualizer onBack={() => setLedActive(false)} /> : <KeyboardPanel selected={selected} onSelect={setSelected} editMode={editMode} />}
{/* Painel de edição ocultado temporariamente para testar o espaço disponível. */}
          <div className="panel relative h-6 overflow-hidden border-cyan-400/60 bg-[#020713] px-0 py-0 shadow-[0_0_10px_rgba(0,217,255,0.15)]" aria-label="Créditos do VEXORA SAMPLER">
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-[#020713] to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-[#020713] to-transparent" />
            <div className="vexora-led-track h-full items-center">
              {Array.from({ length: 2 }, (_, i) => <div key={i} className="flex h-full shrink-0 items-center gap-3 px-6 font-display text-[9px] font-bold tracking-[0.13em] text-neon-cyan">
                <span className="text-neon-green">▰ ▰ ▰</span>
                <span>CRIADO POR <strong className="text-white">NEYZINHO DAS PRODUÇÕES</strong></span>
                <span className="text-neon-green">◆</span>
                <span>WHATSAPP <strong className="text-white">(91) 99358-4049</strong></span>
                <span className="text-neon-green">▰ ▰ ▰</span>
              </div>)}
            </div>
          </div>
        </section>
      </main>
      {showSettings && <SettingsDialog onClose={() => setShowSettings(false)} />}
    </div>
  );
}
