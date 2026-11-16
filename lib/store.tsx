"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { STORE_KEY } from "./constants";
import { getSupabase, supabaseConfigured } from "./supabase";
import type { AppState, Campaign } from "./types";

const BLANK: AppState = { schemaVersion: 1, meta: { lastExportAt: null }, campaigns: [] };

function blank(): AppState {
  return { schemaVersion: 1, meta: { lastExportAt: null }, campaigns: [] };
}

function fromLocal(): { state: AppState; blocked: boolean } {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return { state: blank(), blocked: false };
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.schemaVersion !== 1 || !Array.isArray(parsed.campaigns)) {
      return { state: blank(), blocked: true };
    }
    if (!parsed.meta) parsed.meta = { lastExportAt: null };
    return { state: parsed as AppState, blocked: false };
  } catch {
    return { state: blank(), blocked: true };
  }
}

function toRow(c: Campaign) {
  return {
    id: c.id,
    status: c.status,
    created_at: c.createdAt,
    start_date: c.startDate,
    verdict_date: c.verdictDate,
    objective: c.objective,
    source: c.source,
    criteria: c.criteria,
    stake: c.stake,
    holder: c.holder,
    stake_moved_at: c.stakeMovedAt,
    treat: c.treat,
    charity: c.charity,
    obstacle: c.obstacle,
    next_action: c.nextAction,
    verdict: c.verdict,
    updated_at: new Date().toISOString(),
  };
}

function fromRow(r: Record<string, unknown>): Campaign {
  return {
    id: r.id as string,
    status: r.status as Campaign["status"],
    createdAt: r.created_at as string,
    startDate: r.start_date as string,
    verdictDate: r.verdict_date as string,
    objective: r.objective as string,
    source: r.source as string,
    criteria: (r.criteria as string[]) ?? [],
    stake: r.stake as number,
    holder: r.holder as Campaign["holder"],
    stakeMovedAt: (r.stake_moved_at as string) ?? "",
    treat: r.treat as Campaign["treat"],
    charity: r.charity as Campaign["charity"],
    obstacle: r.obstacle as Campaign["obstacle"],
    nextAction: (r.next_action as string) ?? "",
    verdict: (r.verdict as Campaign["verdict"]) ?? null,
  };
}

interface Store {
  state: AppState;
  loaded: boolean;
  storageBlocked: boolean;
  supabaseOn: boolean;
  upsert: (c: Campaign) => void;
  setAll: (s: AppState) => void;
  setLastExportAt: (iso: string) => void;
}

const Ctx = createContext<Store>({
  state: BLANK,
  loaded: false,
  storageBlocked: false,
  supabaseOn: false,
  upsert: () => {},
  setAll: () => {},
  setLastExportAt: () => {},
});

export function useStore(): Store {
  return useContext(Ctx);
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(BLANK);
  const [loaded, setLoaded] = useState(false);
  const [storageBlocked, setStorageBlocked] = useState(false);
  const supabaseOn = supabaseConfigured();

  useEffect(() => {
    let cancelled = false;
    async function init() {
      const sb = getSupabase();
      if (sb) {
        try {
          const { data, error } = await sb.from("campaigns").select("*").order("created_at", { ascending: true });
          if (!error && data) {
            const campaigns = (data as Record<string, unknown>[]).map(fromRow);
            let lastExportAt: string | null = null;
            const metaRes = await sb.from("app_meta").select("*").eq("id", 1).maybeSingle();
            if (!metaRes.error && metaRes.data) lastExportAt = (metaRes.data as { last_export_at: string | null }).last_export_at;
            if (!cancelled) {
              setState({ schemaVersion: 1, meta: { lastExportAt }, campaigns });
              try {
                localStorage.setItem(STORE_KEY, JSON.stringify({ schemaVersion: 1, meta: { lastExportAt }, campaigns }));
              } catch {}
              setLoaded(true);
              return;
            }
          }
        } catch {}
      }
      const { state: local, blocked } = fromLocal();
      if (!cancelled) {
        setState(local);
        setStorageBlocked(blocked);
        setLoaded(true);
      }
    }
    init();
    return () => {
      cancelled = true;
    };
  }, []);

  const persistLocal = useCallback((s: AppState) => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(s));
    } catch {
      setStorageBlocked(true);
    }
  }, []);

  const syncRow = useCallback((c: Campaign) => {
    const sb = getSupabase();
    if (!sb) return;
    sb.from("campaigns").upsert(toRow(c)).then(() => {});
  }, []);

  const upsert = useCallback(
    (c: Campaign) => {
      setState((prev) => {
        const exists = prev.campaigns.some((x) => x.id === c.id);
        const campaigns = exists ? prev.campaigns.map((x) => (x.id === c.id ? c : x)) : [...prev.campaigns, c];
        const next = { ...prev, campaigns };
        persistLocal(next);
        return next;
      });
      syncRow(c);
    },
    [persistLocal, syncRow]
  );

  const setAll = useCallback(
    (s: AppState) => {
      setState(s);
      persistLocal(s);
      const sb = getSupabase();
      if (sb) {
        sb.from("campaigns").delete().neq("id", "__none__").then(() => {
          if (s.campaigns.length) sb.from("campaigns").upsert(s.campaigns.map(toRow)).then(() => {});
        });
      }
    },
    [persistLocal]
  );

  const setLastExportAt = useCallback(
    (iso: string) => {
      setState((prev) => {
        const next = { ...prev, meta: { lastExportAt: iso } };
        persistLocal(next);
        return next;
      });
      const sb = getSupabase();
      if (sb) sb.from("app_meta").upsert({ id: 1, last_export_at: iso }).then(() => {});
    },
    [persistLocal]
  );

  const value = useMemo(
    () => ({ state, loaded, storageBlocked, supabaseOn, upsert, setAll, setLastExportAt }),
    [state, loaded, storageBlocked, supabaseOn, upsert, setAll, setLastExportAt]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
