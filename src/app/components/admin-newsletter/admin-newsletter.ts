import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';
import {
  NewsletterService, Abonne, Campagne, EtatNewsletter, BrouillonCampagne,
  BlocLettre, OffreBreve, Incarnation,
} from '../../services/newsletter.service';
import { Modale } from '../../utils/modale.directive';

/**
 * La lettre d'information, côté console.
 *
 * Trois sections plutôt qu'une : ce qu'on sait de l'expédition, à qui l'on
 * écrit, et ce qu'on écrit. Elles répondent à des questions différentes et
 * ne se consultent pas au même moment.
 *
 * Le point qui a décidé de la mise en forme : une campagne partie ne se
 * rattrape pas. Tout ce qui précède l'envoi — le décompte des
 * destinataires, l'aperçu sur un abonné réel, l'essai à soi-même, les
 * champs de fusion vides — existe pour qu'on découvre les erreurs avant,
 * et non dans le rapport d'échec.
 */
type Onglet = 'campagnes' | 'abonnes' | 'redaction';

const ROLES = [
  { cle: 'Candidate', libelle: 'Candidats' },
  { cle: 'Recruiter', libelle: 'Recruteurs' },
  { cle: 'Guest', libelle: 'Abonnés sans compte' },
];

const ACTIVITES = [
  { cle: '', libelle: 'Tous', aide: 'Sans condition d’ancienneté' },
  { cle: 'Recents', libelle: 'Inscrits récents', aide: 'Abonnés depuis moins de 30 jours' },
  { cle: 'Dormants', libelle: 'Comptes dormants', aide: 'Sans connexion depuis 90 jours' },
];

const CATEGORIES = [
  'Tech', 'Santé', 'Commerce', 'Bâtiment', 'Industrie', 'Transport',
  'Hôtellerie-restauration', 'Éducation', 'Finance', 'Design',
];

/**
 * Les blocs qu'on peut ajouter, et ce qu'ils valent.
 *
 * L'ordre est celui dans lequel on s'en sert : on écrit un texte bien plus
 * souvent qu'on ne pose une image.
 */
const TYPES_DE_BLOC: { type: BlocLettre['type']; libelle: string; icone: string; aide: string }[] = [
  { type: 'texte', libelle: 'Texte', icone: 'bi-text-paragraph', aide: 'Un ou plusieurs paragraphes. Une ligne vide sépare deux paragraphes.' },
  { type: 'offres', libelle: 'Offres', icone: 'bi-briefcase', aide: 'Des offres du catalogue, choisies ou calculées pour chaque abonné.' },
  { type: 'titre', libelle: 'Titre', icone: 'bi-type-h2', aide: 'Un intertitre, pour découper une lettre longue.' },
  { type: 'bouton', libelle: 'Bouton', icone: 'bi-hand-index', aide: 'Un appel à l’action bien visible.' },
  { type: 'image', libelle: 'Image', icone: 'bi-image', aide: 'Une image hébergée ailleurs, par son adresse.' },
  { type: 'separateur', libelle: 'Séparateur', icone: 'bi-hr', aide: 'Un filet horizontal.' },
];

const SOURCES_OFFRES: { cle: 'abonne' | 'recherche' | 'choisies'; libelle: string; aide: string }[] = [
  {
    cle: 'abonne', libelle: 'Pour chaque abonné',
    aide: 'Chaque destinataire reçoit les offres qui lui correspondent, calculées à l’envoi depuis sa ville et ses centres d’intérêt. Deux personnes ne reçoivent pas la même lettre.',
  },
  {
    cle: 'recherche', libelle: 'Une recherche',
    aide: 'La sélection est décrite, pas figée : une lettre préparée lundi et partie vendredi contient les offres de vendredi.',
  },
  {
    cle: 'choisies', libelle: 'Choisies à la main',
    aide: 'Vous piochez les offres une par une. Pour une lettre éditoriale, où le choix est un acte de rédaction.',
  },
];

const REPLIS: { cle: 'region' | 'recentes' | 'masquer'; libelle: string; aide: string }[] = [
  { cle: 'region', libelle: 'Offres de sa région', aide: 'Les offres récentes du département de l’abonné.' },
  { cle: 'recentes', libelle: 'Offres récentes', aide: 'Les dernières offres publiées, sans condition de lieu.' },
  { cle: 'masquer', libelle: 'Masquer le bloc', aide: 'Le bloc disparaît, intertitre compris.' },
];

