"""Normalisation et enrichissement par règles (section 08 du dossier)."""
from __future__ import annotations

import hashlib
import html
import re
import unicodedata

# Catégorie primaire -> mots-clés (texte sans accents, en minuscules)
CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "ai": ["intelligence artificielle", "genai", "generative", "llm", "machine learning", "deep learning",
           "agents ia", "ai agent", "nlp", "computer vision", "mlops", "chatgpt", "openai", "mistral",
           "anthropic", "hugging face", "rag"],
    "data": ["data", "donnees", "analytics", "business intelligence", "power bi", "databricks", "snowflake",
             "dbt", "data engineering", "big data", "spark", "lakehouse", "dataviz", "sql"],
    "cloud": ["cloud", "aws", "azure", "gcp", "google cloud", "kubernetes", "serverless", "finops", "k8s",
              "cloud native"],
    "cyber": ["cyber", "securite", "securiser", "securisation", "security", "soc", "pentest", "zero trust", "ransomware", "rssi", "ctf",
              "owasp", "iam"],
    "devops": ["devops", "ci/cd", "sre", "observability", "observabilite", "platform engineering", "docker",
               "terraform", "gitops"],
    "software": ["developpeur", "developer", "dev ", "javascript", "typescript", "python", "java", "golang",
                 "rust", "react", "frontend", "backend", "open source", "architecture logicielle", "craft",
                 "php", "symfony", "flutter", "mobile"],
    "product": ["product management", "product manager", "ux", "ui design", "design system", "no-code",
                "nocode", "growth", "figma"],
    "startup": ["startup", "start-up", "saas", "pitch", "fundraising", "levee de fonds", "investisseur",
                "entrepreneur", "incubateur", "demo day", "vc "],
    "deeptech": ["deeptech", "deep tech", "quantique", "quantum", "robotique", "robotics", "spatial",
                 "semi-conducteur", "semiconductor", "biotech"],
    "fintech": ["fintech", "blockchain", "web3", "crypto", "paiement", "payments", "regtech", "defi"],
}

# Technologies : alias -> nom canonique (« GCP » = « Google Cloud »)
TECHNOLOGIES: dict[str, str] = {
    "aws": "AWS", "amazon web services": "AWS", "azure": "Azure", "gcp": "Google Cloud",
    "google cloud": "Google Cloud", "kubernetes": "Kubernetes", "k8s": "Kubernetes", "docker": "Docker",
    "terraform": "Terraform", "databricks": "Databricks", "snowflake": "Snowflake", "dbt": "dbt",
    "spark": "Spark", "kafka": "Kafka", "airflow": "Airflow", "python": "Python", "postgresql": "PostgreSQL",
    "postgres": "PostgreSQL", "power bi": "Power BI", "tableau": "Tableau", "react": "React",
    "next.js": "Next.js", "nextjs": "Next.js", "typescript": "TypeScript", "java": "Java", "rust": "Rust",
    "golang": "Go", "flutter": "Flutter", "pytorch": "PyTorch", "tensorflow": "TensorFlow",
    "langchain": "LangChain", "hugging face": "Hugging Face", "mistral": "Mistral AI", "openai": "OpenAI",
    "github actions": "GitHub Actions", "gitlab": "GitLab", "elasticsearch": "Elasticsearch",
    "mongodb": "MongoDB", "supabase": "Supabase", "figma": "Figma",
}

EVENT_TYPES: dict[str, list[str]] = {
    "Meetup": ["meetup"],
    "Conférence": ["conference", "summit", "keynote", "talks"],
    "Workshop": ["workshop", "atelier", "hands-on", "hands on", "formation", "bootcamp"],
    "Hackathon": ["hackathon", "game jam", "ctf"],
    "Afterwork": ["afterwork", "apero", "drinks", "soiree"],
    "Webinaire": ["webinar", "webinaire", "live stream"],
    "Salon": ["salon", "expo", "forum"],
    "Recrutement": ["job dating", "recrutement", "career", "job fair", "jobfair"],
    "Networking": ["networking"],
}

# Villes prioritaires et quelques alias (texte sans accents)
CITY_ALIASES: dict[str, str] = {
    "paris": "Paris", "lyon": "Lyon", "villeurbanne": "Lyon", "toulouse": "Toulouse", "bordeaux": "Bordeaux",
    "lille": "Lille", "nantes": "Nantes", "marseille": "Marseille", "aix-en-provence": "Marseille",
    "montpellier": "Montpellier", "rennes": "Rennes", "grenoble": "Grenoble", "nice": "Nice",
    "sophia antipolis": "Nice", "sophia-antipolis": "Nice", "strasbourg": "Strasbourg",
}

