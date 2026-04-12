import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './services/auth.service';
import { ToastrService } from 'ngx-toastr';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const toastr = inject(ToastrService);

  if (auth.isLoggedIn()) return true;

  toastr.warning('Veuillez vous connecter');
  router.navigate(['/login']);
  return false;
};

export const recruiterGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const toastr = inject(ToastrService);

  if (auth.isRecruiter()) return true;

  if (!auth.isLoggedIn()) {
    toastr.warning('Veuillez vous connecter');
    router.navigate(['/login']);
  } else {
    toastr.error('Acces reserve aux recruteurs');
    router.navigate(['/']);
  }
  return false;
};

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const toastr = inject(ToastrService);

  if (auth.isAdmin()) return true;

  if (!auth.isLoggedIn()) {
    toastr.warning('Veuillez vous connecter');
    router.navigate(['/login']);
  } else {
    toastr.error('Acces reserve aux administrateurs');
    router.navigate(['/']);
  }
  return false;
};