const STATUTS: Record<string, { libelle: string; classe: string }> = {
  Confirmed: { libelle: 'Confirmé', classe: 'badge-green' },
  Pending: { libelle: 'En attente', classe: 'badge-yellow' },
  Unsubscribed: { libelle: 'Désabonné', classe: '' },
  Bounced: { libelle: 'Injoignable', classe: 'badge-red' },
};

@Component({
  selector: 'app-admin-newsletter',
  imports: [FormsModule, DatePipe, Modale],
  templateUrl: './admin-newsletter.html',
  styleUrl: './admin-newsletter.scss',
})
export class AdminNewsletter implements OnInit, OnDestroy {
  private api = inject(NewsletterService);
  private toastr = inject(ToastrService);
  private sanitizer = inject(DomSanitizer);

  readonly roles = ROLES;
  readonly activites = ACTIVITES;
  readonly categories = CATEGORIES;
  readonly typesDeBloc = TYPES_DE_BLOC;
  readonly sourcesOffres = SOURCES_OFFRES;
  readonly replis = REPLIS;

  onglet = signal<Onglet>('campagnes');
  chargement = signal(true);
  occupe = signal(false);

  etat = signal<EtatNewsletter | null>(null);
  campagnes = signal<Campagne[]>([]);
  abonnes = signal<Abonne[]>([]);
  facettes = signal<any>(null);
  totalAbonnes = signal(0);

  // ── Filtres de la liste d'abonnés ──
  recherche = '';
  filtreStatut = '';

  // ── Rédaction ──
  brouillonId = signal<number | null>(null);
  sujet = '';
  apercuTexte = '';
  corps = '';
  rolesChoisis = signal<string[]>([]);
  catsChoisies = signal<string[]>([]);
  villes = '';
  departements = '';
  activite = '';

  destinataires = signal<number | null>(null);
  messageCiblage = signal('');
  apercuHtml = signal<string | null>(null);

  // ══════════════════════════════
  //  La lettre en blocs
  // ══════════════════════════════

  blocs = signal<BlocLettre[]>([]);

  /** L'indice du bloc dont on règle les détails, ou null. */
  blocActif = signal<number | null>(null);

  blocCourant = computed(() => {
    const i = this.blocActif();
    return i === null ? null : this.blocs()[i] ?? null;
  });

  /**
   * Le mode HTML brut, pour les campagnes écrites avant l'éditeur.
   *
   * On ne convertit pas leur HTML en blocs : le découper à la machine
   * abîmerait une mise en page que quelqu'un a réglée à la main. Elles
   * restent modifiables comme avant, et on peut basculer — en le disant.
   */
  modeHtml = signal(false);

  /** Le rendu réel, rafraîchi pendant qu'on écrit. */
  apercuDirect = signal<string | null>(null);
  apercuEnCours = signal(false);

  /**
   * Dans la peau de qui l'aperçu se rend.
   *
   * Un bloc « pour chaque abonné » ne montre rien sur un destinataire
   * fictif : c'est la ville et les centres d'intérêt de quelqu'un de réel
   * qui font la sélection. En changer est le seul moyen de vérifier
   * qu'une lettre personnalisée tient debout pour plusieurs personnes.
   */
  incarnations = signal<Incarnation[]>([]);
  incarnation = signal<Incarnation | null>(null);

  metiers = signal<string[]>([]);

  // ── Le sélecteur d'offres ──
  selecteurOuvert = signal(false);
  selecteurRecherche = '';
  selecteurResultats = signal<OffreBreve[]>([]);
  selecteurEnCours = signal(false);

  /** Les offres déjà choisies, relues pour qu'on voie autre chose que des numéros. */
  offresChoisies = signal<OffreBreve[]>([]);

  private differeApercu?: ReturnType<typeof setTimeout>;

  /**
   * Le message tel qu'il partira, sans desinfection.
   *
   * Angular nettoie « srcdoc » comme n'importe quel HTML injecte : il en
   * retirait le tableau de mise en page, les styles et l'en-tete sombre.
   * L'apercu montrait alors du texte brut — c'est-a-dire tout sauf ce
   * qu'une messagerie affichera, ce qui lui otait sa raison d'etre.
   *
   * Le contournement est sur ici, a deux conditions reunies : le contenu
   * vient de l'administrateur qui le redige — il pourrait aussi bien
   * l'ecrire directement dans le courriel —, et le cadre porte un
   * « sandbox » vide qui interdit scripts, formulaires et acces a la page
   * qui l'englobe.
   */
  apercuSur = computed<SafeHtml | null>(() => {
    const h = this.apercuHtml();
    return h ? this.sanitizer.bypassSecurityTrustHtml(h) : null;
  });
  apercuRendu = signal('');
  lacunes = signal<{ champ: string; manquant: number; total: number }[]>([]);

