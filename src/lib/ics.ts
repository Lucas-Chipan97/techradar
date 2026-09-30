import type { TechEvent } from "./types";
import { formatPlace } from "./format";

const toIcsDate = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

const escape = (s: string) =>
  s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Génère un fichier .ics (RFC 5545) pour un événement. */
export function buildIcs(event: TechEvent) {
  const end = event.end_at ?? new Date(new Date(event.start_at).getTime() + 2 * 3600_000).toISOString();
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TechRadar France//FR",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${event.id}@techradar`,
    `DTSTAMP:${toIcsDate(new Date().toISOString())}`,
    `DTSTART:${toIcsDate(event.start_at)}`,
    `DTEND:${toIcsDate(end)}`,
    `SUMMARY:${escape(event.title)}`,
    `DESCRIPTION:${escape([event.summary, event.canonical_url].filter(Boolean).join("\n\n"))}`,
    `LOCATION:${escape(event.address ?? formatPlace(event))}`,
    `URL:${event.canonical_url}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n") + "\r\n";
}
