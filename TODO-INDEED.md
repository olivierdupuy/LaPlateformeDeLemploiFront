# TODO — Parité fonctionnelle Indeed

> **Objectif** : implémenter dans *La Plateforme de l'emploi* l'ensemble des fonctionnalités d'Indeed.
> **Source de l'audit** : audit live via BrowserMCP sur `https://fr.indeed.com` le 2026-07-26.
> Pages capturées directement :
> - Page d'accueil + **SERP** `/jobs?q=développeur+web&l=Paris` (recherche, filtres, cartes d'offres, volet détail split, alertes, pagination, recherches associées)
> - **Page entreprise** `/cmp/Waisso` (onglets, 5 critères de notation, avis, salaires par poste, Q&A, FAQ, lieux)
> - **Hub Salaires** `/career/salaries` (recherche métier+lieu, meilleurs salaires par secteur)
> Zones non capturées (bloquées par Cloudflare / nécessitent un compte), complétées par connaissance produit : espace employeur `/hire`, espace candidat connecté.

### Légende de couverture (état actuel de l'app — à confirmer au cas par cas)
- ✅ **Existe** déjà dans l'app
- 🟡 **Partiel** — existe mais à compléter/aligner sur Indeed
- 🔴 **À créer** — absent

> Note : les flags des sections 1–10 ci-dessous datent de l'audit initial. La quasi-totalité a été livrée (voir « Avancement P0 → Compléments » en bas). **La liste actionnable de ce qui reste est ci-dessous.**

---

## 🎯 Reste à faire (au 2026-07-26)

Raffinements de niche encore ouverts (le reste de la parité Indeed est livré) :
- [x] ~~**Compteur d'embauches / réactivité**~~ ✅ endpoint `GET /companies/{name}/activity` + badges « X recrutements récents » / « Répond souvent » sur la fiche offre
- [x] ~~**Badge salaire vs marché**~~ ✅ fiche offre : salaire de l'offre situé vs estimation du métier (au-dessus / dans / en dessous)
- [x] ~~**Graphique des notes année/année**~~ ✅ Chart.js sur l'onglet Avis (moyenne par an)
- [x] ~~**Carte du lieu (Leaflet)**~~ ✅ carte OSM + marqueur sur la fiche offre (si coordonnées)
- [x] ~~**Événements emploi**~~ ✅ modèle `JobEvent` + `EventsController`, page `/evenements` (à venir/passés, création par recruteur/admin), liens footer
- [x] ~~**Réponses automatiques** recruteur~~ ✅ champ `AutoReplyMessage` sur l'offre (formulaire) → message auto envoyé au candidat (messagerie) à la réception de sa candidature
- [x] ~~**Multi-utilisateurs / équipe** de recrutement~~ ✅ partage des offres entre recruteurs d'une même entreprise (`GET /joboffers/mine?scope=team` + `/team-members`) : toggle « Mes offres / Toute l'équipe » + coéquipiers dans `my-offers`
- [x] ~~**Description d'offre en HTML/markdown riche**~~ ✅ pipe markdown **assaini** (gras, italique, listes, sous-titres, liens) sur la fiche offre + hint formulaire
- [x] ~~**Choix du pays / localisation**~~ ✅ sélecteur de pays (FR/BE/CH/CA/LU) dans le footer, préférence persistée (`I18nService`)

**✅ Tous les items du TODO sont traités** — parité Indeed atteinte (hors profondeur des données réelles salaires/avis, paiement des offres sponsorisées, app mobile native).

---

## 1. Recherche d'emploi (SERP)

