import { Routes } from '@angular/router';
import { Home } from './components/home/home';
import { authGuard, recruiterGuard, adminGuard, deuxFacteursAdminGuard } from './auth.guard';

/**
 * ── Pourquoi tout est chargé à la demande ──
 *
 * Ces routes importaient leurs quarante composants en tête de fichier.
 * Un import statique dans le fichier de routes n'a rien de paresseux :
 * tout atterrissait dans le paquet initial. Un visiteur qui consultait
 * une offre téléchargeait donc l'écran d'administration des
 * utilisateurs, les graphiques du tableau de bord recruteur, l'éditeur
 * de CV et la carte Leaflet — 1,8 Mo avant le premier pixel.
 *
 * `loadComponent` renvoie chaque écran dans son propre morceau, ramené
 * au moment où on y va. Les bibliothèques lourdes suivent leur
 * composant : Chart.js part avec les tableaux de bord, Leaflet avec la
 * fiche offre et les statistiques, QRCode avec la page de sécurité.
 *
 * L'accueil fait exception et reste importé ici. C'est la page d'entrée
 * la plus vue, celle que Google chronomètre ; lui faire attendre un
 * aller-retour de plus pour économiser quelques kilo-octets qu'on
 * télécharge de toute façon serait un mauvais échange.
 *
 * `precharger: true` marque les écrans du parcours normal : ils sont
 * ramenés en tâche de fond une fois l'accueil affiché, pour que le
 * découpage ne se paie pas en attente au clic. Voir `precharge.ts`.
 */
