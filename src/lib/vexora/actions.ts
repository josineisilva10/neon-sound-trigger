import { toast } from "sonner";
import { delFile, getFile, listFileIds, putFile } from "./db";
import { computePeaks, engine } from "./engine";
import { activeBank, newId, store, validateState, type LibItem, type State } from "./store";

export const AUDIO_EXT = ["wav", "mp3", "ogg", "flac", "m4a", "aac", "opus", "webm"];
export const IMAGE_EXT = ["jpg", "jpeg", "png", "webp"];
const ext = (n: string) => n.split(".").pop()?.toLowerCase() ?? "";

async function decodeFile(file: File) {
  const b = await engine.decode(await file.arrayBuffer());
  return b;
}

export async function importAudioFiles(files: File[]): Promise<string[]> {
  const ids: string[] = [];
  const errors: string[] = [];
  for (const file of files) {
    const e = ext(file.name);
    if (!AUDIO_EXT.includes(e)) continue;
    try {
      const buffer = await decodeFile(file);
      const id = newId();
      await putFile(id, { blob: file, name: file.name, type: file.type });
      engine.buffers.set(id, buffer);
      const rel = (file as File & { webkitRelativePath?: string }).webkitRelativePath ?? "";
      const item: LibItem = {
        id, name: file.name.replace(/\.[^.]+$/, ""), format: e.toUpperCase(), duration: buffer.duration, size: file.size,
        folder: rel.includes("/") ? rel.slice(0, rel.lastIndexOf("/")) : "Arquivos avulsos", peaks: computePeaks(buffer),
      };
      store.set((s) => ({ ...s, library: [...s.library, item] }));
      ids.push(id);
    } catch {
      errors.push(file.name);
    }
    await new Promise((r) => setTimeout(r, 0)); // keep UI responsive
  }
  if (ids.length) toast.success(`${ids.length} áudio(s) importado(s)`);
  if (errors.length) toast.error(`Arquivo inválido, corrompido ou incompatível: ${errors.slice(0, 3).join(", ")}${errors.length > 3 ? "…" : ""}`);
  if (!ids.length && !errors.length) toast.error("Nenhum arquivo de áudio compatível encontrado (WAV, MP3, OGG, FLAC…)");
  return ids;
}

export async function replaceLibraryFile(id: string, file: File) {
  try {
    const buffer = await decodeFile(file);
    await putFile(id, { blob: file, name: file.name, type: file.type });
    engine.buffers.set(id, buffer);
    store.set((s) => ({
      ...s,
      library: s.library.map((l) => (l.id === id ? { ...l, name: file.name.replace(/\.[^.]+$/, ""), format: ext(file.name).toUpperCase(), duration: buffer.duration, size: file.size, peaks: computePeaks(buffer), missing: false } : l)),
    }));
    toast.success("Arquivo substituído — as teclas associadas foram mantidas");
  } catch {
    toast.error("Arquivo inválido ou incompatível");
  }
}

export async function removeLibraryItem(id: string) {
  engine.stopAll();
  await delFile(id);
  engine.buffers.delete(id);
  store.set((s) => ({
    ...s,
    library: s.library.filter((l) => l.id !== id),
    banks: s.banks.map((b) => ({ ...b, pads: Object.fromEntries(Object.entries(b.pads).map(([c, p]) => [c, p.fileId === id ? { ...p, fileId: null } : p])) })),
  }));
}

export async function checkLibrary() {
  const ids = new Set((await listFileIds()).map(String));
  let missing = 0;
  store.set((s) => ({ ...s, library: s.library.map((l) => { const m = !ids.has(l.id); if (m) missing++; return { ...l, missing: m }; }) }));
  if (missing) toast.error(`${missing} arquivo(s) ausente(s) na biblioteca. Use "Substituir" para recuperá-los.`);
  else toast.success("Biblioteca verificada: todos os arquivos disponíveis");
}

export function preloadBank() {
  const s = store.get();
  for (const p of Object.values(activeBank(s).pads)) if (p.fileId) engine.load(p.fileId).catch(() => {});
}

// ---------- triggering ----------
let latestTriggerRequest = 0;

export function trigger(bankId: string, code: string) {
  const s = store.get();
  const bank = s.banks.find((b) => b.id === bankId);
  const pad = bank?.pads[code];
  if (!pad?.fileId) return;
  const key = `${bankId}:${code}`;
  if (engine.isPlaying(key)) {
    if (pad.retrigger === "ignore") return;
    if (pad.retrigger === "stop") return engine.stopKey(key, pad.fadeOut);
    if (pad.retrigger === "restart") engine.stopKey(key, 0);
  }

  // Only one pad audio at a time: stop the previous sound as soon as another pad is triggered.
  const requestId = ++latestTriggerRequest;
  for (const voice of [...engine.voices.values()]) {
    if (voice.key !== key) engine.stopVoice(voice.id, 0);
  }

  const name = pad.name || s.library.find((l) => l.id === pad.fileId)?.name || code;
  const go = (b: AudioBuffer) => {
    // Prevent a slow file load from starting an older sound after a newer key was pressed.
    if (requestId !== latestTriggerRequest) return;
    engine.play(b, { key, fileId: pad.fileId!, name, volume: pad.volume, loop: pad.mode === "loop", fadeIn: pad.fadeIn, startAt: pad.startAt, group: pad.group });
  };
  const cached = engine.buffers.get(pad.fileId);
  if (cached) go(cached);
  else engine.load(pad.fileId).then(go).catch(() => {
    if (requestId === latestTriggerRequest) toast.error(`"${name}": arquivo indisponível. Verifique a biblioteca.`);
  });
}

