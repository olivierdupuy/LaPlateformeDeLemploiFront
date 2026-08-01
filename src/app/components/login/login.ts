import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { GoogleSignInButton } from '../google-signin-button/google-signin-button';
import { LinkedinSignInButton } from '../linkedin-signin-button/linkedin-signin-button';

@Component({
  selector: 'app-login',
  imports: [RouterLink, FormsModule, GoogleSignInButton, LinkedinSignInButton],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toastr = inject(ToastrService);

  form = { email: '', password: '' };
  /**
   * Signal et non propriété simple : l'application tourne sans zone.js,
   * et une écriture faite depuis un rappel HTTP n'y déclenche aucun
   * rendu. Cet indicateur ne se remettait à zéro à l'écran que parce
   * qu'un toast l'accompagnait et provoquait la détection au passage —
   * le bouton dépendait donc d'un effet de bord pour se débloquer.
   */
  loading = signal(false);
  showPassword = false;

  /**
   * Deuxième temps de la connexion.
   *
   * Quand un second facteur protège le compte, le mot de passe juste ne
   * donne pas de session : il donne un défi de cinq minutes. Le formulaire
   * cède alors la place à la saisie du code — on ne quitte pas la page,
   * c'est la même connexion qui se poursuit.
   */
  defi = signal<string | null>(null);
  code = '';

  /**
   * Le compte est bloqué par le compteur de tentatives. Le distinguer d'un
   * mot de passe faux évite de faire chercher une faute de frappe pendant
   * un quart d'heure alors que rien ne passera.
   */
  bloque = signal<string | null>(null);

  /**
   * Retour de LinkedIn.
   *
   * LinkedIn renvoie sur cette page avec un code d'autorisation. Le code
   * ne vaut rien sans le secret de l'application, que seul le serveur
   * détient : on le lui remet, il fait l'échange.
   *
   * Le « state » est vérifié d'abord. Sans lui, un tiers pourrait
   * provoquer une connexion sous son propre compte LinkedIn en faisant
   * ouvrir un lien préparé — et l'on croirait être chez soi.
   */
  ngOnInit() {
    const q = this.route.snapshot.queryParamMap;
    const code = q.get('code');
    const etat = q.get('state');
    if (!code || !etat) return;

    const attendu = sessionStorage.getItem(LinkedinSignInButton.CLE_ETAT);
    sessionStorage.removeItem(LinkedinSignInButton.CLE_ETAT);
    if (!attendu || attendu !== etat) {
      this.toastr.error('Cette demande de connexion LinkedIn ne vient pas de cet appareil.');
      this.router.navigate(['/login']);
      return;
    }

    this.loading.set(true);
    this.auth.linkedInSignIn(code, LinkedinSignInButton.redirectUri()).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.requiresTwoFactor && res.challengeToken) {
          this.defi.set(res.challengeToken);
          return;
        }
        this.toastr.success('Connecté avec LinkedIn');
        this.router.navigateByUrl(this.redirectTo);
      },
      error: (e) => {
        this.loading.set(false);
        this.toastr.error(e.error?.message || 'La connexion LinkedIn a échoué.');
        this.router.navigate(['/login']);
      },
    });
  }

  /** Page demandée avant la connexion (ex. un tunnel de candidature interrompu). */
  private get redirectTo(): string {
    const target = this.route.snapshot.queryParamMap.get('redirect');
    // On n'accepte qu'un chemin interne : une adresse absolue ouvrirait
    // une redirection vers n'importe quel site depuis notre page de connexion.
    return target && target.startsWith('/') && !target.startsWith('//') ? target : '/';
  }

  /**
   * Ce que la connexion va reprendre.
   *
   * On arrive ici depuis un tunnel de candidature interrompu, un favori,
   * une messagerie — et la page n'en disait rien : « Connexion » tout court
   * laisse croire qu'on a perdu ce qu'on faisait. Le rappel nomme la
   * destination, et la connexion redevient une etape plutot qu'un detour.
   */
  get resumeLabel(): string | null {
    const t = this.redirectTo;
    if (t === '/') return null;
    if (t.includes('/postuler')) return 'Envoyer votre candidature';
    if (t.startsWith('/offres')) return "Revenir a l'offre";
    if (t.startsWith('/favoris')) return 'Vos offres enregistrees';
    if (t.startsWith('/suivi')) return 'Le suivi de vos candidatures';
    if (t.startsWith('/messagerie')) return 'Votre messagerie';
    if (t.startsWith('/mon-cv')) return 'Votre CV';
    if (t.startsWith('/entretiens')) return 'Vos entretiens';
    return 'La page que vous consultiez';
  }

  submit() {
    if (!this.form.email || !this.form.password) { this.toastr.warning('Remplissez tous les champs'); return; }
    this.loading.set(true);
    this.bloque.set(null);

    this.auth.login(this.form).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.requiresTwoFactor && res.challengeToken) {
          this.defi.set(res.challengeToken);
          return;
        }
        this.toastr.success('Connexion réussie');
        this.router.navigateByUrl(this.redirectTo);
      },
      error: (err) => {
        this.loading.set(false);
        if (err.status === 423) {
          this.bloque.set(err.error?.message ?? 'Ce compte est temporairement bloqué.');
          return;
        }
        this.toastr.error(err.error?.message || 'Erreur de connexion');
      },
    });
  }

  verifier() {
    const jeton = this.defi();
    if (!jeton || this.code.replace(/[\s-]/g, '').length < 6) {
      this.toastr.warning('Saisissez le code à six chiffres, ou l’un de vos codes de secours.');
      return;
    }
    this.loading.set(true);
    this.auth.verifier2fa(jeton, this.code).subscribe({
      next: () => {
        this.toastr.success('Connexion réussie');
        this.router.navigateByUrl(this.redirectTo);
      },
      error: (err) => {
        this.loading.set(false);
        this.code = '';
        // Un défi expiré ne se rattrape pas : on renvoie au mot de passe
        // plutôt que de laisser saisir des codes qui seront tous refusés.
        if (err.status === 401 && (err.error?.message ?? '').includes('expir')) this.defi.set(null);
        this.toastr.error(err.error?.message || 'Code refusé');
      },
    });
  }

  /** Revient au mot de passe : le défi devient sans objet. */
  annulerDefi() {
    this.defi.set(null);
    this.code = '';
    this.form.password = '';
  }
}
