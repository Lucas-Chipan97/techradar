import { sampleEvents } from "@/data/sample-events";
import { supabase } from "./supabase";
import type { EventFilters, TechEvent } from "./types";

export type EventsResult = { events: TechEvent[]; source: "supabase" | "sample"; error?: string };

const normalize = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function matchesSample(e: TechEvent, f: EventFilters) {
  if (f.city && e.city !== f.city) return false;
  if (f.category && e.primary_category !== f.category) return false;
  if (f.format && e.format !== f.format) return false;
  if (f.free && !e.is_free) return false;
  if (f.q) {
    const haystack = normalize(
      [e.title, e.summary, e.description, e.organizer_name, ...e.topics, ...e.technologies].join(" "),
    );
    return normalize(f.q).split(/\s+/).every((word) => haystack.includes(word));
  }
  return true;
}

/** Événements à venir, triés par date, avec filtres. */
export async function getUpcomingEvents(filters: EventFilters, limit = 200): Promise<EventsResult> {
  if (!supabase) {
    const events = sampleEvents
      .filter((e) => matchesSample(e, filters))
      .sort((a, b) => a.start_at.localeCompare(b.start_at));
    return { events, source: "sample" };
  }

  // Un événement reste visible jusqu'à sa fin (ou son début s'il n'a pas de fin).
  const now = new Date().toISOString();
  let query = supabase
    .from("events")
    .select("*")
    .or(`end_at.gte.${now},and(end_at.is.null,start_at.gte.${now})`)
    .neq("status", "completed")
    .order("start_at", { ascending: true })
    .limit(limit);

  if (filters.city) query = query.eq("city", filters.city);
  if (filters.category) query = query.eq("primary_category", filters.category);
  if (filters.format) query = query.eq("format", filters.format);
  if (filters.free) query = query.eq("is_free", true);
  if (filters.q) query = query.textSearch("search", filters.q, { type: "websearch", config: "french" });

  const { data, error } = await query;
  if (error) {
    console.error("[events] Supabase:", error.message);
    return { events: [], source: "supabase", error: error.message };
  }
  return { events: (data ?? []) as TechEvent[], source: "supabase" };
}

export async function getEventBySlug(slug: string): Promise<TechEvent | null> {
  if (!supabase) return sampleEvents.find((e) => e.slug === slug) ?? null;
  const { data, error } = await supabase.from("events").select("*").eq("slug", slug).maybeSingle();
  if (error) console.error("[events] Supabase:", error.message);
  return (data as TechEvent | null) ?? null;
}

/** Autres événements de la même catégorie, pour la fiche. */
export async function getSimilarEvents(event: TechEvent, limit = 3) {
  const { events } = await getUpcomingEvents({ category: event.primary_category }, limit + 1);
  return events.filter((e) => e.id !== event.id).slice(0, limit);
}
