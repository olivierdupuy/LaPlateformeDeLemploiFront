import { RouterLink } from '@angular/router';
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../services/admin.service';
import { companyColor } from '../../utils/job.utils';
import { STATUS } from '../../viz/palette';

/**
 * Journal d'activité.
 *
 * Chaque événement occupait une carte de cent trente pixels pour une
 * ligne de texte : cinq entrées remplissaient l'écran, et le journal
 * complet demandait des mètres de défilement. Or on ne lit pas un journal,
 * on le balaie — c'est une piste d'audit, la densité y est la fonction.
 *
 * Les événements se rangent donc par jour, une ligne chacun, et la
 * gravité passe dans un liseré : une suppression ne se lit pas comme une
 * connexion, même à la volée.
 */

/** Gravité d'une action, qui décide de la couleur du liseré. */
type Gravite = 'neutre' | 'info' | 'attention' | 'critique';

interface ActionMeta {
  label: string;
  icon: string;
  gravite: Gravite;
}

/**
 * Les actions telles qu'elles sont écrites en base, traduites une fois
 * ici. La console affichait « RESETPASSWORD » : le nom d'un symbole du
 * code, pas celui d'un fait.
 */
const ACTIONS: Record<string, ActionMeta> = {
  Login: { label: 'Connexion', icon: 'bi-box-arrow-in-right', gravite: 'neutre' },
  Register: { label: 'Inscription', icon: 'bi-person-plus', gravite: 'info' },
  ExportCSV: { label: 'Export de données', icon: 'bi-download', gravite: 'attention' },
  ApproveOffer: { label: 'Offre approuvée', icon: 'bi-check-circle', gravite: 'info' },
  RejectOffer: { label: 'Offre rejetée', icon: 'bi-x-circle', gravite: 'attention' },
  ToggleFeature: { label: 'Mise en avant', icon: 'bi-star', gravite: 'neutre' },
  CreateAnnouncement: { label: 'Annonce publiée', icon: 'bi-megaphone', gravite: 'attention' },
  UpdateSettings: { label: 'Paramètres modifiés', icon: 'bi-sliders2', gravite: 'attention' },
  ChangeRole: { label: 'Rôle modifié', icon: 'bi-shield-check', gravite: 'critique' },
  ResetPassword: { label: 'Mot de passe réinitialisé', icon: 'bi-key', gravite: 'critique' },
  UpdateUser: { label: 'Compte modifié', icon: 'bi-person-gear', gravite: 'attention' },
  UpdateApplication: { label: 'Candidature modifiée', icon: 'bi-pencil-square', gravite: 'neutre' },
  UpdateInterview: { label: 'Entretien modifié', icon: 'bi-calendar-check', gravite: 'neutre' },
  DeleteApplication: { label: 'Candidature supprimée', icon: 'bi-trash3', gravite: 'critique' },
  DeleteOffers: { label: 'Offres supprimées', icon: 'bi-trash3', gravite: 'critique' },
  DeleteSeedOffers: { label: 'Offres de démonstration supprimées', icon: 'bi-trash3', gravite: 'critique' },
  DeleteOffersBySource: { label: 'Offres d’une source supprimées', icon: 'bi-trash3', gravite: 'critique' },
  DeleteAnnouncement: { label: 'Annonce supprimée', icon: 'bi-megaphone', gravite: 'attention' },
  ToggleAnnouncement: { label: 'Annonce activée ou coupée', icon: 'bi-megaphone', gravite: 'neutre' },
  // Toucher au dossier de quelqu'un d'autre — sa recherche, son CV, ses
  // notes — n'est jamais anodin, même quand le geste est petit.
  UpdateSavedSearch: { label: 'Recherche modifiée', icon: 'bi-search', gravite: 'attention' },
  DeleteSavedSearch: { label: 'Recherche supprimée', icon: 'bi-search', gravite: 'attention' },
  DeleteInterview: { label: 'Entretien supprimé', icon: 'bi-calendar-x', gravite: 'critique' },
  DeleteJobNote: { label: 'Note supprimée', icon: 'bi-sticky', gravite: 'attention' },
  UpdateCvSection: { label: 'Section de CV modifiée', icon: 'bi-file-person', gravite: 'attention' },
  DeleteCvSection: { label: 'Section de CV supprimée', icon: 'bi-file-person', gravite: 'critique' },
  TestEmail: { label: 'Message de contrôle envoyé', icon: 'bi-envelope-check', gravite: 'neutre' },
  // Prendre la place d'un utilisateur est l'action la plus sensible du
  // panneau : elle doit se repérer sans lire.
  ImpersonateStart: { label: 'Emprunt d’identité', icon: 'bi-incognito', gravite: 'critique' },
  ImpersonateStop: { label: 'Fin d’emprunt', icon: 'bi-incognito', gravite: 'attention' },
};

