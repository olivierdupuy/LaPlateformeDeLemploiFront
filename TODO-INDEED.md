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

> Note : les flags sont estimés à partir des composants existants (`job-list`, `job-detail`, `job-form`, `applications`, `bookmarks`, `saved-searches`, `track-applications`, `cv-builder`, `interviews`, `inbox`, `candidate-list`, `company-list/detail`, dashboards, admin…) et de l'historique git (alertes emploi, recommandations IA, kanban, templates, bulk actions, SignalR temps réel). À vérifier dans le code avant chaque implémentation.

---

## 1. Recherche d'emploi (SERP)

- [ ] 🟡 **Double champ de recherche** : mots-clés / intitulé / entreprise **+** lieu (deux champs séparés)
- [ ] 🔴 **Autocomplétion** sur le champ mots-clés (intitulés, entreprises, compétences populaires)
- [ ] 🔴 **Autocomplétion lieu** (villes, départements, codes postaux) + géolocalisation "près de moi"
- [ ] 🔴 **Rayon / distance** autour du lieu (0, 5, 10, 25, 50 km…)
- [ ] **Filtres** (barre horizontale, chacun un menu déroulant) :
  - [ ] 🟡 Salaire (minimum estimé, tranches)
  - [ ] 🟡 Type de contrat (CDI, CDD, Intérim, Stage, Alternance, Freelance…)
  - [ ] 🟡 Télétravail (sur site / hybride / 100 % télétravail)
  - [ ] 🔴 Secteur d'activité
  - [ ] 🟡 Horaires de travail (temps plein, temps partiel, journée, nuit…)
  - [ ] 🔴 Langues demandées
  - [ ] 🔴 Niveau d'études requis
  - [ ] 🟡 Date de publication (24 h, 3 j, 7 j, 14 j…)
- [ ] 🟡 **Tri** : par pertinence / par date
- [ ] 🔴 **Recherches associées** ("les chercheurs d'emploi ont aussi recherché…") — chips cliquables
- [ ] ✅ **Recherches sauvegardées** (composant `saved-searches`)
- [ ] 🟡 **Alerte email** activable directement depuis la SERP (toggle "recevoir des alertes pour cette recherche")
- [ ] ✅ **Recommandations personnalisées** ("emplois pour vous") — recommandations IA existantes
- [ ] ✅ **Pagination** des résultats
- [ ] 🔴 **Feedback de pertinence** ("à quel point ces offres sont-elles pertinentes ?") pour affiner l'algo
- [ ] 🔴 **URL SEO partageables** (`/q-<mot>-l-<ville>-emplois.html`) + pages "parcourir par métier/ville"

## 2. Carte d'offre (résultats)

- [ ] 🔴 **Vue split** : liste des offres à gauche + **volet détail** de l'offre sélectionnée à droite (sans changer de page)
- [ ] 🟡 **Badge "Candidature simplifiée"** (postuler en 1 clic avec le CV de la plateforme)
- [ ] ✅ **Badge "Urgent"**
- [ ] 🔴 **Indicateur de réactivité employeur** ("répond souvent sous X jours")
- [ ] 🔴 **Compteur d'embauches** ("X embauche(s) au cours des 30 derniers jours")
- [ ] 🔴 **Label "Annonce" / Sponsorisé** pour les offres mises en avant
- [ ] 🟡 **Avantages listés sur la carte** (tickets resto, RTT, participation, mutuelle, CE…) — nécessite un modèle "avantages/perks"
- [ ] ✅ **Salaire** affiché (fourchette)
- [ ] ✅ **Bouton Enregistrer/Favori** directement sur la carte
- [ ] ✅ **Extrait de description** (snippet)
- [ ] 🔴 **"Offres similaires de cet employeur"** (regroupement par entreprise)

## 3. Fiche offre (détail)

