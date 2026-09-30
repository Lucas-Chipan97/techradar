"""Petit client REST Supabase (PostgREST) pour écrire avec la clé secrète."""
from __future__ import annotations

import requests


class SupabaseError(RuntimeError):
    pass


class Supabase:
    def __init__(self, url: str, key: str):
        self.base = url.rstrip("/") + "/rest/v1"
        self.session = requests.Session()
        self.session.headers.update({"apikey": key, "Content-Type": "application/json"})
        if key.startswith("eyJ"):  # ancienne clé service_role (JWT)
            self.session.headers["Authorization"] = f"Bearer {key}"

    def _check(self, resp: requests.Response):
        if resp.status_code >= 400:
            raise SupabaseError(f"{resp.status_code} {resp.request.method} {resp.url}\n{resp.text[:500]}")
        return resp.json() if resp.text else []

    def select(self, table: str, params: dict) -> list[dict]:
        return self._check(self.session.get(f"{self.base}/{table}", params=params, timeout=30))

    def upsert(self, table: str, rows: list[dict], on_conflict: str, returning: bool = False) -> list[dict]:
        if not rows:
            return []
        prefer = "resolution=merge-duplicates," + ("return=representation" if returning else "return=minimal")
        out: list[dict] = []
        for i in range(0, len(rows), 200):
            resp = self.session.post(
                f"{self.base}/{table}",
                params={"on_conflict": on_conflict},
                json=rows[i : i + 200],
                headers={"Prefer": prefer},
                timeout=60,
            )
            out.extend(self._check(resp) or [])
        return out

    def update(self, table: str, match: dict, values: dict):
        params = {k: f"eq.{v}" for k, v in match.items()}
        self._check(self.session.patch(f"{self.base}/{table}", params=params, json=values, timeout=30))