- [x] ✅ **Double champ de recherche** : mots-clés / intitulé / entreprise **+** lieu (deux champs séparés)
- [x] ✅ **Autocomplétion** sur le champ mots-clés (intitulés, entreprises)
- [x] ✅ **Autocomplétion lieu** *(géolocalisation « près de moi » non implémentée)*
- [x] ✅ **Rayon / distance** autour du lieu (10, 25, 50, 100 km)
- [x] ✅ **Filtres** (barre horizontale, chacun un menu déroulant) :
  - [x] ✅ Salaire (min/max)
  - [x] ✅ Type de contrat (CDI, CDD, Stage, Alternance, Freelance)
  - [x] ✅ Télétravail (sur site / télétravail)
  - [x] ✅ Secteur d'activité
  - [x] ✅ Horaires de travail
  - [x] ✅ Langues demandées
  - [x] ✅ Niveau d'études requis
  - [x] ✅ Date de publication (24 h, 3 j, 7 j, 14 j)
- [x] ✅ **Tri** : par pertinence / par date / salaire / vues
- [x] ✅ **Recherches associées** ("les candidats ont aussi recherché…") — chips cliquables
- [x] ✅ **Recherches sauvegardées** (composant `saved-searches`)
- [x] ✅ **Alerte email** depuis la SERP : bouton « Créer l'alerte » qui enregistre la recherche courante avec alerte activée
- [x] ✅ **Recommandations personnalisées** ("emplois pour vous") — recommandations IA existantes
- [x] ✅ **Pagination** des résultats
- [x] ✅ **Feedback de pertinence** (pouce haut/bas sous les résultats)
- [x] ✅ **Pages "parcourir par métier/ville"** (`/parcourir`) *(URLs SEO en slug `.html` non implémentées)*

## 2. Carte d'offre (résultats)

- [x] ✅ **Vue split** : liste à gauche + **volet détail** à droite (sans changer de page)
- [x] ✅ **Badge "Candidature simplifiée"** (postuler en 1 clic avec le CV de la plateforme)
- [x] ✅ **Badge "Urgent"**
- [x] ✅ **Indicateur de réactivité employeur** ("Répond souvent" — sur la fiche offre)
- [x] ✅ **Compteur d'embauches** ("X recrutements récents" — sur la fiche offre)
- [x] ✅ **Label "Sponsorisée"** pour les offres mises en avant
- [x] ✅ **Avantages listés sur la carte** (via champ `Benefits`)
- [x] ✅ **Salaire** affiché (fourchette)
- [x] ✅ **Bouton Enregistrer/Favori** directement sur la carte
- [x] ✅ **Extrait de description** (snippet)
- [x] ✅ **"Autres offres de cet employeur"** (sur la fiche offre)

## 3. Fiche offre (détail)

- [x] ✅ **Note entreprise (étoiles) + lien** vers la page d'avis de l'entreprise
- [x] ✅ **Postuler** (composant `apply-modal`)
- [x] ✅ **Enregistrer l'offre**
- [x] ✅ **Partager l'offre** (Web Share API / copie du lien)
- [x] ✅ **Bloc "Détails de l'emploi" structuré** : salaire, type, horaires, télétravail, expérience, formation, langues, secteur
- [x] ✅ **Carte/plan du lieu** (Leaflet + OpenStreetMap) + type de télétravail
- [x] ✅ **Signaler l'offre** (contenu abusif / frauduleux)
- [x] ✅ **Transparence de l'annonce** (bloc dépliable : date de publication, type d'affichage, origine, référence)
- [x] ✅ **Description riche** (markdown assaini : listes, titres, gras…)

## 4. Candidature

- [x] ✅ **Candidature simplifiée / 1 clic** avec le CV de la plateforme (Easy Apply)
- [x] ✅ **Postuler avec CV** créé sur la plateforme (`cv-builder`)
- [x] ✅ **Import de CV PDF/DOCX** + parsing (préremplissage du profil)
- [x] ✅ **Questions de présélection** (screening questions) définies par le recruteur
- [x] ✅ **Suivi des candidatures** avec statuts (`track-applications`)
- [x] ✅ **Accusé de réception + relance** : réponse auto à la candidature + bouton « Relancer » sur les candidatures en attente (message au recruteur, anti-spam 7 j)
- [x] ✅ **Lettre de motivation** (optionnelle) attachée à la candidature

## 5. Espace candidat

