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

type Etape = 'repos' | 'cle' | 'codes';

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
