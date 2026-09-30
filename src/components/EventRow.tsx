import Link from "next/link";
import type { TechEvent } from "@/lib/types";
import { formatPlace, formatTime } from "@/lib/format";
import { getCategory } from "@/lib/taxonomy";
import { StatusBadges } from "./StatusBadges";

export function EventRow({ event }: { event: TechEvent }) {
  const category = getCategory(event.primary_category);
  const cancelled = event.status === "cancelled";
  return (
    <Link
      href={`/events/${event.slug}`}
      className="group grid grid-cols-[4rem_1fr] gap-x-4 gap-y-3 rounded-card border border-line bg-white p-4 transition-colors hover:border-brand/50 sm:grid-cols-[4.5rem_1fr_auto] sm:p-5"
    >
      <p className="pt-0.5 text-sm font-semibold tabular-nums text-muted">
        <time dateTime={event.start_at}>{formatTime(event.start_at)}</time>
      </p>
      <div className="min-w-0">
        <h3
          className={`text-lg font-semibold leading-snug tracking-tight group-hover:text-brand-deep ${cancelled ? "text-muted line-through" : ""}`}
        >
          {event.title}
        </h3>
        <p className="mt-1 text-sm text-muted">{formatPlace(event)}</p>
        {event.summary && <p className="mt-2 line-clamp-2 max-w-prose text-[15px] leading-relaxed">{event.summary}</p>}
        <ul className="mt-3 flex flex-wrap gap-1.5 text-xs font-medium" aria-label="Thèmes">
          {category && <li className="rounded-md bg-brand-soft px-2 py-1 text-brand-deep">{category.short}</li>}
          {[...event.technologies, ...event.topics].slice(0, 3).map((t) => (
            <li key={t} className="rounded-md bg-cloud px-2 py-1 text-ink ring-1 ring-inset ring-line">
              {t}
            </li>
          ))}
        </ul>
      </div>
      <div className="col-start-2 sm:col-start-3 sm:row-start-1">
        <StatusBadges event={event} />
      </div>
    </Link>
  );
}
