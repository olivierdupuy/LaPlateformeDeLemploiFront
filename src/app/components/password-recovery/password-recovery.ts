import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../services/auth.service';

/**
 * Les trois écrans de récupération, servis par un seul composant.
 *
 * « J'ai oublié », « voici mon nouveau mot de passe » et « je confirme mon
 * adresse » sont trois moments d'un même parcours, arrivant par le même
 * courriel et menant au même endroit. Trois composants auraient triplé le
 * gabarit sans rien séparer d'utile ; le mode est décidé par la route.
 */
type Mode = 'oubli' | 'reinitialisation' | 'confirmation';

@Component({
  selector: 'app-password-recovery',
  imports: [FormsModule, RouterLink],
  templateUrl: './password-recovery.html',
  styleUrl: './password-recovery.scss',
})
export class PasswordRecovery implements OnInit {
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toastr = inject(ToastrService);

  mode: Mode = 'oubli';
  occupe = signal(false);

  /** Une fois la demande partie, le formulaire cède la place au message. */
  fait = signal(false);
  message = signal('');
  echec = signal(false);

  email = '';
  nouveau = '';
  confirmation = '';
  voirMotDePasse = false;

  private userId = '';
  private jeton = '';

  /**
   * La force d'un mot de passe se juge d'abord à sa longueur : les classes
   * de caractères obligatoires produisent « Password1! » chez tout le
   * monde. Même mesure que sur la page Sécurité, pour que l'exigence
   * annoncée soit la même partout.
   */
  robustesse = computed(() => {
    const m = this.nouveau;
    if (!m) return { texte: '', classe: '' };
    const varietes = [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z0-9]/].filter((r) => r.test(m)).length;
    const points = Math.min(4, Math.floor(m.length / 5) + (m.length >= 12 ? 1 : 0) + (varietes >= 3 ? 1 : 0));
    if (m.length < 8) return { texte: 'Trop court — huit caractères au minimum', classe: 'est-faible' };
    if (points <= 2) return { texte: 'Court. Un mot de passe long résiste mieux qu’un mot de passe compliqué.', classe: 'est-moyen' };
    if (points === 3) return { texte: 'Convenable', classe: 'est-bon' };
    return { texte: 'Solide', classe: 'est-solide' };
  });

  get valide(): boolean {
    return this.nouveau.length >= 8 && this.nouveau === this.confirmation;
  }

  ngOnInit() {
    this.mode = (this.route.snapshot.data['mode'] as Mode) ?? 'oubli';

    const q = this.route.snapshot.queryParamMap;
    this.userId = q.get('id') ?? '';
    this.jeton = q.get('jeton') ?? '';

    if (this.mode !== 'oubli' && (!this.userId || !this.jeton)) {
      this.echec.set(true);
      this.fait.set(true);
      this.message.set('Ce lien est incomplet. Il a peut-être été coupé par votre messagerie : réessayez en le copiant en entier.');
      return;
    }

    // La confirmation d'adresse ne demande rien : le lien suffit, on
    // l'exécute en arrivant plutôt que de faire cliquer une seconde fois.
    if (this.mode === 'confirmation') this.confirmer();
  }

  // ── « J'ai oublié » ──

  demander() {
    if (!this.email.includes('@')) {
      this.toastr.warning('Saisissez votre adresse e-mail.');
      return;
    }
    this.occupe.set(true);
    this.auth.motDePasseOublie(this.email).subscribe({
      next: (r) => {
        this.occupe.set(false);
        this.fait.set(true);
        this.message.set(r.message);
      },
      error: () => {
        this.occupe.set(false);
        this.toastr.error('La demande n’a pas abouti. Réessayez dans un instant.');
      },
    });
  }

  // ── Le nouveau mot de passe ──

  reinitialiser() {
    if (!this.valide) return;
    this.occupe.set(true);
    this.auth.reinitialiserMotDePasse(this.userId, this.jeton, this.nouveau).subscribe({
      next: (r) => {
        this.occupe.set(false);
        this.fait.set(true);
        this.message.set(r.message);
        // Tous les appareils ont été déconnectés : la connexion est la
        // suite naturelle, on ne fait pas chercher le lien.
        setTimeout(() => this.router.navigate(['/login']), 2500);
      },
      error: (e) => {
        this.occupe.set(false);
        this.echec.set(true);
        this.fait.set(true);
        this.message.set(e.error?.message ?? 'Ce lien n’est plus valable.');
      },
    });
  }

  // ── La confirmation d'adresse ──

  private confirmer() {
    this.occupe.set(true);
    this.auth.confirmerEmail(this.userId, this.jeton).subscribe({
      next: (r) => {
        this.occupe.set(false);
        this.fait.set(true);
        this.message.set(r.message);
        this.auth.majUtilisateur({ emailConfirmed: true });
      },
      error: (e) => {
        this.occupe.set(false);
        this.echec.set(true);
        this.fait.set(true);
        this.message.set(e.error?.message ?? 'Ce lien n’est plus valable.');
      },
    });
  }

  // ── Habillage ──

  get titre(): string {
    if (this.mode === 'confirmation') return 'Confirmation de votre adresse';
    if (this.mode === 'reinitialisation') return 'Choisissez un nouveau mot de passe';
    return 'Mot de passe oublié';
  }

  get chapeau(): string {
    if (this.mode === 'confirmation') return 'Nous vérifions le lien que vous venez d’ouvrir.';
    if (this.mode === 'reinitialisation')
      return 'Il remplacera l’ancien immédiatement, et déconnectera tous vos appareils.';
    return 'Indiquez l’adresse de votre compte : nous vous enverrons un lien pour en choisir un nouveau.';
  }
}
