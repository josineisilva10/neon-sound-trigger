import { useEffect, useRef } from "react";
import { engine } from "@/lib/vexora/engine";

const SEGS = 24;
const segColor = (i: number) => (i >= SEGS - 3 ? "var(--neon-red)" : i >= SEGS - 8 ? "var(--neon-orange)" : "var(--neon-green)");

/** Stereo LED meter reading real peak levels from the master bus. */
export function StereoMeter() {
  const refs = useRef<(HTMLDivElement | null)[][]>([[], []]);
  useEffect(() => {
    let raf = 0;
    const held = [0, 0];
    const loop = () => {
      const lv = engine.levels();
      lv.forEach((v, ch) => {
        held[ch] = Math.max(v, held[ch] * 0.9);
        const n = Math.round(Math.min(1, held[ch]) * SEGS);
        refs.current[ch].forEach((el, i) => el && (i < n ? el.setAttribute("data-on", "") : el.removeAttribute("data-on")));
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div className="flex gap-2">
      {["L", "R"].map((lab, ch) => (
        <div key={lab} className="flex flex-col items-center gap-1">
          <div className="flex flex-col-reverse gap-[2px]">
            {Array.from({ length: SEGS }, (_, i) => (
              <div key={i} ref={(el) => { refs.current[ch][i] = el; }} className="meter-seg h-[5px] w-4 rounded-[1px]" style={{ ["--seg" as string]: segColor(i) }} />
            ))}
          </div>
          <span className="font-mono text-[10px] text-muted-foreground">{lab}</span>
        </div>
      ))}
    </div>
  );
}

export function Waveform({ peaks, progress = 0, color = "var(--neon-cyan)", height = 48 }: { peaks: number[]; progress?: number; color?: string; height?: number }) {
  if (!peaks.length) return <div className="flex items-center justify-center text-xs text-muted-foreground" style={{ height }}>Sem forma de onda</div>;
  return (
    <div className="flex items-center gap-[1px]" style={{ height }}>
      {peaks.map((p, i) => (
        <div key={i} className="flex-1 rounded-sm" style={{ height: `${Math.max(4, p * 100)}%`, background: color, opacity: i / peaks.length < progress ? 1 : 0.35 }} />
      ))}
    </div>
  );
}
