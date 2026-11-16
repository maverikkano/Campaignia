"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { LIMITS } from "@/lib/constants";
import { activeCampaign, canSettle, expectedPhrase, outcomeFromResults, phaseOf, stakeholderVerdictMessage } from "@/lib/domain";
import { diffDays, todayYMD, fmtDate } from "@/lib/dates";
import { Button, Card, Input, Label, Textarea } from "@/components/ui";

export default function VerdictPage() {
  const { state, loaded, upsert } = useStore();
  const router = useRouter();
  const [results, setResults] = useState<(boolean | null)[]>([]);
  const [evidence, setEvidence] = useState("");
  const [checked, setChecked] = useState(false);
  const [phrase, setPhrase] = useState("");

  if (!loaded) return <p className="text-muted-foreground">Loading.</p>;
  const c = activeCampaign(state.campaigns);
  if (!c) {
    router.replace("/");
    return <p className="text-muted-foreground">No active campaign.</p>;
  }
  const today = todayYMD();
  const ph = phaseOf(c, today);
  if (results.length !== c.criteria.length) {
    setResults(c.criteria.map(() => null));
    return <p className="text-muted-foreground">Loading.</p>;
  }

  if (ph === "running") {
    const k = diffDays(today, c.verdictDate);
    return (
      <div>
        <h1 className="text-3xl font-semibold">Verdict</h1>
        <p className="mt-2 text-muted-foreground">{c.objective}</p>
        <p className="mt-3">
          Verdict unlocks on {fmtDate(c.verdictDate)}. {k} {k === 1 ? "day" : "days"} to go.
        </p>
        <Link href="/" className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-md border border-input px-4 py-2 text-sm font-medium">
          Back
        </Link>
      </div>
    );
  }

  const v = { results, evidence, checked, phrase };
  const ok = canSettle(c, v);
  const allChosen = results.every((r) => r === true || r === false);

  const copyText = async (text: string, btn: HTMLButtonElement) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {}
      document.body.removeChild(ta);
    }
    btn.textContent = "Copied";
    setTimeout(() => (btn.textContent = "Copy"), 1500);
  };

  const settle = () => {
    if (!canSettle(c, v)) return;
    const out = outcomeFromResults(results);
    upsert({
      ...c,
      status: "settled",
      verdict: {
        settledAt: new Date().toISOString(),
        outcome: out,
        criteriaResults: results.map((r) => r === true),
        evidence: evidence.trim(),
        confirmedBy: c.holder.type === "person" ? "stakeholder" : "phrase",
        reflection: "",
        payoutDone: false,
        payoutDoneAt: null,
      },
    });
    router.push(`/c/${c.id}`);
  };

  return (
    <div>
      <h1 className="text-3xl font-semibold">Verdict</h1>
      <p className="mt-2 text-muted-foreground">{c.objective}</p>

      <h2 className="mb-2 mt-7 text-xl font-semibold">Criteria</h2>
      {c.criteria.map((crit, i) => (
        <fieldset key={i} className="mb-3 border-0 p-0">
          <legend className="mb-1.5 text-sm font-semibold">{crit}</legend>
          <div className="flex gap-3">
            {(["met", "not"] as const).map((opt) => (
              <label key={opt} className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-md border px-4 py-2">
                <input
                  type="radio"
                  name={`crit${i}`}
                  checked={(results[i] === true && opt === "met") || (results[i] === false && opt === "not")}
                  onChange={() => {
                    const arr = [...results];
                    arr[i] = opt === "met";
                    setResults(arr);
                  }}
                />
                {opt === "met" ? "Met" : "Not met"}
              </label>
            ))}
          </div>
        </fieldset>
      ))}

      <Label htmlFor="vEvidence">Evidence</Label>
      <Textarea
        id="vEvidence"
        maxLength={300}
        value={evidence}
        placeholder="What you did, or what happened."
        onChange={(e) => setEvidence(e.target.value)}
      />
      <p className="mt-1 text-sm text-muted-foreground">{evidence.trim().length} / 300</p>

      <h2 className="mb-2 mt-7 text-xl font-semibold">Confirmation</h2>
      {c.holder.type === "person" ? (
        <Card>
          <label className="flex cursor-pointer items-start gap-2.5">
            <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="mt-1 h-6 w-6 shrink-0" />
            <span>
              {c.holder.name} has seen my evidence and agrees with this result.
            </span>
          </label>
          <h2 className="mb-2 mt-6 text-xl font-semibold">Message to the stakeholder</h2>
          <Textarea readOnly className="min-h-[220px] font-mono text-[15px]" value={stakeholderVerdictMessage(c, results, evidence)} />
          <Button
            variant="secondary"
            className="mt-2"
            onClick={(e) => copyText(stakeholderVerdictMessage(c, results, evidence), e.target as HTMLButtonElement)}
          >
            Copy
          </Button>
        </Card>
      ) : allChosen ? (
        <div>
          <p className="text-muted-foreground">Type exactly: {expectedPhrase(results)}</p>
          <div className="mt-2">
            <Label htmlFor="vPhrase">Confirmation phrase</Label>
            <Input id="vPhrase" value={phrase} autoComplete="off" onChange={(e) => setPhrase(e.target.value)} />
          </div>
        </div>
      ) : (
        <p className="text-muted-foreground">Choose Met or Not met for every criterion first.</p>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <Button disabled={!ok} onClick={settle}>
          Settle
        </Button>
        <Link href="/" className="inline-flex min-h-[44px] items-center justify-center rounded-md border border-input px-4 py-2 text-sm font-medium">
          Back
        </Link>
      </div>
      <p className="mt-2 text-[13px] text-muted-foreground">
        Evidence needs {LIMITS.evidence[0]} to {LIMITS.evidence[1]} characters.
      </p>
    </div>
  );
}
