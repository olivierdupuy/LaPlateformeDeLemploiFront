import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { map, of, catchError } from 'rxjs';

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
  } else if (auth.isAdmin()) {
    // Un administrateur n'a rien a faire dans l'espace recruteur :
    // on le renvoie vers sa console.
    router.navigate(['/admin']);
  } else {
    toastr.error('Accès réservé aux recruteurs');
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
    toastr.error('Accès réservé aux administrateurs');
    router.navigate(['/']);
  }
  return false;
};

/**
 * La double authentification, exigée des administrateurs.
 *
 * Un compte administrateur voit toute la base et peut prendre la main sur
 * n'importe qui : c'est là que le risque se concentre, et un mot de passe
 * seul n'y suffit pas. Plutôt que de refuser l'entrée, on conduit à la
 * page qui permet de l'activer — refuser sans dire quoi faire laisserait
 * devant une porte close.
 *
 * Le drapeau peut manquer sur une session ouverte avant l'existence de
 * cette exigence : on le redemande alors au serveur au lieu de laisser
 * passer par défaut.
 */
export const deuxFacteursAdminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const toastr = inject(ToastrService);

  const u = auth.currentUser();
  if (!u || u.role !== 'Admin') return true;

  const conduire = () => {
    toastr.warning(
      'La double authentification est obligatoire pour les administrateurs. Activez-la pour accéder à la console.',
      'Un pas avant d’entrer',
      { timeOut: 8000 },
    );
    return router.createUrlTree(['/securite']);
  };

  if (u.twoFactorEnabled === true) return true;
  if (u.twoFactorEnabled === false) return conduire();

  // Inconnu : la session date d'avant. On demande plutôt que de supposer.
  return auth.getMe().pipe(
    map((frais) => (frais.twoFactorEnabled ? true : conduire())),
    // Si le serveur ne répond pas, on ne verrouille pas la console sur une
    // panne réseau : l'exigence se represente au rechargement suivant.
    catchError(() => of(true)),
  );
};
