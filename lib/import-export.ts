import type { AppState, Campaign } from "./types";

function isYMD(s: unknown): boolean {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function validCampaign(c: unknown): c is Campaign {
  if (!c || typeof c !== "object") return false;
  const o = c as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    (o.status === "active" || o.status === "settled") &&
    typeof o.objective === "string" &&
    Array.isArray(o.criteria) &&
    typeof o.stake === "number" &&
    isYMD(o.startDate) &&
    isYMD(o.verdictDate)
  );
}

export function validateImport(data: unknown): { ok: true; state: AppState } | { ok: false; error: string } {
  if (!data || typeof data !== "object") return { ok: false, error: "File is not valid JSON." };
  const o = data as Record<string, unknown>;
  if (o.schemaVersion !== 1) return { ok: false, error: "Unsupported schema version." };
  if (!Array.isArray(o.campaigns)) return { ok: false, error: "Campaigns list is missing." };
  const campaigns = o.campaigns as unknown[];
  for (const c of campaigns) {
    if (!validCampaign(c)) return { ok: false, error: "A campaign is missing required fields." };
  }
  const active = campaigns.filter((c) => (c as Campaign).status === "active");
  if (active.length > 1) return { ok: false, error: "More than one active campaign." };
  const meta = o.meta as AppState["meta"] | undefined;
  return {
    ok: true,
    state: {
      schemaVersion: 1,
      meta: { lastExportAt: meta?.lastExportAt ?? null },
      campaigns: campaigns as Campaign[],
    },
  };
}
