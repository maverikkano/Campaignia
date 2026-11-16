"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { calibrationSummary, fmtRs } from "@/lib/domain";
import { fmtDate } from "@/lib/dates";
import { Badge, Card } from "@/components/ui";

export default function HistoryPage() {
  const { state, loaded } = useStore();
  if (!loaded) return <p className="text-muted-foreground">Loading.</p>;

  const settled = state.campaigns
    .filter((c) => c.status === "settled")
    .sort((a, b) => ((b.verdict?.settledAt ?? "") < (a.verdict?.settledAt ?? "") ? -1 : 1));

  if (!settled.length) {
    return (
      <div>
        <h1 className="text-3xl font-semibold">History</h1>
        <p className="mt-3 text-muted-foreground">Settled campaigns will appear here.</p>
      </div>
    );
  }

  const cal = calibrationSummary(settled);

  return (
    <div>
      <h1 className="text-3xl font-semibold">History</h1>
      {cal && (
        <Card className="mt-4">
          <p>{cal.line}</p>
          {cal.advice && <p className="mt-1 text-muted-foreground">{cal.advice}</p>}
        </Card>
      )}
      <ul className="mt-4 divide-y divide-border">
        {settled.map((c) => {
          const label = c.verdict!.outcome === "pass" ? "Pass" : c.verdict!.outcome === "abandoned" ? "Abandoned" : "Fail";
          return (
            <li key={c.id} className="py-3">
              <Link href={`/c/${c.id}`} className="block py-1 hover:underline">
                <span>{c.objective}</span>
                <Badge>{label}</Badge>
                {c.verdict!.payoutDone && <Badge>paid out</Badge>}
              </Link>
              <p className="text-muted-foreground">
                {fmtDate(c.startDate)} to {fmtDate(c.verdictDate)}. {fmtRs(c.stake)}.
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
