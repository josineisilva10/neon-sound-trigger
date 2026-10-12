import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { engine } from "@/lib/vexora/engine";
import { keyLabel } from "@/lib/vexora/layout";
import { putFile, delFile } from "@/lib/vexora/db";
import { defaultSettings, setSettings, setWallpaper, store, useAppState, type Settings as S } from "@/lib/vexora/store";
import { IMAGE_EXT, createBackup, exportProject, importProject, listBackups, restoreBackup } from "@/lib/vexora/actions";
import { isDesktop } from "@/lib/vexora/desktop";
import { Field, inputCls } from "./PadEditor";

const TABS = ["Áudio", "Teclado", "Aparência", "Papel de parede", "Projeto", "Desktop"] as const;

function KeyCapture({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const [listening, setL] = useState(false);
  const s = useAppState();
  useEffect(() => {
    if (!listening) return;
    const h = (e: KeyboardEvent) => { e.preventDefault(); e.stopPropagation(); onChange(e.code); setL(false); };
    window.addEventListener("keydown", h, { capture: true });
    return () => window.removeEventListener("keydown", h, { capture: true });
  }, [listening, onChange]);
  return (
    <div className="flex gap-1">
      <button className="btn flex-1" onClick={() => setL(true)}>{listening ? "Pressione uma tecla…" : value ? keyLabel(value, s.settings.layout) : "— nenhuma —"}</button>
      {value && <button className="btn" onClick={() => onChange("")}>×</button>}
    </div>
  );
}

export function SettingsDialog({ onClose }: { onClose: () => void }) {
  const s = useAppState();
  const st = s.settings;
  const [tab, setTab] = useState<(typeof TABS)[number]>("Áudio");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const wallRef = useRef<HTMLInputElement>(null);
  const projRef = useRef<HTMLInputElement>(null);
  const [backups, setBackups] = useState(listBackups);

  useEffect(() => {
    navigator.mediaDevices?.enumerateDevices?.().then((d) => setDevices(d.filter((x) => x.kind === "audiooutput"))).catch(() => {});
  }, []);

  const set = (p: Partial<S>) => setSettings(p);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="panel flex max-h-[90vh] w-full max-w-3xl flex-col !bg-card" role="dialog" aria-label="Configurações">
        <div className="flex items-center justify-between border-b border-border p-3">
          <h2 className="font-display text-sm tracking-widest text-neon-cyan">CONFIGURAÇÕES</h2>
          <button aria-label="Fechar" onClick={onClose}><X className="size-5" /></button>
        </div>
        <div className="flex flex-wrap gap-1 border-b border-border p-2">
          {TABS.map((t) => <button key={t} onClick={() => setTab(t)} className={`rounded px-3 py-1 text-sm ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{t}</button>)}
        </div>
        <div className="grid gap-4 overflow-y-auto p-4 sm:grid-cols-2">
          {tab === "Áudio" && <>
            {engine.canSetSink() && devices.length > 0 ? (
              <Field label="Dispositivo de saída">
                <select className={inputCls} value={st.sinkId} onChange={async (e) => { try { await engine.setSink(e.target.value); set({ sinkId: e.target.value }); } catch { toast.error("Não foi possível usar este dispositivo"); } }}>
                  {devices.map((d) => <option key={d.deviceId} value={d.deviceId === "default" ? "" : d.deviceId}>{d.label || "Dispositivo " + d.deviceId.slice(0, 6)}</option>)}
                </select>
              </Field>
            ) : <p className="text-xs text-muted-foreground">A seleção de dispositivo de saída não é suportada neste navegador; o som sai pelo dispositivo padrão do sistema.</p>}
            <Field label="Preferência de latência (aplica ao recarregar)">
              <select className={inputCls} value={st.latency} onChange={(e) => set({ latency: e.target.value as S["latency"] })}>
                <option value="interactive">Mínima (ao vivo)</option><option value="balanced">Equilibrada</option><option value="playback">Estável (economia)</option>
              </select>
            </Field>
            <Field label={`Limite de sons simultâneos: ${st.maxVoices}`}><input type="range" min={1} max={64} value={st.maxVoices} onChange={(e) => set({ maxVoices: +e.target.value })} /></Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={st.bankSwitchStops} onChange={(e) => set({ bankSwitchStops: e.target.checked })} /> Parar sons ao trocar de banco</label>
            <p className="text-xs text-muted-foreground sm:col-span-2">Taxa de amostragem e buffer são controlados pelo sistema nesta versão e por isso não são exibidos. Latência real atual: {engine.ctx ? `${Math.round((engine.ctx.baseLatency + (engine.ctx.outputLatency || 0)) * 1000)} ms (informada pelo navegador)` : "inicie um som para medir"}.</p>
          </>}

          {tab === "Teclado" && <>
            <Field label="Layout do teclado"><select className={inputCls} value={st.layout} onChange={(e) => set({ layout: e.target.value as S["layout"] })}><option value="abnt2">ABNT2 (Brasil)</option><option value="us">US / Internacional</option></select></Field>
            <Field label="Tecla de Stop Geral"><KeyCapture value={st.stopAllKey} onChange={(c) => set({ stopAllKey: c })} /></Field>
            <Field label="Próximo banco"><KeyCapture value={st.nextBankKey} onChange={(c) => set({ nextBankKey: c })} /></Field>
            <Field label="Banco anterior"><KeyCapture value={st.prevBankKey} onChange={(c) => set({ prevBankKey: c })} /></Field>
            <Field label="Teclas reservadas (nunca disparam sons)">
              <div className="flex flex-wrap gap-1">
                {st.reserved.map((c) => <button key={c} className="btn !py-0.5" onClick={() => set({ reserved: st.reserved.filter((x) => x !== c) })}>{keyLabel(c, st.layout)} ×</button>)}
                <KeyCapture value="" onChange={(c) => c && !st.reserved.includes(c) && set({ reserved: [...st.reserved, c] })} />
              </div>
            </Field>
            <p className="text-xs text-muted-foreground sm:col-span-2">Proteções ativas: teclas ignoradas enquanto você digita em campos, com menus/configurações abertos, ou quando o painel está DESARMADO. Repetição automática de tecla presa é ignorada. Combinações do Windows (Win+L, Ctrl+Alt+Del, Alt+Tab) são protegidas pelo sistema e não podem ser capturadas.</p>
          </>}

          {tab === "Aparência" && <>
            <Field label="Visualização"><select className={inputCls} value={st.view} onChange={(e) => set({ view: e.target.value as S["view"] })}><option value="keyboard">Teclado completo</option><option value="grid">Grade de pads</option></select></Field>
            <Field label={`Tamanho dos pads ${Math.round(st.padScale * 100)}%`}><input type="range" min={0.6} max={1.8} step={0.05} value={st.padScale} onChange={(e) => set({ padScale: +e.target.value })} /></Field>
            <Field label={`Colunas da grade: ${st.gridCols}`}><input type="range" min={2} max={16} value={st.gridCols} onChange={(e) => set({ gridCols: +e.target.value })} /></Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={st.animations} onChange={(e) => set({ animations: e.target.checked })} /> Animações de LED (desative para economizar recursos)</label>
            {([["fn", "Teclas de função"], ["nav", "Navegação/setas"], ["numpad", "Teclado numérico"], ["library", "Biblioteca"], ["editor", "Editor do pad"]] as const).map(([k, l]) => (
              <label key={k} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={st.show[k]} onChange={(e) => set({ show: { ...st.show, [k]: e.target.checked } })} /> Mostrar {l}</label>
            ))}
            <button className="btn sm:col-span-2" onClick={() => { const d = defaultSettings(st.layout); set({ view: d.view, padScale: d.padScale, gridCols: d.gridCols, show: d.show, animations: true }); }}>Restaurar layout padrão</button>
          </>}

          {tab === "Papel de parede" && <>
            <div className="flex gap-2 sm:col-span-2">
              <button className="btn flex-1" onClick={() => wallRef.current?.click()}>Escolher imagem (JPG, PNG, WEBP)</button>
              <button className="btn" onClick={async () => { await delFile("wallpaper"); setWallpaper({ enabled: false }); window.dispatchEvent(new Event("vexora:wallpaper")); }}>Restaurar fundo padrão</button>
            </div>
            <input ref={wallRef} type="file" hidden accept={IMAGE_EXT.map((e) => "." + e).join(",")} onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              if (!IMAGE_EXT.includes(f.name.split(".").pop()?.toLowerCase() ?? "")) return toast.error("Formato de imagem não suportado");
              await putFile("wallpaper", { blob: f, name: f.name, type: f.type });
              setWallpaper({ enabled: true });
              window.dispatchEvent(new Event("vexora:wallpaper"));
              toast.success("Papel de parede salvo");
            }} />
            <Field label="Aplicar em"><select className={inputCls} value={st.wallpaper.target} onChange={(e) => setWallpaper({ target: e.target.value as "full" | "header" })}><option value="full">Fundo completo</option><option value="header">Cabeçalho</option></select></Field>
            <Field label="Modo"><select className={inputCls} value={st.wallpaper.fit} onChange={(e) => setWallpaper({ fit: e.target.value as S["wallpaper"]["fit"] })}><option value="fill">Preencher</option><option value="fit">Ajustar</option><option value="center">Centralizar</option><option value="zoom">Ampliar</option></select></Field>
            <Field label={`Posição horizontal ${st.wallpaper.x}%`}><input type="range" min={0} max={100} value={st.wallpaper.x} onChange={(e) => setWallpaper({ x: +e.target.value })} /></Field>
            <Field label={`Posição vertical ${st.wallpaper.y}%`}><input type="range" min={0} max={100} value={st.wallpaper.y} onChange={(e) => setWallpaper({ y: +e.target.value })} /></Field>
            <Field label={`Escurecer ${Math.round(st.wallpaper.dim * 100)}%`}><input type="range" min={0} max={0.95} step={0.01} value={st.wallpaper.dim} onChange={(e) => setWallpaper({ dim: +e.target.value })} /></Field>
            <Field label={`Opacidade dos painéis ${st.wallpaper.panelOpacity}%`}><input type="range" min={20} max={100} value={st.wallpaper.panelOpacity} onChange={(e) => setWallpaper({ panelOpacity: +e.target.value })} /></Field>
          </>}

          {tab === "Projeto" && <>
            <Field label="Nome do projeto"><input className={inputCls} value={s.projectName} onChange={(e) => store.set((x) => ({ ...x, projectName: e.target.value.slice(0, 80) }))} /></Field>
            <p className="text-xs text-muted-foreground">Salvamento automático ativo: todas as alterações são gravadas localmente.</p>
            <button className="btn" onClick={() => exportProject(false)}>Exportar projeto (só configurações)</button>
            <button className="btn" onClick={() => exportProject(true)}>Exportar empacotando áudios</button>
            <button className="btn" onClick={() => projRef.current?.click()}>Abrir projeto (.vexora.json)</button>
            <button className="btn" onClick={() => { createBackup(); setBackups(listBackups()); }}>Criar cópia de segurança</button>
            <input ref={projRef} type="file" hidden accept=".json" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f && confirm("Substituir o projeto atual?")) void importProject(f); }} />
            <div className="sm:col-span-2">
              <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Backups recentes</div>
              {backups.length === 0 && <p className="text-xs text-muted-foreground">Nenhum backup.</p>}
              <ul className="space-y-1">{backups.map((b) => <li key={b.date} className="flex items-center justify-between rounded bg-background/50 px-2 py-1 text-sm"><span>{b.name} — {new Date(b.date).toLocaleString("pt-BR")}</span><button className="btn !py-0.5" onClick={() => confirm("Restaurar este backup?") && restoreBackup(b)}>Restaurar</button></li>)}</ul>
            </div>
          </>}

          {tab === "Desktop" && <>
            <div className="space-y-2 text-sm sm:col-span-2">
              <p>Ambiente: <b className={isDesktop() ? "text-neon-green" : "text-neon-orange"}>{isDesktop() ? "Aplicativo desktop (Tauri)" : "Navegador"}</b></p>
              {isDesktop() ? (
                <label className="flex items-center gap-2"><input type="checkbox" checked={st.globalShortcuts} onChange={(e) => set({ globalShortcuts: e.target.checked })} /> Atalhos globais do Windows (disparar com outro programa em primeiro plano)</label>
              ) : (
                <p className="text-muted-foreground">Atalhos globais <b>não estão disponíveis</b> no navegador: aqui as teclas só funcionam com a janela do VEXORA em foco. Os atalhos globais funcionam apenas na versão desktop compilada (veja DESKTOP.md no código-fonte).</p>
              )}
              <p className="text-xs text-muted-foreground">Idioma: Português do Brasil.</p>
            </div>
          </>}
        </div>
      </div>
    </div>
  );
}
