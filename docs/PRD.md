# PRD: Pot, a quiet commitment ledger

**Working title:** Pot (a single constant `APP_NAME` so it can be renamed in one place)
**Deliverable:** one file, `index.html`, with HTML, CSS and JavaScript inline. No build step, no dependencies, no network calls.
**Audience of this document:** a coding agent. Requirements use MUST / SHOULD / MAY in the RFC sense.

---

## 1. Summary

A personal web app for making **one-week learning commitments with a real money stake**.

For each campaign the user defines:

- an objective, with checkable "done looks like" criteria
- a cash stake (Rs)
- a **treat** they may buy from that stake if they succeed
- a **charity** that receives the stake if they do not
- a verdict date and a treat date

The app is a **ledger and a ritual**. It does not hold money and it does not judge the user. Its job is to make the commitment concrete, keep attention on the next action, build healthy anticipation of the outcome, and force an honest settlement.

## 2. Problem statement

> I drift into consumption instead of finishing what I set out to learn. I want to turn one goal into a commitment with a real stake, a defined finish line, and a specific reward, so the week has a shape, the verdict is honest, and I look forward to something instead of scrolling.

The app serves three moments:

| Moment | Job |
| --- | --- |
| **Day 0 (create)** | Make the commitment real: define the finish line, move the stake, seal it. |
| **Mid-week (active)** | Keep the next action and the obstacle plan in front of the user, with anticipation attached. |
| **Verdict day (settle)** | Settle honestly: criteria checklist, evidence, forced outcome, payout instructions. |

Most of the value is at the edges (day 0 and verdict day), not in the middle.

## 3. Product principles

These resolve any ambiguity in the rest of the document.

1. **Quiet, not sticky.** The app MUST NOT become another feed. No streaks, points, badges, confetti, daily ratings, notifications, sounds, or "come back" nudges. The user opens it deliberately.
2. **Friction where honesty matters.** Locked criteria, locked stake, a verdict that unlocks only on its date, a forced outcome, a typed or witnessed confirmation. Friction is a feature at creation and settlement, and absent everywhere else.
3. **Contrast, not fantasy.** Anticipation of the treat is paired with the obstacle and the next concrete action. The treat is never shown alone (see section 9).
4. **Both outcomes are real.** The treat and the donation get equal visual weight, so failing feels as concrete as passing.
5. **One thing at a time.** One active campaign at a time. One source per campaign.
6. **Ritual over security.** A determined user can edit localStorage or their system clock, and that is out of scope. The app creates honest friction. It is not an anti-cheat system.

## 4. Non-goals (v1)

- Holding, transferring or verifying money, or any payment or UPI integration
- Accounts, sync, sharing, multi-user, or a backend of any kind
- Notifications, reminders, email, calendar export
- Gamification of any kind (see principle 1)
- Daily check-ins, progress logging, mood or enjoyment ratings
- Multiple concurrent active campaigns
- Editing locked fields after sealing, or re-opening a settled campaign
- Internationalization. English only. Currency fixed to Rs.

## 5. Concepts and lifecycle

### 5.1 Campaign lifecycle

```
[Create wizard] --seal--> ACTIVE --settle--> SETTLED (outcome: pass | fail)
                            |
                            +--abandon--> SETTLED (outcome: abandoned, treated as a forfeit)
```

Only two statuses are persisted: `active` and `settled`. Everything else is **derived from dates**.

### 5.2 Derived phases of an active campaign (computed from today vs `verdictDate`)

| Phase | Condition | Behavior |
| --- | --- | --- |
| `running` | today < verdictDate | Verdict is locked. Active screen shows countdown. |
| `verdict_ready` | today >= verdictDate | Verdict unlocks. Home shows a prominent "Verdict day" call to action. |
| `overdue` | today > verdictDate + 2 days | Gentle plain-text notice. No penalty, no auto-forfeit. The campaign keeps blocking new campaigns, which is the natural pressure. |