  /** Le rafraîchissement des campagnes en cours d'envoi. */
  private minuteur?: ReturnType<typeof setInterval>;
  private differeCiblage?: ReturnType<typeof setTimeout>;

  /**
   * Le nom d'un champ de fusion, accolades comprises.
   *
   * Il se compose ici et non dans le gabarit : Angular decode les entites
   * HTML avant d'analyser le modele, si bien que « &#123;&#123; » y
   * redevient une ouverture d'interpolation et casse la compilation.
   */
  champ = (cle: string) => `{{${cle}}}`;

  statutLibelle = (s: string) => STATUTS[s]?.libelle ?? s;
  statutClasse = (s: string) => STATUTS[s]?.classe ?? '';

  /**
   * Neutralise ce qui vient d'ailleurs avant de le coudre dans du HTML.
   *
   * Les gabarits Angular echappent tout seuls ; les boites de dialogue,
   * non — leur contenu est pose tel quel dans le document. Or ce qu'on y
   * affiche vient d'un formulaire public : l'adresse qu'un inconnu a
   * saisie pour s'abonner. Une adresse portant « <img onerror=…> »
   * s'executerait donc dans la console d'administration, avec la session
   * de l'administrateur — le pire endroit ou cela puisse arriver.
   *
   * Le serveur refuse desormais ces adresses, mais un filtre d'entree se
   * contourne toujours un jour : ce qui protege ici, c'est d'echapper a
   * la sortie, au moment precis ou le texte devient du balisage.
   */
  private static echapper(v: unknown): string {
    return String(v ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /** Un envoi en cours mérite qu'on rafraîchisse : sinon on croit qu'il est figé. */
  envoiEnCours = computed(() => this.campagnes().some((c) => c.status === 'Sending'));

  ngOnInit() {
    this.charger();
    // Toutes les cinq secondes tant qu'une campagne part, jamais sinon :
    // une console qui interroge le serveur en boucle pour rien est une
    // console qui chauffe le serveur pour rien.
    this.minuteur = setInterval(() => {
      if (this.envoiEnCours()) this.chargerCampagnes();
    }, 5000);
  }

  ngOnDestroy() {
    if (this.minuteur) clearInterval(this.minuteur);
    if (this.differeCiblage) clearTimeout(this.differeCiblage);
    if (this.differeApercu) clearTimeout(this.differeApercu);
  }

  /**
   * L'aperçu du rail, tel qu'il partira, sans désinfection.
   *
   * Même raison que la modale : Angular nettoie « srcdoc » et en retirerait
   * le tableau de mise en page, les styles et l'en-tête sombre — l'aperçu
   * montrerait alors du texte brut, c'est-à-dire tout sauf ce qu'une
   * messagerie affichera. Le cadre porte un « sandbox » vide.
   */
  apercuDirectSur = computed<SafeHtml | null>(() => {
    const h = this.apercuDirect();
    return h ? this.sanitizer.bypassSecurityTrustHtml(h) : null;
  });

  private charger() {
    this.chargement.set(true);
    this.api.etat().subscribe({
      next: (e) => this.etat.set(e),
      error: () => this.etat.set(null),
    });
    this.chargerCampagnes();
    this.chargerAbonnes();
  }

  private chargerCampagnes() {
    this.api.campagnes().subscribe({
      next: (c) => { this.campagnes.set(c); this.chargement.set(false); },
      error: () => this.chargement.set(false),
    });
  }

  chargerAbonnes() {
    const p: Record<string, string> = { pageSize: '100' };
    if (this.recherche.trim()) p['q'] = this.recherche.trim();
    if (this.filtreStatut) p['statut'] = this.filtreStatut;

    this.api.abonnes(p).subscribe({
      next: (r) => {
        this.abonnes.set(r.items);
        this.facettes.set(r.facettes);
        this.totalAbonnes.set(r.total);
      },
      error: () => this.toastr.error('La liste des abonnés n’a pas pu être chargée.'),
    });
  }

  // ══════════════════════════════
  //  Abonnés
  // ══════════════════════════════

  filtrer(statut: string) {
    this.filtreStatut = this.filtreStatut === statut ? '' : statut;
    this.chargerAbonnes();
  }

  exporter() {
    this.api.exporter().subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `abonnes-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.toastr.error('L’export a échoué.'),
    });
  }

  async retirer(a: Abonne) {
    const r = await Swal.fire({
      title: 'Retirer cette adresse ?',
      html: `<p style="font-size:.92rem;line-height:1.6">
               <b>${AdminNewsletter.echapper(a.email)}</b> ne recevra plus la lettre d'information.
               Son compte et ses candidatures ne sont pas affectés.
             </p>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#c6364b',
      cancelButtonColor: '#577177',
      confirmButtonText: 'Retirer',
      cancelButtonText: 'Annuler',
    });
    if (!r.isConfirmed) return;

    this.api.desabonnerDepuisLaConsole(a.id).subscribe({
      next: (x) => { this.toastr.success(x.message); this.chargerAbonnes(); },
      error: () => this.toastr.error('Le retrait a échoué.'),
    });
  }

