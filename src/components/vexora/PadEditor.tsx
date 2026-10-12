import { useRef } from "react";
import { Eraser, Play, Square, Upload } from "lucide-react";
import { fmtTime } from "@/lib/vexora/engine";
import { keyLabel } from "@/lib/vexora/layout";
import { PAD_COLORS, activeBank, clearPad, defaultPad, updatePad, useAppState, type Pad } from "@/lib/vexora/store";
import { AUDIO_EXT, importAudioFiles, stopPad, trigger } from "@/lib/vexora/actions";
import { Waveform } from "./Meters";

export const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="flex flex-col gap-1 text-xs text-muted-foreground">
    <span className="uppercase tracking-wider">{label}</span>
    {children}
  </label>
);
export const inputCls = "rounded-md border border-input bg-background/70 px-2 py-1.5 text-sm text-foreground outline-none focus:border-ring";

export function PadEditor({ code }: { code: string | null }) {
  const s = useAppState();
  const bank = activeBank(s);
  const fileRef = useRef<HTMLInputElement>(null);
  if (!code) return <div className="panel p-4 text-sm text-muted-foreground">Selecione uma tecla para configurar o pad. Ative o modo edição para selecionar sem tocar.</div>;
  const pad = bank.pads[code];
  const p = pad ?? defaultPad(Object.keys(bank.pads).length);
  const item = p.fileId ? s.library.find((l) => l.id === p.fileId) : undefined;
  const set = (patch: Partial<Pad>) => updatePad(bank.id, code, patch);

  return (
    <div className="panel space-y-3 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-md border px-3 py-1 font-display text-lg font-bold neon-text" style={{ color: p.color, borderColor: p.color }}>{keyLabel(code, s.settings.layout)}</span>
        <input className={inputCls + " min-w-40 flex-1"} placeholder="Nome do pad" value={p.name} onChange={(e) => set({ name: e.target.value })} />
        <button className="btn" onClick={() => trigger(bank.id, code)} disabled={!p.fileId}><Play className="size-4" /> Tocar</button>
        <button className="btn" onClick={() => stopPad(bank.id, code)}><Square className="size-4" /> Parar</button>
        <button className="btn" onClick={() => fileRef.current?.click()}><Upload className="size-4" /> {p.fileId ? "Substituir áudio" : "Carregar áudio"}</button>
        {pad && <button className="btn text-destructive" onClick={() => clearPad(bank.id, code)}><Eraser className="size-4" /> Limpar</button>}
        <input ref={fileRef} type="file" hidden accept={AUDIO_EXT.map((e) => "." + e).join(",")} onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          const [id] = await importAudioFiles([f]);
          if (id) set({ fileId: id, name: p.name || f.name.replace(/\.[^.]+$/, "") });
        }} />
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <Field label={item ? `${item.name} · ${item.format} · ${fmtTime(item.duration)}${item.missing ? " · ARQUIVO AUSENTE" : ""}` : "Arquivo"}>
          <select className={inputCls} value={p.fileId ?? ""} onChange={(e) => set({ fileId: e.target.value || null })}>
            <option value="">— nenhum —</option>
            {s.library.map((l) => <option key={l.id} value={l.id}>{l.name} ({l.format})</option>)}
          </select>
        </Field>
        <div className="flex items-end gap-1">
          {PAD_COLORS.map((c) => <button key={c} aria-label={`Cor ${c}`} onClick={() => set({ color: c, playColor: c })} className="size-6 rounded-full border-2" style={{ background: c, borderColor: p.color === c ? "var(--foreground)" : "transparent" }} />)}
        </div>
      </div>
      {item && <Waveform peaks={item.peaks} color={p.color} height={40} />}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Field label="Modo"><select className={inputCls} value={p.mode} onChange={(e) => set({ mode: e.target.value as Pad["mode"] })}><option value="once">Tocar uma vez</option><option value="loop">Repetir (loop)</option></select></Field>
        <Field label="Ao repetir tecla"><select className={inputCls} value={p.retrigger} onChange={(e) => set({ retrigger: e.target.value as Pad["retrigger"] })}><option value="restart">Reiniciar</option><option value="stop">Parar</option><option value="overlap">Sobrepor</option><option value="ignore">Ignorar</option></select></Field>
        <Field label="Grupo exclusivo"><input className={inputCls} placeholder="ex: música" value={p.group} onChange={(e) => set({ group: e.target.value })} /></Field>
        <Field label={`Volume ${Math.round(p.volume * 100)}%`}><input type="range" min={0} max={1.5} step={0.01} value={p.volume} onChange={(e) => set({ volume: +e.target.value })} /></Field>
        <Field label={`Fade-in ${p.fadeIn.toFixed(1)}s`}><input type="range" min={0} max={5} step={0.1} value={p.fadeIn} onChange={(e) => set({ fadeIn: +e.target.value })} /></Field>
        <Field label={`Fade-out ${p.fadeOut.toFixed(1)}s`}><input type="range" min={0} max={5} step={0.1} value={p.fadeOut} onChange={(e) => set({ fadeOut: +e.target.value })} /></Field>
        <Field label="Início (s)"><input type="number" min={0} step={0.1} className={inputCls} value={p.startAt} onChange={(e) => set({ startAt: Math.max(0, +e.target.value || 0) })} /></Field>
        <Field label="Efeito LED"><select className={inputCls} value={p.led} onChange={(e) => set({ led: e.target.value as Pad["led"] })}><option value="glow">Brilho contínuo</option><option value="pulse">Pulsante</option><option value="border">Borda luminosa</option><option value="flash">Ativação rápida</option></select></Field>
        <Field label="Cor repouso / tocando"><div className="flex gap-2"><input type="color" value={p.color} onChange={(e) => set({ color: e.target.value })} /><input type="color" value={p.playColor} onChange={(e) => set({ playColor: e.target.value })} /></div></Field>
        <Field label={`Brilho ${p.brightness.toFixed(1)}`}><input type="range" min={0.2} max={2} step={0.1} value={p.brightness} onChange={(e) => set({ brightness: +e.target.value })} /></Field>
        <Field label={`Velocidade ${p.speed.toFixed(1)}s`}><input type="range" min={0.2} max={3} step={0.1} value={p.speed} onChange={(e) => set({ speed: +e.target.value })} /></Field>
        <Field label="Tamanho (grade)"><select className={inputCls} value={p.size} onChange={(e) => set({ size: +e.target.value === 2 ? 2 : 1 })}><option value={1}>Normal</option><option value={2}>Largo</option></select></Field>
      </div>
    </div>
  );
}