### 5.3 Settled outcomes

| Outcome | Meaning | Payout instruction shown |
| --- | --- | --- |
| `pass` | Every criterion was met | Stake is released to the user, spendable only on the treat |
| `fail` | At least one criterion was not met | Stake is donated to the charity |
| `abandoned` | User quit before verdict | Same as `fail`; counted as a fail in stats |

**The user does not choose the outcome.** It is computed: all criteria checked means `pass`, otherwise `fail`. There is no partial pass.

## 6. Data model

All state is a single JSON document stored under localStorage key `pot.v1`.

```jsonc
{
  "schemaVersion": 1,
  "meta": { "lastExportAt": null },          // ISO string or null
  "campaigns": [ /* Campaign[] */ ]
}
```

```jsonc
// Campaign
{
  "id": "string",                             // crypto.randomUUID() with a fallback
  "status": "active" | "settled",
  "createdAt": "ISO datetime",
  "startDate": "YYYY-MM-DD",                  // always today's local date at sealing
  "verdictDate": "YYYY-MM-DD",
  "objective": "string",
  "source": "string",                         // the single source being used
  "criteria": ["string", "string"],           // 2 or 3 items
  "stake": 1000,                              // integer Rs
  "holder": { "type": "person" | "pot", "name": "string" },
  "stakeMovedAt": "ISO datetime",             // set when user ticks "stake moved"
  "treat": { "what": "string", "details": "string", "date": "YYYY-MM-DD" },
  "charity": { "name": "string", "details": "string" },
  "obstacle": { "situation": "string", "response": "string" },   // if-then plan
  "nextAction": "string",
  "verdict": null | {
    "settledAt": "ISO datetime",
    "outcome": "pass" | "fail" | "abandoned",
    "criteriaResults": [true, false],         // same length as criteria; [] if abandoned
    "evidence": "string",
    "confirmedBy": "stakeholder" | "phrase" | "abandon",
    "reflection": "string",                   // optional, may be ""
    "payoutDone": false,                      // treat enjoyed (pass) or donation made (fail/abandoned)
    "payoutDoneAt": null
  }
}
```

Dates are plain `YYYY-MM-DD` strings in the user's **local** time zone, never UTC ISO strings. See section 12 for date-math rules.

## 7. Business rules

### 7.1 Creation validation

| Field | Rule |
| --- | --- |
| Objective | Required, 5-140 chars. |
| Source | Required, 2-120 chars. One source only. Helper text: "One book, course, or person. Not a list." |
| Criteria | 2 or 3 required, each 8-160 chars. Helper text gives checkable examples (see 10.3). |
| Stake | Required integer >= 1. Helper text: "Should sting a little. If you would shrug off losing it, raise it." |
| Holder | Required choice: **A person** (name required, 1-60 chars) or **A separate pot** (self-held account or envelope). |
| Treat what | Required, 3-120 chars. Helper: "Specific. What, not just 'something nice'." |
| Treat details | Optional, max 160 chars (where, with whom, which evening). |
| Treat date | Required. >= verdictDate and <= verdictDate + 60 days. Defaults to verdictDate. |
| Charity name | Required, 2-80 chars. |
| Charity details | Optional, max 160 chars (link, UPI id, how to donate). |
| Verdict date | Required. Between startDate + 3 and startDate + 30 days. Defaults to startDate + 7. |
| Obstacle situation | Required, 5-140 chars. Prompt: "The most likely thing that will pull me off." |
| Obstacle response | Required, 5-140 chars. Prompt: "Then I will ..." |
| Next action | Required, 5-140 chars. Prompt: "The very first concrete step." |
| Stake moved | Required checkbox, "I have actually moved Rs X to [holder]." Sealing is impossible without it. |

### 7.2 One active campaign

If any campaign has `status === "active"`, "Start a campaign" MUST be disabled and replaced with a pointer to the active one. Direct navigation to the create route in that state MUST redirect to Home.