export const routes: Routes = [
  // Public
  { path: '', component: Home },
  {
    path: 'offres',
    data: { precharger: true },
    loadComponent: () => import('./components/job-list/job-list').then((m) => m.JobList),
  },
  {
    path: 'parcourir',
    loadComponent: () => import('./components/browse-jobs/browse-jobs').then((m) => m.BrowseJobs),
  },

  // ── Pages d'atterrissage ──
  //
  // « /emploi/developpeur-web/paris » : l'adresse que les gens tapent,
  // et celle qui manquait. Les mêmes vues existaient derrière des
  // paramètres de requête — que le robots.txt exclut lui-même de
  // l'exploration, à juste titre, les combinaisons se comptant par
  // milliers. Ici le jeu est fini : seules les combinaisons portant
  // assez d'offres pour qu'une page ait du contenu, les autres rendent
  // 404 côté API.
  //
  // Déclarées avant `offres/:id` sans risque de collision — le préfixe
  // diffère — mais après `parcourir`, qui reste le point d'entrée
  // humain vers ces pages.
  {
    path: 'emploi/:metier',
    data: { precharger: true },
    loadComponent: () => import('./components/landing/landing').then((m) => m.Landing),
  },
  {
    path: 'emploi/:metier/:ville',
    loadComponent: () => import('./components/landing/landing').then((m) => m.Landing),
  },
  {
    path: 'salaires',
    loadComponent: () => import('./components/salaries/salaries').then((m) => m.Salaries),
  },
  {
    path: 'salaires/metier/:title',
    loadComponent: () =>
      import('./components/salary-detail/salary-detail').then((m) => m.SalaryDetail),
  },
  {
    path: 'guide',
    loadComponent: () =>
      import('./components/careers-guide/careers-guide').then((m) => m.CareersGuide),
  },
  {
    path: 'guide/:slug',
    loadComponent: () =>
      import('./components/careers-guide/careers-guide').then((m) => m.CareersGuide),
  },
  {
    path: 'evenements',
    loadComponent: () => import('./components/events/events').then((m) => m.Events),
  },

  // Pages légales. Un seul composant les sert toutes : elles partagent la
  // mise en page et se renvoient l'une à l'autre.
  {
    path: 'mentions-legales',
    data: { doc: 'mentions-legales' },
    loadComponent: () => import('./components/legal/legal').then((m) => m.Legal),
  },
  {
    path: 'confidentialite',
    data: { doc: 'confidentialite' },
    loadComponent: () => import('./components/legal/legal').then((m) => m.Legal),
  },
  {
    path: 'cgu',
    data: { doc: 'cgu' },
    loadComponent: () => import('./components/legal/legal').then((m) => m.Legal),
  },
  {
    path: 'cookies',
    data: { doc: 'cookies' },
    loadComponent: () => import('./components/legal/legal').then((m) => m.Legal),
  },
  {
    path: 'accessibilite',
    data: { doc: 'accessibilite' },
    loadComponent: () => import('./components/legal/legal').then((m) => m.Legal),
  },
  {
    path: 'offres/:id',
    data: { precharger: true },
    loadComponent: () => import('./components/job-detail/job-detail').then((m) => m.JobDetail),
  },
  // Tunnel de candidature : charge a la demande (il ne sert qu'apres avoir
  // choisi une offre) et sans garde de route, le composant renvoyant lui-meme
  // vers la connexion en gardant l'offre en adresse de retour.
  {
    path: 'offres/:id/postuler',
    loadComponent: () => import('./components/apply-flow/apply-flow').then((m) => m.ApplyFlow),
  },
  {
    path: 'entreprises',
    loadComponent: () => import('./components/company-list/company-list').then((m) => m.CompanyList),
  },
  {
    path: 'entreprises/:name',
    loadComponent: () =>
      import('./components/company-detail/company-detail').then((m) => m.CompanyDetail),
  },
  // ── Authentification ──
  // Ces routes n'affichent plus de page : elles ouvrent la couche
  // d'authentification par-dessus l'accueil. Elles subsistent parce
  // qu'elles sont des points d'arrivee — LinkedIn renvoie sur /login, et
  // les liens deja partis par courriel pointent ici.
  {
    path: 'login',
    data: { vue: 'connexion', precharger: true },
    loadComponent: () => import('./components/auth-modal/auth-route').then((m) => m.AuthRoute),
  },
  {
    path: 'register',
    data: { vue: 'inscription' },
    loadComponent: () => import('./components/auth-modal/auth-route').then((m) => m.AuthRoute),
  },

  // ── Recuperation ──
  // Trois moments d'un meme parcours, servis par un composant unique :
  // le mode vient de la route. Les adresses sont celles que les courriels
  // fabriquent — les changer ici casserait les liens deja envoyes.
  {
    path: 'mot-de-passe-oublie',
    data: { vue: 'oubli' },
    loadComponent: () => import('./components/auth-modal/auth-route').then((m) => m.AuthRoute),
  },
  {
    path: 'reinitialiser-mot-de-passe',
    data: { vue: 'reinitialisation' },
    loadComponent: () => import('./components/auth-modal/auth-route').then((m) => m.AuthRoute),
  },
  {
    path: 'confirmer-email',
    data: { vue: 'confirmation' },
    loadComponent: () => import('./components/auth-modal/auth-route').then((m) => m.AuthRoute),
  },

  // ── Lettre d'information ──
  // Ouvertes sans compte, la desinscription surtout : quelqu'un qu'on force
  // a se connecter pour ne plus rien recevoir a un autre bouton sous la
  // main, celui qui nous signale comme indesirable. Les adresses sont
  // celles que les courriels fabriquent : les changer casserait les liens
  // deja partis.
  {
    path: 'newsletter',
    data: { mode: 'inscription' },
    loadComponent: () => import('./components/newsletter/newsletter').then((m) => m.Newsletter),
  },
  {
    path: 'newsletter/confirmer',
    data: { mode: 'confirmation' },
    loadComponent: () => import('./components/newsletter/newsletter').then((m) => m.Newsletter),
  },
  {
    path: 'newsletter/desinscription',
    data: { mode: 'desinscription' },
    loadComponent: () => import('./components/newsletter/newsletter').then((m) => m.Newsletter),
  },
  // Les préférences d'envoi : accessibles sans compte depuis un lien de
  // courriel, comme la désinscription et pour la même raison.
  {
    path: 'preferences-courriel',
    loadComponent: () =>
      import('./components/email-preferences/email-preferences').then((m) => m.EmailPreferences),
  },
  // Signalement au titre du règlement européen sur les services
  // numériques. Ouvert à tous, y compris à qui n'a pas de compte : c'est
  // la condition pour que le mécanisme compte.
  {
    path: 'signalement',
    loadComponent: () => import('./components/dsa-report/dsa-report').then((m) => m.DsaReport),
  },
  {
    path: 'suivi',
    loadComponent: () =>
      import('./components/track-applications/track-applications').then((m) => m.TrackApplications),
  },

  // Authenticated
  // Les favoris sont un onglet de « Mes candidatures » ; l'ancienne
  // adresse reste valide et ouvre le bon onglet.
  {
    path: 'favoris',
    data: { tab: 'saved' },
    loadComponent: () =>
      import('./components/track-applications/track-applications').then((m) => m.TrackApplications),
  },
  {
    path: 'profil',
    canActivate: [authGuard],
    loadComponent: () => import('./components/profile/profile').then((m) => m.Profile),
  },
  // La meme page pour les trois espaces : ce qui protege un compte ne
  // depend pas de ce qu'on en fait.
  {
    path: 'securite',
    canActivate: [authGuard],
    loadComponent: () => import('./components/security/security').then((m) => m.Security),
  },
  {
    path: 'entreprises-qui-recrutent',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/hiring-companies/hiring-companies').then((m) => m.HiringCompanies),
  },
  {
    path: 'mon-metier',
    canActivate: [authGuard],
    loadComponent: () => import('./components/job-market/job-market').then((m) => m.JobMarket),
  },
  {
    path: 'recherches-sauvegardees',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/saved-searches/saved-searches').then((m) => m.SavedSearches),
  },
  {
    path: 'entretiens',
    canActivate: [authGuard],
    loadComponent: () => import('./components/interviews/interviews').then((m) => m.Interviews),
  },
  {
    path: 'messagerie',
    canActivate: [authGuard],
    loadComponent: () => import('./components/inbox/inbox').then((m) => m.Inbox),
  },
  {
    path: 'mon-cv',
    canActivate: [authGuard],
    loadComponent: () => import('./components/cv-builder/cv-builder').then((m) => m.CvBuilder),
  },
  {
    path: 'candidats',
    canActivate: [recruiterGuard],
    loadComponent: () =>
      import('./components/candidate-list/candidate-list').then((m) => m.CandidateList),
  },
  {
    path: 'candidats/:id',
    loadComponent: () =>
      import('./components/candidate-profile/candidate-profile').then((m) => m.CandidateProfile),
  },

  // Dashboards par role
  {
    path: 'mon-espace',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/dashboard-candidate/dashboard-candidate').then(
        (m) => m.DashboardCandidate,
      ),
  },
  {
    path: 'espace-recruteur',
    canActivate: [recruiterGuard],
    loadComponent: () =>
      import('./components/dashboard-recruiter/dashboard-recruiter').then(
        (m) => m.DashboardRecruiter,
      ),
  },

  // ── Espace recruteur ──
  // Ces pages vivaient sous /admin/, ce qui melangeait deux metiers.
  {
    path: 'recruteur/offres',
    canActivate: [recruiterGuard],
    loadComponent: () => import('./components/my-offers/my-offers').then((m) => m.MyOffers),
  },
  {
    path: 'recruteur/offres/nouvelle',
    canActivate: [recruiterGuard],
    loadComponent: () => import('./components/job-form/job-form').then((m) => m.JobForm),
  },
  {
    path: 'recruteur/offres/:id/modifier',
    canActivate: [recruiterGuard],
    loadComponent: () => import('./components/job-form/job-form').then((m) => m.JobForm),
  },
  {
    path: 'recruteur/candidatures',
    canActivate: [recruiterGuard],
    loadComponent: () => import('./components/applications/applications').then((m) => m.Applications),
  },
  // Facturation : formules, mises en avant achetées, factures.
  {
    path: 'recruteur/facturation',
    canActivate: [recruiterGuard],
    loadComponent: () => import('./components/billing/billing').then((m) => m.Billing),
  },

  // Anciennes adresses recruteur, conservees pour ne casser aucun lien.
  // Declarees avant le parent 'admin', qui capterait sinon ces chemins.
  { path: 'admin/mes-offres', redirectTo: 'recruteur/offres', pathMatch: 'full' },
  { path: 'admin/nouvelle-offre', redirectTo: 'recruteur/offres/nouvelle', pathMatch: 'full' },
  { path: 'admin/modifier-offre/:id', redirectTo: 'recruteur/offres/:id/modifier' },
  // « admin/candidatures » n'est plus une ancienne adresse recruteur : c'est
  // la page de l'administration. La redirection historique qui subsistait
  // ici la captait au passage et l'envoyait vers une page a garde
  // recruteur — qu'un administrateur n'est pas, les roles etant exclusifs.
  // D'ou le renvoi au tableau de bord depuis les liens « candidatures de
  // cette offre ».
  { path: 'admin/dashboard', redirectTo: 'admin/tableau-de-bord', pathMatch: 'full' },

  // ── Panneau d'administration ──
  // Gabarit dedie (barre laterale, sans la navbar publique).
  {
    path: 'admin',
    loadComponent: () => import('./components/admin-layout/admin-layout').then((m) => m.AdminLayout),
    // La console est aussi gardee par l'exigence de double
    // authentification : un compte qui voit toute la base et peut prendre
    // la main sur n'importe qui ne tient pas sur un mot de passe seul.
    canActivate: [adminGuard, deuxFacteursAdminGuard],
    children: [
      { path: '', redirectTo: 'tableau-de-bord', pathMatch: 'full' },
      {
        path: 'tableau-de-bord',
        loadComponent: () => import('./components/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'statistiques',
        loadComponent: () =>
          import('./components/admin-stats/admin-stats').then((m) => m.AdminStats),
      },
      // Ce que le site encaisse. La facturation existait, mais elle
      // repondait au recruteur sur son propre compte : la console n'en
      // montrait qu'un total.
      {
        path: 'finances',
        loadComponent: () =>
          import('./components/admin-finances/admin-finances').then((m) => m.AdminFinances),
      },
      {
        path: 'offres',
        loadComponent: () =>
          import('./components/admin-offers/admin-offers').then((m) => m.AdminOffers),
      },
      {
        path: 'offres/:id',
        loadComponent: () =>
          import('./components/admin-offer-detail/admin-offer-detail').then(
            (m) => m.AdminOfferDetail,
          ),
      },
      {
        path: 'candidatures',
        loadComponent: () =>
          import('./components/admin-applications/admin-applications').then(
            (m) => m.AdminApplications,
          ),
      },
      {
        path: 'entretiens',
        loadComponent: () =>
          import('./components/admin-interviews/admin-interviews').then((m) => m.AdminInterviews),
      },
      {
        path: 'moderation',
        loadComponent: () =>
          import('./components/admin-moderation/admin-moderation').then((m) => m.AdminModeration),
      },
      // Le catalogue : d'ou viennent les offres et dans quel etat elles
      // sont. Les points d'entree d'import existaient depuis le debut,
      // reserves aux administrateurs, et n'etaient appeles par rien.
      {
        path: 'catalogue',
        loadComponent: () =>
          import('./components/admin-catalogue/admin-catalogue').then((m) => m.AdminCatalogue),
      },
      {
        path: 'utilisateurs',
        loadComponent: () =>
          import('./components/admin-users/admin-users').then((m) => m.AdminUsers),
      },
      {
        path: 'utilisateurs/:id',
        loadComponent: () =>
          import('./components/admin-user-detail/admin-user-detail').then((m) => m.AdminUserDetail),
      },
      {
        path: 'annonces',
        loadComponent: () =>
          import('./components/admin-announcements/admin-announcements').then(
            (m) => m.AdminAnnouncements,
          ),
      },
      {
        path: 'activite',
        loadComponent: () =>
          import('./components/admin-activity/admin-activity').then((m) => m.AdminActivity),
      },
      {
        path: 'newsletter',
        loadComponent: () =>
          import('./components/admin-newsletter/admin-newsletter').then((m) => m.AdminNewsletter),
      },
      // Exploitation : ce qui casse, ce qui tourne, ce qui a vieilli.
      {
        path: 'exploitation',
        loadComponent: () =>
          import('./components/admin-operations/admin-operations').then((m) => m.AdminOperations),
      },
      // Les acces techniques de toute la plateforme. Le controleur
      // existant repond aux administrateurs, mais sur leur propre
      // compte : une cle qui fuit ne pouvait etre revoquee que par son
      // porteur.
      {
        path: 'integrations',
        loadComponent: () =>
          import('./components/admin-integrations/admin-integrations').then(
            (m) => m.AdminIntegrations,
          ),
      },
      {
        path: 'parametres',
        loadComponent: () =>
          import('./components/admin-settings/admin-settings').then((m) => m.AdminSettings),
      },
    ],
  },

  // ── Adresses inconnues ──
  // Elles renvoyaient vers l'accueil, ce qui répondait 200 à une page
  // morte : un moteur enregistrait alors l'accueil sous mille adresses
  // différentes, et le visiteur perdait ce qu'il cherchait sans qu'on le
  // lui dise. Une vraie page d'erreur le dit, et propose des offres.
  // Adresse nommée, pour que les pages qui découvrent l'absence de
  // contenu après coup puissent y renvoyer sans changer l'URL affichée.
  {
    path: 'introuvable',
    loadComponent: () => import('./components/not-found/not-found').then((m) => m.NotFound),
  },
  {
    path: '**',
    loadComponent: () => import('./components/not-found/not-found').then((m) => m.NotFound),
  },
];
