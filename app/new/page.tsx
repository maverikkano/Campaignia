"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { LIMITS } from "@/lib/constants";
import { activeCampaign, blankCampaignFromDraft, parseStake, stakeholderSealMessage, validateDraft, fmtRs } from "@/lib/domain";
import { addDays, todayYMD } from "@/lib/dates";
import type { Draft } from "@/lib/types";
import { Button, Card, FieldError, Input, Label, Textarea } from "@/components/ui";

const STEP_FIELDS: Record<number, (keyof Draft | "criteria")[]> = {
  1: ["objective", "source", "criteria"],
  2: ["stake", "holderType", "holderName"],
  3: ["treatWhat", "treatDetails", "treatDate", "charityName", "charityDetails"],
  4: ["verdictDate", "treatDate"],
  5: ["obstacleSituation", "obstacleResponse", "nextAction"],
  6: [],
};

function blankDraft(): Draft {
  const today = todayYMD();
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

function SealMessageCopy({ draft }: { draft: Draft }) {
  const [label, setLabel] = useState("Copy");
  const text = stakeholderSealMessage({
    holder: { name: draft.holderName },
    objective: draft.objective,
    source: draft.source,
    criteria: draft.criteria,
    stake: parseStake(draft.stake).value ?? 0,
    verdictDate: draft.verdictDate,
    treat: { what: draft.treatWhat },
    charity: { name: draft.charityName },
  });
  return (
    <div className="mt-6">
      <h2 className="text-xl font-semibold">Message to the stakeholder</h2>
      <Textarea readOnly className="mt-2 min-h-[220px] font-mono text-[15px]" value={text} />
      <Button
        variant="secondary"
        className="mt-2"
        onClick={async () => {
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
          setLabel("Copied");
          setTimeout(() => setLabel("Copy"), 1500);
        }}
      >
        {label}
      </Button>
    </div>
  );
}

export default function NewPage() {
  const { state, loaded, upsert } = useStore();
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(blankDraft);
  const [step, setStep] = useState(1);
  const [errStep, setErrStep] = useState(0);
  const [stakeMoved, setStakeMoved] = useState(false);

  const active = useMemo(() => activeCampaign(state.campaigns), [state]);
  if (loaded && active) {
    router.replace("/");
    return <p className="text-muted-foreground">A campaign is already active.</p>;
  }

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const full = validateDraft(draft, todayYMD());
  const errs = errStep === step ? Object.fromEntries(STEP_FIELDS[step].filter((f) => (full as Record<string, string>)[f]).map((f) => [f, (full as Record<string, string>)[f]])) as typeof full : {};
  const hasErr = Object.keys(full).length > 0;

  const next = () => {
    const stepErr = Object.fromEntries(
      STEP_FIELDS[step].filter((f) => (full as Record<string, string>)[f]).map((f) => [f, (full as Record<string, string>)[f]])
    );
    if (Object.keys(stepErr).length) {
      setErrStep(step);
      return;
    }
    setErrStep(0);
    setStep((s) => s + 1);
    window.scrollTo(0, 0);
  };

  const seal = () => {
    const errs2 = validateDraft(draft, todayYMD());
    if (Object.keys(errs2).length || !stakeMoved) return;
    const c = blankCampaignFromDraft(draft, todayYMD());
    upsert(c);
    router.push("/");
  };

  return (
    <div>
      <h1 className="text-3xl font-semibold">Start a campaign</h1>
      <p className="mt-1 text-[15px] text-muted-foreground">Step {step} of 6.</p>

      {step === 1 && (
        <div className="mt-4">
          <Label htmlFor="wObjective">Objective</Label>
          <Input id="wObjective" value={draft.objective} maxLength={140} onChange={(e) => set({ objective: e.target.value })} aria-describedby={errs.objective ? "wObjective-err" : undefined} />
          <FieldError id="wObjective-err" message={errs.objective} />
          <div className="mt-4">
            <Label htmlFor="wSource">Source</Label>
            <Input id="wSource" value={draft.source} maxLength={120} onChange={(e) => set({ source: e.target.value })} aria-describedby={errs.source ? "wSource-err" : undefined} />
            <p className="mt-1 text-[15px] text-muted-foreground">One book, course, or person. Not a list.</p>
            <FieldError id="wSource-err" message={errs.source} />
          </div>
          <p className="mt-4 font-semibold">Done looks like (2 or 3 criteria)</p>
          <p className="text-[15px] text-muted-foreground">Each criterion should be something a friend could check.</p>
          {draft.criteria.map((c, i) => (
            <div key={i} className="mt-3">
              <Label htmlFor={`wCrit${i}`}>Criterion {i + 1}</Label>
              <Input
                id={`wCrit${i}`}
                value={c}
                maxLength={160}
                placeholder={i === 0 ? "Explain the framework from memory in 5 minutes, no notes." : "Complete 3 recorded pitches, each scored on a checklist I wrote today."}
                onChange={(e) => {
                  const arr = [...draft.criteria];
                  arr[i] = e.target.value;
                  set({ criteria: arr });
                }}
              />
            </div>
          ))}
          <FieldError id="wCrit-err" message={errs.criteria} />
          <div className="mt-3 flex flex-wrap gap-3">
            {draft.criteria.length < 3 && (
              <Button variant="secondary" onClick={() => set({ criteria: [...draft.criteria, ""] })}>
                Add criterion
              </Button>
            )}
            {draft.criteria.length > 2 && (
              <Button variant="secondary" onClick={() => set({ criteria: draft.criteria.slice(0, -1) })}>
                Remove last
              </Button>
            )}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="mt-4">
          <Label htmlFor="wStake">Stake (Rs)</Label>
          <Input id="wStake" value={draft.stake} placeholder="1000" inputMode="numeric" onChange={(e) => set({ stake: e.target.value })} aria-describedby={errs.stake ? "wStake-err" : undefined} />
          <p className="mt-1 text-[15px] text-muted-foreground">Should sting a little. If you would shrug off losing it, raise it.</p>
          <FieldError id="wStake-err" message={errs.stake} />
          <p className="mt-4 font-semibold">Who holds the stake</p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            {(["person", "pot"] as const).map((t) => (
              <label key={t} className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-md border px-4 py-2">
                <input type="radio" name="holderType" value={t} checked={draft.holderType === t} onChange={() => set({ holderType: t })} />
                {t === "person" ? "A person holds it" : "A separate pot"}
              </label>
            ))}
          </div>
          <FieldError id="holder-err" message={errs.holderType} />
          {draft.holderType === "person" && (
            <div className="mt-4">
              <Label htmlFor="wHolderName">Holder name</Label>
              <Input id="wHolderName" value={draft.holderName} maxLength={60} onChange={(e) => set({ holderName: e.target.value })} />
              <FieldError id="wHolderName-err" message={errs.holderName} />
            </div>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="mt-4">
          <h2 className="text-xl font-semibold">If I finish</h2>
          <div className="mt-2">
            <Label htmlFor="wTreatWhat">Treat</Label>
            <Input id="wTreatWhat" value={draft.treatWhat} maxLength={120} onChange={(e) => set({ treatWhat: e.target.value })} />
            <p className="mt-1 text-[15px] text-muted-foreground">Specific. What, not just something nice.</p>
            <FieldError id="wTreatWhat-err" message={errs.treatWhat} />
          </div>
          <div className="mt-4">
            <Label htmlFor="wTreatDetails">Treat details (optional)</Label>
            <Input id="wTreatDetails" value={draft.treatDetails} maxLength={160} onChange={(e) => set({ treatDetails: e.target.value })} />
            <p className="mt-1 text-[15px] text-muted-foreground">Where, with whom, which evening.</p>
            <FieldError id="wTreatDetails-err" message={errs.treatDetails} />
          </div>
          <div className="mt-4">
            <Label htmlFor="wTreatDate">Treat date</Label>
            <Input id="wTreatDate" type="date" value={draft.treatDate} onChange={(e) => set({ treatDate: e.target.value })} />
            <FieldError id="wTreatDate-err" message={errs.treatDate} />
          </div>
          <h2 className="mt-7 text-xl font-semibold">If I do not</h2>
          <div className="mt-2">
            <Label htmlFor="wCharityName">Charity</Label>
            <Input id="wCharityName" value={draft.charityName} maxLength={80} onChange={(e) => set({ charityName: e.target.value })} />
            <FieldError id="wCharityName-err" message={errs.charityName} />
          </div>
          <div className="mt-4">
            <Label htmlFor="wCharityDetails">How to donate (optional)</Label>
            <Input id="wCharityDetails" value={draft.charityDetails} maxLength={160} onChange={(e) => set({ charityDetails: e.target.value })} />
            <p className="mt-1 text-[15px] text-muted-foreground">Link, UPI id, how to donate.</p>
            <FieldError id="wCharityDetails-err" message={errs.charityDetails} />
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="mt-4">
          <Label htmlFor="wStart">Start date</Label>
          <Input id="wStart" type="date" value={todayYMD()} disabled aria-disabled="true" />
          <div className="mt-4">
            <Label htmlFor="wVerdictDate">Verdict date</Label>
            <Input id="wVerdictDate" type="date" value={draft.verdictDate} onChange={(e) => set({ verdictDate: e.target.value })} />
            <p className="mt-1 text-[15px] text-muted-foreground">Between 3 and 30 days from today. Defaults to 7 days.</p>
            <FieldError id="wVerdictDate-err" message={errs.verdictDate} />
          </div>
          {errs.treatDate && <p className="mt-3 border-l-2 border-primary pl-2.5 text-sm">Treat date problem: {errs.treatDate} Go back to step 3 to fix it.</p>}
        </div>
      )}

      {step === 5 && (
        <div className="mt-4">
          <Label htmlFor="wObSit">The most likely thing that will pull me off.</Label>
          <Input id="wObSit" value={draft.obstacleSituation} maxLength={140} onChange={(e) => set({ obstacleSituation: e.target.value })} />
          <FieldError id="wObSit-err" message={errs.obstacleSituation} />
          <div className="mt-4">
            <Label htmlFor="wObRes">Then I will ...</Label>
            <Input id="wObRes" value={draft.obstacleResponse} maxLength={140} onChange={(e) => set({ obstacleResponse: e.target.value })} />
            <FieldError id="wObRes-err" message={errs.obstacleResponse} />
          </div>
          <div className="mt-4">
            <Label htmlFor="wNext">The very first concrete step.</Label>
            <Input id="wNext" value={draft.nextAction} maxLength={140} onChange={(e) => set({ nextAction: e.target.value })} />
            <FieldError id="wNext-err" message={errs.nextAction} />
          </div>
        </div>
      )}

      {step === 6 && (
        <div className="mt-4">
          <Card>
            <h2 className="text-xl font-semibold">Review</h2>
            <div className="mt-2 space-y-2 text-[15px]">
              <p><strong>Objective:</strong> {draft.objective}</p>
              <p><strong>Source:</strong> {draft.source}</p>
              <p><strong>Criteria:</strong> {draft.criteria.join(" / ")}</p>
              <p><strong>Stake:</strong> {parseStake(draft.stake).value ? fmtRs(parseStake(draft.stake).value!) : draft.stake}</p>
              <p><strong>Holder:</strong> {draft.holderType === "person" ? draft.holderName : "Separate pot"}</p>
              <p><strong>Treat:</strong> {draft.treatWhat} on {draft.treatDate}</p>
              <p><strong>Charity:</strong> {draft.charityName}</p>
              <p><strong>Verdict date:</strong> {draft.verdictDate}</p>
              <p><strong>Obstacle:</strong> If {draft.obstacleSituation}, then I will {draft.obstacleResponse}.</p>
              <p><strong>Next action:</strong> {draft.nextAction}</p>
            </div>
          </Card>
          {hasErr && (
            <Card className="mt-3">
              <p>Some fields still need attention. Go back and fix them.</p>
              <ul className="mt-2 list-disc pl-5 text-sm">
                {Object.entries(full).map(([k, v]) => (
                  <li key={k}>{k}: {v}</li>
                ))}
              </ul>
            </Card>
          )}
          {draft.holderType === "person" && !hasErr && (
            <SealMessageCopy draft={draft} />
          )}
          {draft.holderType === "pot" && !hasErr && (
            <p className="mt-4 text-muted-foreground">
              Checklist: Move {parseStake(draft.stake).value ? fmtRs(parseStake(draft.stake).value!) : "the stake"} to your separate pot before sealing.
            </p>
          )}
          <p className="mt-4 text-muted-foreground">After this, the finish line and stake cannot be changed.</p>
          <label className="mt-4 flex cursor-pointer items-start gap-2.5">
            <input type="checkbox" checked={stakeMoved} onChange={(e) => setStakeMoved(e.target.checked)} className="mt-1 h-6 w-6 shrink-0" />
            <span>
              I have actually moved {parseStake(draft.stake).value ? fmtRs(parseStake(draft.stake).value!) : "the stake"} to{" "}
              {draft.holderType === "person" ? draft.holderName || "the holder" : "my separate pot"}.
            </span>
          </label>
          <Button className="mt-4" disabled={!stakeMoved} onClick={seal}>
            Seal this campaign
          </Button>
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        {step > 1 && step < 6 && (
          <Button variant="secondary" onClick={() => { setErrStep(0); setStep((s) => s - 1); }}>
            Back
          </Button>
        )}
        {step > 1 && step === 6 && (
          <Button variant="secondary" onClick={() => { setErrStep(0); setStep(5); }}>
            Back
          </Button>
        )}
        {step < 6 && <Button onClick={next}>Next</Button>}
      </div>
    </div>
  );
}
