import { Routes } from '@angular/router';
import { authGuard, companyGuard, jobSeekerGuard, guestGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/home/home').then(m => m.Home) },

  // Auth (guest only)
  { path: 'connexion', canActivate: [guestGuard], loadComponent: () => import('./pages/login/login').then(m => m.Login) },
  { path: 'inscription', canActivate: [guestGuard], loadComponent: () => import('./pages/register/register').then(m => m.Register) },
  { path: 'mot-de-passe-oublie', canActivate: [guestGuard], loadComponent: () => import('./pages/forgot-password/forgot-password').then(m => m.ForgotPassword) },
  { path: 'reinitialiser-mot-de-passe', canActivate: [guestGuard], loadComponent: () => import('./pages/reset-password/reset-password').then(m => m.ResetPassword) },

  // Protected (any logged-in user)
  { path: 'tableau-de-bord', canActivate: [authGuard], loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.Dashboard) },
  { path: 'profil', canActivate: [authGuard], loadComponent: () => import('./pages/profile/profile').then(m => m.Profile) },
  { path: 'mon-compte', canActivate: [authGuard], loadComponent: () => import('./pages/account-settings/account-settings').then(m => m.AccountSettings) },
  { path: 'messagerie', canActivate: [authGuard], loadComponent: () => import('./pages/messaging/messaging').then(m => m.Messaging) },
  { path: 'statistiques', canActivate: [authGuard], loadComponent: () => import('./pages/analytics/analytics').then(m => m.Analytics) },
  { path: 'entretiens', canActivate: [authGuard], loadComponent: () => import('./pages/interviews/interviews').then(m => m.Interviews) },

  // JobSeeker only
  { path: 'mes-preferences', canActivate: [jobSeekerGuard], loadComponent: () => import('./pages/preferences/preferences').then(m => m.Preferences) },
  { path: 'recommandations', canActivate: [jobSeekerGuard], loadComponent: () => import('./pages/recommended-jobs/recommended-jobs').then(m => m.RecommendedJobs) },
  { path: 'mon-cv', canActivate: [jobSeekerGuard], loadComponent: () => import('./pages/resume-builder/resume-builder').then(m => m.ResumeBuilder) },
  { path: 'mes-candidatures', canActivate: [jobSeekerGuard], loadComponent: () => import('./pages/my-applications/my-applications').then(m => m.MyApplications) },
  { path: 'favoris', canActivate: [jobSeekerGuard], loadComponent: () => import('./pages/favorites/favorites').then(m => m.Favorites) },
  { path: 'candidatures-spontanees', canActivate: [jobSeekerGuard], loadComponent: () => import('./pages/spontaneous-applications/spontaneous-applications').then(m => m.SpontaneousApplications) },

  // Company only
  { path: 'mes-offres', canActivate: [companyGuard], loadComponent: () => import('./pages/my-offers/my-offers').then(m => m.MyOffers) },
  { path: 'candidatures-recues', canActivate: [companyGuard], loadComponent: () => import('./pages/my-applications/my-applications').then(m => m.MyApplications) },
  { path: 'candidatures-spontanees-recues', canActivate: [companyGuard], loadComponent: () => import('./pages/spontaneous-applications/spontaneous-applications').then(m => m.SpontaneousApplications) },
  { path: 'offres/nouvelle/creer', canActivate: [companyGuard], loadComponent: () => import('./pages/job-form/job-form').then(m => m.JobForm) },
  { path: 'offres/:id/modifier', canActivate: [companyGuard], loadComponent: () => import('./pages/job-form/job-form').then(m => m.JobForm) },

  // Public
  { path: 'offres/:id', loadComponent: () => import('./pages/job-detail/job-detail').then(m => m.JobDetail) },
  { path: 'offres', loadComponent: () => import('./pages/job-list/job-list').then(m => m.JobList) },
  { path: 'entreprises', loadComponent: () => import('./pages/company-list/company-list').then(m => m.CompanyList) },
  { path: 'entreprises/:id', loadComponent: () => import('./pages/company-detail/company-detail').then(m => m.CompanyDetail) },

  // Legal & Contact
  { path: 'mentions-legales', loadComponent: () => import('./pages/mentions-legales/mentions-legales').then(m => m.MentionsLegales) },
  { path: 'cgu', loadComponent: () => import('./pages/cgu/cgu').then(m => m.Cgu) },
  { path: 'confidentialite', loadComponent: () => import('./pages/confidentialite/confidentialite').then(m => m.Confidentialite) },
  { path: 'contact', loadComponent: () => import('./pages/contact/contact').then(m => m.Contact) },

  { path: '**', loadComponent: () => import('./pages/not-found/not-found').then(m => m.NotFound) }
];