- [x] ✅ **Profil** (`profile`)
- [x] ✅ **CV en ligne** (`cv-builder`) — *reste optionnel : multi-CV, export PDF*
- [x] ✅ **CV visible par les employeurs** (toggle de visibilité → alimente le vivier `candidate-list`)
- [x] ✅ **Offres enregistrées / favoris** (`bookmarks`)
- [x] ✅ **Mes candidatures** (`track-applications`)
- [x] ✅ **Alertes emploi**
- [x] ✅ **Recherches sauvegardées** (`saved-searches`)
- [x] ✅ **Entretiens** (`interviews`)
- [x] ✅ **Messagerie** avec les recruteurs (`inbox`, temps réel SignalR)
- [x] ✅ **Notifications** (push / temps réel)
- [x] ✅ **Complétude du profil** (% + champs manquants)

## 6. Avis sur les entreprises *(nouvelle zone produit)* — audité en direct sur `/cmp/Waisso`

- [x] ✅ **Page entreprise à onglets** : `À propos` · `Emplois` · `Avis` · `Questions`
- [x] ✅ **En-tête** : avatar, **note globale (x,x/5 étoiles)**, bouton **Suivre**, bouton **Ajouter un avis**
- [x] ✅ **Bloc "À propos de l'entreprise"** : création, effectif, secteur, siège, site web *(chiffre d'affaires non inclus)*
- [x] ✅ **Notes par 5 critères** (équilibre, avantages/salaires, sécurité/évolution, direction, culture)
- [x] ✅ **Aperçu des notes** : graphique d'évolution **année par année** (Chart.js)
- [x] ✅ **Avis d'employés** : note /5 + poste + lieu + date + titre + texte libre
- [x] ✅ **Déposer un avis** (formulaire avec star-pickers)
- [x] ✅ **Questions & réponses** (onglet Questions : poser / répondre)
- [x] ✅ **FAQ auto de l'entreprise** (questions courantes générées : siège, effectif, recrutement, note)
- [x] ✅ **Lieux de l'entreprise** (compteur d'offres par lieu + lien vers les offres filtrées)
- [x] ✅ **Salaires par poste** dans la page entreprise (moyenne annuelle par métier)
- [x] ✅ **Offres de l'entreprise** (onglet Emplois)
- [x] ✅ **Suivre une entreprise** (relation de suivi + compteur)
- [x] ✅ **"Autres entreprises qui pourraient vous intéresser"** (même secteur)
- [x] ✅ **Modération des avis** (onglet Avis dans `admin-moderation`)

## 7. Salaires *(nouvelle zone produit)* — audité en direct sur `/career/salaries`

- [x] ✅ **Hub Salaires** : recherche par intitulé de poste + filtre secteur *(recherche par lieu non incluse)*
- [x] ✅ **Meilleurs salaires par secteur** : liste de métiers + salaire moyen annuel + lien vers les offres
- [x] ✅ **Page salaire par métier** (`/salaires/metier/:title`) : moyen, **fourchette (min/médiane/max)**, par **lieu**, par **entreprise**
- [x] ✅ **Contribuer un salaire** (anonyme) pour alimenter les données
- [x] ✅ **Salaire de l'offre rapproché de l'estimation du marché** (badge au-dessus/dans/en dessous)
- [x] ✅ **Lien croisé** salaire ↔ offres d'emploi correspondantes

## 8. Espace recruteur / employeur

