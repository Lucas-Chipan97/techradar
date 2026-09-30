#!/usr/bin/env python3
"""
Collecteur TechRadar France.

Lit sources.yaml, récupère chaque source (flux iCal ou page avec JSON-LD Event),
normalise et classe les événements, puis les enregistre dans Supabase.

  python collect.py --dry-run          # affiche le résultat sans rien écrire
  python collect.py                    # écrit dans Supabase
  python collect.py --only "Nom"       # une seule source
"""
from __future__ import annotations

import argparse
import hashlib
import os
import sys
import time
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib import robotparser
from urllib.parse import urlparse

import requests
import yaml
from dotenv import load_dotenv

import normalize as nz
from parsers import PARIS, RawEvent, parse_ical, parse_jsonld
from supabase_client import Supabase, SupabaseError

ROOT = Path(__file__).parent
USER_AGENT = "TechRadarBot/0.1 (agregateur d'evenements tech; contact: remplace-par-ton-email)"
HORIZON_DAYS = 180
FRENCH_COUNTRIES = {"fr", "fra", "france"}

if hasattr(sys.stdout, "reconfigure"):  # accents corrects dans le terminal Windows
    sys.stdout.reconfigure(encoding="utf-8")


@dataclass
class Source:
    name: str
    url: str
    method: str = "ical"
    source_type: str = "community"
    scope: str = "city"
    tech_only: bool = False
    default_category: str | None = None
    default_city: str | None = None
    enabled: bool = True
    is_local: bool = field(init=False, default=False)

    def __post_init__(self):
        self.is_local = not self.url.startswith(("http://", "https://"))

    @property
    def domain(self) -> str:
        return urlparse(self.url).netloc.removeprefix("www.") or "local"


# ------------------------------------------------------------------ récupération
def allowed_by_robots(url: str) -> bool:
    parts = urlparse(url)
    rp = robotparser.RobotFileParser()
    try:
        resp = requests.get(f"{parts.scheme}://{parts.netloc}/robots.txt", timeout=10,
                            headers={"User-Agent": USER_AGENT})
        if resp.status_code >= 400:
            return True  # pas de robots.txt : pas de restriction déclarée
        rp.parse(resp.text.splitlines())
    except requests.RequestException:
        return True
    return rp.can_fetch(USER_AGENT, url)


def fetch(source: Source) -> bytes:
    if source.is_local:
        return (ROOT / source.url).read_bytes()
    if not allowed_by_robots(source.url):
        raise PermissionError("robots.txt interdit la collecte de cette URL")
    resp = requests.get(source.url, timeout=30, headers={"User-Agent": USER_AGENT,
                                                         "Accept-Language": "fr-FR,fr;q=0.9"})
    resp.raise_for_status()
    return resp.content


def extract(source: Source, content: bytes) -> list[RawEvent]:
    if source.method == "ical":
        return parse_ical(content, source.url)
    if source.method == "jsonld":
        return parse_jsonld(content.decode("utf-8", errors="replace"), source.url)
    raise ValueError(f"méthode inconnue : {source.method}")


# ------------------------------------------------------------------ normalisation
def to_row(ev: RawEvent, source: Source, now: datetime) -> tuple[dict | None, str]:
    """Transforme un RawEvent en ligne `events`. Retourne (ligne, raison du rejet)."""
    end = ev.end or ev.start
    if end < now:
        return None, "passé"
    if ev.start > now + timedelta(days=HORIZON_DAYS):
        return None, "trop lointain"
    if ev.country and nz.fold(ev.country) not in FRENCH_COUNTRIES:
        return None, "hors France"

    title = nz.clean_text(ev.title, 200) or ev.title
    description = nz.clean_text(ev.description, 3000)
    category, score = nz.classify(title, description)
    if not category and not source.tech_only:
        return None, "pas tech"
    category = category or source.default_category
    if not category:
        return None, "catégorie inconnue"

    fmt = nz.detect_format(ev.location, description, ev.attendance)
    city = nz.detect_city(ev.city, ev.address, ev.location) or ev.city or (
        None if fmt == "online" else source.default_city)
    is_free = ev.is_free if ev.is_free is not None else nz.detect_free(title, description)
    canonical_url = ev.url or source.url

    row = {
        "slug": f"{nz.slugify(title)}-{ev.start.astimezone(PARIS).strftime('%Y%m%d')}-{nz.short_hash(ev.uid)}",
        "title": title,
        "summary": nz.make_summary(description),
        "description": description,
        "start_at": ev.start.isoformat(),
        "end_at": ev.end.isoformat() if ev.end and ev.end >= ev.start else None,
        "status": ev.status,
        "format": fmt,
        "city": city,
        "venue": nz.clean_text(ev.venue, 150) if ev.venue else (
            nz.clean_text(ev.location, 150) if fmt != "online" and ev.location else None),
        "address": nz.clean_text(ev.address, 250),
        "postal_code": ev.postal_code,
        "latitude": ev.latitude,
        "longitude": ev.longitude,
        "primary_category": category,
        "topics": nz.extract_topics(title, description),
        "technologies": nz.extract_technologies(title, description),
        "is_free": bool(is_free),
        "price_min": 0 if is_free else ev.price_min,
        "price_max": 0 if is_free else ev.price_max,
        "currency": ev.currency or "EUR",
        "organizer_name": nz.clean_text(ev.organizer, 150),
        "canonical_url": canonical_url,
        # confiance simple : score de mots-clés, plafonné
        "confidence_score": round(min(1.0, 0.4 + score * 0.1), 2) if score else 0.5,
    }
    return row, ""


