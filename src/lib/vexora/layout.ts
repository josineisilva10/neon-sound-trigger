// Physical keyboard layouts keyed by KeyboardEvent.code (layout-independent physical position).
export type LayoutId = "abnt2" | "us";
export interface KeyDef {
  code: string;
  w?: number;
}
export type Row = (KeyDef | { gap: number })[];

const k = (code: string, w = 1): KeyDef => ({ code, w });
const gap = (g: number) => ({ gap: g });

export const FUNCTION_ROW: Row = [
  k("Escape"), gap(1), k("F1"), k("F2"), k("F3"), k("F4"), gap(0.5),
  k("F5"), k("F6"), k("F7"), k("F8"), gap(0.5), k("F9"), k("F10"), k("F11"), k("F12"),
];

export function mainRows(layout: LayoutId): Row[] {
  const intl = layout === "abnt2";
  return [
    [k("Backquote"), ...["1","2","3","4","5","6","7","8","9","0"].map((d) => k("Digit" + d)), k("Minus"), k("Equal"), k("Backspace", 2)],
    [k("Tab", 1.5), ..."QWERTYUIOP".split("").map((c) => k("Key" + c)), k("BracketLeft"), k("BracketRight"), ...(intl ? [] : [k("Backslash", 1.5)])],
    [k("CapsLock", 1.75), ..."ASDFGHJKL".split("").map((c) => k("Key" + c)), k("Semicolon"), k("Quote"), ...(intl ? [k("Backslash")] : []), k("Enter", intl ? 1.25 : 2.25)],
    [k("ShiftLeft", intl ? 1.25 : 2.25), ...(intl ? [k("IntlBackslash")] : []), ..."ZXCVBNM".split("").map((c) => k("Key" + c)), k("Comma"), k("Period"), k("Slash"), ...(intl ? [k("IntlRo")] : []), k("ShiftRight", intl ? 1.75 : 2.75)],
    [k("ControlLeft", 1.25), k("MetaLeft", 1.25), k("AltLeft", 1.25), k("Space", 6.25), k("AltRight", 1.25), k("MetaRight", 1.25), k("ContextMenu", 1.25), k("ControlRight", 1.25)],
  ];
}

export const NAV_ROWS: Row[] = [
  [k("Insert"), k("Home"), k("PageUp")],
  [k("Delete"), k("End"), k("PageDown")],
  [gap(3)],
  [gap(1), k("ArrowUp"), gap(1)],
  [k("ArrowLeft"), k("ArrowDown"), k("ArrowRight")],
];

export function numpadRows(layout: LayoutId): Row[] {
  return [
    [k("NumLock"), k("NumpadDivide"), k("NumpadMultiply"), k("NumpadSubtract")],
    [k("Numpad7"), k("Numpad8"), k("Numpad9"), k("NumpadAdd")],
    [k("Numpad4"), k("Numpad5"), k("Numpad6"), ...(layout === "abnt2" ? [k("NumpadComma")] : [gap(1)])],
    [k("Numpad1"), k("Numpad2"), k("Numpad3"), k("NumpadEnter")],
    [k("Numpad0", 2), k("NumpadDecimal"), gap(1)],
  ];
}

const COMMON: Record<string, string> = {
  Escape: "Esc", Backspace: "⌫", Tab: "Tab", CapsLock: "Caps", Enter: "Enter",
  ShiftLeft: "Shift", ShiftRight: "Shift", ControlLeft: "Ctrl", ControlRight: "Ctrl",
  MetaLeft: "Win", MetaRight: "Win", AltLeft: "Alt", AltRight: "AltGr", ContextMenu: "Menu",
  Space: "Espaço", Insert: "Ins", Home: "Home", PageUp: "PgUp", Delete: "Del", End: "End",
  PageDown: "PgDn", ArrowUp: "↑", ArrowDown: "↓", ArrowLeft: "←", ArrowRight: "→",
  NumLock: "Num", NumpadDivide: "/", NumpadMultiply: "*", NumpadSubtract: "−", NumpadAdd: "+",
  NumpadEnter: "Enter", NumpadDecimal: ",", NumpadComma: ".", Minus: "-", Equal: "=", Comma: ",", Period: ".",
};
const ABNT2: Record<string, string> = {
  Backquote: "'", BracketLeft: "´", BracketRight: "[", Semicolon: "Ç", Quote: "~", Backslash: "]",
  IntlBackslash: "\\", Slash: ";", IntlRo: "/",
};
const US: Record<string, string> = {
  Backquote: "`", BracketLeft: "[", BracketRight: "]", Semicolon: ";", Quote: "'", Backslash: "\\", Slash: "/",
  NumpadDecimal: ".",
};

export function keyLabel(code: string, layout: LayoutId): string {
  const m = layout === "abnt2" ? ABNT2 : US;
  if (m[code]) return m[code];
  if (COMMON[code]) return COMMON[code];
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  if (code.startsWith("Numpad")) return "Num " + code.slice(6);
  return code;
}

function codesOf(rows: Row[]): string[] {
  return rows.flat().filter((x): x is KeyDef => "code" in x).map((x) => x.code);
}
export function layoutCodes(layout: LayoutId): string[] {
  return [...codesOf([FUNCTION_ROW]), ...codesOf(mainRows(layout)), ...codesOf(NAV_ROWS), ...codesOf(numpadRows(layout))];
}
export const ALL_CODES = new Set([...layoutCodes("abnt2"), ...layoutCodes("us")]);

export function detectLayout(): LayoutId {
  if (typeof navigator === "undefined") return "abnt2";
  return navigator.language?.toLowerCase().startsWith("pt") ? "abnt2" : "us";
}