const DEFAUT: ActionMeta = { label: 'Action', icon: 'bi-activity', gravite: 'neutre' };

const COULEUR_GRAVITE: Record<Gravite, string> = {
  neutre: STATUS.neutral,
  info: STATUS.info,
  attention: STATUS.warning,
  critique: STATUS.critical,
};

const ENTITES: Record<string, string> = {
  User: 'Utilisateur',
  JobOffer: 'Offre',
  Application: 'Candidature',
  Announcement: 'Annonce',
  PlatformSetting: 'Paramètre',
  Interview: 'Entretien',
  SavedSearch: 'Recherche enregistrée',
  JobNote: 'Note',
  CvSection: 'Section de CV',
  Email: 'Courriel',
};

const PAR_PAGE = 50;

interface LogRow {
  id: number;
  action: string;
  entityType?: string;
  entityId?: number;
  details?: string;
  userName?: string;
  userId?: string;
  ipAddress?: string;
  createdAt: string;
}

/** Une journée du journal, avec ses événements dans l'ordre. */
interface Journee {
  cle: string;
  libelle: string;
  evenements: LogRow[];
}

@Component({
  selector: 'app-admin-activity',
  imports: [DatePipe, DecimalPipe, FormsModule, RouterLink],
  templateUrl: './admin-activity.html',
  styleUrl: './admin-activity.scss',
})
export class AdminActivity implements OnInit {
  private admin = inject(AdminService);

  logs = signal<LogRow[]>([]);
  actions = signal<string[]>([]);
  total = signal(0);
  page = signal(1);
  loading = signal(true);
  failed = signal(false);

  filterAction = '';
  filterEntity = '';
  /** Recherche locale : la page servie tient en cinquante lignes. */
  recherche = signal('');

  readonly parPage = PAR_PAGE;
  companyColor = companyColor;

  pageCount = computed(() => Math.max(1, Math.ceil(this.total() / PAR_PAGE)));

  /**
   * La recherche filtre la page affichée, pas la base : le dire évite de
   * conclure « aucune connexion de Marie » sur un journal qui en compte
   * cinquante autres, page suivante.
   */
  filtres = computed(() => {
    const q = this.recherche().trim().toLowerCase();
    if (!q) return this.logs();
    return this.logs().filter((l) =>
      [l.userName, l.details, this.meta(l.action).label, l.ipAddress]
        .some((v) => (v ?? '').toLowerCase().includes(q)),
    );
  });

  /**
   * Regroupement par jour.
   *
   * L'horodatage complet se répétait sur chaque ligne alors que la
   * plupart partagent la même date. Le jour passe en intertitre, la ligne
   * ne garde que l'heure.
   */
  journees = computed<Journee[]>(() => {
    const groupes = new Map<string, LogRow[]>();
    for (const l of this.filtres()) {
      const cle = new Date(l.createdAt).toDateString();
      (groupes.get(cle) ?? groupes.set(cle, []).get(cle)!).push(l);
    }
    return [...groupes.entries()].map(([cle, evenements]) => ({
      cle,
      libelle: this.libelleJour(cle),
      evenements,
    }));
  });