# ------------------------------------------------------------------ enregistrement
def save(db: Supabase, source: Source, items: list[tuple[RawEvent, dict]]):
    now_iso = datetime.now(timezone.utc).isoformat()
    [src] = db.upsert("source_registry", [{
        "name": source.name, "url": source.url, "domain": source.domain,
        "source_type": source.source_type, "collection_method": source.method, "scope": source.scope,
        "status": "active",
    }], on_conflict="url", returning=True)
    source_id = src["source_id"]

    # événements déjà connus pour cette source -> on met à jour la même ligne
    known: dict[str, tuple[str, str]] = {}
    for r in db.select("event_sources", {"source_id": f"eq.{source_id}",
                                          "select": "source_event_id,event_id,events(slug)"}):
        known[r["source_event_id"]] = (r["event_id"], (r.get("events") or {}).get("slug"))
    new_rows, update_rows = [], []
    for ev, row in items:
        if ev.uid in known and known[ev.uid][1]:
            event_id, slug = known[ev.uid]
            # on garde le slug d'origine pour ne pas casser les liens existants
            update_rows.append({**row, "slug": slug, "id": event_id})
        else:
            new_rows.append(row)

    inserted = db.upsert("events", new_rows, on_conflict="slug", returning=True)
    by_slug = {r["slug"]: r["id"] for r in inserted}
    db.upsert("events", update_rows, on_conflict="id")

    links = []
    for (ev, row) in items:
        event_id = known[ev.uid][0] if ev.uid in known else by_slug.get(row["slug"])
        if not event_id:
            continue
        raw_hash = hashlib.sha1(f"{ev.title}|{ev.start}|{ev.end}|{ev.location}|{ev.status}".encode()).hexdigest()
        links.append({"event_id": event_id, "source_id": source_id, "source_event_id": ev.uid,
                      "source_url": ev.url or source.url, "last_seen_at": now_iso, "raw_hash": raw_hash})
    db.upsert("event_sources", links, on_conflict="source_id,source_event_id")
    db.update("source_registry", {"source_id": source_id},
              {"last_success_at": now_iso, "last_error": None, "status": "active"})
    return len(new_rows), len(update_rows)


def mark_error(db: Supabase, source: Source, message: str):
    try:
        db.upsert("source_registry", [{
            "name": source.name, "url": source.url, "domain": source.domain,
            "source_type": source.source_type, "collection_method": source.method, "scope": source.scope,
            "status": "broken", "last_error_at": datetime.now(timezone.utc).isoformat(),
            "last_error": message[:500],
        }], on_conflict="url")
    except SupabaseError:
        pass


# ------------------------------------------------------------------ programme
def load_sources(path: Path) -> list[Source]:
    data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    return [Source(**s) for s in data.get("sources", [])]


def main() -> int:
    parser = argparse.ArgumentParser(description="Collecte des événements tech")
    parser.add_argument("--dry-run", action="store_true", help="affiche sans écrire dans Supabase")
    parser.add_argument("--only", help="ne traite que la source portant ce nom")
    parser.add_argument("--sources", default=str(ROOT / "sources.yaml"))
    args = parser.parse_args()

    load_dotenv(ROOT / ".env")
    db = None
    if not args.dry_run:
        url, key = os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SECRET_KEY")
        if not url or not key:
            print("SUPABASE_URL et SUPABASE_SECRET_KEY manquants dans collector/.env "
                  "(ou lance avec --dry-run).")
            return 1
        db = Supabase(url, key)

    sources = [s for s in load_sources(Path(args.sources)) if s.enabled]
    if args.only:
        sources = [s for s in sources if s.name == args.only]
    if not sources:
        print("Aucune source active dans sources.yaml.")
        return 1

    now = datetime.now(timezone.utc)
    failures = 0
    for source in sources:
        print(f"\n▶ {source.name}  ({source.method}, {source.url})")
        if source.is_local and not args.dry_run:
            print("  ignorée : les fichiers locaux ne servent qu'aux tests (--dry-run)")
            continue
        try:
            raw_events = extract(source, fetch(source))
        except Exception as exc:  # une source en panne ne bloque pas les autres
            failures += 1
            print(f"  ✗ échec : {exc}")
            if db:
                mark_error(db, source, str(exc))
            continue

        kept: list[tuple[RawEvent, dict]] = []
        rejected: dict[str, int] = {}
        seen: set[str] = set()
        for ev in raw_events:
            row, reason = to_row(ev, source, now)
            if not row:
                rejected[reason] = rejected.get(reason, 0) + 1
                continue
            key = nz.fold(row["title"]) + row["start_at"][:10]
            if key in seen:
                rejected["doublon"] = rejected.get("doublon", 0) + 1
                continue
            seen.add(key)
            kept.append((ev, row))

        detail = ", ".join(f"{n} {r}" for r, n in rejected.items()) or "aucun rejet"
        print(f"  {len(raw_events)} trouvés, {len(kept)} retenus ({detail})")
        for _, row in kept[:15]:
            where = row["city"] or ("en ligne" if row["format"] == "online" else "?")
            price = "gratuit" if row["is_free"] else "payant/inconnu"
            print(f"    {row['start_at'][:16]}  [{row['primary_category']}]  {row['title'][:60]}  ({where}, {price})")
        if len(kept) > 15:
            print(f"    … et {len(kept) - 15} autres")

        if db and kept:
            try:
                created, updated = save(db, source, kept)
                print(f"  ✓ enregistrés : {created} nouveaux, {updated} mis à jour")
            except SupabaseError as exc:
                failures += 1
                print(f"  ✗ Supabase : {exc}")
        time.sleep(1)  # politesse entre deux sources

    print("\nTerminé." + (f" {failures} source(s) en échec." if failures else ""))
    return 1 if failures and failures == len(sources) else 0


if __name__ == "__main__":
    sys.exit(main())
