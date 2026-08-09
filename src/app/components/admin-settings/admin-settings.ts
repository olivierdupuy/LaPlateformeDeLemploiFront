import { Component, OnInit, HostListener, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminService, ApercuCourriel, EtatDuService, ModeleCourriel } from '../../services/admin.service';
import { ToastrService } from 'ngx-toastr';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import Swal from 'sweetalert2';
import { Modale } from '../../utils/modale.directive';

/**
 * Réglages de la plateforme.
 *
 * La page alignait sept réglages dans l'ordre où la base les rendait, et
 * répétait sous chaque libellé une description qui n'ajoutait rien —
 * « Email de contact / Email de contact », « Mode maintenance / Active le
 * mode maintenance ».
 *
 * Or ce qui manque à une page de réglages n'est jamais le nom du
 * réglage : c'est **ce qui se produit quand on y touche**. Couper les
 * inscriptions, rendre la modération obligatoire, allumer la maintenance
 * ne sont pas des cases à cocher, ce sont des décisions dont l'effet
 * porte sur tous les visiteurs. Chaque réglage énonce donc sa
 * conséquence, au présent, dans l'état où il se trouve — et la phrase
 * change sous les yeux quand on bascule l'interrupteur.
 *
 * Les descriptions ne viennent plus de la base : elles y sont écrites
 * sans accents (« Duree par defaut des offres ») et redisaient le
 * libellé. Elles vivent ici, où elles se relisent.
 */

interface Reglage {
  libelle: string;
  icone: string;
  /** Ce que ce réglage produit, selon sa valeur courante. */
  effet: (v: string) => string;
  /** Un réglage dont l'effet dépasse la console : il se confirme. */
  sensible?: boolean;
  unite?: string;
}

interface Famille {
  cle: string;
  titre: string;
  icone: string;
  intro: string;
  cles: string[];
}

const REGLAGES: Record<string, Reglage> = {
  allow_registration: {
    libelle: 'Inscriptions ouvertes',
    icone: 'bi-person-plus',
    sensible: true,
    effet: (v) =>
      v === 'false'
        ? 'Fermées : le formulaire d’inscription est refusé et le bouton disparaît du site. Les comptes existants continuent de fonctionner.'
        : 'Ouvertes : n’importe qui peut créer un compte candidat ou recruteur.',
  },
  maintenance_mode: {
    libelle: 'Mode maintenance',
    icone: 'bi-cone-striped',
    sensible: true,
    effet: (v) =>
      v === 'true'
        ? 'Actif : le site public est remplacé par une page de maintenance. Personne ne peut consulter les offres ni postuler.'
        : 'Inactif : le site répond normalement.',
  },
  require_moderation: {
    libelle: 'Modération avant publication',
    icone: 'bi-shield-check',
    sensible: true,
    effet: (v) =>
      v === 'true'
        ? 'Obligatoire : une offre déposée par un recruteur reste invisible du public tant qu’un administrateur ne l’a pas approuvée.'
        : 'Facultative : une offre déposée par un recruteur paraît immédiatement, sans relecture.',
  },
  default_offer_duration: {
    libelle: 'Durée de vie d’une offre',
    icone: 'bi-calendar-range',
    unite: 'jours',
    effet: (v) =>
      `Une offre déposée aujourd’hui cesse de paraître dans ${v || '0'} jours, sauf prolongation par son auteur.`,
  },
  newsletter_auto_redaction: {
    libelle: 'Rédaction automatique de la lettre',
    icone: 'bi-stars',
    effet: (v) =>
      v === 'true'
        ? 'Chaque semaine, un brouillon de lettre est préparé par centre d’intérêt à partir des offres réellement parues. Rien ne part sans votre clic.'
        : 'Les lettres restent entièrement écrites à la main.',
  },
  max_applications_per_candidate: {
    libelle: 'Candidatures par candidat',
    icone: 'bi-send-check',
    unite: 'au plus',
    effet: (v) =>
      Number(v) > 0
        ? `Au-delà de ${v} candidatures, un candidat ne peut plus postuler. Ce garde-fou évite les envois en masse.`
        : 'Aucune limite : un candidat peut postuler autant de fois qu’il le souhaite.',
  },
  contact_email: {
    libelle: 'Adresse de contact',
    icone: 'bi-envelope',
    effet: (v) =>
      v
        ? `Affichée en pied de page et sur les pages légales. Les visiteurs écriront à ${v}.`
        : 'Non renseignée : aucun moyen de vous joindre n’est proposé aux visiteurs.',
  },
  welcome_message: {
    libelle: 'Message d’accueil',
    icone: 'bi-chat-heart',
    effet: (v) =>
      v ? 'Affiché aux arrivants sur la page d’accueil.' : 'Aucun message d’accueil n’est affiché.',
  },
};

