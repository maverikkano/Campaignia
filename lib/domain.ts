import { ABANDON_WORD, FAIL_PHRASE, LIMITS, PASS_PHRASE } from "./constants";
import { addDays, diffDays, fmtDate, isValidYMD } from "./dates";
import type { Campaign, Draft } from "./types";

const inr = new Intl.NumberFormat("en-IN");

export function fmtRs(n: number): string {
  return `Rs ${inr.format(n)}`;
}

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

export function activeCampaign(campaigns: Campaign[]): Campaign | null {
  return campaigns.find((c) => c.status === "active") ?? null;
}

export type Phase = "running" | "verdict_ready" | "overdue";

export function phaseOf(c: Campaign, today: string): Phase {
  const dv = diffDays(today, c.verdictDate);
  if (dv > 0) return "running";
  if (diffDays(c.verdictDate, today) <= 2) return "verdict_ready";
  return "overdue";
}

export function overdueDays(c: Campaign, today: string): number {
  return diffDays(c.verdictDate, today);
}

function lenOk(s: string | undefined, min: number, max: number): boolean {
  const t = (s ?? "").trim();
  return t.length >= min && t.length <= max;
}

export function parseStake(raw: unknown): { value?: number; error?: string } {
  if (raw === null || raw === undefined) return { error: "Enter a stake amount." };
  const s = String(raw).trim().replace(/,/g, "").replace(/\s+/g, "");
  if (!s) return { error: "Enter a stake amount." };
  if (s.includes(".")) return { error: "Enter whole rupees, no decimals." };
  if (!/^\d+$/.test(s)) return { error: "Enter whole rupees, digits only." };
  const v = parseInt(s, 10);
  if (!isFinite(v) || v < 1) return { error: "Stake must be at least Rs 1." };
  return { value: v };
}

export type DraftErrors = Partial<Record<keyof Draft | "criteria", string>>;

export function validateDraft(d: Draft, startDate: string): DraftErrors {
  const e: DraftErrors = {};
  if (!lenOk(d.objective, LIMITS.objective[0], LIMITS.objective[1])) e.objective = "Objective must be 5 to 140 characters.";
  if (!lenOk(d.source, LIMITS.source[0], LIMITS.source[1])) e.source = "Source must be 2 to 120 characters.";
  const crits = d.criteria ?? [];
  if (crits.length < 2) e.criteria = "Add at least 2 criteria.";
  else if (crits.length > 3) e.criteria = "Keep at most 3 criteria.";
  else {
    for (const c of crits) {
      if (!lenOk(c, LIMITS.criterion[0], LIMITS.criterion[1])) {
        e.criteria = "Each criterion must be 8 to 160 characters.";
        break;
      }
    }
  }
  const st = parseStake(d.stake);
  if (st.error) e.stake = st.error;
  if (d.holderType !== "person" && d.holderType !== "pot") e.holderType = "Choose who holds the stake.";
  if (d.holderType === "person" && !lenOk(d.holderName, 1, 60)) e.holderName = "Enter the holder name, up to 60 characters.";
  if (!lenOk(d.treatWhat, 3, 120)) e.treatWhat = "Describe the treat specifically, 3 to 120 characters.";
  if ((d.treatDetails ?? "").length > 160) e.treatDetails = "Keep details under 160 characters.";
  if (!lenOk(d.charityName, 2, 80)) e.charityName = "Charity name must be 2 to 80 characters.";
  if ((d.charityDetails ?? "").length > 160) e.charityDetails = "Keep details under 160 characters.";
  const start = startDate;
  if (!isValidYMD(d.verdictDate)) e.verdictDate = "Pick a verdict date.";
  else if (diffDays(start, d.verdictDate) < LIMITS.verdictMinDays || diffDays(start, d.verdictDate) > LIMITS.verdictMaxDays) {
    e.verdictDate = "Verdict must be 3 to 30 days after the start.";
  }
  if (!isValidYMD(d.treatDate)) e.treatDate = "Pick a treat date.";
  else if (isValidYMD(d.verdictDate)) {
    if (diffDays(d.verdictDate, d.treatDate) < 0) e.treatDate = "Treat date cannot be before the verdict date.";
    else if (diffDays(d.verdictDate, d.treatDate) > LIMITS.treatMaxAfterVerdict)
      e.treatDate = "Treat date must be within 60 days after the verdict.";
  }
  if (!lenOk(d.obstacleSituation, 5, 140)) e.obstacleSituation = "Name what will pull you off, 5 to 140 characters.";
  if (!lenOk(d.obstacleResponse, 5, 140)) e.obstacleResponse = "Write what you will do instead, 5 to 140 characters.";
  if (!lenOk(d.nextAction, 5, 140)) e.nextAction = "Write the first concrete step, 5 to 140 characters.";
  return e;
}

const LOCKED_FIELDS = ["objective", "source", "criteria", "stake", "holder", "treat", "charity", "startDate", "verdictDate"];

export function updateActiveCampaign(
  campaign: Campaign,
  patch: { nextAction?: string; obstacleSituation?: string; obstacleResponse?: string } & Record<string, unknown>
): { ok?: true; error?: string } {
  for (const k in patch) {
    if (LOCKED_FIELDS.includes(k)) return { error: `Field ${k} is locked after sealing.` };
  }
  const allowed = ["nextAction", "obstacleSituation", "obstacleResponse"];
  for (const k in patch) {
    if (!allowed.includes(k)) return { error: `Field ${k} cannot be updated.` };
  }
  if (patch.nextAction !== undefined && !lenOk(patch.nextAction as string, 5, 140))
    return { error: "Next action must be 5 to 140 characters." };
  if (patch.obstacleSituation !== undefined && !lenOk(patch.obstacleSituation as string, 5, 140))
    return { error: "Obstacle must be 5 to 140 characters." };
  if (patch.obstacleResponse !== undefined && !lenOk(patch.obstacleResponse as string, 5, 140))
    return { error: "Response must be 5 to 140 characters." };
  if (patch.nextAction !== undefined) campaign.nextAction = (patch.nextAction as string).trim();
  if (patch.obstacleSituation !== undefined) campaign.obstacle.situation = (patch.obstacleSituation as string).trim();
  if (patch.obstacleResponse !== undefined) campaign.obstacle.response = (patch.obstacleResponse as string).trim();
  return { ok: true };
}

