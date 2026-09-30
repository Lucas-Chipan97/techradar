import type { EventFormat } from "./types";

/** Catégories primaires (section 04 du dossier). Le slug est stocké en base. */
export const CATEGORIES = [
  { slug: "ai", label: "Intelligence artificielle", short: "IA" },
  { slug: "data", label: "Data", short: "Data" },
  { slug: "cloud", label: "Cloud & infrastructure", short: "Cloud" },
  { slug: "cyber", label: "Cybersécurité", short: "Cybersécurité" },
  { slug: "software", label: "Software engineering", short: "Dev" },
  { slug: "devops", label: "DevOps & platform", short: "DevOps" },
  { slug: "product", label: "Product & design", short: "Product" },
  { slug: "startup", label: "Startup & SaaS", short: "Startup" },
  { slug: "deeptech", label: "DeepTech", short: "DeepTech" },
  { slug: "fintech", label: "FinTech & Web3", short: "FinTech" },
] as const;

/** Villes prioritaires du MVP. */
export const CITIES = [
  "Paris",
  "Lyon",
  "Toulouse",
  "Bordeaux",
  "Lille",
  "Nantes",
  "Marseille",
  "Montpellier",
  "Rennes",
  "Grenoble",
  "Nice",
  "Strasbourg",
] as const;

export const FORMATS: { value: EventFormat; label: string }[] = [
  { value: "in_person", label: "Sur place" },
  { value: "online", label: "En ligne" },
  { value: "hybrid", label: "Hybride" },
];

export function getCategory(slug: string | undefined | null) {
  return CATEGORIES.find((c) => c.slug === slug);
}

export function getFormatLabel(format: EventFormat) {
  return FORMATS.find((f) => f.value === format)?.label ?? format;
}
