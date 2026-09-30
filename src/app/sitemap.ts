import type { MetadataRoute } from "next";
import { getUpcomingEvents } from "@/lib/events";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { events } = await getUpcomingEvents({}, 1000);
  return [
    { url: base, changeFrequency: "hourly", priority: 1 },
    ...events.map((e) => ({ url: `${base}/events/${e.slug}`, lastModified: e.updated_at, priority: 0.7 })),
  ];
}