  ngOnInit() {
    this.loadLogs();
    this.admin.getLogActions().subscribe({
      next: (a) => this.actions.set(a),
      error: () => {},
    });
  }

  loadLogs() {
    this.loading.set(true);
    this.failed.set(false);
    this.admin
      .getActivityLogs({
        action: this.filterAction || undefined,
        entityType: this.filterEntity || undefined,
        page: this.page(),
      })
      .subscribe({
        next: (res) => {
          this.logs.set(res.logs);
          this.total.set(res.total);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.failed.set(true);
        },
      });
  }

  applyFilter() { this.page.set(1); this.loadLogs(); }

  resetFilters() {
    this.filterAction = '';
    this.filterEntity = '';
    this.recherche.set('');
    this.page.set(1);
    this.loadLogs();
  }

  get filtreActif(): boolean {
    return !!this.filterAction || !!this.filterEntity || !!this.recherche().trim();
  }

  nextPage() {
    if (this.page() >= this.pageCount()) return;
    this.page.update((p) => p + 1);
    this.loadLogs();
  }

  prevPage() {
    if (this.page() <= 1) return;
    this.page.update((p) => p - 1);
    this.loadLogs();
  }

  // ── Lecture d'une ligne ──

  // Le filtre par objet se lisait dans le gabarit, et il y a vieilli : il
  // ignorait les entretiens depuis leur arrivée. Une seule table fait
  // désormais foi, celle qui sert aussi à afficher les lignes.
  readonly objets = Object.entries(ENTITES).map(([cle, libelle]) => ({ cle, libelle }));

  meta = (action: string): ActionMeta => ACTIONS[action] ?? { ...DEFAUT, label: action };
  actionLabel = (action: string) => this.meta(action).label;
  actionIcon = (action: string) => this.meta(action).icon;
  actionColor = (action: string) => COULEUR_GRAVITE[this.meta(action).gravite];
  gravite = (action: string) => this.meta(action).gravite;
  entiteLabel = (type?: string) => (type ? (ENTITES[type] ?? type) : null);

  /** « Aujourd'hui », « Hier », puis la date en toutes lettres. */
  private libelleJour(cle: string): string {
    const jour = new Date(cle);
    const aujourdhui = new Date();
    const veille = new Date();
    veille.setDate(veille.getDate() - 1);
    if (jour.toDateString() === aujourdhui.toDateString()) return "Aujourd'hui";
    if (jour.toDateString() === veille.toDateString()) return 'Hier';
    return jour.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  /**
   * Détail à afficher, quand il en reste un.
   *
   * Le journal écrit « Connexion: Admin LPDE » sur une ligne qui porte
   * déjà « Connexion » et « Admin LPDE » : la même information trois fois.
   * Un détail qui ne fait que répéter l'action et son auteur disparaît.
   */
  detailUtile(log: LogRow): string | null {
    const detail = (log.details ?? '').trim();
    if (!detail) return null;
    const nom = (log.userName ?? '').trim();
    const apresDeuxPoints = detail.includes(':') ? detail.slice(detail.indexOf(':') + 1).trim() : detail;
    if (nom && apresDeuxPoints.toLowerCase() === nom.toLowerCase()) return null;
    return detail;
  }

  /** Une adresse locale ne renseigne personne : elle n'a pas à occuper la ligne. */
  ipUtile(ip?: string): boolean {
    return !!ip && ip !== '::1' && ip !== '127.0.0.1';
  }

  /** Lien vers l'objet concerné, quand il en existe un consultable. */
  lienEntite(log: LogRow): { route: any[]; params?: any; label: string } | null {
    if (log.entityType === 'JobOffer' && log.entityId)
      return { route: ['/offres', log.entityId], label: "Voir l'offre" };
    if (log.entityType === 'Application')
      return { route: ['/admin/candidatures'], label: 'Voir les candidatures' };
    if (log.entityType === 'User' && log.entityId)
      return { route: ['/admin/utilisateurs'], params: { q: log.details }, label: 'Voir le compte' };
    return null;
  }
}