const FAMILLES: Famille[] = [
  {
    cle: 'acces',
    titre: 'Accès au site',
    icone: 'bi-door-open',
    intro: 'Qui peut entrer, et si le site répond.',
    cles: ['allow_registration', 'maintenance_mode'],
  },
  {
    cle: 'offres',
    titre: 'Publication des offres',
    icone: 'bi-briefcase',
    intro: 'Ce qui s’applique aux annonces déposées par les recruteurs.',
    cles: ['require_moderation', 'default_offer_duration'],
  },
  {
    cle: 'candidatures',
    titre: 'Candidatures',
    icone: 'bi-send',
    intro: 'Les limites posées aux candidats.',
    cles: ['max_applications_per_candidate'],
  },
  {
    cle: 'lettre',
    titre: 'Lettre d’information',
    icone: 'bi-envelope-paper',
    intro: 'Ce que la plateforme prépare toute seule.',
    cles: ['newsletter_auto_redaction'],
  },
  {
    cle: 'communication',
    titre: 'Communication',
    icone: 'bi-megaphone',
    intro: 'Ce que le site dit de vous aux visiteurs.',
    cles: ['contact_email', 'welcome_message'],
  },
];

@Component({
  selector: 'app-admin-settings',
  imports: [FormsModule, RouterLink, Modale],
  templateUrl: './admin-settings.html',
  styleUrl: './admin-settings.scss',
})
export class AdminSettings implements OnInit {
  private admin = inject(AdminService);
  private toastr = inject(ToastrService);
  private assainisseur = inject(DomSanitizer);

  readonly familles = FAMILLES;

  settings = signal<any[]>([]);

  /**
   * L'expedition de courriel.
   *
   * Elle n'existait pas : aucun serveur, aucun gabarit. Les alertes de
   * recherche enregistree se disaient « actives » sans que rien ne parte,
   * et un mot de passe oublie ne se recuperait qu'en derangeant un
   * administrateur. Le canal existe maintenant ; reste a lui donner un
   * serveur, et cette page est le seul endroit d'ou l'on peut savoir s'il
   * en a un.
   */
  courriel = signal<{ configure: boolean; etat: string; consequence: string } | null>(null);
  essaiEnCours = signal(false);
  loading = signal(true);

  /**
   * L'état réel du service.
   *
   * La sonde existait sans écran pour la regarder : savoir où les
   * documents sont rangés, ou si la sauvegarde a tourné, demandait un
   * appel à la main. C'est précisément ce qu'une console
   * d'administration doit épargner.
   */
  sante = signal<EtatDuService | null>(null);
  santeMuette = signal(false);
  saving = signal(false);
  importing = signal(false);

  /** L'état servi par le serveur, pour savoir ce qui a bougé. */
  private origine = new Map<string, string>();

  ngOnInit() {
    this.admin.sante().subscribe({
      next: (e) => this.sante.set(e),
      // Une sonde injoignable ne doit pas masquer les réglages : la
      // page rend service même quand elle ne sait pas tout.
      error: () => this.santeMuette.set(true),
    });

    this.admin.etatCourriel().subscribe({
      next: (e) => this.courriel.set(e),
      error: () => this.courriel.set(null),
    });

    this.loading.set(true);
    this.admin.getSettings().subscribe({
      next: (s) => {
        this.settings.set(s);
        this.origine = new Map(s.map((x: any) => [x.key, String(x.value ?? '')]));
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toastr.error('Les réglages n’ont pas pu être chargés.');
      },
    });
  }

  // ══ Accès aux réglages ══

  reglage = (cle: string): Reglage | undefined => REGLAGES[cle];
  entree = (cle: string): any | undefined => this.settings().find((s) => s.key === cle);
  valeur = (cle: string): string => String(this.entree(cle)?.value ?? '');
  estActif = (cle: string) => this.valeur(cle) === 'true';

  ecrire(cle: string, v: string) {
    const e = this.entree(cle);
    if (e) e.value = v;
  }

  /** L'effet en cours, tel que la valeur actuelle le produit. */
  effet = (cle: string): string => REGLAGES[cle]?.effet(this.valeur(cle)) ?? '';

