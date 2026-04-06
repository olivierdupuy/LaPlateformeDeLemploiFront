import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ToastrService } from 'ngx-toastr';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const toastr = inject(ToastrService);

  if (auth.isLoggedIn) return true;

  toastr.warning('Connectez-vous pour acceder a cette page');
  router.navigate(['/connexion'], { queryParams: { returnUrl: router.url } });
  return false;
};

export const companyGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const toastr = inject(ToastrService);

  if (auth.isLoggedIn && auth.isCompany) return true;

  if (!auth.isLoggedIn) {
    toastr.warning('Connectez-vous pour acceder a cette page');
    router.navigate(['/connexion']);
  } else {
    toastr.info('Cette page est reservee aux entreprises');
    router.navigate(['/']);
  }
  return false;
};

export const jobSeekerGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const toastr = inject(ToastrService);

  if (auth.isLoggedIn && auth.isJobSeeker) return true;

  if (!auth.isLoggedIn) {
    toastr.warning('Connectez-vous pour acceder a cette page');
    router.navigate(['/connexion']);
  } else {
    toastr.info('Cette page est reservee aux chercheurs d\'emploi');
    router.navigate(['/']);
  }
  return false;
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn) return true;

  router.navigate(['/tableau-de-bord']);
  return false;
};
