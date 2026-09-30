# TechRadar France

Site de découverte des événements tech en France : Next.js (App Router) + Tailwind CSS + Supabase,
déployé sur Hostinger (offre Business, Node.js Web App) depuis GitHub.

## Démarrer en local

Prérequis : Node.js 20 ou plus récent, Git, VS Code.

```bash
npm install
cp .env.example .env.local   # facultatif au début
npm run dev
```

Ouvre http://localhost:3000. Sans variables Supabase, le site affiche les données d'exemple
de `src/data/sample-events.ts`.

## Brancher Supabase

1. Crée un projet sur supabase.com (région Europe).
2. Dans **SQL Editor**, exécute `supabase/schema.sql`, puis `supabase/seed.sql`.
3. Dans **Project Settings > API**, copie l'URL du projet et la clé `anon` (publique) dans `.env.local`.
4. Relance `npm run dev` : le bandeau « Données d'exemple » disparaît.

La clé `anon` ne peut que **lire** la table `events` (règle RLS dans le schéma).
La clé `service_role` sert uniquement aux scripts de collecte : ne la mets jamais dans le front ni sur GitHub.

## Remplir la base avec de vrais événements (collecteur Python)

Le dossier `collector/` récupère des événements depuis des **flux iCal** et des **pages contenant des données
Schema.org « Event »**, les classe (catégorie, ville, technologies, gratuit ou non) et les enregistre dans Supabase.

```bash
cd collector
python -m venv .venv
source .venv/Scripts/activate      # Git Bash sous Windows (macOS/Linux : source .venv/bin/activate)
pip install -r requirements.txt
cp .env.example .env               # puis colle ta clé secrète Supabase dedans
python collect.py --dry-run        # essai à blanc avec les fichiers d'exemple
python collect.py                  # écrit dans Supabase
```

Ajoute tes sources dans `collector/sources.yaml`, teste chacune avec
`python collect.py --dry-run --only "Nom"`, puis lance la collecte réelle.
Quand tes vraies données sont en place, supprime les événements de démonstration dans le SQL Editor :

```sql
delete from public.events where canonical_url like 'https://example.com/%';
```

Le fichier `.github/workflows/collect.yml` lance la collecte chaque jour sur GitHub Actions
(secrets `SUPABASE_URL` et `SUPABASE_SECRET_KEY` à ajouter dans les réglages du dépôt).
Une collecte quotidienne évite aussi la mise en pause du projet Supabase gratuit.

## Déployer sur Hostinger

1. Pousse le projet sur GitHub (`.env.local` est ignoré par Git).
2. hPanel > **Websites > Add Website > Node.js web app > Import Git repository**, puis choisis le dépôt.
3. Réglages : Node.js 22, build `npm run build`, démarrage `npm start`.
4. Ajoute les variables d'environnement `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   et `NEXT_PUBLIC_SITE_URL` **avant** le build : les variables `NEXT_PUBLIC_` sont intégrées au moment du build,
   donc relance un déploiement après chaque modification.
5. Rattache ton domaine à la Web App. Chaque `git push` sur `main` redéploie le site.

## Structure

```
techradar/
├── src/
│   ├── app/
│   │   ├── layout.tsx               # squelette HTML, police Inter, en-tête et pied de page
│   │   ├── globals.css              # Tailwind + palette de la charte (section 11)
│   │   ├── page.tsx                 # page Découvrir : titre dynamique, filtres, agenda
│   │   ├── not-found.tsx            # page 404
│   │   ├── robots.ts / sitemap.ts   # SEO
│   │   └── events/[slug]/
│   │       ├── page.tsx             # fiche événement + données Schema.org
│   │       └── ics/route.ts         # export .ics « Ajouter à mon agenda »
│   ├── components/                  # EventList, EventRow, Filters, badges, en-tête…
│   ├── lib/
│   │   ├── events.ts                # accès aux données (Supabase ou exemples)
│   │   ├── supabase.ts              # client Supabase en lecture
│   │   ├── filters.ts               # lecture/écriture des filtres dans l'URL
│   │   ├── taxonomy.ts              # catégories, villes, formats
│   │   ├── format.ts                # dates (Europe/Paris), prix, lieux
│   │   ├── ics.ts                   # génération du fichier calendrier
│   │   └── types.ts
│   └── data/sample-events.ts        # événements fictifs de démonstration
├── collector/                       # collecte Python : sources.yaml, parseurs iCal/JSON-LD, classification
├── .github/workflows/collect.yml    # collecte quotidienne automatique
├── supabase/
│   ├── schema.sql                   # events, source_registry, event_sources, RLS, recherche FTS
│   └── seed.sql                     # mêmes événements d'exemple, pour la base
├── .env.example
└── package.json
```

## Scripts

| Commande            | Rôle                                   |
| ------------------- | -------------------------------------- |
| `npm run dev`       | serveur de développement               |
| `npm run build`     | build de production (celui de Hostinger) |
| `npm start`         | lance le build en local                |
| `npm run typecheck` | vérifie les types TypeScript           |

## Étapes suivantes

- Détection des doublons entre sources (score titre + date + ville + organisateur).
- Comptes et favoris avec Supabase Auth.
- Carte des événements (latitude/longitude déjà prévues dans le schéma).
