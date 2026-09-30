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

- Premiers connecteurs Python (JSON-LD, iCal) lancés par GitHub Actions en cron, qui écrivent dans Supabase
  avec la clé `service_role`.
- Comptes et favoris avec Supabase Auth.
- Carte des événements (latitude/longitude déjà prévues dans le schéma).