export function stopPad(bankId: string, code: string) {
  const pad = store.get().banks.find((b) => b.id === bankId)?.pads[code];
  engine.stopKey(`${bankId}:${code}`, pad?.fadeOut ?? 0);
}

export async function preview(fileId: string, name: string) {
  if (engine.isPlaying("preview")) return engine.stopKey("preview");
  try {
    const b = await engine.load(fileId);
    engine.play(b, { key: "preview", fileId, name: "Pré-escuta: " + name, volume: 1, loop: false, fadeIn: 0, startAt: 0, group: "" });
  } catch {
    toast.error("Arquivo indisponível");
  }
}

export function switchBank(dir: 1 | -1 | string) {
  store.set((s) => {
    const i = s.banks.findIndex((b) => b.id === s.activeBank);
    const id = typeof dir === "string" ? dir : s.banks[(i + dir + s.banks.length) % s.banks.length].id;
    return { ...s, activeBank: id };
  });
  if (store.get().settings.bankSwitchStops) engine.stopAll(0.05);
  preloadBank();
}

// ---------- banks ----------
export function addBank() {
  const id = "bank-" + newId();
  store.set((s) => ({ ...s, banks: [...s.banks, { id, name: `Banco ${String.fromCharCode(65 + (s.banks.length % 26))}`, pads: {} }], activeBank: id }));
}
export function renameBank(id: string, name: string) {
  store.set((s) => ({ ...s, banks: s.banks.map((b) => (b.id === id ? { ...b, name: name.slice(0, 40) } : b)) }));
}
export function duplicateBank(id: string) {
  const nid = "bank-" + newId();
  store.set((s) => {
    const b = s.banks.find((x) => x.id === id);
    if (!b) return s;
    return { ...s, banks: [...s.banks, { id: nid, name: b.name + " (cópia)", pads: structuredClone(b.pads) }], activeBank: nid };
  });
}
export function removeBank(id: string) {
  const s0 = store.get();
  if (s0.banks.length <= 1) return toast.error("O projeto precisa de pelo menos um banco");
  for (const c of Object.keys(s0.banks.find((b) => b.id === id)?.pads ?? {})) engine.stopKey(`${id}:${c}`);
  store.set((s) => {
    const banks = s.banks.filter((b) => b.id !== id);
    return { ...s, banks, activeBank: s.activeBank === id ? banks[0].id : s.activeBank };
  });
}

// ---------- projects ----------
const blobToB64 = (b: Blob) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(",")[1] ?? "");
    r.onerror = () => rej(r.error);
    r.readAsDataURL(b);
  });
const b64ToBlob = (b64: string, type: string) => {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type });
};

function download(data: string, filename: string) {
  const url = URL.createObjectURL(new Blob([data], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Format: see PROJECT_FORMAT.md. `files` is only present when the user explicitly packs audio. */
export async function exportProject(pack: boolean, onlyBankId?: string) {
  const s = store.get();
  const payload: Record<string, unknown> = {
    format: "vexora-project", version: 1, exportedAt: new Date().toISOString(),
    state: onlyBankId ? { ...s, banks: s.banks.filter((b) => b.id === onlyBankId), activeBank: onlyBankId } : s,
  };
  if (pack) {
    const files: Record<string, { name: string; type: string; data: string }> = {};
    const ids = new Set(s.library.map((l) => l.id));
    ids.add("wallpaper");
    for (const id of ids) {
      const f = await getFile(id);
      if (f) files[id] = { name: f.name, type: f.type, data: await blobToB64(f.blob) };
    }
    payload.files = files;
  }
  const safe = (s.projectName || "projeto").replace(/[^\w-]+/g, "_");
  download(JSON.stringify(payload), `${safe}${onlyBankId ? "-banco" : ""}.vexora.json`);
}

export async function importProject(file: File) {
  try {
    const raw = JSON.parse(await file.text());
    if (raw?.format !== "vexora-project" || raw.version !== 1) throw new Error("formato");
    const st = validateState(raw.state);
    if (!st) throw new Error("estado");
    if (raw.files && typeof raw.files === "object") {
      for (const [id, f] of Object.entries(raw.files as Record<string, { name: string; type: string; data: string }>)) {
        if (!/^[A-Za-z0-9_-]{1,64}$/.test(id) || typeof f?.data !== "string") continue;
        await putFile(id, { blob: b64ToBlob(f.data, String(f.type ?? "")), name: String(f.name ?? id), type: String(f.type ?? "") });
      }
    }
    engine.stopAll();
    engine.buffers.clear();
    store.replace(st);
    await checkLibrary();
    window.dispatchEvent(new Event("vexora:wallpaper"));
    toast.success(`Projeto "${st.projectName}" carregado`);
  } catch {
    toast.error("Arquivo de projeto inválido ou corrompido");
  }
}

const BK = "vexora:backups";
export interface Backup {
  date: string;
  name: string;
  state: State;
}
export function listBackups(): Backup[] {
  try {
    return JSON.parse(localStorage.getItem(BK) ?? "[]");
  } catch {
    return [];
  }
}
export function createBackup() {
  const s = store.get();
  const list = [{ date: new Date().toISOString(), name: s.projectName, state: s }, ...listBackups()].slice(0, 10);
  localStorage.setItem(BK, JSON.stringify(list));
  toast.success("Cópia de segurança criada");
}
export function restoreBackup(b: Backup) {
  const st = validateState(b.state);
  if (!st) return toast.error("Backup inválido");
  engine.stopAll();
  store.replace(st);
  toast.success("Backup restaurado");
}
