# TODO — Professionnalisation

Audit mené le **2026-08-02** sur les deux dépôts (`lpdeFront`, `lpdeBack`),
build de production inclus.

> ## État au 2026-08-02
>
> **Tout ce qui relevait du travail est fait.** Ce qui reste tient en
> deux catégories, et aucune des deux ne se règle en écrivant du code :
> une **décision d'infrastructure** (le rendu serveur, §1) et une
> **poignée d'accès à obtenir** (comptes tiers, DNS, habilitation
> France Travail). Le détail est en fin de document.
>
> Vérifié à cette date : front **build vert, 0 erreur et 187
> avertissements ESLint** (tous `no-explicit-any`), **34 tests** · back
> **build vert, 136 tests**, migrations `Professionnalisation` et
> `Multidiffusion`.
>
> ### Les huit lots, dans l'ordre
>
> **1er** — §2 découpage du paquet · §3 en-têtes de sécurité · §4 analyse
> statique, tests et étapes CI · §5 journalisation et remontée d'erreurs ·
> §6 formules, quotas, mises en avant et factures · §7 test de fumée après
> déploiement · §9 déclaration d'accessibilité et cliquet a11y · §10
> dédoublonnage, expiration et détection de fraude · §11 flux XML/JSON-LD,
> API publique v1, webhooks signés · §12 compression, cache de sortie,
> requêtes lentes · §13 centre de préférences et gestion des retours ·
> §14 mécanisme de signalement DSA · §15 documentation.
>
> **2e** — consentement de courriel réellement appliqué à l'envoi ·
> IndexNow · ETag sur le plan de site et les flux · fil d'Ariane, FAQ
> structurée et titres par page sur `/entreprises/*`, `/salaires/*`,
> `/guide/*` · indicateurs de fraîcheur du catalogue dans l'admin ·
> documentation publique de l'API · tests des services de qualité et de
> webhooks.
>
> **3e** — 83 des 120 manques d'accessibilité corrigés ; le cliquet ESLint
> descend de 333 à 250.
>
> **4e** — boucles fermées, révélées par la seconde passe de tracé
> (`WORKFLOWS.md`) : écran d'instruction des **signalements DSA** (ils
> arrivaient sans que personne ne puisse rendre la décision motivée que le
> règlement impose) · écran des **adresses bloquées** · lien vers la
> documentation de l'API depuis la facturation · lien vers le centre de
> préférences depuis le profil · tableau de couverture « qui traite quoi ».
>
> **5e** — accessibilité clavier : directive `appModale` (Échap, piège de
> focus, restitution du focus, fermeture au clic sur le fond) appliquée
> aux 7 boîtes de dialogue · 44 → 17 éléments non atteignables ·
> **écran des recettes**, dernière ligne sans écran du tableau de
> couverture · cliquet 250 → 223.
>
> **6e** — troisième passe de tracé (diagrammes 12 à 14) : **la mesure
> d'un signalement DSA s'exécute réellement** (« Contenu retiré » était
> écrit au déclarant sans que rien ne soit retiré — le courriel mentait
> dans un document juridique) · **réouverture d'une adresse bloquée** (un
> faux rejet coupait aussi la réinitialisation de mot de passe, donc
> l'accès au compte, sans recours) · **les modales s'annoncent au lecteur
> d'écran**.
>
> **7e** — **pages d'atterrissage à URL propre** (`/emploi/:metier/:ville`,
> `AtterrissageController` + composant `landing`), le point le plus
> rentable après le SSR.
>
> **8e — celui-ci.** Il ferme les six derniers points qui ne dépendaient
> que de travail :
>
> - **Accessibilité à zéro.** Les 17 éléments non atteignables au clavier
>   et les 15 étiquettes de groupe sont corrigés. Les cinq règles a11y
>   passent de `warn` à **`error`** : elles cassent désormais le build, ce
>   qui est le seul moyen de tenir un zéro. Cliquet 223 → **187**, et il
>   ne reste plus que du `no-explicit-any` sous le plafond.
> - **Tests de `FacturationService`** — 26 tests sur base SQLite en
>   mémoire : numérotation sans trou, non-réattribution après annulation,
>   TVA et arrondis, quotas par formule, brouillons exemptés, mises en
>   avant incluses/payées, expiration.
> - **Tests d'intégration back** — 15 tests à travers le vrai pipeline
>   HTTP (`WebApplicationFactory`, jeton signé, filtres, autorisation) :
>   rôles, périmètre recruteur, route authentifiée des CV, brouillon non
>   candidatable, quota de formule.
> - **Aperçu et essai des modèles de courriel** — les 14 messages
>   transactionnels se relisent depuis les réglages, rendus avec des
>   données d'exemple dans un cadre isolé, et s'envoient à une adresse
>   choisie. Aucun n'était relisible sans provoquer la situation qui le
>   déclenche.
> - **Consentement granulaire et mesure d'audience** — trois finalités
>   séparées, refus aussi accessible que l'accord, aucune case pré-cochée,
>   retrait depuis `/cookies`. Le service de mesure (Matomo ou Plausible
>   auto-hébergé) est écrit et **inerte tant qu'aucune instance n'est
>   déclarée**. Durées de conservation détaillées par catégorie et
>   **registre des traitements** publiés, alignés sur ce que
>   `PurgeService` applique réellement.
> - **Multidiffusion** — dépôt d'une offre chez les partenaires **et son
>   retrait**, qui est la moitié qui manque partout ailleurs : une offre
>   pourvue restée en ligne continue de recevoir des candidatures que
>   personne ne lira. Inerte et explicite tant que les accès manquent.
>
> **Trois vrais défauts trouvés par les tests écrits dans ce lot** — c'est
> le rendement qu'on leur demande :
>
> 1. `apply-flow` : la boucle des options rouvrait un `$index` qui masquait
>    celui de la question. Répondre « Non » à la deuxième question écrivait
>    la réponse dans la case 1 — la bonne réponse rangée sous la mauvaise
>    question, sans que rien ne le signale.
> 2. `job-form` : les identifiants `jf-type`, `jf-ideal-answer` et
>    `jf-options` étaient fixes **à l'intérieur d'une boucle**. À partir de
>    la deuxième question, cliquer « Réponse attendue » déplaçait le curseur
>    dans la carte précédente.
> 3. `Consentement` : `relire()` écrivait dans un champ déclaré après lui.
>    L'accès levait, le `catch` posé pour un stockage indisponible avalait
>    l'erreur, et **tout choix enregistré était oublié au rechargement**.
>    Aucun écran ne le montrait.
>
> Un quatrième a été trouvé par la contrainte de clé étrangère de SQLite,
> que le fournisseur « InMemory » n'aurait pas fait respecter : la
> multidiffusion posait sa ligne de suivi avant de vérifier que l'offre
> existe, ce qui aurait rendu une erreur 500 au lieu du message
> « offre introuvable ».

