"use client";
/**
 * Device-local persistence for the watchlist, collections, alerts and the
 * comparison tray. These move to the database (watchlists, watchlist_products,
 * alerts tables) once accounts ship; the shape here matches those tables.
 */
import { useSyncExternalStore } from "react";

export type AlertType = "price_below" | "rank_better_than" | "trend_score_above" | "demand_change_above";

export interface Collection {
  id: string;
  name: string;
  asins: string[];
}

export interface AlertRule {
  id: string;
  asin: string;
  type: AlertType;
  threshold: number;
  enabled: boolean;
}

interface State {
  collections: Collection[];
  alerts: AlertRule[];
  compare: string[];
}

const KEY = "amazon-pulse:v1";
const DEFAULT: State = { collections: [{ id: "default", name: "My watchlist", asins: [] }], alerts: [], compare: [] };
export const MAX_COMPARE = 5;

let state: State = DEFAULT;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<State>;
      state = {
        collections: parsed.collections?.length ? parsed.collections : DEFAULT.collections,
        alerts: parsed.alerts ?? [],
        compare: (parsed.compare ?? []).slice(0, MAX_COMPARE),
      };
    }
  } catch {
    state = DEFAULT;
  }
}

function save(next: State) {
  state = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable (private mode) — keep in memory */
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  load();
  listeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      loaded = false;
      load();
      l();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

export function useStore(): State & { hydrated: boolean } {
  const s = useSyncExternalStore(
    subscribe,
    () => {
      load();
      return state;
    },
    () => DEFAULT,
  );
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  return { ...s, hydrated };
}

const uid = () => Math.random().toString(36).slice(2, 10);

export const actions = {
  isWatched(asin: string) {
    return state.collections.some((c) => c.asins.includes(asin));
  },
  toggleWatch(asin: string, collectionId = "default") {
    const watched = state.collections.some((c) => c.asins.includes(asin));
    save({
      ...state,
      collections: state.collections.map((c) =>
        watched ? { ...c, asins: c.asins.filter((a) => a !== asin) } : c.id === collectionId ? { ...c, asins: [...c.asins, asin] } : c,
      ),
    });
  },
  setInCollection(asin: string, collectionId: string, on: boolean) {
    save({
      ...state,
      collections: state.collections.map((c) =>
        c.id !== collectionId ? c : on ? { ...c, asins: c.asins.includes(asin) ? c.asins : [...c.asins, asin] } : { ...c, asins: c.asins.filter((a) => a !== asin) },
      ),
    });
  },
  createCollection(name: string) {
    const c = { id: uid(), name: name.trim() || "Untitled", asins: [] };
    save({ ...state, collections: [...state.collections, c] });
    return c.id;
  },
  deleteCollection(id: string) {
    if (id === "default") return;
    save({ ...state, collections: state.collections.filter((c) => c.id !== id) });
  },
  addAlert(rule: Omit<AlertRule, "id" | "enabled">) {
    save({ ...state, alerts: [...state.alerts, { ...rule, id: uid(), enabled: true }] });
  },
  toggleAlert(id: string) {
    save({ ...state, alerts: state.alerts.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a)) });
  },
  removeAlert(id: string) {
    save({ ...state, alerts: state.alerts.filter((a) => a.id !== id) });
  },
  toggleCompare(asin: string): boolean {
    if (state.compare.includes(asin)) {
      save({ ...state, compare: state.compare.filter((a) => a !== asin) });
      return true;
    }
    if (state.compare.length >= MAX_COMPARE) return false;
    save({ ...state, compare: [...state.compare, asin] });
    return true;
  },
  setCompare(asins: string[]) {
    save({ ...state, compare: asins.slice(0, MAX_COMPARE) });
  },
};