### 7.3 Locks after sealing

After sealing, these fields are **immutable**: objective, source, criteria, stake, holder, treat (all parts), charity (all parts), startDate, verdictDate.

These remain **editable** while active, because they are tactics and not goalposts: `nextAction`, `obstacle.situation`, `obstacle.response`.

Enforcement MUST be in the domain layer (the update function rejects locked fields), not only by disabling inputs.

### 7.4 Verdict gate

- The Verdict screen is reachable only when phase is `verdict_ready` or `overdue`.
- Before that, the Verdict route shows: "Verdict unlocks on {date}. {n} days to go." and a link back.
- Unlocking happens at local midnight (00:00) of `verdictDate`.

### 7.5 Settlement

1. User ticks each criterion as met or not met.
2. User writes **evidence** (required, 10-300 chars): what they did, or what happened.
3. Confirmation depends on `holder.type`:
   - `person`: a required checkbox, "**{name}** has seen my evidence and agrees with this result."
   - `pot`: user must **type a phrase** exactly (trimmed, case-insensitive). Pass: `I met every criterion`. Fail: `I did not meet every criterion`. Use constants.
4. The outcome is computed (section 5.3). The user cannot override it.
5. The campaign becomes `settled`. This is irreversible.
6. An optional one-line reflection ("What would you change next time?") is offered after settlement. It is saved as `verdict.reflection`.

### 7.6 Abandon

Available on the Active screen via a quiet text link, not a button. It opens a confirm dialog: "Abandoning counts as a forfeit. Rs X goes to {charity}." The user must type `abandon` to confirm. The outcome is `abandoned`, `criteriaResults` is `[]`, and `confirmedBy` is `abandon`.

### 7.7 Payout follow-through

After settlement, the payout is a manual step the app only tracks:

- `pass`: "Treat enjoyed" toggle. Reminder text: "This treat is only obtainable from this pot."
- `fail` / `abandoned`: "Donation made" toggle.

Toggling sets `payoutDone` and `payoutDoneAt`. It MAY be un-toggled. It has no other effect.

## 8. Screens and requirements

Navigation is a minimal top bar: app name (left) and three text links: **Now**, **History**, **Backup**. Use hash routing so the browser back button works: `#/now`, `#/new`, `#/verdict`, `#/history`, `#/backup`. Unknown hashes go to `#/now`.

### 8.1 Now (home)

Shows exactly one of these states:

**A. No active campaign**

- A short empty state: one sentence of what the app is, and a primary button "Start a campaign".
- First run only (zero campaigns ever): a three-line "How it works": *Put a stake on one goal. Do the work for a week. Settle honestly: treat yourself or donate.*
- Below it, a "Pending" list (see D).

**B. Active, phase `running`** : the Active screen (section 8.3).

**C. Active, phase `verdict_ready` or `overdue`**

- A prominent card: "Verdict day. Settle your campaign." with a button to `#/verdict`.
- The Active screen content remains visible below it.
- If `overdue`: one extra line, "This has been waiting {n} days. Settle it before starting anything new."

**D. Pending payouts** (shown in A and C when relevant)

- For each settled campaign with `payoutDone === false`, a one-line item:
  - pass: "Treat: {what}, on {date}" with a countdown ("in 4 days", "today", "{n} days ago"), and a "Treat enjoyed" toggle.
  - fail / abandoned: "Donate Rs {stake} to {charity}" with a "Donation made" toggle.

### 8.2 Create (wizard)

A six-step wizard, one concern per step. The steps give the ritual its weight. Back and Next buttons, a plain "Step n of 6" indicator, per-step validation on Next, and inline error text tied to its field with `aria-describedby`.