- [ ] 🔴 **Note entreprise (étoiles) + lien** vers la page d'avis de l'entreprise
- [ ] ✅ **Postuler** (composant `apply-modal`)
- [ ] ✅ **Enregistrer l'offre**
- [ ] 🟡 **Partager l'offre** (lien copiable, email, réseaux sociaux)
- [ ] 🟡 **Bloc "Détails de l'emploi" structuré** : salaire, type de poste, lieu, avantages, expérience requise, langues
- [ ] 🟡 **Carte/plan du lieu** (Leaflet déjà dispo dans les deps) + type de télétravail
- [ ] 🔴 **Signaler l'offre** (contenu abusif / frauduleux)
- [ ] 🔴 **Transparence de l'annonce** (origine, sponsorisation)
- [ ] 🟡 **Description riche** (HTML formaté : listes, titres, avantages)

## 4. Candidature

- [ ] 🟡 **Candidature simplifiée / 1 clic** avec le CV de la plateforme (Easy Apply)
- [ ] ✅ **Postuler avec CV** créé sur la plateforme (`cv-builder`)
- [ ] 🟡 **Import de CV PDF/DOCX** + parsing (préremplissage du profil)
- [ ] 🔴 **Questions de présélection** (screening questions) définies par le recruteur
- [ ] ✅ **Suivi des candidatures** avec statuts (`track-applications`)
- [ ] 🟡 **Historique / accusé de réception** + relances automatiques
- [ ] 🔴 **Lettre de motivation** (optionnelle) attachée à la candidature

## 5. Espace candidat

- [ ] ✅ **Profil** (`profile`)
- [ ] ✅ **CV en ligne** (`cv-builder`) — *à compléter : upload PDF, multi-CV, export PDF*
- [ ] 🟡 **CV visible par les employeurs** (toggle de visibilité → alimente le vivier `candidate-list`)
- [ ] ✅ **Offres enregistrées / favoris** (`bookmarks`)
- [ ] ✅ **Mes candidatures** (`track-applications`)
- [ ] ✅ **Alertes emploi**
- [ ] ✅ **Recherches sauvegardées** (`saved-searches`)
- [ ] ✅ **Entretiens** (`interviews`)
- [ ] ✅ **Messagerie** avec les recruteurs (`inbox`, temps réel SignalR)
- [ ] ✅ **Notifications** (push / temps réel)
- [ ] 🔴 **Complétude du profil** (% + suggestions pour être trouvé)

## 6. Avis sur les entreprises *(nouvelle zone produit — 🔴 majeur)* — audité en direct sur `/cmp/Waisso`

- [ ] 🔴 **Page entreprise à onglets** : `À propos` · `Pourquoi postuler` · `Avis` · `Salaires` · `Emplois` · `Questions` (Entretiens en cours de suppression chez Indeed)
- [ ] 🔴 **En-tête** : logo, **note globale (x,x/5 étoiles)**, bouton **Suivre**, bouton **Ajouter un avis**
- [ ] 🔴 **Bloc "À propos de l'entreprise"** : date de création, nombre d'employés (tranche), chiffre d'affaires, secteur, siège social, lien site web
- [ ] 🔴 **Notes par 5 critères** (chacun /5, cliquable → avis filtrés) :
  - Équilibre vie privée/professionnelle · Avantages et salaires · Sécurité et évolution · Direction · Culture d'entreprise
- [ ] 🔴 **Aperçu des notes** : graphique d'évolution **année par année**
- [ ] 🔴 **Avis d'employés** : note /5 + **poste + lieu** + date + **titre** + texte libre ; tri/filtre par critère
- [ ] 🔴 **Déposer un avis** (formulaire, modéré)
- [ ] 🔴 **Questions & réponses** : onglets `Questions fréquentes` / `Entretiens d'embauche`, regroupées par sujet
- [ ] 🔴 **FAQ auto de l'entreprise** ("recrute-t-elle en France ?", "combien d'employés ?", "où est le siège ?")
- [ ] 🔴 **Lieux de l'entreprise** (avec note par lieu) + parcourir les offres par lieu
- [ ] 🔴 **Salaires par poste** dans l'entreprise ("x salaires bruts partagés", moyenne annuelle par poste)
- [ ] 🟡 **Offres de l'entreprise** en carrousel (déjà via `company-detail`)
- [ ] 🔴 **Suivre une entreprise** (recevoir ses nouvelles offres)
- [ ] 🔴 **"Autres entreprises qui pourraient vous intéresser"** (suggestions)
- [ ] 🔴 **Modération des avis** (côté admin — étendre `admin-moderation`)

