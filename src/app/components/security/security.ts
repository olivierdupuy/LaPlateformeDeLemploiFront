import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';
import { SecurityService } from '../../services/security.service';
import { AuthService } from '../../services/auth.service';
import { EtatSecurite, SessionDto } from '../../models/auth.model';
// Import statique et non `await import('qrcode')` : le serveur de
// developpement reecrit un import dynamique en chemin absolu place entre
// guillemets simples, et le dossier du projet contient une apostrophe
// (« La Plateforme de l'emploi »). La chaine se refermait au milieu du
// chemin, et l'application entiere cessait de demarrer — en developpement
// seulement, ce qui rend le piege d'autant plus mauvais.
import { toDataURL } from 'qrcode';

/**
 * La page Securite d'un compte.
 *
 * Elle est la meme pour un candidat, un recruteur et un administrateur :
 * ce qui protege un compte ne depend pas de ce qu'on en fait. Seule
 * l'exigence change — un administrateur ne peut pas se passer du second
 * facteur, et la page le lui dit au lieu de le laisser decouvrir une
 * porte fermee.
 *
 * L'activation se fait en trois temps volontairement separes : on montre
 * la cle, on verifie qu'elle est bien installee, puis seulement on remet
 * les codes de secours. Activer avant d'avoir verifie enfermerait dehors
 * quelqu'un dont l'application n'a pas enregistre la cle.
 */

/**
 * Les temps de l'activation.
 *
 * « choix » n'existait pas : il n'y avait qu'une méthode. Le SMS s'ajoute
 * sans la remplacer, et deux portes de même apparence obligeraient à
 * choisir sans savoir — la page dit donc ce que chacune vaut avant de
 * demander laquelle.
 */
type Etape = 'repos' | 'choix' | 'cle' | 'telephone' | 'sms' | 'codes';

const MOYENS: Record<string, string> = {
  Password: 'Mot de passe',
  Google: 'Google',
  LinkedIn: 'LinkedIn',
  Recovery: 'Code de secours',
  Impersonation: 'Prise en main par un administrateur',
};

@Component({
  selector: 'app-security',
  imports: [FormsModule, DatePipe, RouterLink],
  templateUrl: './security.html',
  styleUrl: './security.scss',
})
export class Security implements OnInit {
  private api = inject(SecurityService);
  private auth = inject(AuthService);
  private toastr = inject(ToastrService);

  etat = signal<EtatSecurite | null>(null);
  chargement = signal(true);
  occupe = signal(false);

  // ── Activation de la double authentification ──
  etape = signal<Etape>('repos');
  cle = signal('');
  cleLisible = signal('');
  qr = signal<string | null>(null);
  code = '';
  codes = signal<string[]>([]);

  // ── Second facteur par SMS ──
  telephone = '';
  telephoneMasque = signal('');
  motSms = signal('');

  // ── Mot de passe ──
  actuel = '';
  nouveau = '';
  confirmation = '';

  moyen = (m: string) => MOYENS[m] ?? m;