  // ══════════════════════════════
  //  Rédaction
  // ══════════════════════════════

  nouvelle() {
    this.brouillonId.set(null);
    this.sujet = '';
    this.apercuTexte = '';
    this.corps = '';
    this.rolesChoisis.set([]);
    this.catsChoisies.set([]);
    this.villes = '';
    this.departements = '';
    this.activite = '';
    this.destinataires.set(null);
    this.apercuHtml.set(null);
    this.lacunes.set([]);

    // Une lettre neuve commence par un texte et un bloc d'offres : c'est
    // ce que fait une lettre de site d'emploi, et l'écran vaut mieux
    // qu'une page blanche à remplir de zéro.
    this.modeHtml.set(false);
    this.blocs.set([
      { type: 'texte', texte: 'Bonjour {{prenom}},\n\nVoici ce qui recrute près de chez vous ce mois-ci.', alignement: 'gauche' },
      { type: 'offres', offres: { source: 'abonne', nombre: 4, repli: 'region', titre: 'Les offres près de chez vous' } },
    ]);
    this.blocActif.set(0);
    this.apercuDirect.set(null);
    this.incarnation.set(null);
    this.offresChoisies.set([]);

    this.onglet.set('redaction');
    this.compter();
    this.chargerMetiers();
    this.majApercu();
  }

  private chargerMetiers() {
    if (this.metiers().length) return;
    this.api.metiers().subscribe({ next: (m) => this.metiers.set(m), error: () => {} });
  }

  ouvrir(c: Campagne) {
    if (c.status !== 'Draft') { this.voirResultats(c); return; }
    this.api.campagne(c.id).subscribe({
      next: (x) => {
        this.brouillonId.set(x.id);
        this.sujet = x.subject;
        this.apercuTexte = x.previewText ?? '';
        this.corps = x.bodyHtml ?? '';
        this.rolesChoisis.set(this.decouper(x.segmentRoles));
        this.catsChoisies.set(this.decouper(x.segmentCategories));
        this.villes = x.segmentCities ?? '';
        this.departements = x.segmentDepartments ?? '';
        this.activite = x.segmentActivity ?? '';
        this.apercuHtml.set(null);

        // Une campagne écrite avant l'éditeur n'a pas de blocs : elle
        // s'ouvre comme avant, dans son HTML, et rien n'est converti
        // derrière son dos.
        let blocs: BlocLettre[] = [];
        try { blocs = x.blocs ? JSON.parse(x.blocs) : []; } catch { blocs = []; }

        this.blocs.set(blocs);
        this.modeHtml.set(blocs.length === 0 && !!x.bodyHtml?.trim());
        this.blocActif.set(blocs.length ? 0 : null);
        this.apercuDirect.set(null);
        this.incarnation.set(null);
        this.offresChoisies.set([]);

        const premier = blocs[0]?.offres;
        if (premier?.source === 'choisies' && premier.ids?.length) {
          this.relireOffresChoisies(premier.ids);
        }

        this.onglet.set('redaction');
        this.compter();
        this.chargerMetiers();
        this.majApercu();
      },
      error: () => this.toastr.error('Cette campagne n’a pas pu être ouverte.'),
    });
  }

  private decouper = (v?: string) =>
    (v ?? '').split(',').map((x) => x.trim()).filter(Boolean);

  // ══════════════════════════════
  //  Les blocs
  // ══════════════════════════════