export function outcomeFromResults(results: (boolean | null)[]): "pass" | "fail" {
  if (!results.length) return "fail";
  for (const r of results) if (!r) return "fail";
  return "pass";
}

export function expectedPhrase(results: (boolean | null)[]): string {
  return outcomeFromResults(results) === "pass" ? PASS_PHRASE : FAIL_PHRASE;
}

export function phraseMatches(input: string | undefined, expected: string): boolean {
  return String(input ?? "").trim().toLowerCase() === expected.toLowerCase();
}

export function canSettle(
  c: Campaign,
  v: { results: (boolean | null)[]; evidence: string; checked: boolean; phrase: string }
): boolean {
  if (!v.results.every((r) => r === true || r === false)) return false;
  const t = (v.evidence ?? "").trim();
  if (t.length < LIMITS.evidence[0] || t.length > LIMITS.evidence[1]) return false;
  if (c.holder.type === "person") return !!v.checked;
  return phraseMatches(v.phrase, expectedPhrase(v.results));
}

export function calibrationSummary(settledNewestFirst: Campaign[]): { line: string; advice: string } | null {
  if (settledNewestFirst.length < 3) return null;
  const last5 = settledNewestFirst.slice(0, 5);
  const passes = last5.filter((c) => c.verdict?.outcome === "pass").length;
  const line = `Passed ${passes} of ${last5.length}.`;
  const last3 = settledNewestFirst.slice(0, 3).map((c) => c.verdict!.outcome);
  let advice = "";
  if (last3.every((o) => o === "pass")) advice = "You have passed your last 3. Consider a higher stake or tighter criteria.";
  else if (last3.every((o) => o === "fail" || o === "abandoned")) advice = "Your last 3 did not land. Consider a narrower objective.";
  return { line, advice };
}

export function stakeholderSealMessage(c: {
  holder: { name: string };
  objective: string;
  source: string;
  criteria: string[];
  stake: number;
  verdictDate: string;
  treat: { what: string };
  charity: { name: string };
}): string {
  const lines = [
    `Hi ${c.holder.name},`,
    "",
    `I am starting a commitment: ${c.objective}`,
    `Source: ${c.source}`,
    "",
    "Done looks like:",
    ...c.criteria.map((crit, i) => `${i + 1}. ${crit}`),
    "",
    `I have moved Rs ${inr.format(c.stake)} to you to hold. On ${fmtDate(c.verdictDate)} I will show you my evidence.`,
    `If I met every criterion, please release the money to me; it is for ${c.treat.what}.`,
    `If not, please donate it to ${c.charity.name} and let me know once it is done.`,
    "Please do not let me renegotiate the criteria.",
  ];
  return lines.join("\n");
}

export function stakeholderVerdictMessage(
  c: { holder: { name: string }; objective: string; criteria: string[] },
  results: (boolean | null)[],
  evidence: string
): string {
  const lines = [
    `Hi ${c.holder.name},`,
    "",
    `Verdict on: ${c.objective}`,
    "",
    ...c.criteria.map(
      (crit, i) => `${i + 1}. ${crit} [${results[i] === true ? "Met" : results[i] === false ? "Not met" : "Undecided"}]`
    ),
    "",
    `Evidence: ${(evidence ?? "").trim()}`,
    "Do you agree with this result?",
  ];
  return lines.join("\n");
}

export function defaultDraft(today: string): Draft {
  const verdict = addDays(today, LIMITS.verdictDefaultDays);
  return {
    objective: "",
    source: "",
    criteria: ["", ""],
    stake: "",
    holderType: "person",
    holderName: "",
    treatWhat: "",
    treatDetails: "",
    treatDate: verdict,
    charityName: "",
    charityDetails: "",
    verdictDate: verdict,
    obstacleSituation: "",
    obstacleResponse: "",
    nextAction: "",
  };
}

export function blankCampaignFromDraft(d: Draft, start: string): Campaign {
  const st = parseStake(d.stake).value ?? 0;
  return {
    id: uid(),
    status: "active",
    createdAt: new Date().toISOString(),
    startDate: start,
    verdictDate: d.verdictDate,
    objective: d.objective.trim(),
    source: d.source.trim(),
    criteria: d.criteria.map((x) => x.trim()),
    stake: st,
    holder: d.holderType === "person" ? { type: "person", name: d.holderName.trim() } : { type: "pot", name: "" },
    stakeMovedAt: new Date().toISOString(),
    treat: { what: d.treatWhat.trim(), details: (d.treatDetails ?? "").trim(), date: d.treatDate },
    charity: { name: d.charityName.trim(), details: (d.charityDetails ?? "").trim() },
    obstacle: { situation: d.obstacleSituation.trim(), response: d.obstacleResponse.trim() },
    nextAction: d.nextAction.trim(),
    verdict: null,
  };
}

export function abandonCampaign(c: Campaign): void {
  c.status = "settled";
  c.verdict = {
    settledAt: new Date().toISOString(),
    outcome: "abandoned",
    criteriaResults: [],
    evidence: "",
    confirmedBy: "abandon",
    reflection: "",
    payoutDone: false,
    payoutDoneAt: null,
  };
}

export { ABANDON_WORD };
