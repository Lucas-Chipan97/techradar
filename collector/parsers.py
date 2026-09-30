"""Extraction brute des événements : flux iCal et données Schema.org (JSON-LD)."""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import date, datetime, time
from zoneinfo import ZoneInfo

from bs4 import BeautifulSoup
from icalendar import Calendar

PARIS = ZoneInfo("Europe/Paris")


@dataclass
class RawEvent:
    uid: str                       # identifiant stable dans la source (UID iCal ou URL)
    title: str
    start: datetime
    end: datetime | None = None
    description: str | None = None
    url: str | None = None
    location: str | None = None    # texte libre du lieu
    venue: str | None = None
    address: str | None = None
    city: str | None = None
    postal_code: str | None = None
    country: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    organizer: str | None = None
    status: str = "scheduled"
    attendance: str | None = None  # online | hybrid | in_person
    is_free: bool | None = None
    price_min: float | None = None
    price_max: float | None = None
    currency: str | None = None
    raw: dict = field(default_factory=dict, repr=False)


def to_aware(value) -> datetime | None:
    """Convertit date / datetime naïf / chaîne ISO en datetime avec fuseau (Paris par défaut)."""
    if value is None:
        return None
    if isinstance(value, str):
        value = value.strip()
        try:
            value = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            try:
                value = date.fromisoformat(value[:10])
            except ValueError:
                return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=PARIS)
    if isinstance(value, date):  # journée entière : 9 h par défaut
        return datetime.combine(value, time(9, 0), tzinfo=PARIS)
    return None


# ---------------------------------------------------------------- iCal
def parse_ical(content: bytes | str, source_url: str) -> list[RawEvent]:
    cal = Calendar.from_ical(content)
    events: list[RawEvent] = []
    for comp in cal.walk("VEVENT"):
        title = str(comp.get("SUMMARY", "")).strip()
        start = to_aware(comp.decoded("DTSTART", None)) if comp.get("DTSTART") else None
        if not title or not start:
            continue
        end = to_aware(comp.decoded("DTEND", None)) if comp.get("DTEND") else None
        url = str(comp.get("URL", "")).strip() or None
        uid = str(comp.get("UID", "")).strip() or f"{source_url}#{title}#{start.isoformat()}"
        status = str(comp.get("STATUS", "")).upper()
        geo = comp.get("GEO")
        events.append(
            RawEvent(
                uid=uid,
                title=title,
                start=start,
                end=end,
                description=str(comp.get("DESCRIPTION", "")) or None,
                url=url,
                location=str(comp.get("LOCATION", "")) or None,
                organizer=_ical_organizer(comp.get("ORGANIZER")),
                status="cancelled" if status == "CANCELLED" else "scheduled",
                latitude=float(geo.latitude) if geo else None,
                longitude=float(geo.longitude) if geo else None,
            )
        )
    return events


def _ical_organizer(value) -> str | None:
    if not value:
        return None
    name = value.params.get("CN") if hasattr(value, "params") else None
    return str(name).strip('"') if name else None


# ---------------------------------------------------------------- JSON-LD
def parse_jsonld(html_text: str, page_url: str) -> list[RawEvent]:
    soup = BeautifulSoup(html_text, "html.parser")
    events: list[RawEvent] = []
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string or script.get_text() or "")
        except (json.JSONDecodeError, TypeError):
            continue
        for node in _walk(data):
            ev = _event_from_node(node, page_url)
            if ev:
                events.append(ev)
    return events


def _walk(data):
    """Parcourt @graph, listes et ItemList pour trouver tous les nœuds."""
    if isinstance(data, list):
        for item in data:
            yield from _walk(item)
    elif isinstance(data, dict):
        yield data
        for key in ("@graph", "itemListElement", "subEvent", "item"):
            if key in data:
                yield from _walk(data[key])


def _types(node: dict) -> list[str]:
    t = node.get("@type", [])
    return t if isinstance(t, list) else [t]


def _first(value):
    return value[0] if isinstance(value, list) and value else value


def _text(value) -> str | None:
    value = _first(value)
    if isinstance(value, dict):
        value = value.get("name") or value.get("@id")
    return str(value).strip() if value else None


def _event_from_node(node: dict, page_url: str) -> RawEvent | None:
    if not any(isinstance(t, str) and t.endswith("Event") for t in _types(node)):
        return None
    title = _text(node.get("name"))
    start = to_aware(node.get("startDate"))
    if not title or not start:
        return None

    url = _text(node.get("url")) or page_url
    ev = RawEvent(
        uid=_text(node.get("@id")) or url + ("" if url != page_url else f"#{title}#{start.date()}"),
        title=title,
        start=start,
        end=to_aware(node.get("endDate")),
        description=_text(node.get("description")),
        url=url,
        organizer=_text(node.get("organizer")),
        raw=node,
    )

    status = (_text(node.get("eventStatus")) or "").lower()
    if "cancel" in status:
        ev.status = "cancelled"
    elif "postpon" in status or "reschedul" in status:
        ev.status = "postponed"

    mode = (_text(node.get("eventAttendanceMode")) or "").lower()
    ev.attendance = "online" if "online" in mode else "hybrid" if "mixed" in mode else None

    for loc in node.get("location") if isinstance(node.get("location"), list) else [node.get("location")]:
        if isinstance(loc, str):
            ev.location = ev.location or loc
        elif isinstance(loc, dict):
            if "VirtualLocation" in _types(loc):
                ev.attendance = ev.attendance or "online"
                continue
            ev.venue = ev.venue or _text(loc.get("name"))
            addr = loc.get("address")
            if isinstance(addr, dict):
                ev.address = " ".join(
                    filter(None, [_text(addr.get("streetAddress")), _text(addr.get("postalCode")),
                                  _text(addr.get("addressLocality"))])
                ) or None
                ev.city = _text(addr.get("addressLocality"))
                ev.postal_code = _text(addr.get("postalCode"))
                ev.country = _text(addr.get("addressCountry"))
            elif isinstance(addr, str):
                ev.address = addr
            geo = loc.get("geo")
            if isinstance(geo, dict):
                try:
                    ev.latitude, ev.longitude = float(geo["latitude"]), float(geo["longitude"])
                except (KeyError, TypeError, ValueError):
                    pass
            ev.location = ", ".join(filter(None, [ev.venue, ev.address]))

    if node.get("isAccessibleForFree") in (True, "true", "True"):
        ev.is_free = True
    offers = node.get("offers")
    offers = offers if isinstance(offers, list) else [offers] if offers else []
    prices = []
    for offer in offers:
        if not isinstance(offer, dict):
            continue
        for key in ("price", "lowPrice", "highPrice"):
            try:
                prices.append(float(str(offer.get(key)).replace(",", ".")))
            except (TypeError, ValueError):
                pass
        ev.currency = ev.currency or _text(offer.get("priceCurrency"))
    if prices:
        ev.price_min, ev.price_max = min(prices), max(prices)
        if ev.price_max == 0:
            ev.is_free = True
        elif ev.is_free is None:
            ev.is_free = False
    return ev