- [x] ✅ **Publier une offre** (`job-form`)
- [x] ✅ **Gérer les candidatures** — kanban, notes, actions groupées (`applications`)
- [x] ✅ **Vivier de candidats / recherche de CV** (`candidate-list`, `candidate-profile`)
- [x] ✅ **Templates d'offres** + **duplication**
- [x] ✅ **Tableau de bord analytics** (`dashboard-recruiter`, Chart.js)
- [x] ✅ **Planification d'entretiens** (`interviews`)
- [x] ✅ **Messagerie candidats** (`inbox`)
- [x] ✅ **Offres sponsorisées / mise en avant** (toggle + label "Sponsorisée") *(pas de tunnel de paiement)*
- [x] ✅ **Questions de présélection** paramétrables à la création d'offre
- [x] ✅ **Page entreprise / branding employeur** (fiche "À propos" éditable)
- [x] ✅ **Réponses automatiques** aux candidats + indicateur de réactivité
- [x] ✅ **Statistiques par offre** (vues, candidatures, conversion, statuts)
- [x] ✅ **Multi-utilisateurs / équipe** de recrutement (partage d'offres par entreprise)

## 9. Contenu & carrière

- [x] ✅ **Guide Carrières** : articles (rédaction de CV, entretien, salaire, reconversion)
- [x] ✅ **Parcourir les emplois** par catégorie / ville / contrat (`/parcourir`)
- [x] ✅ **Parcourir les entreprises** (annuaire — `company-list`)
- [x] ✅ **Événements emploi** (salons, webinaires — `/evenements`)

## 10. Transverse / plateforme

- [x] ✅ **Multi-langue (i18n)** — service runtime FR/EN + switcher (extensible)
- [x] ✅ **Choix du pays / localisation** (sélecteur footer, préférence persistée)
- [x] ✅ **Géolocalisation & cartes** (Leaflet) — recherche par rayon + carte du lieu
- [x] ✅ **Recommandations IA / matching** offre ↔ candidat
- [x] ✅ **Accessibilité** (a11y : focus visible, reduced-motion, contrastes — base du design system)
- [x] ✅ **PWA / expérience mobile** (manifest + service worker, installable)
- [x] ✅ **RGPD** : bandeau cookies, export/suppression des données *(signalement DSA : lien seulement)*
- [x] ✅ **Notifications temps réel** (SignalR)
- [x] ✅ **Modération & anti-fraude** (signalements d'offres + modération admin)
- [x] ✅ **SSO / connexion sociale** (Google — *scaffold, nécessite un Client ID*)

---

## ✅ Avancement — Bloc P0 (implémenté le 2026-07-26)

Livré (front `lpdeFront` + back `lpdeBack`, builds verts) :
- **Double champ** de recherche mot-clé **+ lieu** avec **autocomplétion** (endpoint `GET /joboffers/suggest`)
- **Barre de filtres complète** : type de contrat, télétravail, secteur, **horaires** (nouveau champ), **langues** (nouveau champ), **date de publication**, + panneau avancé (salaire, expérience, formation), **tri** (pertinence/date/salaire/vues)
- **Vue split** liste ↔ volet détail (desktop) ; navigation vers la fiche complète sur mobile
- **Avantages affichés sur les cartes** + volet détail structuré (salaire, type, formation, langues, avantages)
- **Partage** d'offre (Web Share API / copie du lien) sur carte + volet + fiche
- **Signalement** d'offre : modale + `POST /joboffers/{id}/report` + table `JobReports` + endpoints admin (`GET/PATCH /joboffers/reports`)
- Backend : champs `WorkSchedule` + `Languages` sur `JobOffer` (+ DTOs, formulaire de publication), **migration EF `P0SearchFeatures`** générée (s'applique au démarrage)

Complément P0 (implémenté le 2026-07-26, builds verts) :
- **Recherche par rayon** : champs `Latitude`/`Longitude` sur `JobOffer`, `GeoUtils` (géocodage statique villes FR + haversine, zéro dépendance réseau), géocodage au create/update + **backfill au démarrage** des offres existantes, filtre `radius` dans `GET /joboffers`, **sélecteur de rayon** (10/25/50/100 km) dans la barre de filtres (actif quand un lieu est saisi). Migration EF `GeoAndEasyApply`.
- **Candidature simplifiée (1 clic)** : champ `EasyApply` (`JobOffer` + DTO + toggle formulaire), **badge** sur cartes + fiche, **bouton 1-clic** (candidat connecté → candidature créée depuis son profil/CV via `POST /applications`, `Source = "Candidature simplifiée"`), états « Envoi… » / « Candidature envoyée ».

Finalisation P0 (implémenté le 2026-07-26, builds verts) :
- **Pages de parcours SEO** : endpoint `GET /joboffers/browse` (métiers, villes, contrats avec compteurs) + composant `browse-jobs` à la route **`/parcourir`** (chips cliquables → recherche filtrée) + liens navbar & footer.
- **Signalements dans la modération admin** : onglet **Signalements** dans `admin-moderation` (liste offre/motif/détails/date/statut, actions **Traiter/Rejeter**, lien vers l'offre) branché sur `GET/PATCH /joboffers/reports`.

**➡️ Bloc P0 terminé.**

## ✅ Avancement — Bloc P1 (implémenté le 2026-07-26, builds verts)
- **Visibilité CV / vivier** : champ `IsSearchable` sur `AppUser` (+ DTOs), filtre du vivier `candidate-list` côté back, **toggle** dans le profil.
- **Import CV → préremplissage profil** : endpoint `POST /cv/parse-profile` (extraction PDF/DOCX + OpenAI → titre/compétences/expérience/formation/ville/bio), bouton **« Pré-remplir depuis mon CV »** dans le profil.
- **Questions de présélection** : champ `ScreeningQuestions` (offre) + `ScreeningAnswers` (candidature) ; éditeur dans `job-form`, affichage/collecte obligatoire dans `apply-modal` (l'easy-apply 1-clic bascule sur la modale si des questions existent), consultation par le recruteur dans `applications`. Migration EF `P1Features`.

**➡️ Bloc P1 terminé.**

## 🚧 Avancement — Bloc P2 (en cours, 2026-07-26)
- **Fiche offre `/offres/:id`** : mise en page refondue (hero card + outils, grille « Détails de l'emploi », sidebar candidature sticky + entreprise + notes).
- **Avis d'entreprises** (démarré) : modèle `CompanyReview` (note globale + 5 critères : équilibre, salaire/avantages, sécurité/évolution, direction, culture), `CompanyReviewsController` (`GET/POST /companies/{name}/reviews`, `GET .../rating`), migration EF `CompanyReviews`. Page entreprise enrichie : **onglets Emplois/Avis**, résumé des notes (moyenne + critères + répartition), **liste d'avis**, **dépôt d'avis** (modale avec star-pickers). Builds verts.

- **Salaires** : modèle `SalaryContribution` + `SalariesController` (`GET /salaries/roles` meilleurs salaires par métier/secteur, `GET /salaries/estimate` fourchette min/médiane/max + par lieu + par entreprise, `POST /salaries/contribute`), migration EF `SalaryContributions`. Front : **hub `/salaires`** (recherche + filtre secteur + liste métiers), **détail `/salaires/metier/:title`** (salaire moyen, barre de fourchette avec médiane, par entreprise/lieu, **contribuer un salaire**), lien navbar. Builds verts.

- **Q&A entreprise + suivre** : modèles `CompanyQuestion`/`CompanyAnswer`/`CompanyFollow` + endpoints (questions/réponses, follow toggle). Front : **onglet Questions** (poser/répondre) + **bouton Suivre** (compteur) sur la page entreprise. Migration EF `CompanyEngagement`.
- **Employeur avancé** : endpoints recruteur `PATCH /joboffers/{id}/feature` (sponsoriser sa propre offre) + `GET /joboffers/{id}/stats` (vues, candidatures, conversion, statuts). Front : dans `my-offers`, boutons **Sponsoriser** + **Stats** (panneau KPI dépliable), **label « Sponsorisée »** sur les cartes d'offres (tri pertinence les remonte déjà).

**➡️ Bloc P2 essentiellement terminé** (Avis, Salaires, Q&A/suivre, employeur avancé).

## ✅ Avancement — Blocs P3 / P4 (2026-07-26, builds verts)
- **Guide Carrières** : composant `careers-guide` (liste + article) route `/guide` et `/guide/:slug`, 4 articles (CV, entretien, salaire, reconversion), liens footer.
- **RGPD** : bandeau de consentement cookies (app shell, localStorage), endpoints `GET /auth/export-data` (export JSON) + `DELETE /auth/account` (suppression + nettoyage des données), boutons Export / Supprimer dans le profil.
- **i18n** : `I18nService` runtime (dictionnaire FR/EN + `t()`, persistance), **switcher FR/EN** dans la navbar, libellés du layout traduits (extensible aux autres écrans via `t()`).
- **PWA** : `manifest.webmanifest` + icône SVG + `theme-color`/apple meta dans `index.html` + service worker (`public/sw.js`, coquille offline) enregistré.
- **SSO Google** *(scaffold)* : endpoint `POST /auth/google` (vérif du jeton via Google tokeninfo + JWT), `GoogleSignInButton` (GIS) sur la page de connexion, config `environment.googleClientId`. **⚠️ Nécessite un Google Client ID** (front `environment.googleClientId` + back `Google:ClientId`) pour être fonctionnel.

**➡️ Roadmap Indeed P0 → P4 complète.**

## ✅ Avancement — Compléments (items 🟡/🔴 restants, 2026-07-26, builds verts)
- **Fiche « À propos » d'une entreprise** : modèle `CompanyProfile` (création, effectif, secteur, siège, site, présentation) + `GET/PUT /companies/{name}/profile`, migration `CompanyProfile`. Front : **onglet « À propos »** sur la page entreprise (affichage + **éditeur** pour recruteur/admin).
- **Modération des avis** : endpoints admin `GET /companies/reviews/all` + `PATCH /companies/reviews/{id}/status` ; **onglet « Avis entreprises »** dans `admin-moderation` (approuver/masquer). Les avis masqués n'apparaissent plus côté public.
- **Note entreprise (étoiles)** sur la fiche offre (carte entreprise, lien vers les avis) + **« Autres offres chez <entreprise> »**.
- **Complétude du profil** : barre de progression % + champs manquants dans le profil candidat.
- **Recherches associées** (chips « les candidats ont aussi recherché ») + **feedback de pertinence** (pouce haut/bas) sous les résultats de recherche.

Restent (raffinements de niche, non bloquants) : réactivité employeur (« répond sous X j »), compteur d'embauches 30 j, carte Leaflet du lieu, graphique des notes année/année, badge salaire vs marché, événements emploi, réponses auto recruteur, multi-utilisateurs, description d'offre en HTML riche.

## Priorisation suggérée (pour atteindre la parité perçue rapidement)

1. **P0 — cœur recherche/offre** : double champ + autocomplétion, filtres complets (secteur, études, langues, horaires), tri, vue split liste+détail, avantages sur les cartes, partage & signalement d'offre.
2. **P1 — candidature & profil** : candidature simplifiée 1 clic, import CV + parsing, visibilité du CV (vivier), questions de présélection.
3. **P2 — nouvelles zones produit** : Avis entreprises (+ notes par critère, Q&A), Estimation de salaire.
4. **P3 — employeur avancé** : offres sponsorisées, stats par offre, réactivité/réponses auto, branding.
5. **P4 — contenu & transverse** : Guide Carrières, i18n, PWA, SSO Google, RGPD/DSA.

## Détails à re-vérifier en direct (audit à compléter quand accessible)
- [x] ~~Page **Avis entreprise** (`/cmp/<entreprise>`)~~ — ✔ audité (onglets, 5 critères, avis, Q&A, FAQ, lieux)
- [x] ~~Page **Estimation de salaire** (`/career/salaries`)~~ — ✔ audité (hub, par secteur, par métier)
- [ ] Espace **employeur** `/hire` — tunnel de publication, options de sponsorisation, tarifs *(bloqué par Cloudflare pendant l'audit)*
- [ ] Espace **candidat connecté** (profil, "mon Indeed", complétude) — nécessite un compte
- [ ] Page **salaire par métier** détaillée (`/career/<metier>/salaries`) — structure exacte de la fourchette/graphique
