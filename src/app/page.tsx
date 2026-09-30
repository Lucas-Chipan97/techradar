import Link from "next/link";
import { getUpcomingEvents } from "@/lib/events";
import { filtersHref, hasFilters, parseFilters } from "@/lib/filters";
import { getCategory } from "@/lib/taxonomy";
import type { EventFilters } from "@/lib/types";
import { Filters } from "@/components/Filters";
import { EventList } from "@/components/EventList";

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** Titre construit à partir des filtres : « 4 événements Data gratuits à venir à Paris ». */
function headline(count: number, f: EventFilters) {
  const plural = count > 1;
  const parts = [`${count} événement${plural ? "s" : ""}`];
  const category = getCategory(f.category);
  if (category) parts.push(category.short);
  if (f.free) parts.push(plural ? "gratuits" : "gratuit");
  parts.push("à venir");
  if (f.city) parts.push(`à ${f.city}`);
  else if (f.format === "online") parts.push("en ligne");
  else parts.push("en France");
  return parts.join(" ");
}

export default async function DiscoverPage({ searchParams }: PageProps) {
  const filters = parseFilters(await searchParams);
  const { events, source, error } = await getUpcomingEvents(filters);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <section className="pb-8 pt-10 sm:pt-16">
        <h1 className="max-w-4xl text-[34px] font-extrabold leading-[1.05] tracking-[-0.03em] sm:text-5xl lg:text-[64px]">
          {headline(events.length, filters)}
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">
          Meetups, conférences, hackathons et salons réunis depuis plusieurs sources, avec un lien vers la page officielle
          de chaque événement.
        </p>
      </section>

      {source === "sample" && (
        <p className="mb-6 rounded-button bg-brand-soft px-4 py-3 text-sm text-brand-deep">
          Données d&apos;exemple affichées. Renseigne les variables Supabase dans <code>.env.local</code> pour afficher ta
          base.
        </p>
      )}

      <Filters filters={filters} />

      <div className="mt-8">
        {error ? (
          <EmptyState
            title="La base d'événements ne répond pas."
            text="Vérifie l'URL et la clé Supabase, ainsi que la règle de lecture sur la table events."
          />
        ) : events.length > 0 ? (
          <EventList events={events} />
        ) : (
          <EmptyState
            title="Aucun événement ne correspond à ces filtres."
            text="Élargis la ville, le format ou la catégorie pour voir plus de résultats."
            action={hasFilters(filters) ? { href: filtersHref({}), label: "Effacer les filtres" } : undefined}
          />
        )}
      </div>
    </div>
  );
}

function EmptyState({ title, text, action }: { title: string; text: string; action?: { href: string; label: string } }) {
  return (
    <div className="rounded-card border border-dashed border-line bg-white px-6 py-12 text-center">
      <p className="text-lg font-semibold">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-muted">{text}</p>
      {action && (
        <Link
          href={action.href}
          className="mt-6 inline-block rounded-button bg-ink px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-deep"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
