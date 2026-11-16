"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { abandonCampaign, fmtRs, phaseOf, updateActiveCampaign } from "@/lib/domain";
import { ABANDON_WORD } from "@/lib/constants";
import { countdownText, dayCountLine, fmtDate, todayYMD, verdictCountdown } from "@/lib/dates";
import type { Campaign } from "@/lib/types";
import { Button, Card, FieldError, Input, Label } from "@/components/ui";

export function ActiveCampaign({ campaign }: { campaign: Campaign }) {
  const { upsert } = useStore();
  const today = todayYMD();
  const [editingNext, setEditingNext] = useState(false);
  const [nextVal, setNextVal] = useState(campaign.nextAction);
  const [nextErr, setNextErr] = useState("");
  const [editingOb, setEditingOb] = useState(false);
  const [obS, setObS] = useState(campaign.obstacle.situation);
  const [obR, setObR] = useState(campaign.obstacle.response);
  const [obErr, setObErr] = useState("");
  const [abandoning, setAbandoning] = useState(false);
  const [abandonVal, setAbandonVal] = useState("");
  const [abandonErr, setAbandonErr] = useState("");

  const saveNext = () => {
    const copy = structuredClone(campaign);
    const r = updateActiveCampaign(copy, { nextAction: nextVal });
    if (r.error) {
      setNextErr(r.error);
      return;
    }
    upsert(copy);
    setEditingNext(false);
    setNextErr("");
  };

  const saveOb = () => {
    const copy = structuredClone(campaign);
    const r = updateActiveCampaign(copy, { obstacleSituation: obS, obstacleResponse: obR });
    if (r.error) {
      setObErr(r.error);
      return;
    }
    upsert(copy);
    setEditingOb(false);
    setObErr("");
  };

  return (
    <div>
      <p className="mt-2 text-muted-foreground">
        Source: {campaign.source}. {dayCountLine(campaign.startDate, campaign.verdictDate, today)}
      </p>

      <h2 className="mb-2 mt-7 text-xl font-semibold">Next action</h2>
      <Card>
        {!editingNext ? (
          <>
            <p className="font-serif text-2xl leading-snug">{campaign.nextAction}</p>
            <Button
              variant="secondary"
              className="mt-3"
              onClick={() => {
                setNextVal(campaign.nextAction);
                setNextErr("");
                setEditingNext(true);
              }}
            >
              Edit next action
            </Button>
          </>
        ) : (
          <div>
            <Label htmlFor="editNext">Next action</Label>
            <Input id="editNext" value={nextVal} maxLength={140} onChange={(e) => setNextVal(e.target.value)} autoFocus />
            <FieldError id="editNext-err" message={nextErr} />
            <div className="mt-4 flex flex-wrap gap-3">
              <Button onClick={saveNext}>Save</Button>
              <Button variant="secondary" onClick={() => setEditingNext(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card>
          <h3 className="text-lg font-semibold">If I finish</h3>
          <p className="mt-2">{campaign.treat.what}</p>
          {campaign.treat.details && <p className="text-muted-foreground">{campaign.treat.details}</p>}
          <p className="text-muted-foreground">
            {fmtDate(campaign.treat.date)} ({countdownText(campaign.treat.date)})
          </p>
        </Card>
        <Card>
          <h3 className="text-lg font-semibold">If I do not</h3>
          <p className="mt-2">
            {fmtRs(campaign.stake)} to {campaign.charity.name}
          </p>
          {campaign.charity.details && <p className="text-muted-foreground">{campaign.charity.details}</p>}
        </Card>
      </div>
      <p className="mt-2 text-muted-foreground">
        Earned only if every criterion is met on {fmtDate(campaign.verdictDate)}.
      </p>

      <h2 className="mb-2 mt-7 text-xl font-semibold">Obstacle plan</h2>
      <Card>
        {!editingOb ? (
          <>
            <p>
              If {campaign.obstacle.situation}, then I will {campaign.obstacle.response}.
            </p>
            <Button
              variant="secondary"
              className="mt-3"
              onClick={() => {
                setObS(campaign.obstacle.situation);
                setObR(campaign.obstacle.response);
                setObErr("");
                setEditingOb(true);
              }}
            >
              Edit obstacle plan
            </Button>
          </>
        ) : (
          <div>
            <Label htmlFor="obS">The most likely thing that will pull me off.</Label>
            <Input id="obS" value={obS} maxLength={140} onChange={(e) => setObS(e.target.value)} />
            <div className="mt-3">
              <Label htmlFor="obR">Then I will ...</Label>
              <Input id="obR" value={obR} maxLength={140} onChange={(e) => setObR(e.target.value)} />
            </div>
            <FieldError id="ob-err" message={obErr} />
            <div className="mt-4 flex flex-wrap gap-3">
              <Button onClick={saveOb}>Save</Button>
              <Button variant="secondary" onClick={() => setEditingOb(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Card>

      <h2 className="mb-2 mt-7 text-xl font-semibold">Finish line</h2>
      <ul className="divide-y divide-border">
        {campaign.criteria.map((crit, i) => (
          <li key={i} className="py-2.5">
            {crit}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-muted-foreground">
        {campaign.holder.type === "person" ? `Stake held by ${campaign.holder.name}.` : "Stake held in a separate pot."}
      </p>

      {!abandoning ? (
        <button
          type="button"
          className="mt-4 inline-flex min-h-[44px] items-center text-muted-foreground underline underline-offset-4"
          onClick={() => {
            setAbandonVal("");
            setAbandonErr("");
            setAbandoning(true);
          }}
        >
          Abandon campaign
        </button>
      ) : (
        <Card className="mt-4">
          <h2 className="text-xl font-semibold">Abandon this campaign</h2>
          <p className="mt-2">
            Abandoning counts as a forfeit. {fmtRs(campaign.stake)} goes to {campaign.charity.name}.
          </p>
          <div className="mt-3">
            <Label htmlFor="abandonInp">Type abandon to confirm.</Label>
            <Input
              id="abandonInp"
              value={abandonVal}
              autoComplete="off"
              onChange={(e) => setAbandonVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setAbandoning(false);
              }}
              autoFocus
            />
            <FieldError id="abandon-err" message={abandonErr} />
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              variant="destructive"
              onClick={() => {
                if (abandonVal.trim() !== ABANDON_WORD) {
                  setAbandonErr("Type abandon exactly to confirm.");
                  return;
                }
                const copy = structuredClone(campaign);
                abandonCampaign(copy);
                upsert(copy);
                window.location.href = `/c/${copy.id}`;
              }}
            >
              Abandon
            </Button>
            <Button variant="secondary" onClick={() => setAbandoning(false)}>
              Keep going
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

export function phaseLabel(c: Campaign): string {
  return phaseOf(c, todayYMD());
}

export function verdictLabel(c: Campaign): string {
  return verdictCountdown(c.verdictDate);
}
