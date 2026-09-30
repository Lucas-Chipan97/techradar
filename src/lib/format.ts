import type { TechEvent } from "./types";

const TZ = "Europe/Paris";

const dayKeyFmt = new Intl.DateTimeFormat("fr-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const dayNumberFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, day: "numeric" });
const weekdayFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, weekday: "long" });
const monthFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, month: "long" });
const longDateFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, weekday: "long", day: "numeric", month: "long", year: "numeric" });
const timeFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });

/** Clé AAAA-MM-JJ dans le fuseau de Paris, pour regrouper par jour. */
export function dayKey(iso: string) {
  return dayKeyFmt.format(new Date(iso));
}

export function dayParts(iso: string) {
  const d = new Date(iso);
  return { day: dayNumberFmt.format(d), weekday: weekdayFmt.format(d), month: monthFmt.format(d) };
}

export function formatLongDate(iso: string) {
  const s = longDateFmt.format(new Date(iso));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatTime(iso: string) {
  return timeFmt.format(new Date(iso)).replace(":", " h ");
}

export function formatTimeRange(event: TechEvent) {
  const start = formatTime(event.start_at);
  if (!event.end_at) return start;
  if (dayKey(event.start_at) !== dayKey(event.end_at)) {
    return `${start}, jusqu'au ${formatLongDate(event.end_at).toLowerCase()}`;
  }
  return `${start} – ${formatTime(event.end_at)}`;
}

export function formatPrice(event: TechEvent) {
  if (event.is_free) return "Gratuit";
  const money = (n: number) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: event.currency, maximumFractionDigits: 0 }).format(n);
  if (event.price_min != null && event.price_max != null && event.price_max !== event.price_min) {
    return `${money(event.price_min)} à ${money(event.price_max)}`;
  }
  if (event.price_min != null) return money(event.price_min);
  return "Prix non communiqué";
}

export function formatPlace(event: TechEvent) {
  if (event.format === "online") return "En ligne";
  const place = [event.venue, event.city].filter(Boolean).join(", ");
  if (event.format === "hybrid") return place ? `${place} et en ligne` : "Hybride";
  return place || "Lieu à confirmer";
}

export function groupByDay(events: TechEvent[]) {
  const groups = new Map<string, TechEvent[]>();
  for (const e of events) {
    const key = dayKey(e.start_at);
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }
  return [...groups.entries()].map(([key, items]) => ({ key, iso: items[0].start_at, events: items }));
}
