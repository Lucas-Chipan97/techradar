import type { TechEvent } from "@/lib/types";
import { dayParts, groupByDay } from "@/lib/format";
import { EventRow } from "./EventRow";

/** Liste façon agenda : un bloc par jour, date à gauche. */
export function EventList({ events }: { events: TechEvent[] }) {
  const groups = groupByDay(events);
  return (
    <ol className="divide-y divide-line border-y border-line">
      {groups.map((group) => {
        const { day, weekday, month } = dayParts(group.iso);
        return (
          <li key={group.key} className="grid gap-4 py-6 md:grid-cols-[9rem_1fr] md:gap-8">
            <h2 className="flex items-baseline gap-2 self-start md:sticky md:top-24 md:flex-col md:gap-0">
              <span className="text-4xl font-bold leading-none tracking-tight tabular-nums">{day}</span>
              <span className="text-sm font-medium text-muted">
                {weekday.charAt(0).toUpperCase() + weekday.slice(1)} {month}
              </span>
            </h2>
            <ul className="space-y-3">
              {group.events.map((e) => (
                <li key={e.id}>
                  <EventRow event={e} />
                </li>
              ))}
            </ul>
          </li>
        );
      })}
    </ol>
  );
}
