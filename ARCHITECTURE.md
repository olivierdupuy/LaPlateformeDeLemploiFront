# Architecture

Deux applications, deux dépôts, deux déploiements IIS distincts. Rien
n'est partagé entre elles que le contrat HTTP.

```
                        ┌────────────────────────────────┐
   Navigateur  ────────▶│  www.laplateformedelemploi.com │
                        │  IIS — fichiers statiques      │
                        │  Angular 21, PWA, service worker│
                        └───────────────┬────────────────┘
                                        │ HTTPS (JSON)
                                        │ WebSocket (SignalR)
                        ┌───────────────▼────────────────┐
                        │  api.laplateformedelemploi.com │
                        │  IIS — ASP.NET Core 8          │
                        └───┬──────────┬─────────┬───────┘
                            │          │         │
                  ┌─────────▼──┐  ┌────▼────┐  ┌─▼──────────────┐
                  │ SQL Server │  │ Disque  │  │ Services tiers │
                  │ EF Core    │  │ CV, log │  │ (voir plus bas)│
                  └────────────┘  └─────────┘  └────────────────┘
```

---

## Le front (`lpdeFront`)

Application monopage Angular 21, sans rendu serveur. Servie par IIS
comme un jeu de fichiers statiques, avec une règle de réécriture qui
renvoie toute adresse inconnue vers `index.html`.

**Conséquence à connaître** : un robot qui n'exécute pas le JavaScript ne
voit qu'une coquille. Google l'exécute, tardivement ; Bing mal ; les
aperçus de LinkedIn, WhatsApp et Slack pas du tout. C'est le point ouvert
n°1 de `TODO-PROFESSIONNALISATION.md`.

- **Routes** — toutes chargées à la demande sauf l'accueil. Un jeu de
  routes publiques est préchargé en tâche de fond deux secondes après
  l'affichage (`precharge.ts`), sauf sur liaison lente ou économe.
- **Temps réel** — SignalR sur `/hubs/chat` : messagerie et présence.
- **Hors ligne** — `public/sw.js`, coquille minimale. Le manifeste rend
  l'application installable.
- **Erreurs** — `erreur.handler.ts` remonte les exceptions à
  `POST /api/journal/erreur-navigateur`.

## L'API (`lpdeBack`)

ASP.NET Core 8, EF Core, Identity (tables renommées `Users`, `Roles`…).

### Traversées de la requête

```
Compression → journal Serilog → HSTS/HTTPS → fichiers statiques
  → CORS → maintenance → limitation de débit → cache de sortie
  → authentification → autorisation → contrôleurs
```

- **Limitation de débit** — cinq politiques : `identite`, `abonnement`,
  `publication`, `catalogue-api`, plus un plafond général anti-moissonnage.
- **Cache de sortie** — `catalogue` (60 s), `reference` (10 min),
  `plan-de-site` (1 h). Requêtes anonymes uniquement.
- **Filet d'erreur** — `Middleware/FiletErreur.cs` : réponse propre au
  visiteur, trace complète au journal, une référence courte qui relie
  les deux.
- **Journal** — Serilog, un fichier par jour dans `../journaux`, gardé
  trente jours. Hors du répertoire publié : `msdeploy sync` efface ce
  qu'il ne connaît pas.

### Tâches de fond

| Service | Rythme | Rôle |
|---|---|---|
| `JobImportBackgroundService` | 6 h | Import France Travail, dédoublonnage, analyse de fraude, puis entretien |
| `NewsletterSenderService` | continu | Expédie les campagnes validées à la main |
| `RedactionNewsletterService` | hebdo | Dépose des brouillons de lettre — n'envoie jamais |
| `PurgeService` | quotidien | Durées de conservation RGPD, à blanc tant que `purge_active` est faux |

L'entretien du catalogue, après chaque import : retrait des offres
importées non revues chez leur source depuis 30 jours, retrait des mises
en avant échues.

### Authentification

Deux mécanismes séparés, et c'est délibéré :

