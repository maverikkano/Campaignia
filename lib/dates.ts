function pad(n: number) {
  return (n < 10 ? "0" : "") + n;
}

export function todayYMD(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseYMD(s: string): { y: number; m: number; d: number } | null {
  if (typeof s !== "string") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const y = +m[1];
  const mo = +m[2];
  const d = +m[3];
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return { y, m: mo, d };
}

export function isValidYMD(s: string): boolean {
  return parseYMD(s) !== null;
}

export function addDays(ymd: string, n: number): string {
  const p = parseYMD(ymd);
  if (!p) return ymd;
  const dt = new Date(p.y, p.m - 1, p.d + n);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

export function diffDays(a: string, b: string): number {
  const pa = parseYMD(a);
  const pb = parseYMD(b);
  if (!pa || !pb) return 0;
  const ua = Date.UTC(pa.y, pa.m - 1, pa.d);
  const ub = Date.UTC(pb.y, pb.m - 1, pb.d);
  return Math.round((ub - ua) / 86400000);
}

export function fmtDate(ymd: string): string {
  const p = parseYMD(ymd);
  if (!p) return ymd;
  const dt = new Date(p.y, p.m - 1, p.d);
  return dt.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

export function countdownText(target: string): string {
  const d = diffDays(todayYMD(), target);
  if (d > 1) return `in ${d} days`;
  if (d === 1) return "tomorrow";
  if (d === 0) return "today";
  return `${Math.abs(d)} ${Math.abs(d) === 1 ? "day ago" : "days ago"}`;
}

export function verdictCountdown(verdictDate: string): string {
  const d = diffDays(todayYMD(), verdictDate);
  if (d > 1) return `in ${d} days`;
  if (d === 1) return "tomorrow";
  return "today";
}

export function dayCountLine(startDate: string, verdictDate: string, today: string): string {
  const total = diffDays(startDate, verdictDate) + 1;
  let d = diffDays(startDate, today) + 1;
  if (d < 1) d = 1;
  if (d > total) d = total;
  return `Day ${d} of ${total}. Verdict ${fmtDate(verdictDate)} (${verdictCountdown(verdictDate)}).`;
}