  /** Ce qu'on affiche dans la pile, pour reconnaître un bloc sans l'ouvrir. */
  resumeBloc(b: BlocLettre): string {
    switch (b.type) {
      case 'separateur':
        return 'filet';
      case 'image':
        return b.alt?.trim() || b.url?.trim() || 'sans image';
      case 'offres': {
        const o = b.offres;
        if (!o) return 'à régler';
        const source = SOURCES_OFFRES.find((s) => s.cle === o.source)?.libelle ?? o.source;
        return o.source === 'choisies'
          ? `${o.ids?.length ?? 0} offre${(o.ids?.length ?? 0) > 1 ? 's' : ''} choisie${(o.ids?.length ?? 0) > 1 ? 's' : ''}`
          : `${source} · ${o.nombre} max`;
      }
      default: {
        const t = (b.texte ?? '').trim().replace(/\s+/g, ' ');
        if (!t) return 'vide';
        return t.length > 46 ? t.slice(0, 46) + '…' : t;
      }
    }
  }

  iconeBloc = (t: BlocLettre['type']) =>
    TYPES_DE_BLOC.find((x) => x.type === t)?.icone ?? 'bi-square';

  libelleBloc = (t: BlocLettre['type']) =>
    TYPES_DE_BLOC.find((x) => x.type === t)?.libelle ?? t;

  ajouterBloc(type: BlocLettre['type']) {
    const neuf: BlocLettre =
      type === 'offres'
        ? {
            type,
            offres: {
              // Le mode qui rend la lettre utile est celui par défaut : sans
              // cela, personne ne le découvrirait.
              source: 'abonne',
              nombre: 4,
              repli: 'region',
              titre: 'Les offres près de chez vous',
            },
          }
        : { type, texte: '', alignement: 'gauche' };

    this.blocs.update((l) => [...l, neuf]);
    this.blocActif.set(this.blocs().length - 1);
    this.offresChoisies.set([]);
    this.majApercu();
  }

  choisirBloc(i: number) {
    this.blocActif.set(this.blocActif() === i ? null : i);
    const o = this.blocs()[i]?.offres;
    if (o?.source === 'choisies' && o.ids?.length) this.relireOffresChoisies(o.ids);
    else this.offresChoisies.set([]);
  }

  /**
   * Déplacer un bloc.
   *
   * Par boutons et non par glisser-déposer : un ordre qui ne se change
   * qu'à la souris est un ordre qu'on ne peut pas changer au clavier, et
   * la console d'administration se tient au même niveau que le reste du
   * site.
   */
  deplacerBloc(i: number, pas: -1 | 1) {
    const cible = i + pas;
    if (cible < 0 || cible >= this.blocs().length) return;

    this.blocs.update((l) => {
      const copie = [...l];
      [copie[i], copie[cible]] = [copie[cible], copie[i]];
      return copie;
    });

    if (this.blocActif() === i) this.blocActif.set(cible);
    else if (this.blocActif() === cible) this.blocActif.set(i);
    this.majApercu();
  }

  supprimerBloc(i: number) {
    this.blocs.update((l) => l.filter((_, k) => k !== i));
    const actif = this.blocActif();
    if (actif === i) this.blocActif.set(null);
    else if (actif !== null && actif > i) this.blocActif.set(actif - 1);
    this.majApercu();
  }

  /** Le bloc courant a changé : on redessine, sans harceler le serveur. */
  majApercu() {
    if (this.differeApercu) clearTimeout(this.differeApercu);
    this.differeApercu = setTimeout(() => this.rafraichirApercu(), 700);
  }

  private rafraichirApercu() {
    if (!this.blocs().length && !this.corps.trim()) {
      this.apercuDirect.set(null);
      return;
    }

    this.apercuEnCours.set(true);
    this.api.apercu(this.brouillon, this.incarnation()?.id).subscribe({
      next: (r) => {
        this.apercuEnCours.set(false);
        this.apercuDirect.set(r.html);
        this.lacunes.set(r.lacunes ?? []);
        this.apercuRendu.set(r.rendu);
        if (r.incarnations?.length) this.incarnations.set(r.incarnations);
        // Le serveur a pu choisir lui-même l'abonné, faute d'un choix.
        if (!this.incarnation() && r.abonne?.id) this.incarnation.set(r.abonne);
      },
      // Un aperçu qui échoue ne doit pas bloquer la rédaction : on garde
      // le précédent plutôt que d'afficher un cadre vide.
      error: () => this.apercuEnCours.set(false),
    });
  }

  incarnerParId(id: number) {
    const a = this.incarnations().find((x) => x.id === id);
    if (!a) return;
    this.incarnation.set(a);
    this.rafraichirApercu();
  }

  // ── Le sélecteur d'offres ──

  ouvrirSelecteur() {
    this.selecteurOuvert.set(true);
    this.selecteurResultats.set([]);
    this.selecteurRecherche = '';
  }

