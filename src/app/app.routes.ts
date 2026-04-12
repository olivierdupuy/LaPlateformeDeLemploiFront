import { Routes } from '@angular/router';
import { Home } from './components/home/home';
import { JobList } from './components/job-list/job-list';
import { JobDetail } from './components/job-detail/job-detail';
import { JobForm } from './components/job-form/job-form';
import { Applications } from './components/applications/applications';
import { Bookmarks } from './components/bookmarks/bookmarks';
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
import { AdminAnnouncements } from './components/admin-announcements/admin-announcements';
import { AdminSettings } from './components/admin-settings/admin-settings';
import { MyOffers } from './components/my-offers/my-offers';
import { SavedSearches } from './components/saved-searches/saved-searches';
import { CandidateList } from './components/candidate-list/candidate-list';
import { CandidateProfile } from './components/candidate-profile/candidate-profile';
import { Interviews } from './components/interviews/interviews';
import { Inbox } from './components/inbox/inbox';
import { CvBuilder } from './components/cv-builder/cv-builder';
import { authGuard, recruiterGuard, adminGuard } from './auth.guard';

export const routes: Routes = [
  // Public
  { path: '', component: Home },
  { path: 'offres', component: JobList },
  { path: 'offres/:id', component: JobDetail },
  { path: 'entreprises', component: CompanyList },
  { path: 'entreprises/:name', component: CompanyDetail },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'suivi', component: TrackApplications },

  // Authenticated
  { path: 'favoris', component: Bookmarks, canActivate: [authGuard] },
  { path: 'profil', component: Profile, canActivate: [authGuard] },
  { path: 'recherches-sauvegardees', component: SavedSearches, canActivate: [authGuard] },
  { path: 'entretiens', component: Interviews, canActivate: [authGuard] },
  { path: 'messagerie', component: Inbox, canActivate: [authGuard] },
  { path: 'mon-cv', component: CvBuilder, canActivate: [authGuard] },
  { path: 'candidats', component: CandidateList, canActivate: [recruiterGuard] },
  { path: 'candidats/:id', component: CandidateProfile },

  // Dashboards par role
  { path: 'mon-espace', component: DashboardCandidate, canActivate: [authGuard] },
  { path: 'espace-recruteur', component: DashboardRecruiter, canActivate: [recruiterGuard] },

  // Recruiter + Admin
  { path: 'admin/nouvelle-offre', component: JobForm, canActivate: [recruiterGuard] },
  { path: 'admin/modifier-offre/:id', component: JobForm, canActivate: [recruiterGuard] },
  { path: 'admin/candidatures', component: Applications, canActivate: [recruiterGuard] },
  { path: 'admin/dashboard', component: Dashboard, canActivate: [adminGuard] },
  { path: 'admin/mes-offres', component: MyOffers, canActivate: [recruiterGuard] },

  // Admin only
  { path: 'admin/utilisateurs', component: AdminUsers, canActivate: [adminGuard] },
  { path: 'admin/statistiques', component: AdminStats, canActivate: [adminGuard] },
  { path: 'admin/activite', component: AdminActivity, canActivate: [adminGuard] },
  { path: 'admin/moderation', component: AdminModeration, canActivate: [adminGuard] },
  { path: 'admin/annonces', component: AdminAnnouncements, canActivate: [adminGuard] },
  { path: 'admin/parametres', component: AdminSettings, canActivate: [adminGuard] },

  { path: '**', redirectTo: '' },
];
