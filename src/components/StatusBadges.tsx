import type { TechEvent } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { Badge } from "./Badge";

/** Prix et statut, toujours avec un libellé explicite (pas seulement une couleur). */
export function StatusBadges({ event }: { event: TechEvent }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {event.status === "cancelled" && <Badge tone="danger">Annulé</Badge>}
      {event.status === "postponed" && <Badge tone="warning">Reporté</Badge>}
      {event.status === "registration_closed" && <Badge tone="warning">Inscriptions closes</Badge>}
      <Badge tone={event.is_free ? "success" : "neutral"}>{formatPrice(event)}</Badge>
    </div>
  );
}
