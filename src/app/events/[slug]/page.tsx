import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getEventBySlug, getSimilarEvents } from "@/lib/events";
import { formatLongDate, formatPlace, formatPrice, formatTimeRange } from "@/lib/format";
import { getCategory, getFormatLabel } from "@/lib/taxonomy";
import { StatusBadges } from "@/components/StatusBadges";
import { EventRow } from "@/components/EventRow";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const event = await getEventBySlug((await params).slug);
  if (!event) return { title: "Événement introuvable" };
  return {
    title: event.title,
    description: event.summary ?? undefined,
    alternates: { canonical: `/events/${event.slug}` },
  };
}

export default async function EventPage({ params }: PageProps) {
  const event = await getEventBySlug((await params).slug);
  if (!event) notFound();

  const similar = await getSimilarEvents(event);
  const category = getCategory(event.primary_category);
  const closed = event.status === "cancelled" || event.status === "registration_closed";

  const facts: [string, string | null][] = [
    ["Date", formatLongDate(event.start_at)],
    ["Horaire", formatTimeRange(event)],
    ["Lieu", formatPlace(event)],
    ["Format", getFormatLabel(event.format)],
    ["Prix", formatPrice(event)],
    ["Organisateur", event.organizer_name],
    ["Niveau", event.level],
  ];

  // Données structurées Schema.org pour le référencement.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.summary ?? undefined,
    startDate: event.start_at,
    endDate: event.end_at ?? undefined,
    eventStatus: event.status === "cancelled" ? "https://schema.org/EventCancelled" : "https://schema.org/EventScheduled",
    eventAttendanceMode:
      event.format === "online"
        ? "https://schema.org/OnlineEventAttendanceMode"
        : event.format === "hybrid"
          ? "https://schema.org/MixedEventAttendanceMode"
          : "https://schema.org/OfflineEventAttendanceMode",
    location:
      event.format === "online"
        ? { "@type": "VirtualLocation", url: event.canonical_url }
        : { "@type": "Place", name: event.venue ?? event.city, address: event.address ?? event.city },
    organizer: event.organizer_name ? { "@type": "Organization", name: event.organizer_name } : undefined,
    url: event.canonical_url,
  };

  return (
    <article className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 sm:pt-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <Link href="/" className="text-sm font-medium text-muted hover:text-brand-deep">
        Tous les événements
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0">
          {category && <p className="text-sm font-semibold text-brand">{category.label}</p>}
          <h1 className="mt-2 text-[34px] font-extrabold leading-[1.1] tracking-[-0.02em] sm:text-5xl">{event.title}</h1>
          <div className="mt-4">
            <StatusBadges event={event} />
          </div>

          {event.summary && <p className="mt-8 max-w-prose text-xl leading-relaxed">{event.summary}</p>}
          {event.description && (
            <p className="mt-4 max-w-prose text-[17px] leading-relaxed text-ink/80">{event.description}</p>
          )}

          <TagGroup title="Thèmes" items={event.topics} />
          <TagGroup title="Technologies" items={event.technologies} />
          <TagGroup title="Public" items={event.audience} />
        </div>

        <aside className="self-start rounded-card border border-line bg-white p-5 lg:sticky lg:top-24">
          <dl className="divide-y divide-line text-[15px]">
            {facts
              .filter(([, value]) => value)
              .map(([label, value]) => (
                <div key={label} className="grid grid-cols-[7rem_1fr] gap-3 py-2.5 first:pt-0">
                  <dt className="text-muted">{label}</dt>
                  <dd className="font-medium">{value}</dd>
                </div>
              ))}
          </dl>
          <div className="mt-5 grid gap-2">
            <a
              href={event.canonical_url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-button bg-brand px-4 py-3 text-center font-semibold text-white hover:bg-brand-deep"
            >
              {closed ? "Voir la page officielle" : "S'inscrire sur le site officiel"}
            </a>
            <a
              href={`/events/${event.slug}/ics`}
              className="rounded-button border border-line px-4 py-3 text-center font-semibold hover:border-brand/50 hover:text-brand-deep"
            >
              Ajouter à mon agenda
            </a>
          </div>
          <p className="mt-4 text-xs text-muted">
            Mis à jour le {formatLongDate(event.updated_at).toLowerCase()}. Vérifie les informations sur la page officielle
            avant de te déplacer.
          </p>
        </aside>
      </div>

      {similar.length > 0 && (
        <section className="mt-16">
          <h2 className="text-2xl font-bold tracking-tight">Dans la même catégorie</h2>
          <ul className="mt-4 space-y-3">
            {similar.map((e) => (
              <li key={e.id}>
                <EventRow event={e} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}

function TagGroup({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <section className="mt-8">
      <h2 className="text-sm font-semibold text-muted">{title}</h2>
      <ul className="mt-2 flex flex-wrap gap-2 text-sm font-medium">
        {items.map((t) => (
          <li key={t} className="rounded-md bg-white px-2.5 py-1 ring-1 ring-inset ring-line">
            {t}
          </li>
        ))}
      </ul>
    </section>
  );
}
