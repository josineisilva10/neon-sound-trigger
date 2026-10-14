import { useEffect, useRef, useSyncExternalStore } from "react";
import { Copy, Download, Pause, Play, Plus, Square, Trash2, Volume2, VolumeX, OctagonX } from "lucide-react";
import { engine, fmtTime } from "@/lib/vexora/engine";
import { setSettings, useAppState } from "@/lib/vexora/store";
import { addBank, duplicateBank, exportProject, removeBank, renameBank, switchBank, trigger } from "@/lib/vexora/actions";
import { StereoMeter } from "./Meters";

export function SidePanel({ selected }: { selected: string | null }) {
  const s = useAppState();
  useSyncExternalStore(engine.subscribe, engine.getVersion, engine.getVersion);
  const voices = [...engine.voices.values()];
  const st = s.settings;
  const times = useRef(new Map<number, HTMLSpanElement>());

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      times.current.forEach((el, id) => {
        const v = engine.voices.get(id);
        if (v) el.textContent = `${fmtTime(engine.elapsed(v))} / ${fmtTime(v.duration)}`;
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <aside className="flex min-w-0 flex-col gap-1.5">
      <div className="panel p-1.5">
        <div className="mb-0.5 flex items-center justify-between">
          <span className="font-display text-xs tracking-widest text-neon-cyan">MASTER</span>
          <span className={`font-mono text-[10px] ${voices.length ? "text-neon-green neon-text" : "text-muted-foreground"}`}>{engine.paused ? "PAUSADO" : voices.length ? `● ${voices.length} ATIVO(S)` : "○ PARADO"}</span>
        </div>
        <div className="flex items-stretch gap-1.5">
          <StereoMeter />
          <div className="flex flex-1 flex-col justify-between gap-0.5">
            <label className="text-[10px] text-muted-foreground">Volume {Math.round(st.master * 100)}%
              <input className="w-full" type="range" min={0} max={1} step={0.01} value={st.master} onChange={(e) => setSettings({ master: +e.target.value })} />
            </label>
            <div className="grid grid-cols-4 gap-0.5">
              <button className="btn" title="Tocar pad selecionado / retomar" onClick={() => (engine.paused ? engine.resume() : selected && trigger(s.activeBank, selected))}><Play className="size-4" /></button>
              <button className="btn" title="Pausar" onClick={() => engine.pause()}><Pause className="size-4" /></button>
              <button className="btn" title="Parar com fade" onClick={() => engine.stopAll(0.5)}><Square className="size-4" /></button>
              <button className={`btn ${st.muted ? "text-neon-red" : ""}`} title="Mudo" onClick={() => setSettings({ muted: !st.muted })}>{st.muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}</button>
            </div>
            <button className="btn-danger !px-1.5 !py-0.5 text-[10px]" onClick={() => engine.stopAll()}><OctagonX className="size-4" /> STOP</button>
          </div>
        </div>
      </div>

      <div className="panel p-3">
        <div className="mb-1 font-display text-[10px] tracking-widest text-neon-green">TOCANDO AGORA</div>
        {voices.length === 0 && <p className="text-xs text-muted-foreground">Nenhum som em reprodução.</p>}
        <ul className="space-y-1">
          {voices.map((v) => (
            <li key={v.id} className="flex items-center gap-2 rounded bg-background/50 px-2 py-1 text-xs">
              <span className="led-dot led-anim animate-pulse" style={{ ["--led" as string]: "var(--neon-green)" }} />
              <span className="flex-1 truncate">{v.name}</span>
              <span ref={(el) => { if (el) times.current.set(v.id, el); else times.current.delete(v.id); }} className="font-mono text-[10px] text-muted-foreground" />
              <button aria-label="Parar" onClick={() => engine.stopVoice(v.id)} className="text-neon-red"><Square className="size-3" /></button>
            </li>
          ))}
        </ul>
      </div>

      <div className="panel p-3">
        <div className="mb-1 flex items-center justify-between">
          <span className="font-display text-xs tracking-widest text-neon-orange">BANCOS</span>
          <button className="btn !px-2 !py-1" onClick={addBank} title="Adicionar banco"><Plus className="size-3" /></button>
        </div>
        <ul className="space-y-1">
          {s.banks.map((b) => (
            <li key={b.id} className={`flex items-center gap-1 rounded px-1 ${b.id === s.activeBank ? "bg-neon-orange/15 ring-1 ring-neon-orange" : ""}`}>
              <button className="flex-1 truncate py-0.5 text-left text-xs" onClick={() => switchBank(b.id)} onDoubleClick={() => { const n = prompt("Renomear banco", b.name); if (n) renameBank(b.id, n); }}>
                {b.name} <span className="text-[10px] text-muted-foreground">({Object.keys(b.pads).length})</span>
              </button>
              <button title="Duplicar" onClick={() => duplicateBank(b.id)} className="p-1 text-muted-foreground hover:text-foreground"><Copy className="size-3" /></button>
              <button title="Exportar banco" onClick={() => exportProject(false, b.id)} className="p-1 text-muted-foreground hover:text-foreground"><Download className="size-3" /></button>
              <button title="Remover" onClick={() => confirm(`Remover ${b.name}?`) && removeBank(b.id)} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="size-3" /></button>
            </li>
          ))}
        </ul>
        <p className="mt-0.5 text-[9px] text-muted-foreground">Duplo clique para renomear.</p>
      </div>
    </aside>
  );
}
