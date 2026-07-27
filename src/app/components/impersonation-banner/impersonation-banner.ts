import {
  Component, OnDestroy, inject, signal, computed, NgZone, ChangeDetectionStrategy,
} from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../services/auth.service';

/**
 * Bandeau de prise en main de compte.
 *
 * Il est délibérément impossible à manquer : barre pleine largeur, en
 * haut, dans la couleur d'alerte, sans bouton de fermeture. Agir sous
 * l'identité de quelqu'un ne doit jamais devenir un état qu'on oublie —
 * c'est la seule protection contre une action faite au nom d'autrui par
 * inadvertance.
 *
 * Le compte à rebours n'est pas décoratif : le jeton expire au bout de
 * trente minutes, et savoir combien il reste évite de perdre une saisie
 * en cours.
 */
@Component({
  selector: 'app-impersonation-banner',
  templateUrl: './impersonation-banner.html',
  styleUrl: './impersonation-banner.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImpersonationBanner implements OnDestroy {
  private auth = inject(AuthService);
  private router = inject(Router);
  private toastr = inject(ToastrService);
  private zone = inject(NgZone);

  emprunt = this.auth.emprunt;
  sortieEnCours = signal(false);

  private maintenant = signal(Date.now());
  private timer: ReturnType<typeof setInterval>;

  constructor() {
    // Hors zone Angular : une seconde qui bat ne doit pas declencher une
    // detection de changement sur toute l'application.
    this.zone.runOutsideAngular(() => {
      this.timer = setInterval(() => this.maintenant.set(Date.now()), 1000);
    });
    this.timer ??= setInterval(() => {}, 1 << 30);
  }

  /** Temps restant avant expiration du jeton d'emprunt. */
  restant = computed(() => {
    const e = this.emprunt();
    if (!e?.expireA) return null;
    const secondes = Math.floor((new Date(e.expireA).getTime() - this.maintenant()) / 1000);
    if (secondes <= 0) return 'expiré';
    const m = Math.floor(secondes / 60);
    return m >= 1 ? `${m} min` : `${secondes} s`;
  });

  expire = computed(() => this.restant() === 'expiré');

  ngOnDestroy() {
    clearInterval(this.timer);
  }

  revenir() {
    this.sortieEnCours.set(true);

    this.auth.rendreLaMain().subscribe({
      next: () => this.retour(),
      error: () => {
        // Le jeton a pu expirer : sans ce repli on resterait prisonnier
        // d'un compte qu'on ne peut plus quitter.
        if (this.auth.rendreLaMainLocalement()) {
          this.toastr.info('Session d’emprunt expirée — retour à votre compte');
          this.retour();
        } else {
          this.toastr.error('Impossible de revenir. Reconnectez-vous.');
          this.sortieEnCours.set(false);
        }
      },
    });
  }

  private retour() {
    this.sortieEnCours.set(false);
    this.router.navigate(['/admin/utilisateurs']);
  }
}