1. **Objective.** Objective, source, 2-3 criteria (add and remove rows; minimum 2, maximum 3).
2. **Stake.** Amount, holder type (person or pot), holder name if person.
3. **Outcomes.** Treat (what, details, date) and charity (name, details), laid out as two equal-weight blocks headed "If I finish" and "If I don't".
4. **Dates.** Start date (read-only, today), verdict date. Treat date is set in step 3 but re-validated here against the verdict date. If the verdict date is changed so the treat date becomes invalid, the user is sent back with a clear error.
5. **Obstacle and first step.** The if-then plan and the next action.
6. **Review and seal.**
   - A read-only summary of everything.
   - For `person` holders: a generated, copyable **message to the stakeholder** (see 10.4).
   - The "stake moved" checkbox.
   - A primary button "Seal this campaign". Disabled until the checkbox is ticked.
   - A line before sealing: "After this, the finish line and stake can't be changed."

Draft autosave (SHOULD): persist wizard form state to `pot.v1.draft` on each step change, restore it when the user returns to `#/new`, and clear it on seal. A "Discard draft" link is available.

### 8.3 Active

Top to bottom, in this order:

1. **Header line:** objective, source, and "Day {d} of {n}" with "Verdict {weekday, date}" (plain text countdown, "in {k} days").
2. **Next action** (the visual hero, largest type). Inline-editable, saved on blur or Enter.
3. **Contrast panel:** two equal-weight cards side by side (stacked on narrow screens):
   - "If I finish": treat what, details, date, and "{k} days until" (see section 9).
   - "If I don't": "Rs {stake} to {charity}", with details.
   A single line under the panel: "Earned only if every criterion is met on {verdictDate}."
4. **Obstacle plan:** "If {situation}, then I will {response}." Editable inline.
5. **Finish line:** the criteria as a plain, **non-interactive** list. They are not tickable here. Ticking happens on verdict day.
6. **Holder:** "Stake held {with name | in a separate pot}."
7. **Quiet footer links:** "Abandon campaign" (text link). If no export has ever been made, one muted line: "No backup yet. Export one from Backup."

The Active screen MUST NOT contain: progress rings, percentages, streak counters, motivational quotes, or celebratory copy.

### 8.4 Verdict

Reachable only per 7.4. Layout:

1. Objective and the criteria, each with a **Met / Not met** control (two radio options; no default selection, so the user must actively choose).
2. Evidence textarea with a live character count.
3. Confirmation control per 7.5 (checkbox or typed phrase).
4. A primary button "Settle". Disabled until all criteria have a choice, the evidence is valid, and the confirmation is satisfied.
5. For `person` holders: a generated, copyable message to the stakeholder including the evidence (see 10.4).
6. The outcome preview is **not** shown before settling, so the user can't reverse-engineer a desired result.

### 8.5 Result (after settling)

A calm, plain result screen, shown immediately after settlement and reachable from History.

- **pass:** "You met every criterion. Rs {stake} is released. It's for {treat.what}, on {treat.date}." Plus the pot-only reminder and a countdown to the treat date, then a short savoring prompt: "When the day comes: phone away, slow down, notice three specific details." Plus the "Treat enjoyed" toggle.
- **fail / abandoned:** "Not every criterion was met. Rs {stake} goes to {charity}." Plus the donation details, a message for the stakeholder if applicable ("please donate and confirm"), and the "Donation made" toggle. Tone is neutral. No shaming and no consolation clichés.
- Optional reflection input (one line), saved on blur.
- Link: "Start the next campaign".

### 8.6 History

- A list of settled campaigns, newest first: objective, dates, stake, outcome (text label, e.g. "Pass", "Fail", "Abandoned"), and payout status. Each row opens its Result screen.
- A **calibration summary** above the list, shown only when there are >= 3 settled campaigns. Computed over the **last 5 settled campaigns** (or all of them, if fewer):
  - Pass rate as plain text: "Passed 4 of 5."
  - If the last 3 are all `pass`: "You've passed your last 3. Consider a higher stake or tighter criteria."
  - If the last 3 are all `fail` or `abandoned`: "Your last 3 didn't land. Consider a narrower objective."
  - Otherwise no advice line.
