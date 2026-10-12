import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import { Maximize2, Settings as Cog, Play, Square, Repeat2 } from "lucide-react";
import { engine } from "@/lib/vexora/engine";
import { getFile, requestPersistence } from "@/lib/vexora/db";
import { detectLayout } from "@/lib/vexora/layout";
import { activeBank, setSettings, store, updatePad, useAppState } from "@/lib/vexora/store";
import { checkLibrary, preloadBank, switchBank, trigger, stopPad } from "@/lib/vexora/actions";
import { isDesktop, registerGlobalShortcuts, unregisterGlobalShortcuts, windowControl } from "@/lib/vexora/desktop";
import { KeyboardPanel } from "@/components/vexora/Keyboard";
import { PadEditor } from "@/components/vexora/PadEditor";
import { SidePanel } from "@/components/vexora/SidePanel";
import { SettingsDialog } from "@/components/vexora/Settings";
import { fmtTime } from "@/lib/vexora/engine";
import { Waveform } from "@/components/vexora/Meters";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ZENTRIX SAMPLER — Disparo de áudio pelo teclado" },
      { name: "description", content: "ZENTRIX: sampler profissional para DJs com bancos, vinhetas, locuções, efeitos e papel de parede personalizado." },
      { property: "og:title", content: "ZENTRIX SAMPLER" },
      { property: "og:description", content: "ZENTRIX — painel profissional para disparo de vinhetas, locuções e efeitos para DJs." },
    ],
  }),
  component: App,
});

const FIT = { fill: "cover", fit: "contain", center: "auto", zoom: "160%" } as const;

function AudioInfoPanel({ code }: { code: string | null }) {
  const s = useAppState();
  const bank = activeBank(s);
  const pad = code ? bank.pads[code] : undefined;
  const item = pad?.fileId ? s.library.find((l) => l.id === pad.fileId) : undefined;

  return (
    <div className="panel min-w-0 space-y-2 p-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-[10px] font-bold tracking-wider text-neon-cyan">INFORMAÇÕES DO ÁUDIO</h2>
        <span className="text-[9px] text-muted-foreground">{item ? "FAIXA SELECIONADA" : "AGUARDANDO ÁUDIO"}</span>
      </div>
      {!item ? (
        <p className="text-[10px] text-muted-foreground">{code ? "Esta tecla ainda não tem áudio atribuído." : "Selecione uma tecla com áudio para ver os detalhes."}</p>
      ) : (
        <>
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-neon-cyan/50 bg-neon-cyan/10 text-neon-cyan">♫</div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold">{pad?.name || item.name}</div>
              <div className="text-[9px] text-muted-foreground">{fmtTime(item.duration)} · {item.format} · {(item.size / (1024 * 1024)).toFixed(1)} MB</div>
            </div>
            <button className="btn !p-1.5" title="Tocar áudio" onClick={() => code && trigger(bank.id, code)}><Play className="size-3.5" /></button>
            <button className="btn !p-1.5" title="Parar áudio" onClick={() => code && stopPad(bank.id, code)}><Square className="size-3.5" /></button>
          </div>
          <div className="rounded-md border border-border bg-background/60 p-1.5">
            <Waveform peaks={item.peaks} color={pad?.color || "#22d3ee"} height={28} />
          </div>
          <div className="grid grid-cols-3 gap-1 text-[9px]">
            <div className="rounded border border-border p-1"><span className="block text-muted-foreground">FORMATO</span><strong>{item.format}</strong></div>
            <div className="rounded border border-border p-1"><span className="block text-muted-foreground">DURAÇÃO</span><strong>{fmtTime(item.duration)}</strong></div>
            <button className={`btn !justify-center !px-1 !py-1 text-[9px] ${pad?.mode === "loop" ? "text-neon-green" : ""}`} onClick={() => code && updatePad(bank.id, code, { mode: pad?.mode === "loop" ? "once" : "loop" })} title="Alternar repetição">
              <Repeat2 className="size-3" /> {pad?.mode === "loop" ? "LOOP ON" : "REPETIR"}
            </button>
          </div>
        </>
      )}
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

  return (
    <div className="relative min-h-screen" data-anim={st.animations ? "on" : "off"} style={{ ["--panel-alpha" as string]: `${wallStyle ? w.panelOpacity : 85}%` }}>
      {wallStyle && w.target === "full" && <div className="fixed inset-0 -z-10" style={wallStyle}><div className="absolute inset-0 bg-background" style={{ opacity: w.dim }} /></div>}
      <Toaster theme="dark" position="bottom-right" richColors />

      <main className="grid min-w-0 grid-cols-1 items-start gap-1.5 p-1.5 lg:grid-cols-[190px_minmax(0,1fr)]">
        <aside className="flex min-w-0 flex-col gap-1.5">
          <div className="panel flex min-h-[42px] items-center justify-center overflow-hidden px-1 py-0.5">
            <h1 className="text-center font-display text-lg font-extrabold leading-none tracking-[0.16em] text-neon-green neon-text">ZENTRIX<br /><span className="text-neon-cyan">SAMPLER</span></h1>
          </div>
          <SidePanel selected={selected} />
          {st.show.editor && <AudioInfoPanel code={selected} />}
        </aside>
        <section className="flex min-w-0 flex-col gap-1.5">
          <div className="relative min-h-[180px] overflow-hidden rounded-md border border-border sm:min-h-[230px] lg:min-h-[31vh]" style={wallStyle}>
            {(!wall || !w.enabled) && <div className="absolute inset-0 bg-background" />}
            {wall && w.enabled && <div className="absolute inset-0 bg-background" style={{ opacity: w.dim }} />}
            <div className="absolute right-1 top-1 z-10 flex gap-1">
              <button className="btn !p-1.5" onClick={() => setShowSettings(true)} aria-label="Configurações"><Cog className="size-4" /></button>
              <button className="btn !p-1.5" onClick={() => windowControl("max")} aria-label="Maximizar"><Maximize2 className="size-4" /></button>
            </div>
          </div>
          <KeyboardPanel selected={selected} onSelect={setSelected} editMode={editMode} />
          {st.show.editor && <PadEditor code={selected} />}
        </section>
      </main>
      {showSettings && <SettingsDialog onClose={() => setShowSettings(false)} />}
    </div>
  );
}
