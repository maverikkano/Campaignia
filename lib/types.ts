export type CampaignStatus = "active" | "settled";
export type VerdictOutcome = "pass" | "fail" | "abandoned";

export interface Verdict {
  settledAt: string;
  outcome: VerdictOutcome;
  criteriaResults: boolean[];
  evidence: string;
  confirmedBy: "stakeholder" | "phrase" | "abandon";
  reflection: string;
  payoutDone: boolean;
  payoutDoneAt: string | null;
}

export interface Campaign {
  id: string;
  status: CampaignStatus;
  createdAt: string;
  startDate: string;
  verdictDate: string;
  objective: string;
  source: string;
  criteria: string[];
  stake: number;
  holder: { type: "person" | "pot"; name: string };
  stakeMovedAt: string;
  treat: { what: string; details: string; date: string };
  charity: { name: string; details: string };
  obstacle: { situation: string; response: string };
  nextAction: string;
  verdict: Verdict | null;
}

export interface AppState {
  schemaVersion: 1;
  meta: { lastExportAt: string | null };
  campaigns: Campaign[];
}

export interface Draft {
  objective: string;
  source: string;
  criteria: string[];
  stake: string;
  holderType: "person" | "pot";
  holderName: string;
  treatWhat: string;
  treatDetails: string;
  treatDate: string;
  charityName: string;
  charityDetails: string;
  verdictDate: string;
  obstacleSituation: string;
  obstacleResponse: string;
  nextAction: string;
}