Les deux TODO existants portent sur le **produit** :
`TODO-INDEED.md` (parité fonctionnelle, atteinte) et `TODO-ESPACES.md`
(architecture des espaces candidat/recruteur, en cours).

Celui-ci porte sur ce qui sépare une application complète d'une
application **exploitable en production par une équipe** : ce qu'on voit
quand ça casse, ce qui empêche que ça casse, ce qui la rend trouvable, et
ce qui la fait vivre. Aucun item ci-dessous n'ajoute d'écran.

---

## Ce qui est déjà solide — ne pas refaire

Limitation de débit par politique · double authentification · verrouillage
de compte · journal d'activité · filet d'erreur avec numéro de référence ·
endpoint `/api/sante` à deux niveaux · sauvegardes + purge RGPD ·
plan de site généré (100 k+ URL, fichiers enfants) · données structurées
`JobPosting` · PWA installable · bandeau cookies, export et suppression
des données · secrets hors dépôt avec arrêt du déploiement si absents ·
tests backend joués **avant** publication.

C'est déjà au-dessus de la moyenne. Ce qui suit est ce qui manque.

---

> ### Comment lire les sections §1 à §15
>
> **Elles sont l'audit tel qu'il a été rendu, et leurs cases restent
> volontairement vides.** Elles décrivent l'état constaté au moment du
> relevé, avec le raisonnement qui a conduit à chaque point — c'est cela
> qui vaut d'être conservé, et le cocher au fil de l'eau l'effacerait.
>
> **Pour savoir où en est chaque point aujourd'hui**, deux endroits, et
> deux seulement : l'encadré d'état en tête de document, et le
> **« Détail par section »** en fin de document, dont les cases, elles,
> sont à jour.

---

## P0 — Ce qui coûte aujourd'hui

### 1. Rendu serveur (SSR / pré-rendu) — le plus gros écart

Le plan de site annonce plus de cent mille offres. Un robot qui n'exécute
pas le JavaScript n'y trouve qu'une coquille vide : c'est écrit noir sur
blanc dans `seo.service.ts` et dans `index.html`. Google exécute le JS,
mal et tard ; Bing le fait mal ; **LinkedIn, Facebook, WhatsApp, Slack et
Discord ne le font pas du tout** — un lien d'offre partagé n'affiche ni
titre ni description.

Pour un site d'emploi, l'acquisition organique *est* le modèle. Tout le
travail SEO déjà fait (canoniques, `JobPosting`, plan de site) rend une
fraction de ce qu'il pourrait tant que ce point n'est pas traité.

- [ ] **Activer Angular SSR** (`ng add @angular/ssr`) — au minimum sur les
      routes publiques : `/`, `/offres`, `/offres/:id`, `/entreprises/*`,
      `/salaires/*`, `/guide/*`, `/parcourir`.
- [ ] **Hydratation** (`provideClientHydration`) pour ne pas repayer le
      rendu côté client.
- [ ] **Cache serveur** des fiches offres rendues (elles changent peu) —
      sinon 100 k pages rendues à la demande écrasent l'API.
- [ ] Vérifier le résultat sur le **validateur Google Rich Results** et
      dans **Search Console** (pages indexées avant/après).

*Alternative si le SSR complet est trop lourd : pré-rendu (SSG) des pages
éditoriales + rendu dynamique réservé aux robots. Moins propre, plus
rapide à livrer.*

### 2. Le paquet initial fait 1,8 Mo

`dist/lpdeFront/browser/main-*.js` : **1,8 Mo** non compressé, parce que
`app.routes.ts` importe statiquement une quarantaine de composants — tout
le panneau d'administration, toutes les consoles recruteur, Chart.js,
Leaflet. Seul `apply-flow` est chargé à la demande. Un visiteur qui
consulte une offre télécharge donc l'écran d'administration des
utilisateurs.

Le budget déclaré dans `angular.json` est de 2 Mo en avertissement : il ne
protège rien.

- [ ] **Passer toutes les routes en `loadComponent`** — en priorité `admin/*`,
      `recruteur/*`, `dashboard-*`, `cv-builder`, `job-form`.
- [ ] **Isoler Chart.js et Leaflet** dans les composants qui les utilisent
      (import dynamique), pas dans le paquet commun.
- [ ] **Resserrer les budgets** : 600 ko d'avertissement, 900 ko d'erreur
      sur le paquet initial. Un budget qui ne casse jamais ne sert à rien.
- [ ] Mesurer avant/après (`--stats-json` + analyseur) et noter le gain.

### 3. En-têtes de sécurité absents

