// Native desktop bridge (Tauri v2, withGlobalTauri: true). In the browser every function reports "unavailable".
type TauriGlobal = {
  core?: {
    invoke: <T>(command: string, args?: Record<string, unknown>) => Promise<T>;
  };
  globalShortcut?: {
    register: (s: string | string[], h: (e: { shortcut: string; state: "Pressed" | "Released" }) => void) => Promise<void>;
    unregisterAll: () => Promise<void>;
  };
};
const tauri = (): TauriGlobal | undefined =>
  typeof window === "undefined" ? undefined : (window as unknown as { __TAURI__?: TauriGlobal }).__TAURI__;

export const isDesktop = () => !!tauri();

let globalActive = false;
export const globalShortcutsActive = () => globalActive;

/** Registers OS-wide hotkeys (KeyboardEvent.code names are valid Tauri accelerators). */
export async function registerGlobalShortcuts(codes: string[], onPress: (code: string) => void): Promise<string[]> {
  const gs = tauri()?.globalShortcut;
  if (!gs) return [];
  await gs.unregisterAll();
  globalActive = false;
  const failed: string[] = [];
  for (const c of codes) {
    try {
      await gs.register(c, (e) => {
        if (e.state === "Pressed") onPress(c);
      });
    } catch {
      failed.push(c); // protected by Windows or used by another program
    }
  }
  globalActive = codes.length > failed.length;
  return failed;
}
export async function unregisterGlobalShortcuts() {
  await tauri()?.globalShortcut?.unregisterAll();
  globalActive = false;
}

export function windowControl(action: "min" | "max" | "close") {
  const api = tauri();
  if (action === "max" && api?.core?.invoke) {
    return api.core.invoke("toggle_maximize").catch((error) => {
      console.error("Não foi possível maximizar a janela do VEXORA SAMPLER:", error);
    });
  }
  if (action === "max") {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen();
  }
}