- Empty state: "Settled campaigns will appear here."

### 8.7 Backup

- **Export:** a button downloads `pot-backup-YYYY-MM-DD.json` containing the full state, and sets `meta.lastExportAt`. Show "Last backup: {date or never}".
- **Import:** a file input accepting `.json`. On selecting a file:
  1. Parse and validate (see 11.3).
  2. Show a preview: "{n} campaigns ({m} settled, {a} active)."
  3. Require explicit confirmation: "This replaces everything currently in Pot."
  4. On confirm, replace state.
- Explanatory text, two lines: "Your data lives in this browser only. Clearing site data erases it. Export a backup now and then."

## 9. Anticipation design (key to the product)

The product thesis: anticipation of a reward is pleasurable and motivating, but dwelling on the reward alone can reduce effort. So the app uses **mental contrasting**: reward, then obstacle, then plan.

Requirements:

1. The treat MUST NOT be rendered anywhere without the **next action** and **obstacle plan** on the same screen.
2. The treat is always specific (what, with optional details, on which date). Vague treats are blocked by validation.
3. The treat countdown is plain text ("in 9 days", "tomorrow", "today"), not an animated or decorative element.
4. The "If I don't" card MUST have the same size, typography, and prominence as the "If I finish" card.
5. For passed campaigns where the treat date is in the future, the countdown continues on Home under Pending. Anticipation persists after the verdict.
6. On the treat date itself, the Pending item reads "Today" in the item's primary text. No other effect.
7. No variable or random rewards. The same content appears every time.

## 10. Copy and tone

### 10.1 Voice

Plain, calm, adult. Short sentences. No exclamation marks, no emoji, no cheerleading, no guilt.

### 10.2 Currency and numbers

Display as `Rs 1,000` using `Intl.NumberFormat('en-IN')` with a constant prefix `CURRENCY = 'Rs'`.

### 10.3 Helper-text examples for criteria

Show these as placeholders or help:

- "Explain the framework from memory in 5 minutes, no notes."
- "Complete 3 recorded pitches, each scored on a checklist I wrote today."

Help line: "Each criterion should be something a friend could check."

### 10.4 Stakeholder message templates

Generated client-side and shown in a read-only textarea with a **Copy** button. Copy MUST use `navigator.clipboard.writeText` when available, with a fallback of selecting the textarea text and calling `document.execCommand('copy')`.

**At sealing:**

```
Hi {name},

I'm starting a commitment: {objective}
Source: {source}

Done looks like:
1. {criterion 1}
2. {criterion 2}
3. {criterion 3}

I've moved Rs {stake} to you to hold. On {verdict date} I'll show you my evidence.
If I met every criterion, please release the money to me; it's for {treat.what}.
If not, please donate it to {charity} and let me know once it's done.
Please don't let me renegotiate the criteria.
```

**At verdict:** a short message with the objective, each criterion marked Met or Not met, the evidence, and the line "Do you agree with this result?"

For `pot` holders, step 6 instead shows a one-line checklist: "Move Rs {stake} to your separate pot before sealing."

## 11. Persistence and backup

### 11.1 Storage

- Key `pot.v1` in `localStorage`. Every read and write MUST be wrapped in try/catch.
- If storage is unavailable, show a persistent banner: "Your browser is blocking storage. Data won't be saved. Export often." The app continues with in-memory state.
- Writes are synchronous and happen after every successful mutation.
- Listen to the `storage` event and reload state when another tab changes it.

### 11.2 Schema versioning

State carries `schemaVersion`. On load, if the version is missing or higher than supported, do not overwrite: show a blocking message offering to export the raw data. This leaves room for a future migration function.

### 11.3 Import validation

Reject, with a human-readable error, when any of the following holds:

- the file is not valid JSON
- `schemaVersion` is unsupported
- `campaigns` is not an array
- any campaign lacks required fields or has wrong types
- any campaign has an invalid date string
- there is more than one `active` campaign

