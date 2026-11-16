"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { fmtRs } from "@/lib/domain";
import { countdownText, fmtDate } from "@/lib/dates";
import { Button, Card, Input, Label } from "@/components/ui";

export default function ResultPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { state, loaded, upsert } = useStore();
  if (!loaded) return <p className="text-muted-foreground">Loading.</p>;

  const c = state.campaigns.find((x) => x.id === params.id);
  if (!c || c.status !== "settled" || !c.verdict) {
    return (
      <div>
        <h1 className="text-3xl font-semibold">Not found</h1>
        <Link href="/" className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-md border border-input px-4 py-2 text-sm font-medium">
          Back to Now
        </Link>
      </div>
    );
  }

  const o = c.verdict.outcome;
  const toggle = (on: boolean) => {
    upsert({
      ...c,
      verdict: { ...c.verdict!, payoutDone: on, payoutDoneAt: on ? new Date().toISOString() : null },
    });
  };

  return (
    <div>
      <h1 className="text-3xl font-semibold">
        {o === "pass" ? "Settled. Passed." : o === "abandoned" ? "Settled. Abandoned." : "Settled. Not passed."}
      </h1>
      <p className="mt-2 text-muted-foreground">{c.objective}</p>

      <Card className="mt-4">
        {o === "pass" ? (
          <>
            <p>
              You met every criterion. {fmtRs(c.stake)} is released. It is for {c.treat.what}, on {fmtDate(c.treat.date)}.
            </p>
            {c.holder.type === "pot" && <p className="mt-2 text-muted-foreground">This treat is only obtainable from this pot.</p>}
            <p className="mt-2 text-muted-foreground">Treat {countdownText(c.treat.date)}.</p>
            <p className="mt-2 text-muted-foreground">When the day comes: phone away, slow down, notice three specific details.</p>
          </>
        ) : (
          <>
            <p>
              {o === "abandoned" ? `Campaign abandoned. ${fmtRs(c.stake)} goes to ${c.charity.name}.` : `Not every criterion was met. ${fmtRs(c.stake)} goes to ${c.charity.name}.`}
            </p>
            {c.charity.details && <p className="mt-2 text-muted-foreground">{c.charity.details}</p>}
            {c.holder.type === "person" && <p className="mt-2 text-muted-foreground">Ask {c.holder.name} to donate and confirm.</p>}
          </>
        )}
      </Card>

      <label className="mt-4 flex cursor-pointer items-start gap-2.5">
        <input type="checkbox" checked={!!c.verdict.payoutDone} onChange={(e) => toggle(e.target.checked)} className="mt-1 h-6 w-6 shrink-0" />
        <span>{o === "pass" ? "Treat enjoyed" : "Donation made"}</span>
      </label>

      <h2 className="mb-2 mt-7 text-xl font-semibold">Reflection</h2>
      <Label htmlFor="refl">What would you change next time. (optional)</Label>
      <Input
        id="refl"
        defaultValue={c.verdict.reflection ?? ""}
        maxLength={200}
        onBlur={(e) => upsert({ ...c, verdict: { ...c.verdict!, reflection: e.target.value } })}
      />

      <div className="mt-6 flex flex-wrap gap-3">
        <Button onClick={() => router.push("/")}>Start the next campaign</Button>
        <Link href="/history" className="inline-flex min-h-[44px] items-center justify-center rounded-md border border-input px-4 py-2 text-sm font-medium">
          History
        </Link>
      </div>
    </div>
  );
}