- **JWT** pour les personnes. Double authentification obligatoire pour
  l'administration (application ou SMS). Verrouillage du compte au
  cinquième échec.
- **Clés d'API** pour les machines (`CleApiAttribute`). Portées
  explicites, empreinte SHA-256 en base, clé jamais stockée en clair.

## La base

SQL Server. Les migrations s'appliquent **au démarrage** de l'API
(`db.Database.Migrate()`).

> Une migration qui échoue empêche donc l'API de démarrer. Le chemin de
> retour n'est pas outillé : c'est le point ouvert §7 de
> `TODO-PROFESSIONNALISATION.md`.

Une trentaine de tables. Les principales : `JobOffers`, `Applications`,
`Users`, `Messages`, `Interviews`, `CompanyReviews`, `SalaryContributions`,
`Newsletter*`, `ActivityLogs`, et depuis la professionnalisation
`ErreursNavigateur`, `SignalementsDsa`, `PreferencesCourriel`,
`RetoursCourriel`, `Abonnements`, `MisesEnAvant`, `Factures`,
`JetonsApi`, `Webhooks`, `LivraisonsWebhook`.

## Sources d'offres

| Source | État | Clé de déduplication |
|---|---|---|
| France Travail | active | `francetravail:<id>` |
| Adzuna, Jooble, Arbeitnow, Remotive | désactivées, code conservé | `<source>:<id>` |

Le dédoublonnage **inter-sources** passe par `JobOffer.Empreinte` :
SHA-256 de (intitulé normalisé | entreprise | ville), calculé par
`QualiteCatalogue`. `ExternalId` ne dédoublonne qu'au sein d'une source.

## Services tiers

Tous dégradent proprement : sans clé, la fonction est refusée avec un
message explicite et le reste du site continue de servir.

| Service | Usage | Sans clé |
|---|---|---|
| Anthropic | Analyse de CV, rédaction assistée | 503 sur ces routes |
| Brevo | Lettre d'information, retours d'expédition | Campagnes en attente |
| SMTP (OVH) | Courriels transactionnels | Écrits au journal |
| OVH SMS | Second facteur par SMS | Seule l'application d'authentification est proposée |
| Firebase | Notifications poussées | Pas de notification mobile |
| Google, LinkedIn | Connexion sociale | Boutons masqués |
| France Travail | Import d'offres | Pas d'import |
| Prestataire de paiement | Formules, mises en avant | Achat refusé, message explicite |
| France Travail (dépôt) | Multidiffusion d'une offre | Destination refusée, l'habilitation manquante est nommée |
| Partenaire agrégateur | Multidiffusion d'une offre | Idem |
| Matomo / Plausible | Mesure d'audience auto-hébergée | Rien n'est compté, aucune requête ne part |

Les deux dernières lignes se configurent respectivement par
`FranceTravail:DepotClientId` / `DepotClientSecret` et
`Multidiffusion:PartenaireUrl` / `PartenaireJeton` côté API, et par
`mesureUrl` + `mesureSiteId` (Matomo) ou `mesureDomaine` (Plausible)
côté site. L'habilitation « dépôt d'offres » de France Travail est
**distincte** de celle qui sert à lire le catalogue : avoir l'une ne
donne pas l'autre.

La mesure d'audience a une seconde condition, indépendante de la
configuration : le **consentement du visiteur à cette finalité**. Une
instance déclarée n'autorise rien par elle-même.

## Flux sortants

- `GET /api/seo/sitemap.xml` — plan de site, fichiers enfants de 50 000 URL
- `GET /api/flux/offres.xml` — flux agrégateurs (format Indeed)
- `GET /api/flux/offres.jsonld` — `ItemList` de `JobPosting` pour Google for Jobs
- `GET /api/v1/*` — API publique versionnée, clé requise
- Webhooks sortants — signés HMAC-SHA256, désactivation après 10 échecs

Les flux ne diffusent que les offres déposées sur la plateforme :
rediffuser ce qui a été importé renverrait aux agrégateurs leurs propres
annonces.