  fermerSelecteur() { this.selecteurOuvert.set(false); }

  chercherOffres() {
    const q = this.selecteurRecherche.trim();
    if (!q) return;
    this.selecteurEnCours.set(true);
    this.api.chercherOffres(q).subscribe({
      next: (r) => { this.selecteurResultats.set(r); this.selecteurEnCours.set(false); },
      error: () => { this.selecteurEnCours.set(false); this.toastr.error('La recherche a échoué.'); },
    });
  }

  private relireOffresChoisies(ids: number[]) {
    this.api.offresChoisies(ids).subscribe({
      next: (r) => {
        this.offresChoisies.set(r);
        // Une offre retirée du catalogue depuis ne revient pas : on nettoie
        // la sélection plutôt que de garder un numéro qui ne rendra rien.
        const vivantes = r.map((x) => x.id);
        if (vivantes.length !== ids.length) {
          const o = this.blocCourant()?.offres;
          if (o) { o.ids = vivantes; this.majApercu(); }
          this.toastr.info('Une offre de la sélection n’est plus au catalogue : elle a été retirée.');
        }
      },
      error: () => this.offresChoisies.set([]),
    });
  }

  ajouterOffre(o: OffreBreve) {
    const bloc = this.blocCourant()?.offres;
    if (!bloc) return;
    bloc.ids = [...(bloc.ids ?? [])];
    if (bloc.ids.includes(o.id)) return;
    bloc.ids.push(o.id);
    this.offresChoisies.update((l) => [...l, o]);
    this.majApercu();
  }

  retirerOffre(id: number) {
    const bloc = this.blocCourant()?.offres;
    if (!bloc) return;
    bloc.ids = (bloc.ids ?? []).filter((x) => x !== id);
    this.offresChoisies.update((l) => l.filter((x) => x.id !== id));
    this.majApercu();
  }

  deplacerOffre(i: number, pas: -1 | 1) {
    const bloc = this.blocCourant()?.offres;
    const cible = i + pas;
    const l = this.offresChoisies();
    if (!bloc || cible < 0 || cible >= l.length) return;

    const copie = [...l];
    [copie[i], copie[cible]] = [copie[cible], copie[i]];
    this.offresChoisies.set(copie);
    bloc.ids = copie.map((x) => x.id);
    this.majApercu();
  }

  dejaChoisie = (id: number) => this.offresChoisies().some((x) => x.id === id);

