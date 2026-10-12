import { useEffect, useRef, useSyncExternalStore } from "react";
import { engine, fmtTime } from "@/lib/vexora/engine";
import { FUNCTION_ROW, NAV_ROWS, keyLabel, layoutCodes, mainRows, numpadRows, type Row } from "@/lib/vexora/layout";
import { activeBank, defaultPad, swapPads, updatePad, useAppState, type LibItem, type Pad } from "@/lib/vexora/store";
import { trigger } from "@/lib/vexora/actions";

interface Props {
  selected: string | null;
  onSelect: (code: string) => void;
  editMode: boolean;
}

export function KeyboardPanel({ selected, onSelect, editMode }: Props) {
  const s = useAppState();
  useSyncExternalStore(engine.subscribe, engine.getVersion, engine.getVersion);
  const bank = activeBank(s);
  const st = s.settings;
  const bars = useRef(new Map<string, HTMLDivElement>());
  const lib = new Map(s.library.map((l) => [l.id, l]));

  // Progress bars follow the real playback position of each voice.
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      bars.current.forEach((el, code) => {
        const v = engine.latestVoice(`${bank.id}:${code}`);
        el.style.width = v ? `${(engine.elapsed(v) / v.duration) * 100}%` : "0%";
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [bank.id]);

  const keyProps = (code: string, w = 1) => ({
    code, w, pad: bank.pads[code], lib, selected: selected === code, reserved: st.reserved.includes(code) || code === st.stopAllKey,
    playing: engine.isPlaying(`${bank.id}:${code}`), label: keyLabel(code, st.layout),
    barRef: (el: HTMLDivElement | null) => { if (el) bars.current.set(code, el); else bars.current.delete(code); },
    onClick: () => { onSelect(code); if (!editMode) trigger(bank.id, code); },
    onDropKey: (from: string) => swapPads(bank.id, from, code),
    onDropFile: (fileId: string) => { const l = lib.get(fileId); updatePad(bank.id, code, { fileId, name: bank.pads[code]?.name || l?.name || "" }); onSelect(code); },
  });

  const renderRows = (rows: Row[]) =>
    rows.map((row, i) => (
      <div key={i} className={`flex min-w-0 gap-1 ${row.length === 1 && "code" in row[0] && row[0].code === "Space" ? "justify-center" : ""}`}>
        {row.map((k, j) => ("gap" in k ? <div key={j} style={{ width: `calc(var(--u) * ${k.gap})` }} className="flex-none" /> : <PadKey key={k.code} {...keyProps(k.code, k.w)} />))}
      </div>
    ));

  // Keep the keyboard large while scaling its keys to fit the available width.
  // The parent layout provides the container query width (cqi).
  const unit = `clamp(2.2rem, calc((100cqi - 4rem) / 18), ${5.2 * st.padScale}rem)`;

  if (st.view === "grid") {
    const codes = layoutCodes(st.layout).filter((c) => bank.pads[c]);
    return (
      <div className="panel p-3" style={{ ["--u" as string]: unit }}>
        {codes.length === 0 && <p className="p-6 text-center text-muted-foreground">Nenhum pad configurado neste banco. Use o modo teclado ou arraste áudios da biblioteca.</p>}
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${st.gridCols}, minmax(0, 1fr))` }}>
          {codes.map((c) => (
            <div key={c} style={{ gridColumn: `span ${bank.pads[c].size}` }} className="[&>button]:!w-full">
              <PadKey {...keyProps(c)} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Compact layout: remove Caps Lock, both Shift keys and bottom-row modifiers.
  // Keep the rows aligned and leave only the space bar on the bottom row.
  const compactRows = mainRows(st.layout).map((row, index) => {
    if (index === 2) return row.filter((key) => !("code" in key) || key.code !== "CapsLock");
    if (index === 3) return row.filter((key) => !("code" in key) || (key.code !== "ShiftLeft" && key.code !== "ShiftRight"));
    if (index === 4) return row.filter((key) => "code" in key && key.code === "Space");
    return row;
  });

  return (
    <div className="panel keyboard-fit-panel p-2 sm:p-3" style={{ ["--u" as string]: unit }}>
      <div className="flex w-full min-w-0 items-start gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {st.show.fn && <div className="mb-2">{renderRows([FUNCTION_ROW])}</div>}
          {renderRows(compactRows)}
        </div>
        {st.show.nav && <div className="flex flex-none flex-col gap-1">{st.show.fn && <div className="mb-2 h-[var(--u)]" />}{renderRows(NAV_ROWS)}</div>}
      </div>
    </div>
  );
}

interface KeyProps {
  code: string; w: number; pad?: Pad; lib: Map<string, LibItem>; selected: boolean; reserved: boolean; playing: boolean; label: string;
  barRef: (el: HTMLDivElement | null) => void; onClick: () => void; onDropKey: (from: string) => void; onDropFile: (id: string) => void;
}

function PadKey({ code, w, pad, lib, selected, reserved, playing, label, barRef, onClick, onDropKey, onDropFile }: KeyProps) {
  const p = pad ?? defaultPad();
  const item = pad?.fileId ? lib.get(pad.fileId) : undefined;
  const assigned = !!pad?.fileId;
  return (
    <button
      type="button"
      draggable={!!pad}
      onDragStart={(e) => e.dataTransfer.setData("vexora/key", code)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const k = e.dataTransfer.getData("vexora/key");
        const f = e.dataTransfer.getData("vexora/file");
        if (k && k !== code) onDropKey(k);
        else if (f) onDropFile(f);
      }}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="padkey px-1.5 py-1"
      data-assigned={assigned || undefined}
      data-playing={playing || undefined}
      data-selected={selected || undefined}
      data-reserved={reserved || undefined}
      data-effect={p.led}
      title={item ? `${label} — ${pad?.name || item.name}` : label}
      style={{ ["--w" as string]: w, ["--led" as string]: playing ? p.playColor : p.color, ["--b" as string]: p.brightness, ["--s" as string]: `${p.speed}s` }}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="font-display text-[11px] font-bold leading-none" style={{ color: assigned ? p.color : undefined }}>{label}</span>
        {playing && <span className="led-dot led-anim animate-pulse" />}
      </div>
      {assigned && (
        <>
          <div className="mt-0.5 truncate text-[11px] font-semibold leading-tight">{pad?.name || item?.name || "—"}</div>
          <div className="font-mono text-[9px] text-muted-foreground">{item?.missing ? "AUSENTE" : fmtTime(item?.duration ?? 0)}{p.mode === "loop" ? " ⟳" : ""}</div>
        </>
      )}
      <div ref={barRef} className="absolute bottom-0 left-0 h-[3px]" style={{ background: p.playColor, width: 0 }} />
    </button>
  );
}
