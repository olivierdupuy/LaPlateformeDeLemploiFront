import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './services/auth.service';
import { AuthModalService } from './services/auth-modal.service';
import { ToastrService } from 'ngx-toastr';
import { map, of, catchError } from 'rxjs';

/**
 * Demander l'identité sans faire quitter la page.
 *
 * La garde renvoyait vers /login : on perdait l'écran d'où l'on venait,
 * et la connexion faite, on atterrissait à l'accueil sans savoir ce
 * qu'on était venu chercher. Refuser la navigation suffit — la page
 * courante reste affichée — et la modale s'ouvre par-dessus en retenant
 * la destination pour y conduire ensuite.
 */
function demanderIdentite(cible: string) {
  const toastr = inject(ToastrService);
  const modale = inject(AuthModalService);
  const router = inject(Router);

  toastr.warning('Connectez-vous pour accéder à cette page.');
  modale.ouvrir('connexion', { redirect: cible });

  // Refuser suffit quand une page est déjà affichée : elle reste, et la
  // modale se pose dessus. Mais sur un lien ouvert directement — un
  // favori, une adresse collée — rien n'a encore été rendu : refuser
  // laisserait une modale flottant sur du vide. On donne alors l'accueil
  // pour toile de fond.
  return router.navigated ? false : router.createUrlTree(['/']);
}

export const authGuard: CanActivateFn = (_r, state) => {
  const auth = inject(AuthService);

  if (auth.isLoggedIn()) return true;
  return demanderIdentite(state.url);
};

export const recruiterGuard: CanActivateFn = (_r, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const toastr = inject(ToastrService);

  if (auth.isRecruiter()) return true;

  if (!auth.isLoggedIn()) {
    return demanderIdentite(state.url);
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

export const adminGuard: CanActivateFn = (_r, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const toastr = inject(ToastrService);

  if (auth.isAdmin()) return true;

  if (!auth.isLoggedIn()) {
    return demanderIdentite(state.url);
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
