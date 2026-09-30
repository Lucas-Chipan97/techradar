import { CITIES, getCategory, FORMATS } from "./taxonomy";
import type { EventFilters, EventFormat } from "./types";

type RawParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;

/** Transforme les paramètres d'URL en filtres validés. */
export function parseFilters(params: RawParams): EventFilters {
  const city = first(params.city);
  const category = first(params.category);
  const format = first(params.format);
  const q = first(params.q)?.slice(0, 100);
  return {
    q,
    city: CITIES.includes(city as (typeof CITIES)[number]) ? city : undefined,
    category: getCategory(category) ? category : undefined,
    format: FORMATS.some((f) => f.value === format) ? (format as EventFormat) : undefined,
    free: first(params.free) === "1" || undefined,
  };
}

/** Construit l'URL de la page Découvrir en modifiant certains filtres. */
export function filtersHref(filters: EventFilters, patch: Partial<EventFilters> = {}) {
  const next = { ...filters, ...patch };
  const sp = new URLSearchParams();
  if (next.q) sp.set("q", next.q);
  if (next.city) sp.set("city", next.city);
  if (next.category) sp.set("category", next.category);
  if (next.format) sp.set("format", next.format);
  if (next.free) sp.set("free", "1");
  const qs = sp.toString();
  return qs ? `/?${qs}` : "/";
}

export function hasFilters(f: EventFilters) {
  return Boolean(f.q || f.city || f.category || f.format || f.free);
}
