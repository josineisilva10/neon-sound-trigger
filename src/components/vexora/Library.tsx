import { useMemo, useRef, useState } from "react";
import { FolderOpen, Headphones, Plus, RefreshCw, Replace, Trash2, Upload } from "lucide-react";
import { fmtTime } from "@/lib/vexora/engine";
import { activeBank, updatePad, useAppState } from "@/lib/vexora/store";
import { AUDIO_EXT, checkLibrary, importAudioFiles, preview, removeLibraryItem, replaceLibraryFile } from "@/lib/vexora/actions";
import { inputCls } from "./PadEditor";

export function Library({ selected }: { selected: string | null }) {
  const s = useAppState();
  const [q, setQ] = useState("");
  const [fmt, setFmt] = useState("");
  const [folder, setFolder] = useState("");
  const filesRef = useRef<HTMLInputElement>(null);
  const dirRef = useRef<HTMLInputElement>(null);
  const replRef = useRef<HTMLInputElement>(null);
  const replId = useRef("");
  const folders = useMemo(() => [...new Set(s.library.map((l) => l.folder))].sort(), [s.library]);
  const formats = useMemo(() => [...new Set(s.library.map((l) => l.format))].sort(), [s.library]);
  const items = s.library.filter((l) => (!q || l.name.toLowerCase().includes(q.toLowerCase())) && (!fmt || l.format === fmt) && (!folder || l.folder === folder));
  const bank = activeBank(s);

  return (
    <div className="panel flex min-h-0 flex-col gap-2 p-3">
      <div className="flex items-center justify-between">
        <span className="font-display text-xs tracking-widest text-neon-blue">BIBLIOTECA</span>
        <span className="text-[10px] text-muted-foreground">{s.library.length} áudios</span>
      </div>
      <div className="grid grid-cols-3 gap-1">
        <button className="btn" onClick={() => filesRef.current?.click()}><Upload className="size-4" /> Arquivos</button>
        <button className="btn" onClick={() => dirRef.current?.click()}><FolderOpen className="size-4" /> Pasta</button>
        <button className="btn" onClick={checkLibrary} title="Verificar arquivos ausentes"><RefreshCw className="size-4" /> Atualizar</button>
      </div>
      <input ref={filesRef} type="file" multiple hidden accept={AUDIO_EXT.map((e) => "." + e).join(",")} onChange={(e) => { const f = [...(e.target.files ?? [])]; e.target.value = ""; void importAudioFiles(f); }} />
      <input ref={dirRef} type="file" hidden {...({ webkitdirectory: "", directory: "" } as object)} onChange={(e) => { const f = [...(e.target.files ?? [])]; e.target.value = ""; void importAudioFiles(f); }} />
      <input ref={replRef} type="file" hidden accept={AUDIO_EXT.map((e) => "." + e).join(",")} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void replaceLibraryFile(replId.current, f); }} />
      <input className={inputCls} placeholder="Pesquisar pelo nome…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="grid grid-cols-2 gap-1">
        <select className={inputCls} value={folder} onChange={(e) => setFolder(e.target.value)}><option value="">Todas as pastas</option>{folders.map((f) => <option key={f} value={f}>{f}</option>)}</select>
        <select className={inputCls} value={fmt} onChange={(e) => setFmt(e.target.value)}><option value="">Todos formatos</option>{formats.map((f) => <option key={f}>{f}</option>)}</select>
      </div>
      <ul className="-mx-1 min-h-0 flex-1 space-y-1 overflow-y-auto px-1">
        {items.length === 0 && <li className="p-3 text-center text-xs text-muted-foreground">Importe arquivos WAV, MP3, OGG ou FLAC. Os arquivos são copiados para o armazenamento local do app; os originais não são alterados.</li>}
        {items.map((l) => (
          <li key={l.id} draggable onDragStart={(e) => e.dataTransfer.setData("vexora/file", l.id)} className={`group cursor-grab rounded border border-transparent bg-background/40 px-2 py-1 hover:border-border ${l.missing ? "opacity-60" : ""}`}>
            <div className="flex items-center gap-1">
              <button aria-label="Pré-escutar" onClick={() => preview(l.id, l.name)} className="text-neon-cyan"><Headphones className="size-4" /></button>
              <span className="flex-1 truncate text-sm">{l.name}</span>
              <span className="font-mono text-[10px] text-muted-foreground">{l.format} {fmtTime(l.duration)}</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span className="flex-1 truncate">{l.missing ? "⚠ arquivo ausente" : l.folder}</span>
              {selected && <button title="Atribuir à tecla selecionada" onClick={() => updatePad(bank.id, selected, { fileId: l.id, name: bank.pads[selected]?.name || l.name })} className="hover:text-neon-green"><Plus className="size-3" /></button>}
              <button title="Substituir arquivo (mantém teclas)" onClick={() => { replId.current = l.id; replRef.current?.click(); }} className="hover:text-foreground"><Replace className="size-3" /></button>
              <button title="Remover da biblioteca" onClick={() => confirm(`Remover "${l.name}" da biblioteca?`) && removeLibraryItem(l.id)} className="hover:text-destructive"><Trash2 className="size-3" /></button>
            </div>
          </li>
        ))}
      </ul>
      <p className="text-[10px] text-muted-foreground">Arraste um áudio até uma tecla. Pastas são importadas no momento da seleção (sem sincronização automática).</p>
    </div>
  );
}