  /**
   * Passer du HTML brut aux blocs.
   *
   * Le HTML existant n'est pas converti : le découper à la machine
   * abîmerait une mise en page réglée à la main. Il est conservé jusqu'à
   * l'enregistrement, et c'est l'avertissement de la confirmation.
   */
  async passerAuxBlocs() {
    const r = await Swal.fire({
      title: 'Passer à l’éditeur en blocs ?',
      html: `<p style="font-size:.92rem;line-height:1.6;text-align:left">
               Le HTML que vous avez écrit ne sera pas converti — le découper
               automatiquement abîmerait votre mise en page. Il sera remplacé
               par les blocs que vous composerez.
             </p>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#15616d',
      cancelButtonColor: '#577177',
      confirmButtonText: 'Passer aux blocs',
      cancelButtonText: 'Garder le HTML',
    });
    if (!r.isConfirmed) return;

    this.corps = '';
    this.modeHtml.set(false);
    this.blocs.set([]);
    this.ajouterBloc('texte');
  }

  private get brouillon(): BrouillonCampagne {
    return {
      subject: this.sujet,
      previewText: this.apercuTexte || undefined,
      bodyHtml: this.corps,
      // Les blocs prennent le pas côté serveur. On n'envoie rien quand il
      // n'y en a pas : « [] » écraserait le HTML d'une campagne ancienne
      // qu'on ouvre juste pour en changer le ciblage.
      blocs: this.blocs().length ? JSON.stringify(this.blocs()) : undefined,
      roles: this.rolesChoisis(),
      categories: this.catsChoisies(),
      cities: this.decouper(this.villes),
      departments: this.decouper(this.departements),
      activity: this.activite || undefined,
    };
  }

  basculerRole(r: string) {
    this.rolesChoisis.update((l) => (l.includes(r) ? l.filter((x) => x !== r) : [...l, r]));
    this.compter();
  }

  basculerCat(c: string) {
    this.catsChoisies.update((l) => (l.includes(c) ? l.filter((x) => x !== c) : [...l, c]));
    this.compter();
  }

  /**
   * Le décompte, différé d'un instant.
   *
   * Il se déclenche à chaque frappe dans les villes ou les départements :
   * sans ce délai, saisir « Montpellier » lancerait onze requêtes.
   */
  compterDiffere() {
    if (this.differeCiblage) clearTimeout(this.differeCiblage);
    this.differeCiblage = setTimeout(() => this.compter(), 400);
  }

  compter() {
    this.api.compter(this.brouillon).subscribe({
      next: (r) => {
        this.destinataires.set(r.destinataires);
        this.messageCiblage.set(r.message);
      },
      error: () => this.destinataires.set(null),
    });
  }

  enregistrer(silencieux = false) {
    if (!this.sujet.trim()) { this.toastr.warning('Un objet est nécessaire.'); return; }
    this.occupe.set(true);

    const id = this.brouillonId();
    const suite = (nouvelId: number) => {
      this.brouillonId.set(nouvelId);
      this.occupe.set(false);
      if (!silencieux) this.toastr.success('Brouillon enregistré.');
      this.chargerCampagnes();
    };

    if (id) {
      this.api.enregistrer(id, this.brouillon).subscribe({
        next: () => suite(id),
        error: (e) => { this.occupe.set(false); this.toastr.error(e?.error?.message ?? 'Erreur.'); },
      });
    } else {
      this.api.creer(this.brouillon).subscribe({
        next: (r) => suite(r.id),
        error: (e) => { this.occupe.set(false); this.toastr.error(e?.error?.message ?? 'Erreur.'); },
      });
    }
  }

  /** L'aperçu en grand, dans une modale — le rail en montre déjà un, en petit. */
  voirApercu() {
    if (!this.corps.trim() && !this.blocs().length) {
      this.toastr.warning('Écrivez d’abord le message.');
      return;
    }
    this.occupe.set(true);
    this.api.apercu(this.brouillon, this.incarnation()?.id).subscribe({
      next: (r) => {
        this.occupe.set(false);
        this.apercuHtml.set(r.html);
        this.apercuRendu.set(r.rendu);
        this.lacunes.set(r.lacunes ?? []);
      },
      error: () => { this.occupe.set(false); this.toastr.error('L’aperçu a échoué.'); },
    });
  }

  fermerApercu() { this.apercuHtml.set(null); }

  async essai() {
    if (!this.brouillonId()) {
      this.toastr.info('Enregistrez d’abord le brouillon.');
      return;
    }
    const r = await Swal.fire({
      title: 'S’envoyer un essai',
      input: 'email',
      inputLabel: 'Laissez vide pour recevoir sur votre propre adresse',
      inputPlaceholder: 'vous@exemple.fr',
      showCancelButton: true,
      confirmButtonColor: '#15616d',
      cancelButtonColor: '#577177',
      confirmButtonText: 'Envoyer',
      cancelButtonText: 'Annuler',
      inputValidator: () => null,
    });
    if (!r.isConfirmed) return;

    this.occupe.set(true);
    this.api.essai(this.brouillonId()!, r.value || undefined).subscribe({
      next: (x) => {
        this.occupe.set(false);
        if (x.parti) this.toastr.success(x.message);
        else this.toastr.warning(x.message, 'L’essai n’est pas parti');
      },
      error: (e) => { this.occupe.set(false); this.toastr.error(e?.error?.message ?? 'Erreur.'); },
    });
  }

  /**
   * L'envoi.
   *
   * La confirmation récite ce qui va se produire — combien de personnes,
   * et que rien ne se rattrape — plutôt que de demander « êtes-vous sûr ».
   */
  async envoyer() {
    if (!this.brouillonId()) { this.toastr.info('Enregistrez d’abord le brouillon.'); return; }
    const n = this.destinataires() ?? 0;
    if (n === 0) { this.toastr.warning('Aucun abonné ne correspond à ce ciblage.'); return; }

    const r = await Swal.fire({
      title: 'Envoyer maintenant ?',
      html: `<p style="font-size:.93rem;line-height:1.65;text-align:left">
               <b>${n} personne${n > 1 ? 's' : ''}</b> ${n > 1 ? 'recevront' : 'recevra'} ce message.
             </p>
             <p style="font-size:.9rem;line-height:1.6;text-align:left;color:#577177;margin-top:.7rem">
               Un message parti ne se rattrape pas. Si vous n'avez pas encore envoyé
               d'essai à vous-même, c'est le moment.
             </p>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#15616d',
      cancelButtonColor: '#577177',
      confirmButtonText: `Envoyer aux ${n}`,
      cancelButtonText: 'Pas encore',
    });
    if (!r.isConfirmed) return;

    this.occupe.set(true);
    this.api.envoyer(this.brouillonId()!).subscribe({
      next: (x) => {
        this.occupe.set(false);
        this.toastr.success(x.message, 'Envoi lancé', { timeOut: 9000 });
        this.onglet.set('campagnes');
        this.chargerCampagnes();
      },
      error: (e) => { this.occupe.set(false); this.toastr.error(e?.error?.message ?? 'Erreur.', '', { timeOut: 12000 }); },
    });
  }

