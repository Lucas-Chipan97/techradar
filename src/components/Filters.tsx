import Link from "next/link";
import type { EventFilters } from "@/lib/types";
import { CATEGORIES, CITIES, FORMATS } from "@/lib/taxonomy";
import { filtersHref } from "@/lib/filters";

const field =
  "h-11 rounded-button border border-line bg-white px-3 text-[15px] outline-none focus:border-brand";

/** Formulaire GET : fonctionne sans JavaScript et donne des URL partageables. */
export function Filters({ filters }: { filters: EventFilters }) {
  return (
    <div className="space-y-4">
      <form action="/" method="get" role="search" className="grid grid-cols-2 gap-2 lg:grid-cols-[1fr_auto_auto_auto_auto]">
        {filters.category && <input type="hidden" name="category" value={filters.category} />}
        <label className="sr-only" htmlFor="q">Rechercher</label>
        <input
          id="q"
          type="search"
          name="q"
          defaultValue={filters.q}
          placeholder="Databricks, Kubernetes, hackathon…"
          className={`${field} col-span-2 w-full lg:col-span-1`}
        />
        <label className="sr-only" htmlFor="city">Ville</label>
        <select id="city" name="city" defaultValue={filters.city ?? ""} className={`${field} min-w-0`}>
          <option value="">Toutes les villes</option>
          {CITIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <label className="sr-only" htmlFor="format">Format</label>
        <select id="format" name="format" defaultValue={filters.format ?? ""} className={`${field} min-w-0`}>
          <option value="">Tous les formats</option>
          {FORMATS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
        <label className={`${field} flex cursor-pointer items-center gap-2 select-none`}>
          <input type="checkbox" name="free" value="1" defaultChecked={filters.free} className="size-4 accent-brand" />
          Gratuit
        </label>
        <button
          type="submit"
          className="h-11 rounded-button bg-brand px-5 text-[15px] font-semibold text-white hover:bg-brand-deep"
        >
          Filtrer
        </button>
      </form>

      <nav aria-label="Catégories" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="flex gap-2 pb-1 text-sm font-medium whitespace-nowrap">
          <li>
            <CategoryLink href={filtersHref(filters, { category: undefined })} active={!filters.category}>
              Tout
            </CategoryLink>
          </li>
          {CATEGORIES.map((c) => (
            <li key={c.slug}>
              <CategoryLink href={filtersHref(filters, { category: c.slug })} active={filters.category === c.slug}>
                {c.short}
              </CategoryLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

function CategoryLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`inline-block rounded-full px-3.5 py-1.5 ring-1 ring-inset ${
        active ? "bg-ink text-white ring-ink" : "bg-white text-ink ring-line hover:ring-brand/50"
      }`}
    >
      {children}
    </Link>
  );
}