  /**
   * La force d'un mot de passe se juge d'abord a sa longueur : les classes
   * de caracteres obligatoires produisent « Password1! » chez tout le
   * monde. On mesure donc la longueur, et la variete seulement ensuite.
   */
  robustesse = computed(() => {
    const m = this.nouveau;
    if (!m) return { niveau: 0, texte: '', classe: '' };
    const varietes = [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z0-9]/].filter((r) => r.test(m)).length;
    const points = Math.min(4, Math.floor(m.length / 5) + (m.length >= 12 ? 1 : 0) + (varietes >= 3 ? 1 : 0));
    if (m.length < 8) return { niveau: 1, texte: 'Trop court — huit caractères au minimum', classe: 'est-faible' };
    if (points <= 2) return { niveau: 2, texte: 'Court. Un mot de passe long résiste mieux qu’un mot de passe compliqué.', classe: 'est-moyen' };
    if (points === 3) return { niveau: 3, texte: 'Convenable', classe: 'est-bon' };
    return { niveau: 4, texte: 'Solide', classe: 'est-solide' };
  });

  /** Ce que vaut chaque méthode, dit avant de faire choisir. */
  readonly methodes = [
    {
      cle: 'Totp' as const,
      titre: 'Application d’authentification',
      icone: 'bi-phone-vibrate',
      atout: 'Le plus sûr',
      texte:
        'Une application installée sur votre téléphone fabrique le code hors ligne. ' +
        'Il ne circule jamais sur le réseau : ni votre opérateur, ni nous, ne pouvons le connaître.',
      contre: 'Il faut installer une application, et conserver les codes de secours.',
    },
    {
      cle: 'Sms' as const,
      titre: 'Code par SMS',
      icone: 'bi-chat-dots',
      atout: 'Rien à installer',
      texte:
        'Un code à six chiffres vous est envoyé au moment de vous connecter. ' +
        'Aucune application, aucune configuration.',
      // Dit franchement : proposer les deux comme équivalentes serait
      // laisser choisir le moins sûr sans le savoir.
      contre:
        'Moins sûr : quelqu’un qui obtient un duplicata de votre carte SIM chez ' +
        'votre opérateur reçoit vos codes à votre place. Le message peut aussi ' +
        'se perdre, ou n’arriver que hors de portée du réseau.',
    },
  ];

  ngOnInit() {
    this.charger();
  }

  private charger() {
    this.chargement.set(true);
    this.api.etat().subscribe({
      next: (e) => {
        this.etat.set(e);
        this.chargement.set(false);
        // L'utilisateur en memoire peut dater : la page Securite est
        // l'endroit ou l'on vient justement verifier ces deux points.
        this.auth.majUtilisateur({ twoFactorEnabled: e.deuxFacteurs, emailConfirmed: e.emailConfirme });
      },
      error: () => {
        this.chargement.set(false);
        this.toastr.error('Impossible de lire l’état de sécurité du compte.');
      },
    });
  }

  // ══════════════════════════════
  //  Double authentification
  // ══════════════════════════════

  /** Le choix précède l'installation : on ne montre pas un QR à qui veut un SMS. */
  commencerChoix() {
    this.etape.set('choix');
  }

  choisir(methode: 'Totp' | 'Sms') {
    if (methode === 'Totp') this.commencer2fa();
    else { this.telephone = ''; this.motSms.set(''); this.etape.set('telephone'); }
  }

  // ══════════════════════════════
  //  Second facteur par SMS
  // ══════════════════════════════

  envoyerCodeSms() {
    if (!this.telephone.trim()) {
      this.toastr.error('Saisissez votre numéro de téléphone mobile.');
      return;
    }
    this.occupe.set(true);
    this.api.envoyerCodeSms(this.telephone).subscribe({
      next: (r) => {
        this.occupe.set(false);
        this.telephoneMasque.set(r.telephone);
        this.motSms.set(r.message);
        this.code = '';
        this.etape.set('sms');
      },
      error: (e) => {
        this.occupe.set(false);
        this.toastr.error(e?.error?.message ?? 'Le SMS n’a pas pu être envoyé.');
      },
    });
  }

  renvoyerCodeSms() {
    this.occupe.set(true);
    this.api.envoyerCodeSms(this.telephone).subscribe({
      next: (r) => {
        this.occupe.set(false);
        this.motSms.set(r.message);
        this.toastr.success(r.message);
      },
      error: (e) => {
        this.occupe.set(false);
        this.motSms.set(e?.error?.message ?? '');
        this.toastr.error(e?.error?.message ?? 'Le renvoi a échoué.');
      },
    });
  }

  activerSms() {
    if (this.code.replace(/\s/g, '').length < 6) {
      this.toastr.error('Le code compte six chiffres.');
      return;
    }
    this.occupe.set(true);
    this.api.activerSms(this.telephone, this.code).subscribe({
      next: (r) => {
        this.codes.set(r.codesDeSecours);
        this.etape.set('codes');
        this.code = '';
        this.occupe.set(false);
        this.charger();
      },
      error: (e) => {
        this.occupe.set(false);
        this.toastr.error(e?.error?.message ?? 'Code refusé.');
      },
    });
  }

  async commencer2fa() {
    this.occupe.set(true);
    this.api.preparer2fa().subscribe({
      next: async (p) => {
        this.cle.set(p.cle);
        this.cleLisible.set(p.cleLisible);
        this.etape.set('cle');
        this.occupe.set(false);

        try {
          this.qr.set(await toDataURL(p.uri, { margin: 1, width: 220,
            color: { dark: '#10272b', light: '#ffffff' } }));
        } catch {
          // Sans QR on saisit la cle a la main : c'est prevu, et affiche.
          this.qr.set(null);
        }
      },
      error: (e) => {
        this.occupe.set(false);
        this.toastr.error(e?.error?.message ?? 'La préparation a échoué.');
      },
    });
  }

  activer() {
    if (this.code.replace(/\s/g, '').length < 6) {
      this.toastr.error('Le code compte six chiffres.');
      return;
    }
    this.occupe.set(true);
    this.api.activer2fa(this.code).subscribe({
      next: (r) => {
        this.codes.set(r.codesDeSecours);
        this.etape.set('codes');
        this.code = '';
        this.occupe.set(false);
        this.charger();
      },
      error: (e) => {
        this.occupe.set(false);
        this.toastr.error(e?.error?.message ?? 'Code refusé.');
      },
    });
  }

  annulerActivation() {
    this.etape.set('repos');
    this.cle.set('');
    this.qr.set(null);
    this.code = '';
    this.telephone = '';
    this.motSms.set('');
  }

  terminer() {
    this.etape.set('repos');
    this.codes.set([]);
    this.toastr.success('Votre compte est protégé par un second facteur.');
  }

  async desactiver() {
    const res = await Swal.fire({
      title: 'Retirer le second facteur ?',
      html: `<p style="font-size:.93rem;line-height:1.6;margin-bottom:1rem">
               Votre mot de passe suffira de nouveau pour entrer. Quiconque le devinerait
               entrerait avec lui.
             </p>
             <input id="mdp" type="password" class="swal2-input" placeholder="Votre mot de passe" autocomplete="off">
             <input id="code" type="text" class="swal2-input" placeholder="Code de l'application, ou code de secours" autocomplete="off">`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#c6364b',
      cancelButtonColor: '#577177',
      confirmButtonText: 'Retirer',
      cancelButtonText: 'Garder',
      preConfirm: () => ({
        mdp: (document.getElementById('mdp') as HTMLInputElement)?.value ?? '',
        code: (document.getElementById('code') as HTMLInputElement)?.value ?? '',
      }),
    });
    if (!res.isConfirmed) return;

    this.occupe.set(true);
    this.api.desactiver2fa(res.value.mdp, res.value.code).subscribe({
      next: (r) => {
        this.occupe.set(false);
        this.toastr.success(r.message);
        this.charger();
      },
      error: (e) => {
        this.occupe.set(false);
        this.toastr.error(e?.error?.message ?? 'Désactivation refusée.');
      },
    });
  }

  async regenerer() {
    const res = await Swal.fire({
      title: 'Refaire les codes de secours ?',
      text: 'Les anciens cesseront de fonctionner immédiatement.',
      icon: 'question',
      input: 'password',
      inputPlaceholder: 'Votre mot de passe',
      inputAttributes: { autocomplete: 'off' },
      showCancelButton: true,
      confirmButtonColor: '#15616d',
      cancelButtonColor: '#577177',
      confirmButtonText: 'Refaire',
      cancelButtonText: 'Annuler',
    });
    if (!res.isConfirmed) return;

    this.occupe.set(true);
    this.api.regenererCodes(res.value ?? '').subscribe({
      next: (r) => {
        this.codes.set(r.codesDeSecours);
        this.etape.set('codes');
        this.occupe.set(false);
        this.charger();
      },
      error: (e) => {
        this.occupe.set(false);
        this.toastr.error(e?.error?.message ?? 'Régénération refusée.');
      },
    });
  }

  copierCodes() {
    navigator.clipboard?.writeText(this.codes().join('\n'));
    this.toastr.success('Codes copiés. Collez-les ailleurs que sur ce téléphone.');
  }

  telechargerCodes() {
    const contenu =
      `Codes de secours — La Plateforme de l'emploi\n` +
      `Compte : ${this.etat()?.email}\n` +
      `Établis le ${new Date().toLocaleDateString('fr-FR')}\n\n` +
      `Chacun ne sert qu'une fois. Conservez ce fichier ailleurs que sur\n` +
      `l'appareil qui génère vos codes : c'est lui que ces codes remplacent.\n\n` +
      this.codes().map((c, i) => `${String(i + 1).padStart(2, ' ')}. ${c}`).join('\n') + '\n';

    const url = URL.createObjectURL(new Blob([contenu], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'codes-de-secours-lpde.txt';
    a.click();
    URL.revokeObjectURL(url);
  }

  copierCle() {
    navigator.clipboard?.writeText(this.cle());
    this.toastr.success('Clé copiée.');
  }

  // ══════════════════════════════
  //  Mot de passe
  // ══════════════════════════════

  get motDePasseValide(): boolean {
    return this.actuel.length > 0 && this.nouveau.length >= 8 && this.nouveau === this.confirmation;
  }

  changerMotDePasse() {
    if (!this.motDePasseValide) return;
    this.occupe.set(true);
    this.api.changerMotDePasse(this.actuel, this.nouveau).subscribe({
      next: (r) => {
        this.actuel = this.nouveau = this.confirmation = '';
        this.occupe.set(false);
        this.toastr.success(r.message);
        this.charger();
      },
      error: (e) => {
        this.occupe.set(false);
        this.toastr.error(e?.error?.message ?? 'Changement refusé.');
      },
    });
  }

  // ══════════════════════════════
  //  Appareils
  // ══════════════════════════════

  async fermer(s: SessionDto) {
    if (s.courante) return;
    this.occupe.set(true);
    this.api.fermerSession(s.id).subscribe({
      next: (r) => {
        this.occupe.set(false);
        this.toastr.success(r.message);
        this.charger();
      },
      error: () => {
        this.occupe.set(false);
        this.toastr.error('Cet appareil n’a pas pu être déconnecté.');
      },
    });
  }

  async toutFermer() {
    const res = await Swal.fire({
      title: 'Déconnecter les autres appareils ?',
      text: 'Cet appareil-ci reste connecté. Tous les autres devront saisir de nouveau leurs identifiants.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#15616d',
      cancelButtonColor: '#577177',
      confirmButtonText: 'Déconnecter',
      cancelButtonText: 'Annuler',
    });
    if (!res.isConfirmed) return;

    this.occupe.set(true);
    this.api.fermerToutesLesSessions().subscribe({
      next: (r) => {
        this.occupe.set(false);
        this.toastr.success(r.message);
        this.charger();
      },
      error: () => {
        this.occupe.set(false);
        this.toastr.error('La déconnexion a échoué.');
      },
    });
  }

  // ══════════════════════════════
  //  Adresse
  // ══════════════════════════════

  confirmerAdresse() {
    this.occupe.set(true);
    this.api.envoyerConfirmation().subscribe({
      next: (r) => {
        this.occupe.set(false);
        if (r.envoye) this.toastr.success(r.message);
        else this.toastr.warning(r.message, 'Aucun serveur d’expédition');
      },
      error: () => {
        this.occupe.set(false);
        this.toastr.error('L’envoi a échoué.');
      },
    });
  }
}
