import { Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../services/auth.service';
import { AuthModalService, VueAuth } from '../../services/auth-modal.service';
import { PlatformService } from '../../services/platform.service';
import { GoogleSignInButton } from '../google-signin-button/google-signin-button';
import { LinkedinSignInButton } from '../linkedin-signin-button/linkedin-signin-button';
import { AuthResponse } from '../../models/auth.model';
import { Regles, erreursDuServeur } from '../../utils/validation';
import { CATEGORIES } from '../../utils/categories';
import { NewsletterService } from '../../services/newsletter.service';
import { CompanyReviewService } from '../../services/company-review.service';

/**
 * Toute l'authentification, en une couche posée sur la page.
 *
 * Elle remplace trois pages pleines — connexion, inscription,
 * récupération. Le gain n'est pas cosmétique : on se connectait depuis
 * une offre et l'on atterrissait à l'accueil, à charge de retrouver
 * l'offre. Ici la page reste derrière, et la parenthèse se referme là
 * où elle s'est ouverte.
 *
 * Le second facteur est un temps de la connexion, pas une vue à part :
 * le mot de passe était bon, la même conversation se poursuit.
 */
@Component({
  selector: 'app-auth-modal',
  imports: [FormsModule, GoogleSignInButton, LinkedinSignInButton],
  templateUrl: './auth-modal.html',
  styleUrl: './auth-modal.scss',
})
export class AuthModal {
  private auth = inject(AuthService);
  private router = inject(Router);
  private toastr = inject(ToastrService);
  modale = inject(AuthModalService);
  platform = inject(PlatformService);
  private lettre = inject(NewsletterService);
  private entreprises = inject(CompanyReviewService);

  private panneau = viewChild<ElementRef<HTMLElement>>('panneau');

  /**
   * Signaux et non propriétés simples : l'application tourne sans
   * zone.js, et une écriture faite depuis un rappel HTTP n'y déclenche
   * aucun rendu. Un indicateur d'attente posé en propriété ne se
   * remettrait à zéro à l'écran que par effet de bord.
   */
  occupe = signal(false);

  // ── Connexion ──
  identifiants = { email: '', motDePasse: '' };
  voirMotDePasse = signal(false);
  /** Le compteur de tentatives a fermé la porte : le dire, plutôt que
   *  laisser chercher une faute de frappe pendant un quart d'heure. */
  bloque = signal<string | null>(null);

  // ── Second facteur ──
  defi = signal<string | null>(null);
  code = '';
  methode = signal<string>('Totp');
  destinataire = signal<string | null>(null);
  motSms = signal<string | null>(null);
  renvoiEnCours = signal(false);

  // ══════════════════════════════
  //  Inscription
  // ══════════════════════════════

  inscription = { prenom: '', nom: '', email: '', motDePasse: '', role: 'Candidate', entreprise: '' };

  /**
   * L'inscription d'un candidat se fait en trois temps.
   *
   * Un état interne de la vue, pas une vue de plus : c'est la même
   * inscription qui se poursuit, exactement comme le second facteur est
   * un temps de la connexion et non un écran à part.
   *
   * Le compte est créé à la fin de l'étape 1, jamais à la fin du
   * parcours. Accumuler les réponses pour tout envoyer à la fin
   * perdrait l'inscription à chaque abandon — c'est-à-dire précisément
   * là où découper en étapes est censé aider. Après l'étape 1, fermer
   * la fenêtre ne coûte plus rien : le compte existe, le courriel de
   * confirmation est parti, la session est ouverte.
   *
   * Le recruteur suit le même découpage, mais décrit autre chose : ses
   * étapes 2 et 3 renseignent l'entreprise — la fiche que les candidats
   * consultent avant de postuler — et non sa propre recherche.
   */
  etape = signal(1);
  readonly categories = CATEGORIES;

  /** Étape 2 — ce qu'on cherche. */
  recherche = { metier: '', ville: '', experience: '' };

  /**
   * Étape 3 — être trouvé, être prévenu.
   *
   * Les deux cases ne partent pas du même endroit, et c'est voulu.
   *
   * La visibilité auprès des recruteurs est **déjà active** sur un
   * compte candidat : c'est le comportement de la plateforme depuis
   * toujours. Une case décochée mentirait — et, laissée telle quelle,
   * masquerait le profil de quiconque n'y touche pas, à rebours de ce
   * qu'il veut et de ce qui se passait avant que cette étape existe.
   * Elle reflète donc l'état réel du compte ; la décocher est un retrait
   * délibéré.
   *
   * L'abonnement à la lettre, lui, ne part jamais coché : c'est un
   * consentement à recevoir des messages, et le pré-cocher serait
   * indéfendable autant que contraire au RGPD.
   */
  visibleRecruteurs = true;
  lettreConsentie = false;
  choisies = signal<string[]>([]);

  /**
   * Étapes 2 et 3 du recruteur — l'entreprise, pas la personne.
   *
   * La fiche est partagée : deux recruteurs de la même société
   * décrivent le même objet. Elle est donc lue avant d'être montrée,
   * et « dejaDecrite » retient qu'un collègue est passé avant — sans
   * quoi le second effacerait le travail du premier en passant l'étape
   * à moitié remplie.
   */
  societe = { secteur: '', taille: '', ville: '', site: '', presentation: '', fonction: '' };
  dejaDecrite = signal(false);

  readonly taillesEntreprise = [
    '1 à 10', '11 à 50', '51 à 250', '251 à 1000', 'Plus de 1000',
  ];

  /**
   * Les deux étapes facultatives sont escamotées quand la modale a été
   * ouverte pour finir une candidature : faire remplir des centres
   * d'intérêt à quelqu'un qui allait postuler, c'est le perdre.
   */
  private get parcoursCourt(): boolean {
    return (this.modale.contexte().redirect ?? '').includes('/postuler');
  }

  /** Combien d'étapes on annonce — deux si le parcours est écourté. */
  get totalEtapes(): number { return this.parcoursCourt && !this.estRecruteur ? 2 : 3; }

  /** Candidat comme recruteur passent par des étapes ; leur contenu diffère. */
  get enEtapes(): boolean { return true; }
  get estRecruteur(): boolean { return this.inscription.role === 'Recruiter'; }

  /**
   * Une adresse personnelle sur un compte recruteur.
   *
   * Une remarque, jamais un refus : les candidats répondent plus
   * volontiers à une adresse professionnelle, mais l'exiger écarterait
   * les indépendants et les toutes petites structures — qui recrutent
   * aussi.
   */
  get adressePersonnelle(): boolean {
    if (!this.estRecruteur) return false;
    const domaine = this.inscription.email.split('@')[1]?.toLowerCase() ?? '';
    return ['gmail.com', 'hotmail.fr', 'hotmail.com', 'outlook.fr', 'outlook.com',
            'yahoo.fr', 'yahoo.com', 'orange.fr', 'free.fr', 'sfr.fr', 'laposte.net',
            'wanadoo.fr', 'icloud.com'].includes(domaine);
  }

  /** Les jalons de la barre de progression. */
  get jalons(): number[] {
    return Array.from({ length: this.totalEtapes }, (_, i) => i + 1);
  }

  /** L'erreur du serveur sur le nombre d'années, s'il y en a une. */
  get errExperience() { return this.serveur()['experienceYears'] ?? null; }
  get errMetier() { return this.erreur('title', () => Regles.texteCourt(this.recherche.metier, 'Le métier recherché', { max: 150, obligatoire: false })); }
  get errVille() { return this.erreur('city', () => Regles.texteCourt(this.recherche.ville, 'La ville', { obligatoire: false })); }

  basculerCategorie(c: string) {
    this.choisies.update((l) => (l.includes(c) ? l.filter((x) => x !== c) : [...l, c]));
  }


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

  // ── Récupération ──
  emailOubli = '';
  nouveau = '';
  confirmation = '';
  /** Une fois la demande partie, le formulaire cède la place au message. */
  fait = signal(false);
  message = signal('');
  echec = signal(false);

  constructor() {
    // L'ouverture remet tout à plat. Sans cela, un mot de passe saisi,
    // la modale fermée puis rouverte, se retrouverait encore là — et le
    // message d'une demande précédente s'afficherait sur la suivante.
    effect(() => {
      const vue = this.modale.vue();
      if (vue === null) {
        this.liberer();
        return;
      }
      this.reinitialiser(vue);
      this.saisir();
    });
  }

  // ══════════════════════════════
  //  Cycle de vie de la couche
  // ══════════════════════════════

  private declencheur: HTMLElement | null = null;

  private reinitialiser(vue: VueAuth) {
    this.occupe.set(false);
    this.bloque.set(null);
    this.defi.set(null);
    this.code = '';
    this.motSms.set(null);
    this.destinataire.set(null);
    this.fait.set(false);
    this.echec.set(false);
    this.message.set('');
    this.identifiants.motDePasse = '';
    this.nouveau = '';
    this.confirmation = '';
    this.voirMotDePasse.set(false);
    this.touche = {};
    this.soumis.set(false);
    this.serveur.set({});
    this.siteWeb = '';
    this.ouvertA = Date.now();
    this.etape.set(1);
    this.recherche = { metier: '', ville: '', experience: '' };
    this.visibleRecruteurs = true;
    this.lettreConsentie = false;
    this.choisies.set([]);
    this.societe = { secteur: '', taille: '', ville: '', site: '', presentation: '', fonction: '' };
    this.dejaDecrite.set(false);

    const c = this.modale.contexte();

    // Le lien du courriel doit porter les deux moitiés. Coupé par une
    // messagerie, il n'en porte qu'une — et une page qui demanderait un
    // mot de passe pour le refuser ensuite ferait perdre le sien.
    if ((vue === 'reinitialisation' || vue === 'confirmation') && (!c.id || !c.jeton)) {
      this.echouer('Ce lien est incomplet. Il a peut-être été coupé par votre messagerie : réessayez en le copiant en entier.');
      return;
    }

    // La confirmation d'adresse ne demande rien : le lien suffit. On
    // l'exécute en arrivant plutôt que de faire cliquer une seconde fois.
    if (vue === 'confirmation') this.confirmerAdresse();

    // Retour de LinkedIn : le code d'autorisation ne vaut rien sans le
    // secret de l'application, que seul le serveur détient.
    if (vue === 'connexion' && c.code) this.echangerLinkedIn(c.code, c.etat);
  }

  /** Le clavier arrive dans la modale, pas derrière elle. */
  private saisir() {
    this.declencheur = document.activeElement as HTMLElement | null;
    document.body.classList.add('a-modale-ouverte');
    queueMicrotask(() => {
      const p = this.panneau()?.nativeElement;
      if (!p) return;
      // Le premier champ, pas le premier élément focalisable : la croix de
      // fermeture ouvre le panneau dans le document et raflait le curseur,
      // si bien qu'une frappe immédiate n'écrivait nulle part.
      const cible = p.querySelector<HTMLElement>('input:not([type=hidden]):not([disabled]):not([tabindex="-1"])')
                 ?? p.querySelector<HTMLElement>('button:not([disabled]):not([tabindex="-1"])');
      cible?.focus();
    });
  }

  private liberer() {
    document.body.classList.remove('a-modale-ouverte');
    // Rendre le curseur là où il était : fermer une modale ne doit pas
    // renvoyer le clavier en haut du document.
    this.declencheur?.focus?.();
    this.declencheur = null;
  }

  /**
   * Fermer.
   *
   * Passé l'étape 1, le compte existe et la session est ouverte : la
   * croix et la touche Échap valent alors « j'ai fini », pas « annule ».
   * On conduit donc là où l'on allait, comme le ferait l'écran de
   * sortie — sans quoi quelqu'un qui referme au lieu de cliquer
   * « Terminer » resterait planté sur la page d'où il venait, sans
   * comprendre qu'il est désormais connecté.
   */
  fermer() {
    const enCoursDInscription = this.modale.vue() === 'inscription'
                                && this.enEtapes && this.etape() > 1;
    if (enCoursDInscription) { this.terminer(); return; }
    this.modale.fermer();
  }

  /**
   * Le clavier ne doit pas s'échapper derrière la modale.
   *
   * Sans cette boucle, une tabulation continue dans la page du dessous —
   * on remplit un formulaire qu'on ne voit pas, et un lecteur d'écran
   * annonce un contenu recouvert.
   */
  auClavier(e: KeyboardEvent) {
    if (e.key === 'Escape') { this.fermer(); return; }
    if (e.key !== 'Tab') return;

    const p = this.panneau()?.nativeElement;
    if (!p) return;
    // « tabindex="-1" » est exclu explicitement : le champ-piège en porte
    // un, et il est bien dans le document — hors de vue, mais pas
    // « display:none ». Sans cette exclusion, la boucle du clavier
    // déposerait le curseur dans un champ que personne ne voit.
    const cibles = [...p.querySelectorAll<HTMLElement>(
      'a[href]:not([tabindex="-1"]), button:not([disabled]):not([tabindex="-1"]), '
      + 'input:not([disabled]):not([tabindex="-1"]), select:not([tabindex="-1"]), '
      + 'textarea:not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])',
    )].filter((el) => el.offsetParent !== null && !el.closest('[aria-hidden="true"]'));
    if (!cibles.length) return;

    const premier = cibles[0];
    const dernier = cibles[cibles.length - 1];
    const actif = document.activeElement;

    if (e.shiftKey && actif === premier) { e.preventDefault(); dernier.focus(); }
    else if (!e.shiftKey && actif === dernier) { e.preventDefault(); premier.focus(); }
  }

  // ══════════════════════════════
  //  Habillage
  // ══════════════════════════════

  /** Les étapes de l'inscription ont leur propre titre : c'est ce qui dit
   *  qu'on avance, plus sûrement qu'un compteur. */
  private readonly etapesCandidat = [
    { titre: 'Votre recherche',
      chapeau: 'Trois champs, et les offres qu’on vous montrera cesseront d’être au hasard.' },
    { titre: 'Être trouvé, être prévenu',
      chapeau: 'Deux choix indépendants, que vous pourrez changer à tout moment.' },
    { titre: 'Bienvenue',
      chapeau: 'Votre compte est prêt. Il reste une chose à faire.' },
  ];

  /** Le recruteur décrit une entreprise, pas une recherche. */
  private readonly etapesRecruteur = [
    { titre: 'Votre entreprise',
      chapeau: 'C’est la fiche que les candidats consultent avant de postuler.' },
    { titre: 'Ce que verront les candidats',
      chapeau: 'Une offre adossée à une entreprise décrite ne reçoit pas les mêmes candidatures.' },
    { titre: 'Prêt à publier',
      chapeau: 'Votre compte est prêt. Vos offres paraîtront dès leur enregistrement.' },
  ];

  private get etapesDuRole() {
    return this.estRecruteur ? this.etapesRecruteur : this.etapesCandidat;
  }

  titre = computed(() => {
    if (this.modale.vue() === 'inscription' && this.etape() > 1)
      return this.etapesDuRole[this.etape() - 2].titre;
    return {
      connexion: 'Connexion',
      inscription: 'Créer un compte',
      oubli: 'Mot de passe oublié',
      reinitialisation: 'Nouveau mot de passe',
      confirmation: 'Confirmation de votre adresse',
    }[this.modale.vue() ?? 'connexion'];
  });

  chapeau = computed(() => {
    if (this.modale.vue() === 'inscription' && this.etape() > 1)
      return this.etapesDuRole[this.etape() - 2].chapeau;
    return {
      connexion: 'Accédez à vos candidatures, vos offres enregistrées et vos messages.',
      inscription: 'Quelques secondes suffisent, et rien ne vous engage.',
      oubli: 'Indiquez l’adresse de votre compte : nous vous enverrons un lien pour en choisir un nouveau.',
      reinitialisation: 'Il remplacera l’ancien immédiatement, et déconnectera tous vos appareils.',
      confirmation: 'Nous vérifions le lien que vous venez d’ouvrir.',
    }[this.modale.vue() ?? 'connexion'];
  });

  /**
   * Le panneau de marque suit la vue.
   *
   * Servir « Reprenez où vous en étiez » à quelqu'un qui crée son
   * compte, ou vanter le suivi des candidatures à qui vient récupérer un
   * accès perdu, sonne faux : chaque moment a son propos.
   */
  marque = computed(() => ({
    connexion: {
      oeil: 'Espace membre',
      titre: 'Reprenez où vous',
      accent: 'en étiez',
      lead: 'Vos candidatures, vos offres enregistrées et vos messages vous attendent.',
      points: [
        'Suivez l’avancement de chaque candidature',
        'Recevez les nouvelles offres qui vous correspondent',
        'Échangez directement avec les recruteurs',
      ],
    },
    inscription: {
      oeil: 'Rejoignez la plateforme',
      titre: 'Votre prochain poste',
      accent: 'commence ici',
      lead: 'Un compte gratuit, en quelques secondes, et rien qui vous engage.',
      points: [
        'Postulez sans ressaisir votre CV à chaque fois',
        'Gardez vos offres et vos recherches d’un appareil à l’autre',
        'Suivez chaque candidature jusqu’à la réponse',
      ],
    },
    oubli: {
      oeil: 'Récupération',
      titre: 'On vous rend',
      accent: 'votre accès',
      lead: 'Un lien valable trente minutes part à l’adresse de votre compte.',
      points: [
        'Le lien ne sert qu’une fois',
        'Votre ancien mot de passe reste actif jusqu’au nouveau',
        'La réponse est la même que le compte existe ou non',
      ],
    },
    reinitialisation: {
      oeil: 'Récupération',
      titre: 'Choisissez-en un',
      accent: 'que vous retiendrez',
      lead: 'Un mot de passe long résiste mieux qu’un mot de passe compliqué.',
      points: [
        'Il remplace l’ancien immédiatement',
        'Tous vos appareils seront déconnectés',
        'Huit caractères au minimum',
      ],
    },
    confirmation: {
      oeil: 'Sécurité',
      titre: 'Votre adresse,',
      accent: 'vérifiée',
      lead: 'C’est elle qui portera vos alertes et les réponses des recruteurs.',
      points: [
        'Elle vous rend votre compte si vous perdez le mot de passe',
        'Elle n’apparaît sur aucun profil public',
        'Vous pouvez en changer à tout moment',
      ],
    },
  }[this.modale.vue() ?? 'connexion']));

  /**
   * Ce que la connexion va reprendre.
   *
   * On arrive souvent d'une candidature interrompue, et « Connexion »
   * tout court laisse croire qu'on a perdu ce qu'on faisait. Nommer la
   * destination rend l'étape à sa place.
   */
  reprise = computed(() => {
    const t = this.modale.contexte().redirect;
    if (!t || t === '/') return null;
    if (t.includes('/postuler')) return 'Envoyer votre candidature';
    if (t.startsWith('/offres')) return 'Revenir à l’offre';
    if (t.startsWith('/favoris')) return 'Vos offres enregistrées';
    if (t.startsWith('/suivi')) return 'Le suivi de vos candidatures';
    if (t.startsWith('/messagerie')) return 'Votre messagerie';
    if (t.startsWith('/mon-cv')) return 'Votre CV';
    if (t.startsWith('/entretiens')) return 'Vos entretiens';
    if (t.startsWith('/mon-espace')) return 'Votre tableau de bord';
    if (t.startsWith('/espace-recruteur') || t.startsWith('/recruteur')) return 'Votre espace recruteur';
    if (t.startsWith('/candidats')) return 'Les profils de candidats';
    if (t.startsWith('/recherches-sauvegardees')) return 'Vos recherches enregistrées';
    if (t.startsWith('/mon-metier')) return 'Votre marché de l’emploi';
    if (t.startsWith('/entreprises-qui-recrutent')) return 'Les entreprises qui recrutent';
    if (t.startsWith('/profil')) return 'Votre profil';
    if (t.startsWith('/securite')) return 'Vos réglages de sécurité';
    if (t.startsWith('/admin')) return 'La console d’administration';
    return 'La page que vous consultiez';
  });

  // ══════════════════════════════
  //  Contrôle des saisies
  // ══════════════════════════════

  /**
   * Quels champs ont déjà été quittés.
   *
   * Objet ordinaire, écrit depuis le gabarit au « blur » : la détection
   * de changement suit un événement de gabarit, même sans zone.js.
   *
   * Une erreur ne s'affiche pas pendant qu'on remplit un champ pour la
   * première fois — souligner « adresse invalide » à la deuxième lettre
   * saisie est un reproche adressé à quelqu'un qui n'a pas fini de
   * parler. Elle apparaît quand on le quitte, ou quand on valide.
   */
  touche: Record<string, boolean> = {};

  /** Vrai dès la première tentative d'envoi : tout se montre alors. */
  soumis = signal(false);

  /** Ce que le serveur a refusé, champ par champ, jusqu'à la frappe suivante. */
  serveur = signal<Record<string, string>>({});

  private montrer(champ: string): boolean {
    return !!this.touche[champ] || this.soumis();
  }

  /** L'erreur à afficher sous un champ : la nôtre, ou celle du serveur. */
  private erreur(champ: string, regle: () => string | null): string | null {
    const duServeur = this.serveur()[champ];
    if (duServeur) return duServeur;
    return this.montrer(champ) ? regle() : null;
  }

  // Accesseurs et non « computed » : ils lisent des propriétés ordinaires,
  // qui ne notifient rien. Un calcul mémoïsé s'évaluerait une fois et ne
  // bougerait plus.
  get errEmail() { return this.erreur('email', () => Regles.email(this.identifiants.email)); }
  get errMotDePasse() {
    return this.erreur('password', () => Regles.requis(this.identifiants.motDePasse, 'Le mot de passe'));
  }
  get errCode() { return this.erreur('code', () => Regles.code(this.code)); }

  get errPrenom() { return this.erreur('firstName', () => Regles.texteCourt(this.inscription.prenom, 'Le prénom')); }
  get errNom() { return this.erreur('lastName', () => Regles.texteCourt(this.inscription.nom, 'Le nom')); }
  get errEmailInscription() { return this.erreur('email', () => Regles.email(this.inscription.email)); }
  get errMotDePasseInscription() { return this.erreur('password', () => Regles.motDePasse(this.inscription.motDePasse)); }
  get errEntreprise() {
    return this.erreur('company', () => this.inscription.role === 'Recruiter'
      ? Regles.texteCourt(this.inscription.entreprise, 'Le nom de l’entreprise', { max: 200 })
      : null);
  }

  get errEmailOubli() { return this.erreur('email', () => Regles.email(this.emailOubli)); }
  get errNouveau() { return this.erreur('nouveauMotDePasse', () => Regles.motDePasse(this.nouveau)); }
  get errConfirmation() {
    if (!this.montrer('confirmation')) return null;
    if (!this.confirmation) return 'Répétez le mot de passe.';
    return this.nouveau === this.confirmation ? null : 'Les deux saisies diffèrent.';
  }

  /**
   * Vérifie la vue courante avant d'appeler le serveur.
   *
   * Rend vrai si tout est bon. Sinon marque tout comme vu — afin que
   * chaque erreur s'affiche d'un coup — et pose le curseur sur le premier
   * champ fautif : faire chercher lequel des huit champs bloque est le
   * meilleur moyen de faire abandonner un formulaire.
   */
  private valide(regles: Array<[string, string | null]>): boolean {
    this.serveur.set({});
    this.soumis.set(true);
    const premier = regles.find(([, err]) => err !== null);
    if (!premier) return true;
    setTimeout(() => this.panneau()?.nativeElement
      .querySelector<HTMLElement>(`[data-champ="${premier[0]}"]`)?.focus());
    return false;
  }

  /** Une saisie corrigée efface le reproche du serveur qui la visait. */
  effacer(champ: string) {
    const s = this.serveur();
    if (s[champ]) {
      const { [champ]: _, ...reste } = s;
      this.serveur.set(reste);
    }
  }

  /**
   * Solidité du mot de passe.
   *
   * La longueur prime : les classes de caractères obligatoires
   * produisent « Password1! » chez tout le monde. Même mesure que sur la
   * page Sécurité, pour que l'exigence annoncée soit la même partout.
   */
  private mesurer(m: string) {
    if (!m) return { rang: 0, texte: '' };
    const varietes = [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z0-9]/].filter((r) => r.test(m)).length;
    if (m.length < 8) return { rang: 1, texte: 'Trop court — huit caractères au minimum' };
    const points = Math.floor(m.length / 5) + (m.length >= 12 ? 1 : 0) + (varietes >= 3 ? 1 : 0);
    if (points <= 2) return { rang: 2, texte: 'Court. Un mot de passe long résiste mieux qu’un mot de passe compliqué.' };
    if (points === 3) return { rang: 3, texte: 'Convenable' };
    return { rang: 4, texte: 'Solide' };
  }

  /**
   * Accesseurs et non « computed » : ces deux mesures lisent une
   * propriété ordinaire, pas un signal. Un calcul mémoïsé sur une valeur
   * qui ne notifie rien s'évalue une fois et ne bouge plus — la jauge
   * restait vide quoi qu'on tape. Un accesseur, lui, est relu à chaque
   * rendu, et la frappe dans un champ lié en déclenche un.
   */
  get forceInscription() { return this.mesurer(this.inscription.motDePasse); }
  get forceNouveau() { return this.mesurer(this.nouveau); }

  get nouveauValide(): boolean {
    return this.nouveau.length >= 8 && this.nouveau === this.confirmation;
  }

  // ══════════════════════════════
  //  Connexion
  // ══════════════════════════════

  connecter() {
    if (!this.valide([
      ['email', Regles.email(this.identifiants.email)],
      ['password', Regles.requis(this.identifiants.motDePasse, 'Le mot de passe')],
    ])) return;

    this.occupe.set(true);
    this.bloque.set(null);

    this.auth.login({ email: this.identifiants.email.trim(), password: this.identifiants.motDePasse }).subscribe({
      next: (r) => this.apresAuthentification(r, 'Connexion réussie'),
      error: (e) => {
        this.occupe.set(false);
        this.serveur.set(erreursDuServeur(e));
        if (e.status === 423) {
          this.bloque.set(e.error?.message ?? 'Ce compte est temporairement bloqué.');
          return;
        }
        this.toastr.error(e.error?.message || 'Adresse ou mot de passe incorrect.');
      },
    });
  }

  /**
   * Le point de passage de toute identité établie — mot de passe,
   * Google, LinkedIn, second facteur.
   *
   * Une réponse qui réclame un code n'est pas une session : elle ouvre
   * le deuxième temps. Le bouton Google l'ignorait et naviguait vers
   * l'accueil, si bien qu'un compte protégé repartait « connecté » sans
   * l'être — un clic de plus et tout était à recommencer.
   */
  private apresAuthentification(r: AuthResponse, mot: string) {
    if (r.requiresTwoFactor && r.challengeToken) {
      this.occupe.set(false);
      this.defi.set(r.challengeToken);
      this.methode.set(r.twoFactorMethod ?? 'Totp');
      this.destinataire.set(r.twoFactorTarget ?? null);
      this.motSms.set(r.twoFactorMessage ?? null);
      // Un tour de boucle, pas une micro-tâche : celle-ci s'exécute avant
      // qu'Angular ait remplacé le formulaire par le champ du code, et
      // visait donc un élément qui n'existait pas encore.
      setTimeout(() => this.panneau()?.nativeElement
        .querySelector<HTMLElement>('#auth-code')?.focus());
      return;
    }

    this.occupe.set(false);

    // Entré par Google ou LinkedIn depuis « Créer un compte » : l'étape 1
    // est franchie sans avoir été affichée — le fournisseur a donné le
    // nom, et l'adresse est déjà vérifiée. Le parcours reprend donc à
    // l'étape 2 plutôt que de se refermer sur un profil vide.
    if (this.modale.vue() === 'inscription' && this.enEtapes && this.etape() === 1) {
      this.toastr.success(mot);
      this.allerEtape(2);
      return;
    }

    this.toastr.success(mot);
    const suite = this.modale.contexte().redirect;
    this.modale.fermer();
    if (suite) this.router.navigateByUrl(suite);
  }

  /** Ce que le bouton Google remonte, traité comme le reste. */
  entrerParGoogle(r: AuthResponse) {
    this.apresAuthentification(r, 'Connecté avec Google');
  }

  private echangerLinkedIn(code: string, etat?: string) {
    // Le « state » se vérifie d'abord. Sans lui, un tiers pourrait
    // provoquer une connexion sous son propre compte LinkedIn en faisant
    // ouvrir un lien préparé — et l'on se croirait chez soi.
    const attendu = sessionStorage.getItem(LinkedinSignInButton.CLE_ETAT);
    sessionStorage.removeItem(LinkedinSignInButton.CLE_ETAT);
    if (!attendu || !etat || attendu !== etat) {
      this.toastr.error('Cette demande de connexion LinkedIn ne vient pas de cet appareil.');
      return;
    }

    this.occupe.set(true);
    this.auth.linkedInSignIn(code, LinkedinSignInButton.redirectUri()).subscribe({
      next: (r) => this.apresAuthentification(r, 'Connecté avec LinkedIn'),
      error: (e) => {
        this.occupe.set(false);
        this.toastr.error(e.error?.message || 'La connexion LinkedIn a échoué.');
      },
    });
  }

  // ══════════════════════════════
  //  Second facteur
  // ══════════════════════════════

  verifier() {
    const jeton = this.defi();
    if (!jeton) return;
    if (!this.valide([['code', Regles.code(this.code)]])) return;

    this.occupe.set(true);
    this.auth.verifier2fa(jeton, this.code).subscribe({
      next: (r) => this.apresAuthentification(r, 'Connexion réussie'),
      error: (e) => {
        this.occupe.set(false);
        this.code = '';
        this.serveur.set(erreursDuServeur(e));
        // Un défi expiré ne se rattrape pas : on revient au mot de passe
        // plutôt que de laisser saisir des codes tous refusés d'avance.
        if (e.status === 401 && (e.error?.message ?? '').includes('expir')) this.defi.set(null);
        this.toastr.error(e.error?.message || 'Code refusé.');
      },
    });
  }

  renvoyer() {
    const jeton = this.defi();
    if (!jeton || this.renvoiEnCours()) return;
    this.renvoiEnCours.set(true);
    this.auth.renvoyerCode(jeton).subscribe({
      next: (r) => {
        this.renvoiEnCours.set(false);
        this.motSms.set(r.message);
        this.toastr.success(r.message);
      },
      error: (e) => {
        this.renvoiEnCours.set(false);
        this.motSms.set(e.error?.message ?? null);
        this.toastr.error(e.error?.message ?? 'Le renvoi a échoué.');
      },
    });
  }

  quitterDefi() {
    this.defi.set(null);
    this.code = '';
    this.identifiants.motDePasse = '';
    this.motSms.set(null);
    this.destinataire.set(null);
  }

  // ══════════════════════════════
  //  Inscription
  // ══════════════════════════════

  choisirRole(role: string) { this.inscription.role = role; }

  creer() {
    if (!this.platform.allowRegistration) {
      this.toastr.error('Les inscriptions sont actuellement fermées.');
      return;
    }
    const f = this.inscription;
    if (!this.valide([
      ['firstName', Regles.texteCourt(f.prenom, 'Le prénom')],
      ['lastName', Regles.texteCourt(f.nom, 'Le nom')],
      ['company', f.role === 'Recruiter'
        ? Regles.texteCourt(f.entreprise, 'Le nom de l’entreprise', { max: 200 }) : null],
      ['email', Regles.email(f.email)],
      ['password', Regles.motDePasse(f.motDePasse)],
    ])) return;

    this.occupe.set(true);
    this.auth.register({
      firstName: f.prenom.trim(), lastName: f.nom.trim(), email: f.email.trim(),
      password: f.motDePasse, role: f.role, company: f.entreprise.trim(),
      siteWeb: this.siteWeb, msSaisie: this.msSaisie,
    }).subscribe({
      next: () => {
        // Le compte existe désormais : ce qui suit enrichit, et un
        // abandon ne perd plus rien.
        this.occupe.set(false);
        this.toastr.success(this.estRecruteur
          ? 'Votre compte est créé. Vous pouvez déjà publier — encore deux questions sur l’entreprise.'
          : 'Votre compte est créé. Encore deux questions, si vous voulez.');
        this.allerEtape(2);
      },
      error: (e) => {
        this.occupe.set(false);
        this.serveur.set(erreursDuServeur(e));
        this.toastr.error(e.error?.message || 'La création du compte a échoué.');
      },
    });
  }

  // ══════════════════════════════
  //  Les étapes qui suivent le compte
  // ══════════════════════════════

  /**
   * Change d'étape et remet le clavier au bon endroit.
   *
   * Le curseur se pose sur le premier champ de l'étape atteinte : sans
   * cela il resterait sur un bouton qui vient de disparaître, et la
   * frappe suivante n'écrirait nulle part.
   */
  private allerEtape(n: number) {
    this.etape.set(n);
    this.touche = {};
    this.soumis.set(false);
    this.serveur.set({});

    // La case de visibilité montre ce que le compte vaut réellement, et
    // non ce qu'on aimerait lui faire dire.
    if (n === 3 && !this.estRecruteur)
      this.visibleRecruteurs = this.auth.currentUser()?.isSearchable ?? true;

    if (n === 2 && this.estRecruteur) this.lireFicheEntreprise();
    setTimeout(() => {
      const p = this.panneau()?.nativeElement;
      p?.querySelector<HTMLElement>('input:not([type=hidden]):not([disabled]):not([tabindex="-1"])')?.focus();
    });
  }

  /** Revenir en arrière ne doit rien effacer de ce qui a été saisi. */
  precedent() {
    if (this.etape() > 2) this.allerEtape(this.etape() - 1);
  }

  /**
   * Passer une étape facultative.
   *
   * Le bouton existe et se voit : une étape qu'on ne peut pas passer
   * n'est pas facultative, quoi qu'en dise le titre.
   */
  passer() {
    this.allerEtape(this.parcoursCourt && this.etape() === 2 ? 4 : this.etape() + 1);
  }

  /** Étape 2 — le métier, la ville, l'expérience. */
  enregistrerRecherche() {
    const r = this.recherche;
    if (!this.valide([
      ['title', Regles.texteCourt(r.metier, 'Le métier recherché', { max: 150, obligatoire: false })],
      ['city', Regles.texteCourt(r.ville, 'La ville', { obligatoire: false })],
    ])) return;

    // Tout vide : inutile d'appeler le serveur pour ne rien changer.
    const annees = r.experience === '' ? null : Number(r.experience);
    if (!r.metier.trim() && !r.ville.trim() && annees === null) { this.passer(); return; }

    if (annees !== null && (Number.isNaN(annees) || annees < 0 || annees > 70)) {
      this.serveur.set({ experienceYears: 'Indiquez un nombre d’années entre 0 et 70.' });
      return;
    }

    this.occupe.set(true);
    this.auth.updateProfile({
      title: r.metier.trim() || undefined,
      city: r.ville.trim() || undefined,
      experienceYears: annees,
    }).subscribe({
      next: () => { this.occupe.set(false); this.passer(); },
      error: (e) => this.echecEtapeFacultative(e),
    });
  }

  // ══════════════════════════════
  //  Les étapes du recruteur
  // ══════════════════════════════

  /**
   * Lire la fiche avant de la montrer.
   *
   * « PUT /companies/{nom}/profile » écrase tous les champs, null
   * compris. Sans cette lecture, le deuxième recruteur d'une même
   * société effacerait ce que le premier avait décrit, simplement en
   * passant l'étape à moitié remplie. On préremplit donc, et on le dit.
   */
  private lireFicheEntreprise() {
    const nom = this.inscription.entreprise.trim();
    if (!nom) return;

    this.entreprises.getProfile(nom).subscribe({
      next: (f) => {
        const decrite = !!(f?.industry || f?.size || f?.headquarters || f?.website || f?.about);
        this.dejaDecrite.set(decrite);
        if (!decrite) return;
        this.societe.secteur = f.industry ?? '';
        this.societe.taille = f.size ?? '';
        this.societe.ville = f.headquarters ?? '';
        this.societe.site = f.website ?? '';
        this.societe.presentation = f.about ?? '';
      },
      // Pas de fiche, ou serveur muet : on part de champs vierges. Ce
      // n'est pas une erreur à montrer, c'est le cas ordinaire.
      error: () => this.dejaDecrite.set(false),
    });
  }

  /** Étape 2 du recruteur — secteur, taille, ville, site. */
  enregistrerEntreprise() {
    const s = this.societe;
    if (!this.valide([
      ['industry', Regles.texteCourt(s.secteur, 'Le secteur', { max: 200, obligatoire: false })],
      ['headquarters', Regles.texteCourt(s.ville, 'La ville', { max: 200, obligatoire: false })],
      ['website', Regles.lien(s.site)],
    ])) return;

    const nom = this.inscription.entreprise.trim();
    if (!nom) {
      this.serveur.set({ company: 'Indiquez le nom de votre entreprise.' });
      return;
    }
    if (!s.secteur.trim() && !s.taille && !s.ville.trim() && !s.site.trim()) { this.passer(); return; }

    this.occupe.set(true);

    // Le nom doit d'abord vivre sur le compte : le serveur n'autorise
    // l'écriture d'une fiche qu'à un recruteur qui déclare cette
    // entreprise. Entré par SSO, il n'en avait aucune — il vient de la
    // saisir ici, et sans cet enregistrement la fiche lui serait refusée.
    const declarer = this.auth.currentUser()?.company?.trim().toLowerCase() === nom.toLowerCase()
      ? Promise.resolve()
      : new Promise<void>((resolve, reject) =>
          this.auth.updateProfile({ company: nom }).subscribe({ next: () => resolve(), error: reject }));

    declarer.then(() => this.ecrireFiche()).catch((e) => this.echecEtapeFacultative(e));
  }

  /** L'écriture proprement dite, une fois l'entreprise déclarée. */
  private ecrireFiche() {
    const s = this.societe;
    // La présentation est renvoyée telle quelle : l'omettre l'effacerait.
    this.entreprises.saveProfile(this.inscription.entreprise.trim(), {
      industry: s.secteur.trim() || undefined,
      size: s.taille || undefined,
      headquarters: s.ville.trim() || undefined,
      website: s.site.trim() || undefined,
      about: s.presentation.trim() || undefined,
    }).subscribe({
      next: () => { this.occupe.set(false); this.passer(); },
      error: (e) => this.echecEtapeFacultative(e),
    });
  }

  /** Étape 3 du recruteur — la présentation, et sa fonction. */
  enregistrerPresentation() {
    const s = this.societe;
    if (!this.valide([
      ['title', Regles.texteCourt(s.fonction, 'Votre fonction', { max: 150, obligatoire: false })],
    ])) return;

    if (!s.presentation.trim() && !s.fonction.trim()) { this.allerEtape(4); return; }

    this.occupe.set(true);
    // Les autres champs de la fiche repartent avec, pour la même raison :
    // ce qu'on n'envoie pas est effacé.
    this.entreprises.saveProfile(this.inscription.entreprise.trim(), {
      industry: s.secteur.trim() || undefined,
      size: s.taille || undefined,
      headquarters: s.ville.trim() || undefined,
      website: s.site.trim() || undefined,
      about: s.presentation.trim() || undefined,
    }).subscribe({
      next: () => {
        if (!s.fonction.trim()) { this.occupe.set(false); this.allerEtape(4); return; }
        this.auth.updateProfile({ title: s.fonction.trim() }).subscribe({
          next: () => { this.occupe.set(false); this.allerEtape(4); },
          error: (e) => this.echecEtapeFacultative(e),
        });
      },
      error: (e) => this.echecEtapeFacultative(e),
    });
  }

  get errSecteur() { return this.erreur('industry', () => Regles.texteCourt(this.societe.secteur, 'Le secteur', { max: 200, obligatoire: false })); }
  get errVilleSiege() { return this.erreur('headquarters', () => Regles.texteCourt(this.societe.ville, 'La ville', { max: 200, obligatoire: false })); }
  get errSite() { return this.erreur('website', () => Regles.lien(this.societe.site)); }
  get errFonction() { return this.erreur('title', () => Regles.texteCourt(this.societe.fonction, 'Votre fonction', { max: 150, obligatoire: false })); }

  /** Étape 3 — visibilité auprès des recruteurs, et centres d'intérêt. */
  enregistrerPreferences() {
    this.occupe.set(true);

    const abonnement = this.lettreConsentie
      ? this.lettre.abonner({
          email: this.inscription.email.trim() || this.auth.currentUser()?.email || '',
          prenom: this.inscription.prenom.trim() || undefined,
          ville: this.recherche.ville.trim() || undefined,
          categories: this.choisies().join(',') || undefined,
          source: 'Inscription',
        })
      : null;

    this.auth.updateProfile({ isSearchable: this.visibleRecruteurs }).subscribe({
      next: () => {
        if (!abonnement) { this.occupe.set(false); this.allerEtape(4); return; }
        abonnement.subscribe({
          next: () => { this.occupe.set(false); this.allerEtape(4); },
          // L'abonnement n'est pas le sujet de l'inscription : s'il
          // échoue, on le dit et l'on avance. La page « Lettre
          // d'information » reste là pour réessayer.
          error: (e) => {
            this.occupe.set(false);
            this.toastr.warning(e?.error?.message ?? 'L’abonnement à la lettre n’a pas abouti.');
            this.allerEtape(4);
          },
        });
      },
      error: (e) => this.echecEtapeFacultative(e),
    });
  }

  /**
   * Un échec sur une étape facultative ne doit enfermer personne.
   *
   * Le compte est déjà créé : le pire qui puisse arriver est de ne pas
   * enregistrer une préférence. On le dit, et « Passer » reste offert.
   */
  private echecEtapeFacultative(e: unknown) {
    this.occupe.set(false);
    const err = e as { error?: { message?: string } };
    this.serveur.set(erreursDuServeur(e));
    this.toastr.error(err?.error?.message ?? 'Cet enregistrement n’a pas abouti. Vous pourrez le reprendre depuis votre profil.');
  }

  /** L'écran de sortie : on referme là où l'on est entré. */
  terminer(destination?: string) {
    const suite = destination ?? this.modale.contexte().redirect;
    this.modale.fermer();
    if (suite) this.router.navigateByUrl(suite);
  }

  // ══════════════════════════════
  //  Récupération
  // ══════════════════════════════

  demanderLien() {
    if (!this.valide([['email', Regles.email(this.emailOubli)]])) return;

    this.occupe.set(true);
    this.auth.motDePasseOublie(this.emailOubli.trim(),
                               { siteWeb: this.siteWeb, msSaisie: this.msSaisie }).subscribe({
      next: (r) => { this.occupe.set(false); this.fait.set(true); this.message.set(r.message); },
      error: (e) => {
        this.occupe.set(false);
        this.serveur.set(erreursDuServeur(e));
        this.toastr.error(e.error?.message || 'La demande n’a pas abouti. Réessayez dans un instant.');
      },
    });
  }

  reinitialiserMotDePasse() {
    if (!this.valide([
      ['nouveauMotDePasse', Regles.motDePasse(this.nouveau)],
      ['confirmation', this.nouveau === this.confirmation ? null : 'Les deux saisies diffèrent.'],
    ])) return;

    const c = this.modale.contexte();
    this.occupe.set(true);
    this.auth.reinitialiserMotDePasse(c.id!, c.jeton!, this.nouveau).subscribe({
      next: (r) => {
        this.occupe.set(false);
        this.fait.set(true);
        this.message.set(r.message);
        // Tous les appareils viennent d'être déconnectés : se reconnecter
        // est la suite naturelle, on ne fait pas chercher le chemin.
        setTimeout(() => { if (this.modale.ouverte()) this.modale.basculer('connexion'); }, 2200);
      },
      error: (e) => this.echouer(e.error?.message ?? 'Ce lien n’est plus valable.'),
    });
  }

  private confirmerAdresse() {
    const c = this.modale.contexte();
    this.occupe.set(true);
    this.auth.confirmerEmail(c.id!, c.jeton!).subscribe({
      next: (r) => {
        this.occupe.set(false);
        this.fait.set(true);
        this.message.set(r.message);
        this.auth.majUtilisateur({ emailConfirmed: true });
      },
      error: (e) => this.echouer(e.error?.message ?? 'Ce lien n’est plus valable.'),
    });
  }

  private echouer(texte: string) {
    this.occupe.set(false);
    this.echec.set(true);
    this.fait.set(true);
    this.message.set(texte);
  }

  // ── Navigation interne ──
  allerA(vue: VueAuth) { this.modale.basculer(vue); }
}
