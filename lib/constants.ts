export const APP_NAME = "Campaignia";
export const CURRENCY = "Rs";
export const STORE_KEY = "pot.v1";
export const PASS_PHRASE = "I met every criterion";
export const FAIL_PHRASE = "I did not meet every criterion";
export const ABANDON_WORD = "abandon";

export const LIMITS = {
  objective: [5, 140],
  source: [2, 120],
  criterion: [8, 160],
  criteriaCount: [2, 3],
  holderName: [1, 60],
  treatWhat: [3, 120],
  treatDetails: [0, 160],
  charityName: [2, 80],
  charityDetails: [0, 160],
  obstacle: [5, 140],
  nextAction: [5, 140],
  evidence: [10, 300],
  verdictMinDays: 3,
  verdictMaxDays: 30,
  verdictDefaultDays: 7,
  treatMaxAfterVerdict: 60,
} as const;
