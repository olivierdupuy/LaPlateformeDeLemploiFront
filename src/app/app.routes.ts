import { Routes } from '@angular/router';
import { Home } from './components/home/home';
import { JobList } from './components/job-list/job-list';
import { BrowseJobs } from './components/browse-jobs/browse-jobs';
import { Salaries } from './components/salaries/salaries';
import { SalaryDetail } from './components/salary-detail/salary-detail';
import { CareersGuide } from './components/careers-guide/careers-guide';
import { Events } from './components/events/events';
import { JobDetail } from './components/job-detail/job-detail';
import { JobForm } from './components/job-form/job-form';
import { Applications } from './components/applications/applications';
import { TrackApplications } from './components/track-applications/track-applications';
import { CompanyList } from './components/company-list/company-list';
import { CompanyDetail } from './components/company-detail/company-detail';
import { Dashboard } from './components/dashboard/dashboard';
import { DashboardRecruiter } from './components/dashboard-recruiter/dashboard-recruiter';
import { DashboardCandidate } from './components/dashboard-candidate/dashboard-candidate';
import { Login } from './components/login/login';
import { Register } from './components/register/register';
import { Profile } from './components/profile/profile';
import { AdminUsers } from './components/admin-users/admin-users';
import { AdminStats } from './components/admin-stats/admin-stats';
import { AdminActivity } from './components/admin-activity/admin-activity';
import { AdminModeration } from './components/admin-moderation/admin-moderation';
import { AdminOffers } from './components/admin-offers/admin-offers';
import { AdminApplications } from './components/admin-applications/admin-applications';
import { AdminInterviews } from './components/admin-interviews/admin-interviews';
import { AdminUserDetail } from './components/admin-user-detail/admin-user-detail';
import { HiringCompanies } from './components/hiring-companies/hiring-companies';
import { AdminAnnouncements } from './components/admin-announcements/admin-announcements';
import { AdminSettings } from './components/admin-settings/admin-settings';
import { MyOffers } from './components/my-offers/my-offers';
import { SavedSearches } from './components/saved-searches/saved-searches';
import { CandidateList } from './components/candidate-list/candidate-list';
import { CandidateProfile } from './components/candidate-profile/candidate-profile';
import { Interviews } from './components/interviews/interviews';
import { Inbox } from './components/inbox/inbox';
import { CvBuilder } from './components/cv-builder/cv-builder';
import { AdminLayout } from './components/admin-layout/admin-layout';
import { authGuard, recruiterGuard, adminGuard } from './auth.guard';

export const routes: Routes = [
  // Public
  { path: '', component: Home },
  { path: 'offres', component: JobList },
  { path: 'parcourir', component: BrowseJobs },
  { path: 'salaires', component: Salaries },
  { path: 'salaires/metier/:title', component: SalaryDetail },
  { path: 'guide', component: CareersGuide },
  { path: 'guide/:slug', component: CareersGuide },
  { path: 'evenements', component: Events },
  { path: 'offres/:id', component: JobDetail },
  { path: 'entreprises', component: CompanyList },
  { path: 'entreprises/:name', component: CompanyDetail },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'suivi', component: TrackApplications },

  // Authenticated
  // Les favoris sont un onglet de « Mes candidatures » ; l'ancienne
  // adresse reste valide et ouvre le bon onglet.
  { path: 'favoris', component: TrackApplications, data: { tab: 'saved' } },
  { path: 'profil', component: Profile, canActivate: [authGuard] },
  { path: 'entreprises-qui-recrutent', component: HiringCompanies, canActivate: [authGuard] },
  { path: 'recherches-sauvegardees', component: SavedSearches, canActivate: [authGuard] },
  { path: 'entretiens', component: Interviews, canActivate: [authGuard] },
  { path: 'messagerie', component: Inbox, canActivate: [authGuard] },
  { path: 'mon-cv', component: CvBuilder, canActivate: [authGuard] },
  { path: 'candidats', component: CandidateList, canActivate: [recruiterGuard] },
  { path: 'candidats/:id', component: CandidateProfile },

  // Dashboards par role
  { path: 'mon-espace', component: DashboardCandidate, canActivate: [authGuard] },
  { path: 'espace-recruteur', component: DashboardRecruiter, canActivate: [recruiterGuard] },

  // ── Espace recruteur ──
  // Ces pages vivaient sous /admin/, ce qui melangeait deux metiers.
  { path: 'recruteur/offres', component: MyOffers, canActivate: [recruiterGuard] },
  { path: 'recruteur/offres/nouvelle', component: JobForm, canActivate: [recruiterGuard] },
  { path: 'recruteur/offres/:id/modifier', component: JobForm, canActivate: [recruiterGuard] },
  { path: 'recruteur/candidatures', component: Applications, canActivate: [recruiterGuard] },

  // Anciennes adresses recruteur, conservees pour ne casser aucun lien.
  // Declarees avant le parent 'admin', qui capterait sinon ces chemins.
  { path: 'admin/mes-offres', redirectTo: 'recruteur/offres', pathMatch: 'full' },
  { path: 'admin/nouvelle-offre', redirectTo: 'recruteur/offres/nouvelle', pathMatch: 'full' },
  { path: 'admin/modifier-offre/:id', redirectTo: 'recruteur/offres/:id/modifier' },
  { path: 'admin/candidatures', redirectTo: 'recruteur/candidatures', pathMatch: 'full' },
  { path: 'admin/dashboard', redirectTo: 'admin/tableau-de-bord', pathMatch: 'full' },

  // ── Panneau d'administration ──
  // Gabarit dedie (barre laterale, sans la navbar publique).
  {
    path: 'admin',
    component: AdminLayout,
    canActivate: [adminGuard],
    children: [
      { path: '', redirectTo: 'tableau-de-bord', pathMatch: 'full' },
      { path: 'tableau-de-bord', component: Dashboard },
      { path: 'statistiques', component: AdminStats },
      { path: 'offres', component: AdminOffers },
      { path: 'candidatures', component: AdminApplications },
      { path: 'entretiens', component: AdminInterviews },
      { path: 'moderation', component: AdminModeration },
      { path: 'utilisateurs', component: AdminUsers },
      { path: 'utilisateurs/:id', component: AdminUserDetail },
      { path: 'annonces', component: AdminAnnouncements },
      { path: 'activite', component: AdminActivity },
      { path: 'parametres', component: AdminSettings },
    ],
  },

  { path: '**', redirectTo: '' },
];
