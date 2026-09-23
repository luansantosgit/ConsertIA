export interface BusinessHourDay {
  open: boolean;
  start: string;
  end: string;
}

export type BusinessHoursConfig = Record<string, BusinessHourDay>;

const DEFAULT_HOURS: BusinessHoursConfig = {
  "0": { open: false, start: "08:00", end: "18:00" },
  "1": { open: true, start: "08:00", end: "18:00" },
  "2": { open: true, start: "08:00", end: "18:00" },
  "3": { open: true, start: "08:00", end: "18:00" },
  "4": { open: true, start: "08:00", end: "18:00" },
  "5": { open: true, start: "08:00", end: "18:00" },
  "6": { open: true, start: "08:00", end: "12:00" },
};

const VALID_TIME = /^\d{1,2}:\d{2}$/;

function sanitizeTime(value: unknown, fallback: string): string {
  const raw = (value ?? "").toString().trim();
  return VALID_TIME.test(raw) ? raw.slice(0, 5) : fallback;
}

interface RawHoursEntry {
  open?: unknown;
  start?: unknown;
  end?: unknown;
}

export function normalizeBusinessHours(raw: unknown): BusinessHoursConfig {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_HOURS };
  const rawMap = raw as Record<string, RawHoursEntry>;
  const result: BusinessHoursConfig = { ...DEFAULT_HOURS };
  for (let day = 0; day <= 6; day++) {
    const entry = rawMap[String(day)];
    if (!entry || typeof entry !== "object") continue;
    result[String(day)] = {
      open: entry.open === true,
      start: sanitizeTime(entry.start, DEFAULT_HOURS[String(day)].start),
      end: sanitizeTime(entry.end, DEFAULT_HOURS[String(day)].end),
    };
  }
  return result;
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function weekdayOf(dateIso: string): number {
  const [y, m, d] = dateIso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function isOpenAt(hours: BusinessHoursConfig | undefined, dateIso: string, hhmm: string): boolean {
  const day = hours?.[String(weekdayOf(dateIso))];
  if (!day?.open) return false;
  const time = toMinutes(hhmm);
  return time >= toMinutes(day.start) && time < toMinutes(day.end);
}

export function nowInTimezone(timezone: string): { dateIso: string; hhmm: string; weekday: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  const dateIso = `${get("year")}-${get("month")}-${get("day")}`;
  const hhmm = `${get("hour") === "24" ? "00" : get("hour")}:${get("minute")}`;
  return { dateIso, hhmm, weekday: weekdayOf(dateIso) };
}

export function isOpenNow(hours: BusinessHoursConfig | undefined, timezone: string): boolean {
  const { dateIso, hhmm } = nowInTimezone(timezone);
  return isOpenAt(hours, dateIso, hhmm);
}

const WEEKDAY_NAMES = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];

export function businessHoursSummary(hours: BusinessHoursConfig | undefined): string {
  const config = hours && typeof hours === "object" ? hours : { ...DEFAULT_HOURS };
  return WEEKDAY_NAMES.map((name, day) => {
    const entry = config[String(day)];
    return entry?.open ? `${name}: ${entry.start} às ${entry.end}` : `${name}: fechado`;
  }).join(" | ");
}

export function nextOpenDayText(hours: BusinessHoursConfig | undefined, timezone: string): string {
  const config = hours && typeof hours === "object" ? hours : { ...DEFAULT_HOURS };
  const { dateIso, weekday } = nowInTimezone(timezone);
  const [y, m, d] = dateIso.split("-").map(Number);
  for (let i = 0; i <= 7; i++) {
    const date = new Date(Date.UTC(y, m - 1, d + i));
    const iso = date.toISOString().slice(0, 10);
    const dayIndex = (weekday + i) % 7;
    const entry = config[String(dayIndex)];
    if (entry?.open) {
      const br = `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
      return `${WEEKDAY_NAMES[dayIndex]} (${br}) a partir das ${entry.start}`;
    }
  }
  return "";
}
