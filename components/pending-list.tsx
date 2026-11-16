"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { countdownText, fmtDate } from "@/lib/dates";
import { fmtRs } from "@/lib/domain";
import { Button } from "@/components/ui";

export function PendingList() {
  const { state, upsert } = useStore();
  const pending = state.campaigns.filter((c) => c.status === "settled" && c.verdict && !c.verdict.payoutDone);
  if (!pending.length) return null;
  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold">Pending</h2>
      <ul className="mt-2 divide-y divide-border">
        {pending.map((c) => {
          const o = c.verdict!.outcome;
          const line =
            o === "pass"
              ? `Treat: ${c.treat.what}, on ${fmtDate(c.treat.date)} (${countdownText(c.treat.date)})`
              : `Donate ${fmtRs(c.stake)} to ${c.charity.name}`;
          return (
            <li key={c.id} className="py-3">
              <span>{line}</span>{" "}
              <Link href={`/c/${c.id}`} className="underline underline-offset-4">
                Open
              </Link>{" "}
              <Button
                variant="secondary"
                className="ml-2"
                onClick={() => {
                  upsert({
                    ...c,
                    verdict: { ...c.verdict!, payoutDone: true, payoutDoneAt: new Date().toISOString() },
                  });
                }}
              >
                {o === "pass" ? "Treat enjoyed" : "Donation made"}
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
