import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { NewsletterService } from '../../services/newsletter.service';
import { AuthService } from '../../services/auth.service';
import { Regles, erreursDuServeur } from '../../utils/validation';
import { CATEGORIES } from '../../utils/categories';
import { Explication } from '../explication/explication';

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

@Component({
  selector: 'app-newsletter',
  imports: [FormsModule, RouterLink, Explication],
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


  /**
   * Anti-robots — voir « Validation/AntiRobot.cs » cote serveur.
   *
   * « siteWeb » est un champ-piege : invisible et hors du parcours au
   * clavier, une personne ne peut pas le remplir. « msSaisie » mesure le
   * temps passe sur le formulaire ; lire, comprendre et remplir prend
   * plus d'une seconde et demie a n'importe qui.
   *
   * Aucun service tiers, aucun cookie : le bandeau du site promet
   * qu'aucun traceur n'est depose, et un CAPTCHA commercial aurait rendu
   * cette phrase fausse.
   */
  siteWeb = '';
  private ouvertA = Date.now();
  protected get msSaisie() { return Date.now() - this.ouvertA; }

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

  /**
   * Ce qui ne va pas, champ par champ.
   *
   * Accesseurs et non « computed » : ils lisent des propriétés
   * ordinaires, qui ne notifient rien. Un calcul mémoïsé s'évaluerait
   * une fois et ne bougerait plus.
   *
   * Rien ne s'affiche tant qu'on n'a pas quitté le champ ou tenté
   * d'envoyer : reprocher une adresse incomplète à la deuxième lettre
   * saisie, c'est parler à quelqu'un qui n'a pas fini.
   */
  touche: Record<string, boolean> = {};
  soumis = signal(false);
  serveur = signal<Record<string, string>>({});

  private erreur(champ: string, regle: () => string | null): string | null {
    const duServeur = this.serveur()[champ];
    if (duServeur) return duServeur;
    return (this.touche[champ] || this.soumis()) ? regle() : null;
  }

  get errEmail() { return this.erreur('email', () => Regles.email(this.email)); }
  get errPrenom() {
    return this.erreur('prenom', () => Regles.texteCourt(this.prenom, 'Le prénom', { obligatoire: false }));
  }
  get errVille() {
    return this.erreur('ville', () => Regles.texteCourt(this.ville, 'La ville', { max: 200, obligatoire: false }));
  }
  get errConsentement() {
    return this.soumis() && !this.consentement
      ? 'Cochez la case pour donner votre accord.' : null;
  }

  effacer(champ: string) {
    const s = this.serveur();
    if (s[champ]) {
      const { [champ]: _, ...reste } = s;
      this.serveur.set(reste);
    }
  }

  get valide(): boolean {
    return !Regles.email(this.email)
        && !Regles.texteCourt(this.prenom, 'Le prénom', { obligatoire: false })
        && !Regles.texteCourt(this.ville, 'La ville', { max: 200, obligatoire: false })
        && this.consentement;
  }

  abonner() {
    this.serveur.set({});
    this.soumis.set(true);
    if (!this.valide) {
      // Le curseur va sur le premier champ fautif : faire chercher lequel
      // bloque est le meilleur moyen de faire abandonner un formulaire.
      const premier = this.errEmail ? 'email' : this.errPrenom ? 'prenom'
                    : this.errVille ? 'ville' : null;
      if (premier) {
        setTimeout(() => document.querySelector<HTMLElement>(`[data-champ="${premier}"]`)?.focus());
      }
      return;
    }
    this.occupe.set(true);
    this.api.abonner({
      email: this.email.trim(),
      prenom: this.prenom.trim() || undefined,
      ville: this.ville.trim() || undefined,
      categories: this.choisies().join(',') || undefined,
      source: 'Page',
      siteWeb: this.siteWeb,
      msSaisie: this.msSaisie,
    }).subscribe({
      next: (r) => {
        this.occupe.set(false);
        this.fait.set(true);
        this.message.set(r.message);
      },
      error: (e) => {
        this.occupe.set(false);
        this.serveur.set(erreursDuServeur(e));
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