## 7. Salaires *(nouvelle zone produit — 🔴)* — audité en direct sur `/career/salaries`

- [ ] 🔴 **Hub Salaires** : recherche **Intitulé de poste + Lieu** ("Imaginez votre prochain salaire")
- [ ] 🔴 **Meilleurs salaires par secteur** (filtre secteur) : liste de métiers + **salaire moyen annuel** + lien vers les offres
- [ ] 🔴 **Page salaire par métier** (`/career/<metier>/salaries`) : salaire moyen, **fourchette (bas/médian/haut)**, par **lieu**, par **entreprise**, satisfaction salariale, métiers proches — graphique (Chart.js déjà utilisé)
- [ ] 🔴 **Contribuer un salaire** (anonyme) pour alimenter les données
- [ ] 🔴 **Salaire de l'offre rapproché de l'estimation du marché** (badge "au-dessus/en dessous du marché")
- [ ] 🔴 **Lien croisé** salaire ↔ offres d'emploi correspondantes

## 8. Espace recruteur / employeur

- [ ] ✅ **Publier une offre** (`job-form`)
- [ ] ✅ **Gérer les candidatures** — kanban, notes, actions groupées (`applications`)
- [ ] ✅ **Vivier de candidats / recherche de CV** (`candidate-list`, `candidate-profile`)
- [ ] ✅ **Templates d'offres** + **duplication**
- [ ] ✅ **Tableau de bord analytics** (`dashboard-recruiter`, Chart.js)
- [ ] ✅ **Planification d'entretiens** (`interviews`)
- [ ] ✅ **Messagerie candidats** (`inbox`)
- [ ] 🔴 **Offres sponsorisées / mise en avant** (budget, boost de visibilité, label "Annonce")
- [ ] 🔴 **Questions de présélection** paramétrables à la création d'offre
- [ ] 🟡 **Page entreprise / branding employeur** (logo, présentation, culture — lié à la zone Avis)
- [ ] 🔴 **Réponses automatiques** aux candidats + indicateur de réactivité
- [ ] 🔴 **Statistiques par offre** (vues, clics, taux de candidature, provenance)
- [ ] 🟡 **Multi-utilisateurs / équipe** de recrutement (rôles, partage d'offres)

## 9. Contenu & carrière

- [ ] 🔴 **Guide Carrières** : articles (rédaction de CV, préparation d'entretien, conseils métier)
- [ ] 🟡 **Parcourir les emplois** par catégorie / ville / entreprise (pages SEO)
- [ ] 🟡 **Parcourir les entreprises** (annuaire — `company-list` existe)
- [ ] 🔴 **Événements emploi** (salons, webinaires — type Indeed Events)

## 10. Transverse / plateforme

- [ ] 🔴 **Multi-langue (i18n)** — au minimum FR, base extensible
- [ ] 🔴 **Choix du pays / localisation**
- [ ] 🟡 **Géolocalisation & cartes** (Leaflet) — recherche par rayon, plan des offres
- [ ] ✅ **Recommandations IA / matching** offre ↔ candidat
- [ ] 🟡 **Accessibilité** (a11y : focus, ARIA, contrastes — base posée dans le design system)
- [ ] 🔴 **PWA / expérience mobile** (installable, offline léger)
- [ ] 🟡 **RGPD** : gestion des cookies, consentement, export/suppression des données, signalement (DSA)
- [ ] ✅ **Notifications temps réel** (SignalR)
- [ ] 🟡 **Modération & anti-fraude** (offres frauduleuses, signalements — étendre l'admin)
- [ ] 🔴 **SSO / connexion sociale** (Google, etc. — Indeed propose "Continuer avec Google")

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

**➡️ Bloc P0 terminé.** Prochaine étape : P1 (candidature simplifiée déjà faite ; reste import CV + parsing, visibilité CV/vivier, questions de présélection).

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