Le `web.config` généré au déploiement gère la redirection HTTPS et la
réécriture Angular, rien d'autre. Aucun `Content-Security-Policy`,
`X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, et
**pas de HSTS** — la redirection 301 vers HTTPS laisse la toute première
requête en clair. Côté API, `Program.cs` n'appelle ni `UseHsts` ni
`UseHttpsRedirection`.

- [ ] `<customHeaders>` dans le `web.config` du front : CSP (commencer en
      `report-only`), `X-Content-Type-Options: nosniff`,
      `Referrer-Policy: strict-origin-when-cross-origin`,
      `Permissions-Policy`, `Strict-Transport-Security` (max-age long,
      après vérification que tout est bien en HTTPS).
- [ ] `app.UseHsts()` côté API en production.
- [ ] `Cache-Control: immutable, max-age=31536000` sur les fichiers
      hachés, `no-cache` sur `index.html` — aujourd'hui aucune politique
      n'est déclarée, IIS improvise.
- [ ] Vérifier le résultat sur **securityheaders.com** et **SSL Labs**.

### 4. Aucun test côté front, aucun garde-fou en intégration continue

`find src -name "*.spec.ts"` ne renvoie **rien**. Le workflow front
enchaîne `npm install` → `npm run build` → déploiement : ni test, ni
analyse statique. Il n'y a pas non plus de configuration ESLint dans le
dépôt.

Côté back c'est mieux — deux fichiers de tests (`DepotFichiersTests`,
`ValidationTests`), joués avant publication — mais aucun contrôleur, aucun
parcours complet n'est couvert.

- [ ] **ESLint + Prettier** en dur, avec une étape `npm run lint` dans le
      workflow qui casse le build.
- [ ] **Tests unitaires front** sur ce qui est logique et non visuel :
      `utils/validation.ts`, `screening.ts`, `job.utils.ts`,
      `paged-query.ts`, `france-geo.ts`, `markdown.pipe.ts`
      (l'assainissement du markdown mérite des tests d'attaque),
      `auth.interceptor.ts`, `auth.guard.ts`.
- [ ] **Tests d'intégration back** (`WebApplicationFactory` + base en
      mémoire ou conteneur) sur les frontières qui font mal :
      autorisation par rôle, périmètre recruteur (`PerimetreRecruteur`),
      route authentifiée des CV, brouillons non candidatables.
- [ ] **Étape de test dans le workflow front**, avant la publication.

### 5. Rien ne prévient quand ça casse

`/api/sante` existe et sait dire « sain / dégradé / en panne ». **Personne
ne l'interroge.** Une exception non rattrapée part dans le journal d'IIS,
qui n'est ni structuré, ni conservé, ni consultable ailleurs que sur le
serveur. Côté navigateur, une erreur JavaScript en production est
purement invisible.

- [ ] **Surveillance externe** de `/api/sante` (UptimeRobot, Better Stack,
      ou une tâche planifiée) → alerte courriel/SMS. Les canaux existent
      déjà (Brevo, OVH SMS).
- [ ] **Journalisation structurée** : Serilog, fichier roulant + niveau
      configurable, avec le numéro de référence de `FiletErreur` en
      propriété — pour qu'un visiteur au téléphone donne « 4F2A9C31 » et
      qu'on retrouve la ligne.
- [ ] **`ErrorHandler` Angular global** qui remonte les exceptions du
      navigateur à un endpoint dédié (avec limitation de débit et
      anonymisation), ou un service tiers si le budget le permet.
- [ ] **Tableau de bord d'exploitation** dans l'admin : dernières erreurs,
      santé des tâches de fond, âge de la dernière sauvegarde. La barre
      d'état admin en montre déjà une partie — la compléter.

---

## P1 — Ce qui fait la différence à l'usage

### 6. Monétisation

Les offres sponsorisées existent, avec label et remontée dans le tri —
**sans tunnel de paiement**. C'est le modèle économique d'un site
d'emploi, et il est gratuit.

- [ ] **Paiement des offres mises en avant** (Stripe Checkout : le moins de
      code, la conformité PCI en moins).
- [ ] **Formules recruteur** avec quotas : nombre d'offres actives, accès
      au vivier, durée de mise en avant.
- [ ] **Factures** téléchargeables + historique dans l'espace recruteur.
- [ ] **Facturation dans l'admin** : qui paie quoi, relances, remboursements.

### 7. Recette et déploiement

Un `push` sur `main` part directement en production, sans environnement
intermédiaire, sans vérification après coup, sans retour arrière prévu
autrement qu'en repoussant un correctif. La note de mémoire sur le
déploiement IIS rappelle déjà qu'un `msdeploy sync` efface les fichiers
d'exécution : le risque est connu.

- [ ] **Environnement de recette** (sous-domaine + base séparée) déployé
      depuis une branche, ou depuis `main` avant la production.
- [ ] **Test de fumée après déploiement** : appeler `/api/sante`, charger
      l'accueil et une fiche offre ; échec ⇒ le workflow échoue bruyamment.
- [ ] **Retour arrière** : garder les deux publications précédentes sur le
      serveur, prévoir la bascule.
- [ ] **Migrations EF** : elles s'appliquent au démarrage. Documenter (ou
      outiller) le chemin de retour d'une migration qui casse — c'est le
      seul incident dont on ne se relève pas en redéployant.

### 8. Référencement — ce qui reste après le SSR

- [ ] **Pages d'atterrissage à URL propre** : `/emploi/developpeur-web/paris`
      plutôt que des paramètres de requête. `/parcourir` produit
      aujourd'hui des pastilles qui mènent à des URL filtrées, que le
      `robots.txt` exclut lui-même de l'exploration. Ce sont pourtant ces
      pages-là qui captent la longue traîne (« emploi <métier> <ville> »).
- [ ] **Fil d'Ariane structuré** (`BreadcrumbList`) et **FAQ structurée**
      sur les articles du guide.
- [ ] **IndexNow / ping Bing** à chaque import : cent mille offres qui
      changent quotidiennement méritent mieux qu'une exploration passive.
- [ ] **Google Search Console** raccordée, et son suivi intégré au rituel
      (indexation, requêtes, erreurs d'exploration).
- [ ] **Pages d'erreur utiles** : la route `**` redirige vers l'accueil,
      ce qui répond 200 à une adresse morte. Une vraie page 404 qui propose
      des offres proches vaut mieux — pour le visiteur comme pour le moteur.

### 9. Accessibilité

Les bases sont là (focus visible, `prefers-reduced-motion`, `aria-live`
par endroits). Ce qui manque, c'est la **vérification** et la
**déclaration** — en France, l'obligation RGAA est un sujet dès qu'on
adresse des services publics ou de l'emploi.

- [ ] **Audit automatique** (axe-core en test, ou Lighthouse CI) sur les
      dix écrans les plus vus, intégré au workflow.
- [ ] **Parcours au clavier** vérifié à la main sur les tunnels critiques :
      candidature, dépôt d'offre, connexion.
- [ ] **Page « Déclaration d'accessibilité »** avec le taux de conformité
      et les points connus non conformes.
- [ ] **Contrastes** revérifiés après le changement d'identité visuelle
      (pétrole sur crème notamment).

### 10. Qualité des données d'offres

Cinq sources d'import (France Travail, Adzuna, Jooble, Arbeitnow,
Remotive) alimentent le même catalogue.

- [ ] **Déduplication inter-sources** : la même offre publiée sur trois
      agrégateurs apparaît trois fois. Empreinte sur
      (intitulé + entreprise + ville + fourchette) et fusion.
- [ ] **Expiration automatique** des offres importées non revues depuis
      N jours — une offre morte qui reste en ligne coûte plus cher qu'une
      offre absente.
- [ ] **Détection d'annonces frauduleuses** assistée par l'IA (le client
      existe déjà) : signaux classiques — salaire aberrant, contact hors
      plateforme, demande de paiement — en file de modération plutôt qu'en
      blocage automatique.
- [ ] **Indicateur de fraîcheur** dans l'admin : offres par source, âge
      médian, taux d'échec des imports.

---

## P2 — Ce qui ouvre la suite

### 11. Intégrations professionnelles

- [ ] **Flux XML sortant** (format Indeed / Google Jobs) pour que des
      partenaires reprennent le catalogue.
- [ ] **API publique documentée** + jetons par recruteur : dépôt d'offre et
      relève des candidatures depuis un ATS.
- [ ] **Webhooks** sur les événements (nouvelle candidature, changement de
      statut) — c'est ce que demandent les recruteurs équipés.
- [ ] **Multidiffusion** : publier une offre simultanément sur France
      Travail et les partenaires.

### 12. Performance de l'API

`Program.cs` ne déclare ni compression de réponse, ni cache de sortie.
`BrowseCache` et `AddMemoryCache` couvrent un cas ; le reste passe en
base à chaque requête.

- [ ] **`AddResponseCompression`** (Brotli/Gzip) — les listes d'offres en
      JSON compressent d'un facteur cinq à dix.
- [ ] **`AddOutputCache`** sur les lectures publiques : `/joboffers`
      (par jeu de filtres), `/joboffers/browse`, `/salaries/*`,
      `/companies/*`.
- [ ] **Journalisation des requêtes SQL lentes** (seuil EF) — puis index
      là où ça se voit.
- [ ] **ETag / 304** sur les fiches offres, pour que le navigateur ne
      retélécharge pas ce qui n'a pas bougé.

### 13. Courriel

- [ ] **SPF, DKIM, DMARC** vérifiés et documentés — sans quoi les alertes
      et confirmations partent en indésirables, ce qui casse tout le
      parcours d'inscription sans qu'aucune erreur ne s'affiche.
- [ ] **Gestion des retours** (bounces Brevo) : désactiver les adresses
      mortes plutôt que de continuer à leur écrire.
- [ ] **Centre de préférences** : choisir quoi recevoir (alertes,
      candidatures, lettre) plutôt qu'un désabonnement global.
- [ ] **Aperçu et test d'envoi** des modèles depuis l'admin.

### 14. Conformité

- [ ] **Consentement granulaire** : le bandeau cookies est binaire ; dès
      qu'une mesure d'audience arrive, il faudra distinguer les finalités.
- [ ] **Mesure d'audience respectueuse** (Matomo ou Plausible auto-hébergé)
      — aujourd'hui on ne sait pas quelles pages sont vues.
- [ ] **Durées de conservation** documentées par type de donnée, et
      alignées sur ce que `PurgeService` applique réellement.
- [ ] **Mécanisme de signalement DSA** complet (pas seulement un lien) :
      formulaire, accusé, décision motivée, voie de recours.
- [ ] **Registre des traitements** et mentions à jour pour les
      sous-traitants (Brevo, OVH, Anthropic, Firebase, France Travail).

### 15. Documentation du dépôt

Le `README.md` du front est celui généré par le CLI Angular. Rien
n'explique comment monter le projet, quels secrets sont nécessaires, ni ce
que fait chaque service de fond.

- [ ] **README** réel : prérequis, base locale, secrets attendus, lancement
      des deux projets, comptes de démonstration.
- [ ] **`CONTRIBUTING`** court : conventions de commit (elles sont déjà
      tenues), style de code, ce qui doit passer avant de pousser.
- [ ] **Schéma d'architecture** : les deux applications, la base, les cinq
      sources d'import, SignalR, les tâches de fond, les services tiers.
- [ ] **Journal des changements** destiné aux utilisateurs — ce qui existe
      aujourd'hui est l'historique Git, qui ne s'adresse pas à eux.

---

## Ordre suggéré

*L'ordre de l'audit. Les points 2 à 5 sont faits ; il est conservé parce
qu'il explique pourquoi ils l'ont été dans cet ordre-là.*

1. **SSR + découpage du paquet** (§1, §2) — ce sont les deux points qui
   changent des chiffres mesurables : pages indexées, temps d'affichage.
2. **En-têtes de sécurité** (§3) — une demi-journée, et le site passe d'un
   F à un A sur les analyseurs publics.
3. **Surveillance + journalisation** (§5) — pour cesser d'apprendre les
   pannes par un visiteur.
4. **Tests et intégration continue** (§4) — ce qui rend tout le reste
   modifiable sans crainte.
5. **Paiement** (§6) — dès que le socle tient.
6. Le reste, par opportunité.

### Ce qu'il reste à faire, dans l'ordre où cela rapporte

1. **Trancher le rendu serveur** (§1). C'est le seul point P0 ouvert, et
   il commande tout le travail de référencement déjà livré : canoniques,
   `JobPosting`, plan de site, fil d'Ariane, FAQ structurée, pages
   d'atterrissage. Chacun rend une fraction de ce qu'il pourrait tant
   qu'un robot qui n'exécute pas le JavaScript ne voit qu'une coquille.
2. **Trois enregistrements DNS** (SPF, DKIM, DMARC). Le moins de travail
   du document, et sans eux tout le parcours d'inscription casse en
   silence : les confirmations partent en indésirables, et aucune erreur
   ne s'affiche nulle part.
3. **Un compte de surveillance externe.** L'endpoint répond, le test de
   fumée l'interroge à chaque déploiement, et personne ne l'interroge
   *entre* deux déploiements.
4. **Le reste des accès**, par opportunité — chacun n'est plus qu'une
   clé à renseigner dans du code déjà écrit et testé.

---

## Ce qui n'est pas dans ce document

- La **parité fonctionnelle Indeed** : voir `TODO-INDEED.md` (atteinte).
- L'**architecture des espaces candidat et recruteur** : voir
  `TODO-ESPACES.md` (P0 « Mes candidatures » à onglets encore ouvert).
- L'**application mobile native** — la PWA installable couvre l'essentiel
  du besoin tant que le volume ne la justifie pas.
- Le **multilingue** : le sélecteur de langue et de pays a été retiré
  volontairement (commit `a44913a`). À reprendre quand un marché hors de
  France sera visé, pas avant — et alors avec `hreflang` et des URL par
  langue, pas un dictionnaire en mémoire.

---

# Reste ouvert — liste à jour

**Huit lots livrés.** La section « attend du travail » est **vide** : ce
qui suit ne se règle pas en écrivant du code.

## 1. Attend votre décision — un seul point

| Point | Deux voies |
|---|---|
| **Rendu serveur (§1)** | **(a)** Pré-rendu des routes publiques statiques + rendu serveur des fiches offres pour les robots et aperçus sociaux, via un point d'entrée .NET et une règle de réécriture sur l'agent utilisateur. **Aucun changement d'infrastructure** — le front reste des fichiers statiques sur IIS. **(b)** SSR Angular complet : meilleur résultat, mais exige un processus Node (iisnode ou reverse proxy) et change le modèle de déploiement. |

C'est le seul point P0 non traité, et le plus rentable des deux côtés :
un robot qui n'exécute pas le JavaScript ne voit qu'une coquille, et un
lien d'offre partagé sur LinkedIn ou WhatsApp n'affiche ni titre ni
description.

Il l'est devenu **davantage** depuis le 7ᵉ lot : les pages
d'atterrissage `/emploi/:metier/:ville` sont précisément celles qui
captent la longue traîne, et ce sont celles qui souffrent le plus de
n'être servies qu'en JavaScript.

## 2. Attend un accès que je n'ai pas

Chacune de ces lignes correspond à du code **écrit, testé et inerte** :
le service existe, répond « non configuré » et dit ce qui lui manque.
Il n'y a donc rien à développer, seulement une clé à renseigner.

| Point | Ce qu'il reste à faire, une fois l'accès obtenu |
|---|---|
| Surveillance externe | Créer le compte (UptimeRobot, Better Stack), pointer sur `https://api.laplateformedelemploi.com/api/sante`, alerte à 2 échecs consécutifs |
| Environnement de recette | Provisionner un site IIS et une base ; le workflow se duplique en changeant trois secrets |
| Retour arrière | Choisir la stratégie (dossiers horodatés ou bascule de site IIS) et l'outiller |
| Paiement réel | Ouvrir un compte prestataire, renseigner `Paiement:CleSecrete` et `Paiement:SecretRetour`, remplacer l'appel de `CreerTunnel`. La vérification de signature du retour est déjà écrite |
| SPF, DKIM, DMARC | Trois enregistrements DNS. Rien à écrire dans le dépôt |
| IndexNow | Poser le fichier `<clé>.txt` à la racine du site et renseigner `Seo:IndexNowKey`. Le service est écrit et ne fait rien sans |
| Google Search Console | Raccorder le domaine et suivre l'indexation |
| **Apex en HTTPS** | `laplateformedelemploi.com` pointe sur un service de redirection tiers qui ne répond qu'en HTTP : `https://` sans `www` ne se connecte pas du tout. La règle de réécriture `Apex vers www` est déjà déployée et attend que l'enregistrement A pointe sur le serveur. Détail de la manœuvre ci-dessous |
| **Mesure d'audience** | Installer une instance **Matomo ou Plausible** (auto-hébergée — jamais Google Analytics, sanctionné par la CNIL), puis renseigner `mesureUrl` et `mesureSiteId` (Matomo) ou `mesureDomaine` (Plausible) dans l'environnement. Le consentement par finalité est déjà en place et sera respecté |
| **Multidiffusion France Travail** | Demander l'habilitation « **dépôt d'offres** » — distincte de celle qui sert déjà à lire le catalogue — puis renseigner `FranceTravail:DepotClientId` et `DepotClientSecret`. La mise en forme de l'offre au format attendu est écrite |
| **Multidiffusion partenaire** | Renseigner `Multidiffusion:PartenaireUrl` et `Multidiffusion:PartenaireJeton`. Dépôt et retrait sont écrits et testés |

### L'apex en HTTPS, en détail

Constaté le 2026-08-02, après le déploiement :

| | `laplateformedelemploi.com` | `www.laplateformedelemploi.com` |
|---|---|---|
| Enregistrement A | `217.70.184.38` — service de redirection tiers | `162.19.96.47` — le serveur OVH |
| `http://` | 301 vers `https://www…`, chemin et paramètres conservés | sert |
| `https://` | **aucune connexion** — rien n'écoute sur 443 | sert |

Le trafic de l'apex n'atteint donc jamais IIS, et aucune règle de
réécriture ne peut s'y appliquer. Ce n'est pas un défaut du dépôt :
c'est un enregistrement DNS qui désigne quelqu'un d'autre.

L'ennui grandit tout seul. Les navigateurs tentent HTTPS d'abord — mode
« HTTPS-First » de Chrome, barre d'adresse de Safari — de sorte qu'une
part croissante des gens qui tapent le domaine sans `www` n'obtiennent
pas une redirection mais une erreur de connexion.

**Ce qui est déjà fait :** la règle `Apex vers www` est dans le
`web.config` généré au déploiement. Elle rend un 301 vers `https://www`
en conservant le chemin, et laisse passer `/.well-known/acme-challenge/`
— sans quoi le certificat ne pourrait jamais être validé, la validation
étant justement ce qui se fait en clair.

**Révisé le 2026-08-02.** Ce qui suit corrige trois erreurs de la version
précédente : l'ordre des étapes, la façon d'obtenir le certificat, et un
obstacle qui n'avait pas été vu.

**L'obstacle, d'abord.** Un jeton ACME est un fichier *sans extension*, et
IIS refuse de servir ce qu'il ne sait pas nommer : le module statique
rendait 404.3 alors même que les règles de réécriture épargnaient le
chemin. Aucune émission ni aucun renouvellement n'aurait pu aboutir.
Corrigé par `public/.well-known/acme-challenge/web.config`, et le test de
fumée du déploiement lit désormais un témoin à chaque mise en ligne.

*Une première correction posait ce réglage dans un bloc `location` du
`web.config` racine : IIS l'a refusé et le site entier a rendu 500
pendant 3 min 12 s. Le réglage était bon, sa portée ne l'était pas.*

**L'ordre s'inverse.** La redirection de l'apex **préserve le chemin** —
vérifié, avec et sans chaîne de requête — et une validation HTTP-01 suit
les redirections. Le jeton déposé dans la racine de `www` répond donc
pour le nom nu, **sans toucher au DNS**. Le certificat s'obtient en
premier, et la fenêtre d'avertissement décrite ici auparavant n'existe
pas : elle n'était pas inévitable, elle était le produit du mauvais ordre.

1. **Certificat** : `outils/certificat-apex.ps1` sur le serveur. Il émet
   un certificat **séparé** ne portant que le nom nu, et refuse d'agir
   tant que le témoin ne répond pas. *Ne pas étendre le certificat
   mutualisé comme le recommandait la version précédente : il couvre huit
   sites de la machine, et le réémettre ferait courir un risque à sept
   sites qui n'ont rien demandé. Le SNI permet un certificat par nom.*
2. **DNS** : l'enregistrement A de l'apex passe de `217.70.184.38` à
   `162.19.96.47`.
3. **Liaisons IIS** : le nom d'hôte `laplateformedelemploi.com` sur les
   ports 80 et 443 du site front, avec le certificat de l'étape 1.
4. **Vérifier** : `curl -I https://laplateformedelemploi.com/offres`
   doit rendre un 301 vers `https://www.laplateformedelemploi.com/offres`.

À aucun moment le site n'est plus dégradé qu'aujourd'hui : entre les
étapes 2 et 3, `https://` sur l'apex ne répond pas — l'état actuel — et
`http://` garde sa redirection.

*Variante sans travail serveur : activer la redirection HTTPS chez le
fournisseur du service de redirection, qui la propose généralement. Cela
règle le symptôme en une case à cocher, mais laisse la redirection hors
du dépôt — là où personne ne la relit, et où le prochain qui cherchera
pourquoi l'apex se comporte ainsi ne la trouvera pas.*

## 3. Attend que la production tourne

- [x] ✅ **Premier index posé après mesure** — le relevé des requêtes
      lentes, mis en service le 2026-08-02, a immédiatement attrapé une
      recherche d'offres à 1 554 ms. `IX_JobOffers_Recherche` et la
      recherche en deux temps ramènent « developpeur » de 5 031 ms à
      460 ms. En cherchant pourquoi, on a aussi découvert que la base
      était collationnée sensible aux accents : le même mot tapé sans
      accent rendait 9 offres au lieu de 71.
- [ ] **Les suivants**, quand le relevé aura tourné quelques jours en
      production. Poser un index avant d'avoir mesuré, c'est deviner — et
      un index inutile coûte à chaque écriture.

## 4. Attend du travail

**Ce document seul ne le dit pas.** Il couvre l'industrialisation — mise
en production, sécurité, performance, conformité — et pour ce périmètre
la phrase reste vraie.

Les fonctionnalités, elles, vivent dans `TODO-ESPACES.md`, qui compte
**dix-huit points ouverts** au 2026-08-02 : sept dans l'espace candidat,
neuf dans l'espace recruteur, deux transverses. Jusqu'à cette date ce
document annonçait « Rien » sans renvoyer nulle part, ce qui laissait
croire qu'il ne restait plus rien à écrire dans toute l'application.

Les trois points **P0 de l'espace candidat sont clos** : « Mes
candidatures » à onglets comptés, archivage, compteurs. Vérifiés de bout
en bout le 2026-08-02.

Le prochain lot fonctionnel, par ordre de ce qu'il rapporte au candidat :
la **date de consultation** (l'étape existe, la date manque, l'API la
renvoie déjà), « **cette offre n'est plus disponible** », puis les
**préférences d'emploi** et leur restitution sur la fiche offre — c'est
la paire qui rend les préférences utiles, l'une sans l'autre ne sert à
rien.

*Deux points d'accessibilité restent hors de portée d'un outil, et le
resteront : la **vérification manuelle au clavier** des trois tunnels
critiques (candidature, dépôt d'offre, connexion) et un **audit
`axe-core` au moteur de rendu**, qui trouve ce que l'analyse statique
ne peut pas voir — contrastes calculés, ordre de focus réel, annonces
d'un lecteur d'écran. Ce sont des vérifications, pas des
fonctionnalités : elles ne se cochent pas une fois, elles se refont.*

---

# Détail par section (historique)

Ce qui suit n'a **pas** été livré. Chaque point dit pourquoi — la
distinction importe : certains attendent une décision ou un accès, les
autres attendent du travail.

## Bloqué sur une décision ou un accès

### §1 — Rendu serveur

Le seul point P0 non traité, et le plus rentable. Il n'a pas été fait
parce qu'il **change le modèle de déploiement** : le front part
aujourd'hui vers IIS comme un jeu de fichiers statiques ; un SSR complet
demande un processus Node (iisnode, ou un reverse proxy). Ce n'est pas
une décision à prendre à la place de l'exploitant.

Deux voies, à trancher :

- [ ] **SSR complet** — `ng add @angular/ssr`, hébergement Node, cache
      serveur des fiches offres. Le plus propre, le plus lourd.
- [ ] **Pré-rendu + rendu pour robots** — les routes publiques statiques
      pré-rendues en HTML (compatible IIS tel quel), plus un point
      d'entrée .NET qui rend une page minimale (titre, description,
      `JobPosting`, texte de l'offre) aux robots et aux aperçus sociaux,
      via une règle de réécriture sur l'agent utilisateur. Aucun
      changement d'infrastructure, l'essentiel du bénéfice.

### §5 / §7 — Ce qui demande un accès

- [ ] **Surveillance externe** de `/api/sante` (UptimeRobot, Better
      Stack). L'endpoint répond et le test de fumée l'interroge à chaque
      déploiement ; personne ne l'interroge *entre* deux déploiements.
      Demande un compte tiers.
- [ ] **Environnement de recette** — sous-domaine et base séparés.
      Demande de provisionner un site IIS de plus.
- [ ] **Retour arrière** — conserver les deux publications précédentes
      sur le serveur. Demande un accès au serveur et un choix de
      stratégie (dossiers horodatés, ou bascule de site IIS).
- [ ] **Chemin de retour d'une migration EF** — les migrations
      s'appliquent au démarrage ; une migration fautive empêche l'API de
      démarrer. À outiller.

### §6 — Paiement réel

Toute la mécanique est en place : formules, quotas appliqués à la
publication (site **et** API), mises en avant incluses ou payées avec
expiration automatique, factures numérotées sans trou, TVA, page
recruteur, vue des recettes en admin.

`PrestatairePaiement` est l'unique point d'ancrage. Il répond « non
configuré » tant que `Paiement:CleSecrete` et `Paiement:SecretRetour`
sont absents, et les achats sont refusés avec un message explicite —
le parti déjà retenu pour Brevo, OVH et le modèle de langage.

- [ ] Ouvrir un compte prestataire, renseigner les deux secrets, et
      remplacer l'appel de `CreerTunnel` par celui du prestataire. La
      vérification de signature du retour est déjà écrite.

### §13 — SPF, DKIM, DMARC

- [ ] Ce sont des enregistrements DNS. Rien à écrire dans le dépôt.

## Demande du travail, pas un accès

### §8 — SEO

- [x] Page 404 réelle (l'adresse inconnue renvoyait vers l'accueil en 200)
- [x] **Pages d'atterrissage à URL propre** (`/emploi/:metier`,
      `/emploi/:metier/:ville`) — `AtterrissageController` côté API,
      composant `landing` côté site, entrées de plan de site.
      *Une combinaison sous le seuil rend 404, délibérément : mieux vaut
      une adresse qui n'existe pas qu'une page vide indexée. Cent mille
      pages sans contenu abîment le jugement porté sur tout le domaine.*
- [x] **Fil d'Ariane structuré** sur `/entreprises/*`, `/salaires/*` et
      `/guide/*`.
- [x] **FAQ structurée** sur les articles du guide (chaque intertitre
      devient une question).
- [x] **Titres et descriptions par page** sur ces trois familles — elles
      n'appelaient pas `SeoService` du tout et partageaient donc le titre
      de section générique posé par la coquille. Des milliers de fiches
      d'entreprise au même titre sont, pour un moteur, des doublons.
- [x] **IndexNow** — les offres entrées dans les sept dernières heures
      sont signalées à Bing, Yandex, Seznam et Naver après chaque import.
      Sans clé (`Seo:IndexNowKey` + fichier de vérification à la racine),
      le service ne fait rien et le dit.

### §9 — Accessibilité

- [x] Déclaration d'accessibilité (`/accessibilite`), honnête : elle
      annonce « partiellement conforme » et énumère les manques.
- [x] Règles a11y actives en intégration continue, avec cliquet.
- [x] **83 étiquettes de formulaire sur 98** liées à leur champ
      (`<label for>` + `id`). Il en reste 15, qui demandent une reprise
      manuelle : leur étiquette désigne un groupe de boutons ou une
      liste de choix, pas un champ unique — le lien correct est alors
      `aria-labelledby` sur un `role="group"`, pas un `for`.
      *Le premier passage automatique a produit 28 associations fausses
      — une étiquette pointant vers un champ situé 80 lignes plus bas.
      Elles ont été détectées par un contrôle de plausibilité puis
      retirées : une étiquette qui annonce le mauvais libellé est pire
      que pas d'étiquette du tout.*
- [x] **27 éléments cliquables sur 44** rendus accessibles au clavier,
      via la directive `appModale` (`utils/modale.directive.ts`) : Échap
      ferme, le focus entre à l'ouverture et reste piégé, il retourne à
      son point de départ à la fermeture, et le clic sur le fond est
      géré par comparaison de cible — ce qui supprime du même coup les
      `(click)="$event.stopPropagation()"` qui ne servaient qu'à annuler
      le gestionnaire du voile.
      *Poser un `tabindex` sur les fonds de modale aurait fait taire
      l'avertissement en ajoutant 7 arrêts de tabulation qui ne mènent
      nulle part. Le manque était ailleurs.*
- [x] **Les 15 étiquettes de groupe restantes**, traitées une par une
      selon ce qu'elles désignaient réellement — et elles ne désignaient
      pas toutes la même chose : cinq étaient de vraies étiquettes à qui
      il ne manquait qu'un `for`, six annonçaient un groupe de boutons
      (`role="group"` + `aria-labelledby` sur un `<span>`), une était un
      titre de section déguisé en `<label>`.
      *La correction a révélé un défaut plus sérieux que l'avertissement
      lui-même : dans `job-form`, trois identifiants étaient fixes à
      l'intérieur d'une boucle. Les étiquettes « passaient » la règle en
      désignant toutes le champ de la première question. À partir de la
      deuxième, cliquer sur « Réponse attendue » déplaçait le curseur
      dans la carte précédente.*
- [x] **Les 17 éléments cliquables restants.** Là encore, trois causes
      distinctes derrière un seul avertissement : un titre portant un
      `(click)` (devenu un `<button>` à l'intérieur du titre), une
      huitième modale restée hors de `appModale`, et surtout **quatre
      `(click)` posés sur des `div` pour ne rien faire d'autre
      qu'annuler celui d'un parent**. Ceux-là ne demandaient pas à être
      rendus focalisables : ils demandaient à disparaître. Le garde-fou
      vit maintenant sur le lien de la carte, qui sait reconnaître un
      clic tombé dans une zone d'action.
      *Un `stopPropagation` dans `applications` était devenu vestigial :
      il retenait le clic d'une carte qui n'est plus cliquable.*
- [x] **Les cinq règles a11y passent en `error`.** Elles sont à zéro, et
      le seul moyen de tenir un zéro est d'interdire le premier retour
      en arrière. Le cliquet du workflow ne couvre plus que du
      `no-explicit-any`.
- [ ] Vérification manuelle au clavier des trois tunnels critiques.
      *Ne se coche pas : c'est une vérification, elle se refait.*
- [ ] Audit `axe-core` au moteur de rendu, en plus de l'analyse
      statique — contrastes calculés, ordre de focus réel, annonces d'un
      lecteur d'écran. L'analyse statique ne voit aucun des trois.

### §10 — Qualité du catalogue

- [x] Dédoublonnage inter-sources par empreinte
- [x] Expiration des offres importées non revues depuis 30 jours
- [x] Détection de fraude (7 signaux pondérés) → file de modération
- [x] **Indicateurs de fraîcheur** dans `/admin/exploitation` : offres
      par source, dernière vue, retard signalé au-delà de deux jours, âge
      médian, offres bientôt expirées, doublons potentiels, et la file
      des offres retenues par l'analyse de fraude.

### §11 — Intégrations

- [x] Flux XML (format agrégateurs) et JSON-LD (Google for Jobs)
- [x] API publique v1, clés à portées, webhooks signés
- [x] **Multidiffusion** — dépôt d'une offre chez un partenaire depuis
      la console recruteur, suivi par destination, **et retrait**.
      *Le retrait est la raison d'être de tout le reste. Le catalogue
      sortait déjà en flux, mais un flux se subit : le partenaire vient
      le lire quand il veut, et retirer une offre pourvue consiste à
      espérer qu'il repassera. La multidiffusion pousse, reçoit une
      référence, et sait donc retirer. Une offre pourvue qui reste en
      ligne chez trois agrégateurs continue de recevoir des candidatures
      que personne ne lira — c'est le reproche le plus courant fait aux
      sites d'emploi, et il est mérité.*
      *Un retrait qui échoue ne se déclare jamais réussi : la ligne
      reste « diffusée » avec son motif. La marquer « retirée » à tort
      ferait croire au recruteur que son offre ne reçoit plus rien.*
      *Les accès manquent (habilitation « dépôt » chez France Travail,
      identifiants partenaire) : chaque destination refuse en disant ce
      qui lui manque, plutôt qu'en montrant un bouton qui ne ferait rien.*
- [x] **Documentation publique de l'API** — `/guide/api` : clés,
      portées, points d'entrée, codes de refus, webhooks et vérification
      de signature.

### §12 — Performance

- [x] Compression Brotli/Gzip, cache de sortie, requêtes lentes journalisées
- [x] **ETag / 304** sur le plan de site et les flux sortants — les gros
      fichiers relus plusieurs fois par jour par chaque robot. *Écarté
      sur la fiche offre : le compteur de vues change à chaque appel, une
      étiquette n'y tiendrait jamais.*
- [ ] Poser les index révélés par le journal des requêtes lentes, une
      fois qu'il aura tourné quelques jours en production.

### §13 / §14 — Courriel et conformité

- [x] Centre de préférences par catégorie, sans connexion
- [x] Gestion des retours d'expédition (dur, doux, plainte)
- [x] Mécanisme de signalement DSA complet
- [x] **`ConsentementCourriel.Autorise()` est branché.** Le seul
      entonnoir de courriel de candidature (`Prevenir`) et l'expéditeur
      de la lettre l'interrogent avant chaque envoi ; un refus est
      désormais appliqué, et les adresses bloquées écartées. Le lien
      vers le centre de préférences figure au pied de chaque message.
      *Les alertes de recherche et les entretiens ne partent pas encore
      par courriel : quand ils le feront, ils devront passer par le même
      contrôle.*
- [x] **Aperçu et essai des modèles depuis l'admin** — les 14 messages
      transactionnels se listent, se rendent avec des données d'exemple
      et s'envoient à une adresse choisie, depuis les réglages.
      *Aucun n'était relisible sans provoquer la situation qui le
      déclenche : relire le courriel de suppression de compte supposait
      d'en supprimer un, et relire la décision d'un signalement DSA,
      d'instruire un signalement pour de vrai. On les relisait donc
      après coup, dans la boîte du destinataire — c'est-à-dire trop tard.*
      *Le rendu passe par un `iframe` en bac à sable plutôt que par un
      `innerHTML` : ces gabarits ne sont que du style en ligne, et
      l'assainisseur d'Angular retire l'attribut `style` — l'aperçu
      aurait menti sur ce qui part.*
- [x] **Consentement granulaire par finalité** — trois finalités
      distinctes (nécessaire, mesure, confort), refus aussi accessible
      que l'accord, aucune case pré-cochée, retrait depuis `/cookies`
      avec les réponses précédentes déjà en place.
      *Un numéro de version accompagne le choix : ajouter une finalité
      invalide les consentements antérieurs, faute de quoi on la ferait
      accepter par un accord donné avant qu'elle n'existe. Et l'ancien
      bandeau binaire n'est pas converti en accord à la mesure — il
      annonçait « aucun outil de mesure d'audience », un « j'ai compris »
      donné à cette phrase-là n'autorise rien.*
- [x] **Mesure d'audience respectueuse** — service écrit pour Matomo et
      Plausible auto-hébergés, appel direct sans bibliothèque tierce,
      adresse débarrassée de ses paramètres de recherche avant l'envoi.
      *Cette dernière précision n'est pas cosmétique : les filtres
      passent par ces paramètres, et « /offres?q=depression+reconversion »
      en dit plus sur quelqu'un que tout le reste de sa visite.*
      *Inerte tant qu'aucune instance n'est déclarée — voir « Reste
      ouvert », §2.*
- [x] **Durées de conservation** détaillées par catégorie de donnée,
      relevées dans `PurgeService` plutôt que recopiées : 24 mois pour
      le compte avec préavis à 60 jours, 24 mois pour les candidatures,
      12 mois pour le journal, 10 ans pour les pièces comptables.
- [x] **Registre des traitements** — les six sous-traitants, ce que
      chacun voit exactement, et la base des transferts hors UE.
      *Le point qui méritait d'être écrit noir sur blanc : le modèle de
      langage reçoit le texte des offres, jamais un CV, jamais une
      candidature.*

### §4 — Tests

- [x] ESLint, Vitest, étapes CI sur les deux dépôts
- [x] **34 tests front** — validation, assainissement du markdown, et
      les 10 du consentement. *Ces derniers ont trouvé leur défaut à la
      première exécution : `relire()` écrivait dans un champ déclaré
      après lui, le `catch` avalait l'erreur, et tout choix enregistré
      était oublié au rechargement.*
- [x] **Tests d'intégration back** (`WebApplicationFactory`) — 15 tests
      sur les frontières qui font mal : autorisation par rôle, périmètre
      recruteur (y compris le collègue de la même entreprise, et le
      compte sans entreprise qui ne partage rien), route authentifiée
      des CV, brouillon non candidatable, quota de formule.
      *Ils passent par le vrai pipeline HTTP — jeton signé, filtres,
      autorisation. Un test qui appelle la méthode du contrôleur en
      direct saute exactement la couche où logent ces failles, et
      rapporterait « vert » sur les cinq.*
      *Deux obstacles valaient d'être notés : le démarrage applique des
      migrations SQL Server et sème des données de démonstration — d'où
      la garde sur l'environnement « Test » ; et le chemin du dépôt
      contient une apostrophe (« La Plateforme de l'emploi ») qui casse
      l'expression MSBuild dont `Mvc.Testing` déduit la racine de
      contenu, d'où la racine posée à la main.*
- [x] Tests de `QualiteCatalogue` (empreinte, variantes d'intitulé et de
      lieu, signaux de fraude, accents et apostrophes typographiques) et
      de `WebhookService` (signature, rejeu, secrets) — 34 tests ajoutés,
      79 au total. **Ils ont trouvé deux vrais défauts** : les motifs de
      fraude, écrits sans accents, ne reconnaissaient pas « carte
      d'identité » ; et les deux signaux les plus accablants pesaient
      moins que le seuil, donc ne déclenchaient la modération qu'avec
      l'aide fortuite d'un signal faible.
- [x] **Tests de `FacturationService`** — 26 tests : numérotation sans
      trou, non-réattribution après annulation, TVA et arrondis, quotas
      par formule, brouillons exemptés, offre fermée qui libère une
      place, formule échue qui retombe sur la gratuite, mises en avant
      incluses ou payées, expiration et double poussée.
      *La base est **SQLite en mémoire**, pas le fournisseur
      « InMemory » d'EF : ce dernier ne connaît ni clé étrangère, ni
      unicité, ni transaction. Un test qui passe dessus ne dit rien de
      ce qui se passera en production — et c'est précisément sur ces
      règles-là que porte la facturation. La contrainte a d'ailleurs
      immédiatement servi : elle a refusé les offres rattachées à un
      recruteur inexistant, puis, dans la multidiffusion, une ligne de
      suivi posée avant vérification de l'offre.*
