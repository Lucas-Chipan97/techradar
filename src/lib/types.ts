export type EventFormat = "in_person" | "online" | "hybrid";

export type EventStatus =
  | "scheduled"
  | "postponed"
  | "cancelled"
  | "completed"
  | "registration_closed";

/** Événement canonique tel qu'exposé au front (table public.events). */
export type TechEvent = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  description: string | null;
  start_at: string;
  end_at: string | null;
  timezone: string;
  status: EventStatus;
  format: EventFormat;
  language: string | null;
  city: string | null;
  venue: string | null;
  address: string | null;
  primary_category: string;
  topics: string[];
  technologies: string[];
  audience: string[];
  level: string | null;
  is_free: boolean;
  price_min: number | null;
  price_max: number | null;
  currency: string;
  organizer_name: string | null;
  canonical_url: string;
  updated_at: string;
};

export type EventFilters = {
  q?: string;
  city?: string;
  category?: string;
  format?: EventFormat;
  free?: boolean;
};
