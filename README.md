# La plateforme de l'emploi — application web

Interface Angular du site. Elle ne va jamais en base : tout passe par
l'API .NET du dépôt `lpdeBack`, qui vit à côté.

Ce fichier était celui généré par le CLI Angular. Il expliquait comment
lancer `ng serve` et rien de ce qu'il fallait savoir.

---

## Monter le projet

**Prérequis** — Node 22, npm 11. L'API doit tourner en parallèle : sans
elle, l'application démarre et n'affiche rien.

```bash
npm install
npm start          # http://localhost:4200
```

L'adresse de l'API se règle dans `src/environments/environment.ts`
(`http://localhost:5013/api` par défaut). En production, le workflow de
déploiement réécrit `environment.production.ts` à partir des secrets du
dépôt : ne pas y mettre de valeur en dur.

## Les commandes

| Commande | Ce qu'elle fait |
|---|---|
| `npm start` | Serveur de développement, rechargement à chaud |
| `npm run build` | Construction de production dans `dist/` |
| `npm test` | Tests unitaires (Vitest), une passe |
| `npm run test:watch` | Idem, en continu |
| `npm run lint` | Analyse statique (ESLint + règles Angular et accessibilité) |

`npm run lint` et `npm test` tournent en intégration continue **avant**
la construction : ce qu'ils refusent ne part pas en production.

## Ce qu'il faut savoir avant de modifier

**Les routes sont chargées à la demande.** `app.routes.ts` n'importe
statiquement que l'accueil. Ajouter un `import` de composant en tête de
ce fichier remettrait l'écran concerné dans le paquet initial de tout le
monde — c'est ainsi qu'il avait atteint 1,8 Mo. Utiliser `loadComponent`.

**Le budget de paquet mord.** 600 kB en avertissement, 900 kB en erreur.
Une bibliothèque lourde s'importe dans le composant qui s'en sert, jamais
dans `app.config.ts` : c'est ce qui tirait Chart.js chez les visiteurs
qui ne verront jamais un graphique.

**Le plafond d'avertissements ESLint est un cliquet.** Il vaut le compte
du dernier passage de correction (223, dont 33 d'accessibilité — il était
de 333 dont 120). Il ne doit que descendre : `package.json` → `lint`.

**Le design system vit dans `src/styles.scss`.** Les jetons de couleur,
les échelles typographiques et les classes utilitaires (`.card`,
`.btn-primary`, `.badge`, `.empty-box`, `.page-head`) y sont définis une
fois. Un composant qui redéfinit une couleur en dur sortira de la
famille au prochain changement d'identité.

**Les erreurs remontent.** `erreur.handler.ts` envoie les exceptions du
navigateur à l'API en production, dédoublonnées et plafonnées. Elles se
consultent dans `/admin/exploitation`.

## Où sont les choses

```
src/app/
  components/     un dossier par écran (.ts, .html, .scss)
  services/       appels API, un service par domaine
  viz/            fabriques de graphiques Chart.js — les réglages
                  communs s'y posent au chargement du module
  utils/          fonctions pures : validation, markdown, filtres
  app.routes.ts   toutes les routes, toutes paresseuses sauf l'accueil
  precharge.ts    ce qui est ramené en tâche de fond après le 1er écran
  erreur.handler.ts  remontée des exceptions navigateur
```

## Comptes de démonstration

Créés au démarrage de l'API si la base est vide. Les identifiants sont
dans le `Program.cs` de `lpdeBack`, section « SEED ».

## Documentation liée

- [`ARCHITECTURE.md`](ARCHITECTURE.md) — les deux applications, la base,
  les sources d'import, les services tiers
- [`WORKFLOWS.md`](WORKFLOWS.md) — carte de navigation et diagrammes de
  séquence des parcours ajoutés. À lire avant de toucher à la
  facturation, aux webhooks ou aux préférences de courriel : les
  diagrammes disent où passent les contrôles qu'il ne faut pas
  contourner
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — conventions, ce qui doit passer
  avant de pousser
- [`CHANGELOG.md`](CHANGELOG.md) — ce qui change, côté utilisateur
- `TODO-PROFESSIONNALISATION.md` — l'état de la dette technique
- `TODO-INDEED.md`, `TODO-ESPACES.md` — la feuille de route produit
