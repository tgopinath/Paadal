import "server-only";
import type { Sql } from "postgres";

export interface RemoteState {
  collections: { id: string; name: string; asins: string[] }[];
  alerts: { id: string; asin: string; type: string; threshold: number; enabled: boolean }[];
}

export type WatchOp =
  | { op: "toggleWatch"; asin: string }
  | { op: "setInCollection"; asin: string; collectionId: string; on: boolean }
  | { op: "createCollection"; name: string }
  | { op: "deleteCollection"; collectionId: string }
  | { op: "addAlert"; asin: string; type: string; threshold: number }
  | { op: "toggleAlert"; id: string }
  | { op: "removeAlert"; id: string }
  | { op: "importLocal"; asins: string[] };

const ALERT_TYPES = new Set(["price_below", "rank_better_than", "trend_score_above", "demand_change_above"]);
const UUID = /^[0-9a-f-]{36}$/i;
const ASIN = /^[A-Z0-9]{10}$/;

export async function ensureDefault(sql: Sql, userId: string): Promise<string> {
  const [w] = await sql<{ id: string }[]>`
    INSERT INTO watchlists (user_id, name, is_default) VALUES (${userId}, 'My watchlist', true)
    ON CONFLICT (user_id) WHERE is_default DO UPDATE SET name = watchlists.name RETURNING id`;
  return w.id;
}

export async function readState(sql: Sql, userId: string): Promise<RemoteState> {
  await ensureDefault(sql, userId);
  const lists = await sql<{ id: string; name: string; is_default: boolean; asins: string[] | null }[]>`
    SELECT w.id, w.name, w.is_default,
      array_remove(array_agg(p.asin ORDER BY wp.added_at), NULL) AS asins
    FROM watchlists w
    LEFT JOIN watchlist_products wp ON wp.watchlist_id = w.id
    LEFT JOIN products p ON p.id = wp.product_id
    WHERE w.user_id = ${userId}
    GROUP BY w.id ORDER BY w.is_default DESC, w.created_at`;
  const alerts = await sql<{ id: string; asin: string; type: string; threshold: number; enabled: boolean }[]>`
    SELECT a.id, p.asin, a.alert_type::text AS type, a.threshold, a.enabled
    FROM alerts a JOIN products p ON p.id = a.product_id
    WHERE a.user_id = ${userId} ORDER BY a.created_at`;
  return {
    collections: lists.map((l) => ({ id: l.is_default ? "default" : l.id, name: l.name, asins: l.asins ?? [] })),
    alerts,
  };
}

/** Applies one change on behalf of `userId`. Every statement is scoped to that user. */
export async function applyOp(sql: Sql, userId: string, op: WatchOp): Promise<void> {
  const productId = async (asin: string) => {
    if (!ASIN.test(asin)) throw new Error("Invalid ASIN");
    const [p] = await sql<{ id: string }[]>`SELECT id FROM products WHERE asin = ${asin}`;
    if (!p) throw new Error("Unknown product");
    return p.id;
  };
  const listId = async (id: string) => {
    if (id === "default") return ensureDefault(sql, userId);
    if (!UUID.test(id)) throw new Error("Invalid collection");
    const [w] = await sql<{ id: string }[]>`SELECT id FROM watchlists WHERE id = ${id} AND user_id = ${userId}`;
    if (!w) throw new Error("Unknown collection");
    return w.id;
  };

  switch (op.op) {
    case "toggleWatch": {
      const pid = await productId(op.asin);
      const removed = await sql`
        DELETE FROM watchlist_products wp USING watchlists w
        WHERE wp.watchlist_id = w.id AND w.user_id = ${userId} AND wp.product_id = ${pid}`;
      if (removed.count === 0) {
        await sql`INSERT INTO watchlist_products (watchlist_id, product_id) VALUES (${await ensureDefault(sql, userId)}, ${pid}) ON CONFLICT DO NOTHING`;
      }
      return;
    }
    case "setInCollection": {
      const [pid, wid] = [await productId(op.asin), await listId(op.collectionId)];
      if (op.on) await sql`INSERT INTO watchlist_products (watchlist_id, product_id) VALUES (${wid}, ${pid}) ON CONFLICT DO NOTHING`;
      else await sql`DELETE FROM watchlist_products WHERE watchlist_id = ${wid} AND product_id = ${pid}`;
      return;
    }
    case "createCollection":
      await sql`INSERT INTO watchlists (user_id, name) VALUES (${userId}, ${String(op.name).trim().slice(0, 80) || "Untitled"})`;
      return;
    case "deleteCollection":
      if (op.collectionId === "default") throw new Error("The default watchlist can't be deleted");
      await sql`DELETE FROM watchlists WHERE id = ${await listId(op.collectionId)} AND user_id = ${userId} AND NOT is_default`;
      return;
    case "addAlert": {
      if (!ALERT_TYPES.has(op.type) || !Number.isFinite(op.threshold) || Math.abs(op.threshold) > 1e9) throw new Error("Invalid alert");
      await sql`INSERT INTO alerts (user_id, product_id, alert_type, threshold) VALUES (${userId}, ${await productId(op.asin)}, ${op.type}::alert_type, ${op.threshold})`;
      return;
    }
    case "toggleAlert":
      if (!UUID.test(op.id)) throw new Error("Invalid alert");
      await sql`UPDATE alerts SET enabled = NOT enabled WHERE id = ${op.id} AND user_id = ${userId}`;
      return;
    case "removeAlert":
      if (!UUID.test(op.id)) throw new Error("Invalid alert");
      await sql`DELETE FROM alerts WHERE id = ${op.id} AND user_id = ${userId}`;
      return;
    case "importLocal": {
      const asins = op.asins.filter((a) => ASIN.test(a)).slice(0, 500);
      if (!asins.length) return;
      const wid = await ensureDefault(sql, userId);
      await sql`
        INSERT INTO watchlist_products (watchlist_id, product_id)
        SELECT ${wid}, id FROM products WHERE asin = ANY(${asins}::text[])
        ON CONFLICT DO NOTHING`;
      return;
    }
  }
}