Strip unknown fields. Cap file size at 5 MB.

## 12. Technical constraints

- **One file.** `index.html` with `<style>` and `<script>` inline. No external fonts, CDNs, images, or libraries. Works fully offline and from `file://`.
- **Vanilla JS**, ES2018+, no frameworks, no transpile. Targets the current versions of Chrome, Safari, Firefox and Edge, on desktop and mobile.
- **Security:** all user-supplied text MUST be rendered with `textContent` or equivalent, never `innerHTML` with interpolated data. Imported JSON is untrusted.
- **Date math:** treat all dates as `YYYY-MM-DD` strings in local time.
  - Implement `todayYMD()`, `parseYMD()`, `addDays()`, `diffDays(a, b)`.
  - `diffDays` MUST be computed via `Date.UTC(y, m - 1, d)` to avoid DST and timezone errors.
  - Never use `new Date('YYYY-MM-DD')`, which parses as UTC.
- **Code structure** inside one IIFE, with clearly commented sections:
  1. `constants` (APP_NAME, CURRENCY, limits, phrases)
  2. `dates` (pure functions)
  3. `domain` (pure functions: validation, phase derivation, outcome computation, lock enforcement, stats)
  4. `store` (load, save, subscribe, import and export)
  5. `ui` helpers (element builder, formatting, copy-to-clipboard)
  6. `views` (one render function per route)
  7. `router`
  8. `init`
- The domain layer MUST NOT touch the DOM. Views MUST NOT contain business rules.
- **Self-test hook:** navigating to `#/selftest` runs assertions on the domain and date functions and prints PASS/FAIL results to the console and on screen. It MUST cover: `diffDays` across a DST change, phase derivation at each boundary, outcome computation, lock enforcement, one-active rule, import validation rejects, and the calibration summary.
- Target size: under 100 KB.

## 13. Visual design and accessibility

- **Feel:** calm and unhurried, like a well-set page. Lots of whitespace, a single column with `max-width` of about 640px, a generous line height, and large readable type.
- **Fonts:** system stack only. Consider a serif for headings and the Next action, with a sans for UI text.
- **Color:** a warm neutral palette plus **one** accent. Use CSS custom properties on `:root`. Provide a dark theme via `prefers-color-scheme: dark` using the same variable names. Pass and fail outcomes MUST be distinguished by **text labels**, not by red and green.
- **Motion:** minimal. Gentle opacity transitions only, and none at all under `prefers-reduced-motion: reduce`.
- **Accessibility (WCAG 2.1 AA):**
  - Every input has a visible `<label>`.
  - Full keyboard operation, with visible focus rings.
  - Text contrast >= 4.5:1 in both themes.
  - Errors are announced via `aria-live="polite"` and linked with `aria-describedby`.
  - The wizard step change moves focus to the step heading.
  - Dialogs trap focus and close on Escape (or use native `<dialog>`).
  - Touch targets >= 44px.
- Responsive from 320px up. The two-card contrast panel stacks below roughly 560px.

## 14. Edge cases

| Case | Expected behavior |
| --- | --- |
| User opens the app after the verdict date passed long ago | Verdict stays available. Show the overdue notice. No auto-forfeit. |
| Treat date earlier than the verdict date | Blocked by validation. |
| Stake entered as `1,000` or `1000.50` | Strip thousands separators. Reject decimals with a message. |
| Pass with treat date already in the past | Countdown reads "{n} days ago". The toggle is still available. |
| Two tabs open | `storage` event reloads state. Last write wins. |
| localStorage cleared | App shows first-run state. Backup is the only recovery path. |
| Import file with an active campaign while one exists | The import replaces everything, after confirmation. |
| User navigates to `#/verdict` with no active campaign | Redirect to `#/now`. |
| User navigates to `#/new` while one is active | Redirect to `#/now`. |
| Very long text in fields | Wrap and never overflow. Counts and limits per 7.1. |
| System clock moves backwards | The app uses the current clock. No special handling. |

