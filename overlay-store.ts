// Tiny external store describing the visual effects drawn by <AgentOverlay>.
// Tools write to it; the overlay component renders from it.

export interface Effect {
  key: string;
  element: Element;
  kind: "highlight" | "focus";
  label?: string;
}

export interface OverlayState {
  effects: Effect[];
  cursor: { x: number; y: number; clickedAt: number } | null;
}

const EMPTY: OverlayState = { effects: [], cursor: null };
let state: OverlayState = EMPTY;
const listeners = new Set<() => void>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();

const emit = (next: OverlayState) => {
  state = next;
  listeners.forEach((l) => l());
};

export const overlayStore = {
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  getState: () => state,
  getServerState: (): OverlayState => EMPTY, // must be referentially stable

  addEffect(effect: Omit<Effect, "key">, ttlMs = 15000) {
    const key = `${effect.kind}-${Math.random().toString(36).slice(2, 8)}`;
    let effects = state.effects.filter((e) => e.element !== effect.element);
    if (effect.kind === "focus") effects = effects.filter((e) => e.kind !== "focus");
    emit({ ...state, effects: [...effects.slice(-7), { ...effect, key }] });
    timers.set(key, setTimeout(() => overlayStore.removeEffect(key), ttlMs));
  },
  removeEffect(key: string) {
    clearTimeout(timers.get(key));
    timers.delete(key);
    emit({ ...state, effects: state.effects.filter((e) => e.key !== key) });
  },
  clearEffects() {
    timers.forEach(clearTimeout);
    timers.clear();
    emit({ ...state, effects: [] });
  },

  moveCursor(x: number, y: number, click = false) {
    emit({ ...state, cursor: { x, y, clickedAt: click ? Date.now() : (state.cursor?.clickedAt ?? 0) } });
  },
  hideCursor() {
    emit({ ...state, cursor: null });
  },
};