  /** Un réglage modifié se signale : on voit ce qu'on s'apprête à changer. */
  estModifie = (cle: string) => this.valeur(cle) !== (this.origine.get(cle) ?? '');

  // ══ Mentions légales ══
  // Elles se rangent à part : ce sont les seuls réglages qui paraissent
  // mot pour mot sur des pages publiques, et un champ vide y affiche
  // « Non renseigné » au visiteur.

  estMentionLegale = (key: string) => key.startsWith('legal_');

  get mentionsLegales() {
    return this.settings().filter((s) => this.estMentionLegale(s.key));
  }

  get mentionsVides(): number {
    return this.mentionsLegales.filter((s) => !String(s.value ?? '').trim()).length;
  }

  // ══ Modifications en attente ══

  /**
   * Un getter, pas un `computed` : les valeurs sont éditées sur les objets
   * rendus par la requête, qui ne sont pas des signals — un `computed` ne
   * serait jamais recalculé et la barre ne paraîtrait jamais.
   */
  get modifies(): string[] {
    return this.settings()
      .filter((s) => String(s.value ?? '') !== (this.origine.get(s.key) ?? ''))
      .map((s) => s.key);
  }

  get isDirty(): boolean {
    return this.modifies.length > 0;
  }

  annuler() {
    this.settings.update((liste) =>
      liste.map((s) => ({ ...s, value: this.origine.get(s.key) ?? s.value })),
    );
    this.toastr.info('Modifications annulées');
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(e: BeforeUnloadEvent) {
    if (this.isDirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  }

  /**
   * Enregistrement.
   *
   * Trois réglages changent ce que voit le public — la maintenance, les
   * inscriptions, la modération. Les enregistrer d'un clic au milieu
   * d'autres changements anodins ne laissait aucune occasion de se
   * raviser : on ne s'en apercevait qu'en visitant le site. La
   * confirmation ne redemande pas « êtes-vous sûr » — elle récite ce qui
   * va se produire.
   */
  async save() {
    if (!this.isDirty || this.saving()) return;

    const graves = this.modifies.filter((c) => REGLAGES[c]?.sensible);
    if (graves.length) {
      const res = await Swal.fire({
        title: 'Ces réglages changent ce que voient les visiteurs',
        html:
          '<ul style="text-align:left;margin:0;padding-left:1.1rem;line-height:1.6;font-size:0.92rem">' +
          graves.map((c) => `<li><b>${REGLAGES[c].libelle}</b> — ${this.effet(c)}</li>`).join('') +
          '</ul>',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#01489C',
        cancelButtonColor: '#577177',
        confirmButtonText: 'Enregistrer',
        cancelButtonText: 'Revenir',
      });
      if (!res.isConfirmed) return;
    }

    this.saving.set(true);
    const data = this.settings().map((s) => ({
      key: s.key, value: s.value, type: s.type, description: s.description,
    }));
    this.admin.updateSettings(data).subscribe({
      next: () => {
        this.saving.set(false);
        this.origine = new Map(this.settings().map((s: any) => [s.key, String(s.value ?? '')]));
        this.toastr.success('Réglages enregistrés');
      },
      error: () => {
        this.saving.set(false);
        this.toastr.error('Les réglages n’ont pas pu être enregistrés.');
      },
    });
  }

  /** Envoie un message de controle, ou le modèle ouvert en aperçu. */
  essayerCourriel(modele?: string) {
    this.essaiEnCours.set(true);
    this.admin.essaiCourriel(this.adresseEssai().trim() || undefined, modele).subscribe({
      next: (r) => {
        this.essaiEnCours.set(false);
        if (r.parti) this.toastr.success(r.message, 'Message parti');
        else this.toastr.warning(r.message, 'Rien n’est parti');
      },
      error: () => {
        this.essaiEnCours.set(false);
        this.toastr.error('L’essai n’a pas abouti.');
      },
    });
  }

  // ══════════════════════════════════════
  //  Modèles de courriel
  // ══════════════════════════════════════
  //
  // Quatorze messages partent au nom de la plateforme, et aucun n'était
  // relisible sans provoquer la situation qui le déclenche : relire le
  // courriel de suppression de compte supposait d'en supprimer un, et
  // relire la décision d'un signalement DSA, d'instruire un signalement
  // pour de vrai. On les relisait donc après coup, dans la boîte du
  // destinataire — c'est-à-dire trop tard.

  modeles = signal<ModeleCourriel[]>([]);
  apercu = signal<ApercuCourriel | null>(null);
  apercuEnCours = signal(false);

  /** Vide, l'essai part à l'adresse de l'administrateur connecté. */
  adresseEssai = signal('');

  /** Les modèles groupés par catégorie, dans l'ordre d'apparition. */
  modelesParCategorie = computed(() => {
    const groupes = new Map<string, ModeleCourriel[]>();
    for (const m of this.modeles()) {
      const liste = groupes.get(m.categorie) ?? [];
      liste.push(m);
      groupes.set(m.categorie, liste);
    }
    return [...groupes].map(([categorie, items]) => ({ categorie, items }));
  });

  /**
   * Le HTML du modèle, prêt pour un `iframe` en bac à sable.
   *
   * Un cadre isolé plutôt qu'un `innerHTML` : un courriel se compose en
   * attributs `style` et en tableaux, et l'insérer dans la page mêlerait
   * sa mise en forme à celle de la console. Le cadre montre le message
   * tel qu'il partira, sans rien déformer autour.
   *
   * Le `bypassSecurityTrust` mérite sa justification, parce qu'il en
   * faut toujours une :
   *
   *   — l'assainisseur d'Angular retire l'attribut `style`. Or ces
   *     gabarits ne sont *que* du style en ligne : passer par lui
   *     rendrait un aperçu sans couleurs, sans marges et sans cadre,
   *     c'est-à-dire un aperçu qui ment sur ce qui va partir ;
   *   — la source n'est pas une saisie : le serveur rend ses propres
   *     modèles avec des données d'exemple écrites dans le code, et
   *     tout ce qui vient d'ailleurs y passe par `HtmlEncode` ;
   *   — la vraie barrière est le `sandbox` du cadre, posé sans valeur,
   *     donc au maximum : ni script, ni formulaire, ni navigation, ni
   *     accès au document parent. Elle tient quand bien même un gabarit
   *     serait un jour compromis.
   */
  apercuSrcdoc = computed<SafeHtml>(() =>
    this.assainisseur.bypassSecurityTrustHtml(this.apercu()?.html ?? ''),
  );

  chargerModeles() {
    if (this.modeles().length) return;
    this.admin.modelesCourriel().subscribe({
      next: (m) => this.modeles.set(m),
      error: () => this.toastr.error('La liste des modèles n’a pas pu être chargée.'),
    });
  }

  ouvrirApercu(cle: string) {
    this.apercuEnCours.set(true);
    this.admin.apercuModeleCourriel(cle).subscribe({
      next: (a) => { this.apercu.set(a); this.apercuEnCours.set(false); },
      error: () => {
        this.apercuEnCours.set(false);
        this.toastr.error('Ce modèle n’a pas pu être rendu.');
      },
    });
  }

  fermerApercu() { this.apercu.set(null); }

  // ══ Import du catalogue ══

  importJobs() {
    this.importing.set(true);
    this.admin.importJobs().subscribe({
      next: (r) => { this.importing.set(false); this.toastr.success(r.message, 'Import'); },
      error: (err) => { this.importing.set(false); this.toastr.error(err.error?.message || "Échec de l'import"); },
    });
  }

  // ══ Libellés des mentions légales ══

  settingIcon(key: string): string {
    const map: Record<string, string> = {
      legal_raison_sociale: 'bi-building', legal_adresse: 'bi-geo-alt',
      legal_siret: 'bi-hash', legal_tva: 'bi-receipt', legal_telephone: 'bi-telephone',
      legal_directeur_publication: 'bi-person-badge', legal_hebergeur: 'bi-hdd-network',
      legal_dpo: 'bi-shield-lock', legal_conservation_compte: 'bi-clock-history',
      legal_conservation_candidatures: 'bi-clock-history', legal_conservation_journal: 'bi-clock-history',
    };
    return REGLAGES[key]?.icone ?? map[key] ?? 'bi-gear';
  }

  settingLabel(key: string): string {
    const map: Record<string, string> = {
      legal_raison_sociale: 'Raison sociale, forme juridique, capital',
      legal_adresse: 'Adresse du siège social',
      legal_siret: 'Numéro SIRET',
      legal_tva: 'TVA intracommunautaire',
      legal_telephone: 'Téléphone',
      legal_directeur_publication: 'Directeur de la publication',
      legal_hebergeur: 'Hébergeur',
      legal_dpo: 'Délégué à la protection des données',
      legal_conservation_compte: 'Conservation — compte inactif',
      legal_conservation_candidatures: 'Conservation — candidatures',
      legal_conservation_journal: 'Conservation — journal',
    };
    return REGLAGES[key]?.libelle ?? map[key] ?? key;
  }
}