  // ══════════════════════════════
  //  Campagnes
  // ══════════════════════════════

  async arreter(c: Campagne) {
    const r = await Swal.fire({
      title: 'Arrêter l’envoi ?',
      html: `<p style="font-size:.92rem;line-height:1.6">
               Les messages déjà partis le restent. Seuls ceux qui attendent
               encore seront annulés.
             </p>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#c6364b',
      cancelButtonColor: '#577177',
      confirmButtonText: 'Arrêter',
      cancelButtonText: 'Laisser finir',
    });
    if (!r.isConfirmed) return;

    this.api.arreter(c.id).subscribe({
      next: (x) => { this.toastr.success(x.message); this.chargerCampagnes(); },
      error: (e) => this.toastr.error(e?.error?.message ?? 'Erreur.'),
    });
  }

  async supprimer(c: Campagne) {
    const r = await Swal.fire({
      title: 'Supprimer cette campagne ?',
      text: c.status === 'Draft'
        ? 'Ce brouillon sera perdu.'
        : 'Les statistiques de cet envoi seront perdues avec elle.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#c6364b',
      cancelButtonColor: '#577177',
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler',
    });
    if (!r.isConfirmed) return;

    this.api.supprimer(c.id).subscribe({
      next: (x) => { this.toastr.success(x.message); this.chargerCampagnes(); },
      error: (e) => this.toastr.error(e?.error?.message ?? 'Erreur.'),
    });
  }

  async voirResultats(c: Campagne) {
    this.api.campagne(c.id).subscribe({
      next: (x) => {
        const echecs = (x.echecs ?? []).slice(0, 12);
        const liste = echecs.length
          ? '<div style="margin-top:.9rem;text-align:left"><b style="font-size:.85rem">Échecs</b>'
            + '<ul style="margin:.3rem 0 0;padding-left:1.1rem;font-size:.8rem;line-height:1.6;color:#577177">'
            + echecs.map((e) => `<li>${AdminNewsletter.echapper(e.email)} — `
                                + `${AdminNewsletter.echapper(e.error ?? 'raison inconnue')}</li>`).join('')
            + '</ul></div>'
          : '';
        Swal.fire({
          // Le titre d'une boite de dialogue est lui aussi du HTML : un
          // objet de campagne y vaut balisage s'il n'est pas echappe.
          title: AdminNewsletter.echapper(x.subject),
          html: `<div style="text-align:left;font-size:.92rem;line-height:1.7">
                   <div><b>${+x.delivered || 0}</b> message${x.delivered > 1 ? 's' : ''} remis</div>
                   ${x.failed ? `<div style="color:#c6364b"><b>${+x.failed || 0}</b> en échec</div>` : ''}
                   ${x.restants ? `<div><b>${+x.restants || 0}</b> encore en attente</div>` : ''}
                   <div style="color:#577177;margin-top:.5rem">
                     Ciblage : ${AdminNewsletter.echapper(this.decrireSegment(x)) || 'tous les abonnés'}
                   </div>
                 </div>${liste}`,
          confirmButtonColor: '#15616d',
          confirmButtonText: 'Fermer',
          width: 560,
        });
      },
      error: () => this.toastr.error('Les résultats n’ont pas pu être lus.'),
    });
  }

  /** Le ciblage en toutes lettres : « Recruteurs · Tech · 34 ». */
  decrireSegment(c: Campagne): string {
    const bouts: string[] = [];
    const r = this.decouper(c.segmentRoles).map(
      (x) => ROLES.find((y) => y.cle === x)?.libelle ?? x);
    if (r.length) bouts.push(r.join(', '));
    if (c.segmentCategories) bouts.push(c.segmentCategories);
    if (c.segmentCities) bouts.push(c.segmentCities);
    if (c.segmentDepartments) bouts.push('dép. ' + c.segmentDepartments);
    const a = ACTIVITES.find((x) => x.cle === c.segmentActivity);
    if (a && a.cle) bouts.push(a.libelle.toLowerCase());
    return bouts.join(' · ');
  }
}
