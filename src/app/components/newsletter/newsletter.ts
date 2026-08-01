import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { NewsletterService } from '../../services/newsletter.service';
import { AuthService } from '../../services/auth.service';

/**
 * La lettre d'information, côté visiteur.
 *
 * Trois moments d'un même parcours — s'abonner, confirmer, se retirer —
 * servis par un composant unique, comme pour la récupération de mot de
 * passe. Ils arrivent par le même courriel et se ressemblent assez pour
 * qu'un gabarit commun ne coûte rien en clarté.
 *
 * Le retrait n'exige ni compte ni mot de passe, et c'est délibéré : la
 * loi l'impose, et quelqu'un qu'on force à se connecter pour ne plus
 * recevoir nos messages a un autre bouton sous la main — celui qui nous
 * signale comme indésirable.
 */
type Mode = 'inscription' | 'confirmation' | 'desinscription';

/** Les catégories proposées à l'abonnement, dans l'ordre des grands secteurs. */
const CATEGORIES = [
  'Tech', 'Santé', 'Commerce', 'Bâtiment', 'Industrie', 'Transport',
  'Hôtellerie-restauration', 'Éducation', 'Finance', 'Design',
];

@Component({
  selector: 'app-newsletter',
  imports: [FormsModule, RouterLink],
  templateUrl: './newsletter.html',
  styleUrl: './newsletter.scss',
})
export class Newsletter implements OnInit {
  private api = inject(NewsletterService);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toastr = inject(ToastrService);

  readonly categories = CATEGORIES;

  mode: Mode = 'inscription';
  occupe = signal(false);
  fait = signal(false);
  echec = signal(false);
  message = signal('');

  // ── Abonnement ──
  email = '';
  prenom = '';
  ville = '';
  choisies = signal<string[]>([]);
  consentement = false;

  // ── Désinscription ──
  private jeton = '';
  adresseMasquee = signal<string | null>(null);
  dejaRetire = signal(false);
  motif = '';

  readonly motifs = [
    'Je reçois trop de messages',
    'Le contenu ne me concerne pas',
    'Je ne me souviens pas m’être abonné',
    'J’ai trouvé un emploi',
  ];

  ngOnInit() {
    this.mode = (this.route.snapshot.data['mode'] as Mode) ?? 'inscription';
    this.jeton = this.route.snapshot.queryParamMap.get('jeton') ?? '';

    // Un visiteur connecté n'a pas à ressaisir ce que la plateforme sait.
    const u = this.auth.currentUser();
    if (u && this.mode === 'inscription') {
      this.email = u.email;
      this.prenom = u.firstName ?? '';
      this.ville = u.city ?? '';
    }

    if (this.mode === 'confirmation') this.confirmer();
    if (this.mode === 'desinscription') this.chargerEtat();
  }

  // ══════════════════════════════
  //  S'abonner
  // ══════════════════════════════

  basculer(c: string) {
    this.choisies.update((l) => (l.includes(c) ? l.filter((x) => x !== c) : [...l, c]));
  }

  get valide(): boolean {
    return /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(this.email.trim()) && this.consentement;
  }

  abonner() {
    if (!this.valide) {
      // On distingue les deux refus : « adresse invalide » sur une case à
      // cocher oubliée enverrait chercher une faute de frappe qui n'existe pas.
      this.toastr.warning(
        this.consentement ? 'Cette adresse ne semble pas valide.'
                          : 'Cochez la case pour donner votre accord.');
      return;
    }
    this.occupe.set(true);
    this.api.abonner({
      email: this.email.trim(),
      prenom: this.prenom.trim() || undefined,
      ville: this.ville.trim() || undefined,
      categories: this.choisies().join(',') || undefined,
      source: 'Page',
    }).subscribe({
      next: (r) => {
        this.occupe.set(false);
        this.fait.set(true);
        this.message.set(r.message);
      },
      error: (e) => {
        this.occupe.set(false);
        this.toastr.error(e?.error?.message ?? 'L’abonnement n’a pas pu être enregistré.');
      },
    });
  }

  // ══════════════════════════════
  //  Confirmer
  // ══════════════════════════════

  private confirmer() {
    if (!this.jeton) {
      this.echec.set(true);
      this.fait.set(true);
      this.message.set('Ce lien est incomplet. Il a peut-être été coupé par votre messagerie : réessayez en le copiant en entier.');
      return;
    }
    this.occupe.set(true);
    this.api.confirmer(this.jeton).subscribe({
      next: (r) => {
        this.occupe.set(false);
        this.fait.set(true);
        this.message.set(r.message);
      },
      error: (e) => {
        this.occupe.set(false);
        this.echec.set(true);
        this.fait.set(true);
        this.message.set(e?.error?.message ?? 'Ce lien n’est plus valable.');
      },
    });
  }

  // ══════════════════════════════
  //  Se retirer
  // ══════════════════════════════

  private chargerEtat() {
    if (!this.jeton) {
      this.echec.set(true);
      this.fait.set(true);
      this.message.set('Ce lien de désinscription est incomplet.');
      return;
    }
    this.api.etatAbonne(this.jeton).subscribe({
      next: (e) => {
        if (!e.connu) {
          this.echec.set(true);
          this.fait.set(true);
          this.message.set('Ce lien de désinscription n’est pas reconnu. Il vient peut-être d’un très ancien message.');
          return;
        }
        this.adresseMasquee.set(e.email ?? null);
        this.dejaRetire.set(!!e.desabonne);
      },
      error: () => {
        this.echec.set(true);
        this.fait.set(true);
        this.message.set('Ce lien de désinscription n’est pas reconnu.');
      },
    });
  }

  desabonner() {
    this.occupe.set(true);
    this.api.desabonner(this.jeton, this.motif || undefined).subscribe({
      next: (r) => {
        this.occupe.set(false);
        this.fait.set(true);
        this.message.set(r.message);
      },
      error: (e) => {
        this.occupe.set(false);
        this.echec.set(true);
        this.fait.set(true);
        this.message.set(e?.error?.message ?? 'La désinscription a échoué.');
      },
    });
  }

  /** Se raviser : on revient à l'accueil sans rien changer. */
  garder() {
    this.router.navigate(['/']);
  }

  // ── Habillage ──

  get titre(): string {
    if (this.mode === 'confirmation') return 'Confirmation de votre abonnement';
    if (this.mode === 'desinscription') return 'Ne plus recevoir la lettre';
    return 'La lettre d’information';
  }

  get chapeau(): string {
    if (this.mode === 'confirmation') return 'Nous vérifions le lien que vous venez d’ouvrir.';
    if (this.mode === 'desinscription')
      return 'Un clic suffit. Aucun compte, aucun mot de passe, aucune question obligatoire.';
    return 'Les offres qui bougent, les métiers qui recrutent, et ce qui change sur la plateforme. ' +
           'Sans compte, et sans engagement.';
  }
}
