"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { activeCampaign, phaseOf, overdueDays } from "@/lib/domain";
import { todayYMD } from "@/lib/dates";
import { Card } from "@/components/ui";
import { PendingList } from "@/components/pending-list";
import { ActiveCampaign } from "@/components/active-campaign";

export default function NowPage() {
  const { state, loaded, storageBlocked, supabaseOn } = useStore();
  if (!loaded) return <p className="text-muted-foreground">Loading.</p>;

  const active = activeCampaign(state.campaigns);
  const today = todayYMD();

  return (
    <div>
      {storageBlocked && (
        <div className="mb-4 border-b pb-3">Your browser is blocking storage. Data will not be saved. Export often.</div>
      )}
      {!supabaseOn && (
        <p className="mb-4 text-sm text-muted-foreground">
          Supabase is not configured. Data stays in this browser. Add Supabase keys to .env.local to sync.
        </p>
      )}
      {!active ? (
        <>
          <h1 className="text-3xl font-semibold">Campaignia</h1>
          {state.campaigns.length === 0 ? (
            <>
              <p className="mt-3 text-muted-foreground">
                Put a stake on one goal. Do the work for a week. Settle honestly: treat yourself or donate.
              </p>
              <Card className="mt-4">
                <p className="font-semibold">How it works</p>
                <ul className="mt-2 list-disc pl-5">
                  <li>Put a stake on one goal.</li>
                  <li>Do the work for a week.</li>
                  <li>Settle honestly: treat yourself or donate.</li>
                </ul>
                <Link href="/new" className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                  Start a campaign
                </Link>
              </Card>
            </>
          ) : (
            <>
              <p className="mt-3 text-muted-foreground">No active campaign.</p>
              <Link href="/new" className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                Start a campaign
              </Link>
            </>
          )}
          <PendingList />
        </>
      ) : (
        <>
          <h1 className="text-3xl font-semibold">{active.objective}</h1>
          {(phaseOf(active, today) === "verdict_ready" || phaseOf(active, today) === "overdue") && (
            <Card className="mt-4 border-2 border-primary">
              <p>Verdict day. Settle your campaign.</p>
              {phaseOf(active, today) === "overdue" && (
                <p className="mt-1 text-muted-foreground">
                  This has been waiting {overdueDays(active, today)} days. Settle it before starting anything new.
                </p>
              )}
              <Link href="/verdict" className="mt-3 inline-flex min-h-[44px] items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                Settle now
              </Link>
            </Card>
          )}
          <ActiveCampaign campaign={active} />
          <PendingList />
        </>
      )}
    </div>
  );
}
