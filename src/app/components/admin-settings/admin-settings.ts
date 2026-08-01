import { Component, OnInit, HostListener, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminService } from '../../services/admin.service';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';

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
  imports: [FormsModule, RouterLink],
  templateUrl: './admin-settings.html',
  styleUrl: './admin-settings.scss',
})
export class AdminSettings implements OnInit {
  private admin = inject(AdminService);
  private toastr = inject(ToastrService);

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
  saving = signal(false);
  importing = signal(false);

  /** L'état servi par le serveur, pour savoir ce qui a bougé. */
  private origine = new Map<string, string>();

  ngOnInit() {
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
        confirmButtonColor: '#15616d',
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

  /** Envoie un message de controle a sa propre adresse. */
  essayerCourriel() {
    this.essaiEnCours.set(true);
    this.admin.essaiCourriel().subscribe({
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
