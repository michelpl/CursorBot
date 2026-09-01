// text Telegram text UTC mstext
// 1. text10m / 1h30m / 45s / 2dtext
// 2. text HH:MMtext09:00 / 22:30text
// 3. textYYYY-MM-DD HH:MMtext T text
//
// text tz text HH:MM / text"text"text UTC text

export interface ParseTimeOptions {
  now: number; // textUTC mstext
  tz: string; // IANA text "Asia/Shanghai" / "UTC"
  maxAheadDays: number; // text setTimeout text 32-bit text
}

export interface ParseTimeResult {
  at: number; // text UTC mstext 0
  error?: string; // text
}

const RELATIVE_RE = /^(\d+d)?(\d+h)?(\d+m)?(\d+s)?$/;
const HHMM_RE = /^(\d{1,2}):(\d{2})$/;
const ABSOLUTE_RE = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})$/;

export function parseTimeExpr(
  input: string,
  opts: ParseTimeOptions,
): ParseTimeResult {
  const t = input.trim();
  if (!t) return { at: 0, error: "empty" };

  // 1. text
  const m = RELATIVE_RE.exec(t);
  if (m && (m[1] || m[2] || m[3] || m[4])) {
    let ms = 0;
    if (m[1]) ms += parseInt(m[1]) * 86400_000;
    if (m[2]) ms += parseInt(m[2]) * 3600_000;
    if (m[3]) ms += parseInt(m[3]) * 60_000;
    if (m[4]) ms += parseInt(m[4]) * 1000;
    return finalize(opts.now + ms, opts);
  }

  // 2. text HH:MM
  const hm = HHMM_RE.exec(t);
  if (hm) {
    const hh = parseInt(hm[1]!);
    const mm = parseInt(hm[2]!);
    if (hh > 23 || mm > 59) return { at: 0, error: "invalid HH:MM" };
    const at = inTzAt(opts.now, opts.tz, hh, mm);
    // text text text
    const finalAt = at <= opts.now ? at + 86400_000 : at;
    return finalize(finalAt, opts);
  }

  // 3. text YYYY-MM-DD HH:MM
  const ab = ABSOLUTE_RE.exec(t);
  if (ab) {
    const [, y, mo, d, hh, mm] = ab;
    const at = makeTzDate(opts.tz, +y!, +mo! - 1, +d!, +hh!, +mm!);
    if (Number.isNaN(at)) return { at: 0, error: "invalid date" };
    return finalize(at, opts);
  }

  return {
    at: 0,
    error:
      "text 10m / 1h30m / 45s / 09:00 / 2026-05-06 09:00",
  };
}

// text now text tz text yyyy/mm/ddtext hh:mmtext UTC ms
function inTzAt(now: number, tz: string, hh: number, mm: number): number {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(new Date(now));
  const get = (n: string): number =>
    parseInt(parts.find((p) => p.type === n)!.value, 10);
  return makeTzDate(tz, get("year"), get("month") - 1, get("day"), hh, mm);
}

// text tz text (y, m, d, hh, mm) text UTC mstext
// text UTC text utcGuesstext tz text
// text UTC text tz text UTCtext
function makeTzDate(
  tz: string,
  y: number,
  mIdx: number,
  d: number,
  hh: number,
  mm: number,
): number {
  const utcGuess = Date.UTC(y, mIdx, d, hh, mm);
  const tzNow = new Date(utcGuess);
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const parts = fmt.formatToParts(tzNow);
  const get = (n: string): number =>
    parseInt(parts.find((p) => p.type === n)!.value, 10);
  const tzAsUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
  );
  // tzAsUtc text utcGuess text tz text wall-clocktext tz text
  const offset = tzAsUtc - utcGuess;
  return utcGuess - offset;
}

function finalize(at: number, opts: ParseTimeOptions): ParseTimeResult {
  const limit = opts.now + opts.maxAheadDays * 86400_000;
  if (at > limit) {
    return { at: 0, error: `Máximo ${opts.maxAheadDays} dias à frente` };
  }
  if (at < opts.now) {
    return { at: 0, error: "Horário no passado" };
  }
  return { at };
}