ONLINE_HINTS = ["en ligne", "online", "zoom.us", "meet.google", "teams.microsoft", "webinar", "webinaire",
                "virtual", "virtuel", "livestream", "youtube.com", "twitch.tv"]
FREE_HINTS = ["gratuit", "gratuite", "entree libre", "free entry", "free event", "free admission", "0 €", "0€"]


def fold(text: str | None) -> str:
    """Minuscules sans accents, pour comparer du texte."""
    if not text:
        return ""
    text = unicodedata.normalize("NFD", text)
    return "".join(c for c in text if unicodedata.category(c) != "Mn").lower()


def clean_text(text: str | None, limit: int | None = None) -> str | None:
    """Retire le HTML, décode les entités et compacte les espaces."""
    if not text:
        return None
    text = re.sub(r"<br\s*/?>|</p>", "\n", text, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    text = html.unescape(text)
    text = re.sub(r"[ \t\u00a0]+", " ", text)
    text = re.sub(r"\n\s*\n+", "\n\n", text).strip()
    if limit and len(text) > limit:
        text = text[:limit].rsplit(" ", 1)[0] + "…"
    return text or None


def make_summary(description: str | None, limit: int = 240) -> str | None:
    """Premières phrases de la description, coupées proprement."""
    text = clean_text(description)
    if not text:
        return None
    text = " ".join(text.split())
    if len(text) <= limit:
        return text
    cut = text[:limit]
    end = max(cut.rfind(". "), cut.rfind("! "), cut.rfind("? "))
    return cut[: end + 1] if end > 80 else cut.rsplit(" ", 1)[0] + "…"


def _count(text: str, keyword: str) -> int:
    pattern = r"(?<![a-z0-9])" + re.escape(keyword.strip()) + r"(?![a-z0-9])"
    return len(re.findall(pattern, text))


def classify(title: str, description: str | None) -> tuple[str | None, int]:
    """Catégorie primaire par score de mots-clés (titre x3). Retourne (catégorie, score)."""
    t, d = fold(title), fold(description)
    scores: dict[str, int] = {}
    for cat, keywords in CATEGORY_KEYWORDS.items():
        score = sum(3 * _count(t, k) + _count(d, k) for k in keywords)
        if score:
            scores[cat] = score
    # « IA » / « AI » en majuscules, pour éviter les faux positifs (« j'ai »)
    ai_hits = 3 * len(re.findall(r"\b(IA|AI)\b", title)) + len(re.findall(r"\b(IA|AI)\b", description or ""))
    if ai_hits:
        scores["ai"] = scores.get("ai", 0) + ai_hits
    if not scores:
        return None, 0
    best = max(scores, key=scores.get)
    return best, scores[best]


def extract_technologies(title: str, description: str | None) -> list[str]:
    text = fold(f"{title} {description or ''}")
    found = {canon for alias, canon in TECHNOLOGIES.items() if _count(text, alias)}
    return sorted(found)


def extract_topics(title: str, description: str | None) -> list[str]:
    text = fold(f"{title} {description or ''}")
    return [label for label, kws in EVENT_TYPES.items() if any(_count(text, k) for k in kws)][:3]


def detect_city(*texts: str | None) -> str | None:
    for text in texts:
        folded = fold(text)
        for alias, city in CITY_ALIASES.items():
            if _count(folded, alias):
                return city
    return None


def detect_format(location: str | None, description: str | None, hinted: str | None = None) -> str:
    if hinted in ("online", "hybrid", "in_person"):
        return hinted
    loc = fold(location)
    if loc and (any(h in loc for h in ONLINE_HINTS) or loc.startswith("http")):
        return "online"
    if not loc and any(h in fold(description) for h in ONLINE_HINTS[:4]):
        return "online"
    return "in_person"


def detect_free(*texts: str | None) -> bool:
    text = fold(" ".join(t for t in texts if t))
    return any(h in text for h in FREE_HINTS)


def slugify(text: str, max_len: int = 60) -> str:
    text = re.sub(r"[^a-z0-9]+", "-", fold(text)).strip("-")
    return text[:max_len].rstrip("-") or "evenement"


def short_hash(value: str, n: int = 6) -> str:
    return hashlib.sha1(value.encode()).hexdigest()[:n]
