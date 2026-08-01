import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AuthModalService, VueAuth } from '../../services/auth-modal.service';

/**
 * Le relais entre une adresse et la couche d'authentification.
 *
 * Les cinq routes ne rendent plus de page : elles ouvrent la modale et
 * rendent la main à l'accueil. Elles ne sont pas décoratives pour
 * autant — un lien de réinitialisation, une confirmation d'adresse et
 * le retour de LinkedIn arrivent d'un courriel ou d'un tiers, et
 * doivent répondre. Les supprimer casserait des liens déjà partis.
 *
 * L'adresse est remplacée plutôt qu'empilée : sans cela, le bouton
 * « précédent » ramènerait sur une route qui rouvrirait la modale, en
 * boucle.
 */
@Component({
  selector: 'app-auth-route',
  template: '',
})
export class AuthRoute implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(AuthService);
  private modale = inject(AuthModalService);

  ngOnInit() {
    // Les données de route émettent aussi quand Angular réutilise le
    // composant d'une de ces routes à l'autre : lire l'instantané une
    // seule fois laisserait la deuxième sans effet.
    this.route.data.subscribe((data) => {
      const q = this.route.snapshot.queryParamMap;
      const vue = (data['vue'] as VueAuth) ?? 'connexion';
      const redirect = AuthModalService.chemin(q.get('redirect'));

      // Déjà connecté : rouvrir une connexion n'aurait pas de sens. La
      // confirmation d'adresse, elle, se fait justement en étant connecté.
      const inutile = this.auth.isLoggedIn() && (vue === 'connexion' || vue === 'inscription');

      this.router.navigateByUrl(redirect && inutile ? redirect : '/', { replaceUrl: true })
        .then(() => {
          if (inutile) return;
          this.modale.ouvrir(vue, {
            redirect,
            id: q.get('id') ?? undefined,
            jeton: q.get('jeton') ?? undefined,
            code: q.get('code') ?? undefined,
            etat: q.get('state') ?? undefined,
          });
        });
    });
  }
}