## 15. Acceptance criteria

Each item should be verifiable by hand, and the domain-level items should also be covered by `#/selftest`.

**Creation**

- [ ] I cannot seal a campaign without ticking "stake moved".
- [ ] I cannot proceed past a step with invalid fields, and each error is shown next to its field.
- [ ] A treat date before the verdict date is rejected.
- [ ] The verdict date defaults to today + 7 and cannot be set < 3 or > 30 days out.
- [ ] Choosing a person holder requires a name. Choosing a pot does not.
- [ ] The review step shows a copyable stakeholder message only for person holders.
- [ ] Closing the tab mid-wizard and returning restores my draft (SHOULD).

**Rules**

- [ ] While a campaign is active, "Start a campaign" is disabled and `#/new` redirects to Home.
- [ ] Objective, source, criteria, stake, holder, treat, charity and dates cannot be changed after sealing, even by calling the update function directly.
- [ ] Next action and the obstacle plan remain editable while active.
- [ ] The Verdict screen is unreachable before the verdict date and reachable from 00:00 local on that date.

**Active screen**

- [ ] The next action is the most prominent element.
- [ ] "If I finish" and "If I don't" cards are the same size and weight.
- [ ] The treat is never visible without the next action and obstacle plan on the same screen.
- [ ] There are no streaks, rings, percentages, or celebratory text anywhere.

**Verdict and settlement**

- [ ] Criteria have no default selection. Settle stays disabled until every criterion has a choice, evidence is valid, and confirmation is done.
- [ ] Person holder: a confirmation checkbox is required. Pot holder: the exact typed phrase is required.
- [ ] Outcome is `pass` only if every criterion is Met. Otherwise `fail`. The user cannot override it.
- [ ] Settling is irreversible. The campaign appears in History.
- [ ] Abandon requires typing `abandon` and records outcome `abandoned`.
- [ ] After a pass, the Result screen shows the treat countdown and the pot-only reminder. After a fail, it shows the donation instruction.
- [ ] Payout toggles persist.

**History and calibration**

- [ ] The calibration summary appears only with >= 3 settled campaigns and follows the rules in 8.6.

**Persistence**

- [ ] Reloading the page preserves everything.
- [ ] Export downloads valid JSON. Importing it into a cleared browser restores identical state.
- [ ] Importing a malformed file shows an error and changes nothing.
- [ ] With storage blocked, the banner appears and the app still works in memory.

**Quality**

- [ ] No use of `innerHTML` with user data.
- [ ] Works from `file://` with the network disabled.
- [ ] Keyboard-only completion of the full flow is possible.
- [ ] `#/selftest` passes.
- [ ] Layout is usable at 320px, 768px and 1280px, in light and dark themes.

## 16. Suggested build order

1. **Skeleton:** constants, date utilities, domain types, store with load, save, subscribe, router, empty views. Add `#/selftest` early and extend it as you go.
2. **Create wizard:** all six steps, validation, stakeholder message, draft autosave, sealing.
3. **Active screen:** layout per 8.3, inline editing, countdown text, abandon flow.
4. **Verdict and Result:** gate, checklist, confirmation modes, outcome computation, payout toggles, reflection.
5. **Home logic and History:** phases, Pending list, calibration summary.
6. **Backup:** export, import with validation and preview.
7. **Polish:** theming, a11y pass, responsive pass, reduced motion, size check, run through every acceptance item.

## 17. Assumptions made (confirm or change)

- The pass rule is **all criteria met**. There is no partial credit.
- The start date is always today, with no scheduling for the future.
- Verdict window is 3-30 days (default 7). Treat date may be up to 60 days after the verdict.
- There is **no minimum stake**, only a nudge in the helper text.
- Only one persisted draft exists at a time.
- Currency is Rs, with no multi-currency support.
- The app never auto-forfeits an overdue campaign. The one-active-campaign rule is the pressure.
