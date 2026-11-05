"use client";
/**
 * Watchlist, collections, alerts and the comparison tray.
 *
 * - Demo mode or signed out: saved on this device (localStorage).
 * - Production and signed in: the account is the source of truth
 *   (/api/watchlist). Changes apply optimistically, then the server's state
 *   replaces the local copy. Items saved on the device before signing in are
 *   added to the account once.
 * The comparison tray always stays on the device.
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
let remote = false;
let remoteChecked = false;
/** Temporary collection ids created optimistically → server ids. */
const aliases = new Map<string, string>();
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
    // In account mode only the comparison tray is kept on the device.
    window.localStorage.setItem(KEY, JSON.stringify(remote ? { ...DEFAULT, compare: next.compare, migrated: true } : next));
  } catch {
    /* storage unavailable (private mode) — keep in memory */
  }
  listeners.forEach((l) => l());
}

type RemoteResponse = { mode: "local" } | { mode: "remote"; collections: Collection[]; alerts: AlertRule[] };

function adopt(r: RemoteResponse) {
  if (r.mode !== "remote") return;
  remote = true;
  for (const [tmp, real] of aliases) if (real === "") {
    const c = [...r.collections].reverse().find((x) => x.name === tmp.split(":")[1]);
    if (c) aliases.set(tmp, c.id);
  }
  save({ ...state, collections: r.collections, alerts: r.alerts as AlertRule[] });
}

async function syncRemote() {
  if (remoteChecked || typeof window === "undefined") return;
  remoteChecked = true;
  try {
    const res = await fetch("/api/watchlist", { cache: "no-store" });
    if (!res.ok) return;
    let r = (await res.json()) as RemoteResponse;
    if (r.mode !== "remote") return;
    // One-time move of device items into the account.
    const raw = window.localStorage.getItem(KEY);
    const local = raw ? (JSON.parse(raw) as Partial<State> & { migrated?: boolean }) : null;
    const localAsins = local && !local.migrated ? [...new Set((local.collections ?? []).flatMap((c) => c.asins))] : [];
    if (localAsins.length) r = await send({ op: "importLocal", asins: localAsins });
    adopt(r);
  } catch {
    /* offline: keep showing the device copy */
  }
}

async function send(op: Record<string, unknown>): Promise<RemoteResponse> {
  const res = await fetch("/api/watchlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(op) });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Request failed");
  return res.json();
}

/** Apply locally now; in account mode, confirm with the server. */
function commit(next: State, op: Record<string, unknown>) {
  save(next);
  if (!remote) return;
  send(op).then(adopt, () => {
    remoteChecked = false;
    void syncRemote(); // server rejected or offline: resync to the truth
  });
}

export function isAccountMode() {
  return remote;
}

function subscribe(l: () => void) {
  load();
  void syncRemote();
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
    commit({
      ...state,
      collections: state.collections.map((c) =>
        watched ? { ...c, asins: c.asins.filter((a) => a !== asin) } : c.id === collectionId ? { ...c, asins: [...c.asins, asin] } : c,
      ),
    }, { op: "toggleWatch", asin });
  },
  setInCollection(asin: string, collectionId: string, on: boolean) {
    commit({
      ...state,
      collections: state.collections.map((c) =>
        c.id !== collectionId ? c : on ? { ...c, asins: c.asins.includes(asin) ? c.asins : [...c.asins, asin] } : { ...c, asins: c.asins.filter((a) => a !== asin) },
      ),
    }, { op: "setInCollection", asin, collectionId, on });
  },
  createCollection(name: string) {
    const clean = name.trim().slice(0, 80) || "Untitled";
    const c = { id: `tmp-${uid()}`, name: clean, asins: [] };
    if (remote) aliases.set(`${c.id}:${clean}`, "");
    commit({ ...state, collections: [...state.collections, c] }, { op: "createCollection", name: clean });
    return c.id;
  },
  /** Maps an optimistic collection id to the server's id once it is known. */
  resolveCollectionId(id: string): string {
    for (const [tmp, real] of aliases) if (tmp.startsWith(`${id}:`) && real) return real;
    return id;
  },
  deleteCollection(id: string) {
    if (id === "default") return;
    commit({ ...state, collections: state.collections.filter((c) => c.id !== id) }, { op: "deleteCollection", collectionId: id });
  },
  addAlert(rule: Omit<AlertRule, "id" | "enabled">) {
    commit({ ...state, alerts: [...state.alerts, { ...rule, id: `tmp-${uid()}`, enabled: true }] }, { op: "addAlert", ...rule });
  },
  toggleAlert(id: string) {
    commit({ ...state, alerts: state.alerts.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a)) }, { op: "toggleAlert", id });
  },
  removeAlert(id: string) {
    commit({ ...state, alerts: state.alerts.filter((a) => a.id !== id) }, { op: "removeAlert", id });
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
