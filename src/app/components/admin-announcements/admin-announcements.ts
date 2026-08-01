import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../services/admin.service';
import { ToastrService } from 'ngx-toastr';
import { STATUS } from '../../viz/palette';

/**
 * Annonces de la plateforme.
 *
 * La page portait un défaut sérieux : décocher « Afficher en bannière »
 * — l'état par défaut du formulaire — ne produisait pas une annonce
 * discrète, mais **une notification poussée à chaque compte de la
 * plateforme**, immédiatement et sans retour possible. Rien ne le disait,
 * ni la case, ni le bouton, ni un récapitulatif.
 *
 * Le mode de diffusion est donc devenu un choix explicite entre deux
 * gestes de nature différente : une bannière, qu'on retire quand on veut,
 * et un envoi, qu'on ne rattrape pas. Le second annonce son nombre de
 * destinataires et demande confirmation.
 */

type Diffusion = 'banniere' | 'notification';

interface AnnonceForm {
  title: string;
  message: string;
  type: string;
  targetRole: string;
  diffusion: Diffusion;
  startsAt: string;
  endsAt: string;
}

const FORM_VIDE = (): AnnonceForm => ({
  title: '',
  message: '',
  type: 'info',
  targetRole: '',
  diffusion: 'banniere',
  startsAt: '',
  endsAt: '',
});

/** Longueurs au-delà desquelles le bandeau du site cesse de tenir sur une ligne. */
const MAX_TITRE = 60;
const MAX_MESSAGE = 200;

const TYPES = [
  { cle: 'info', label: 'Information', icon: 'bi-info-circle-fill', color: STATUS.info },
  { cle: 'warning', label: 'Avertissement', icon: 'bi-exclamation-triangle-fill', color: STATUS.warning },
  { cle: 'success', label: 'Succès', icon: 'bi-check-circle-fill', color: STATUS.good },
  { cle: 'danger', label: 'Alerte', icon: 'bi-x-octagon-fill', color: STATUS.critical },
];

const CIBLES = [
  { cle: '', label: 'Tous les utilisateurs' },
  { cle: 'Candidate', label: 'Candidats uniquement' },
  { cle: 'Recruiter', label: 'Recruteurs uniquement' },
];

@Component({
  selector: 'app-admin-announcements',
  imports: [DatePipe, FormsModule],
  templateUrl: './admin-announcements.html',
  styleUrl: './admin-announcements.scss',
})
export class AdminAnnouncements implements OnInit {
  private admin = inject(AdminService);
  private toastr = inject(ToastrService);

  announcements = signal<any[]>([]);
  loading = signal(true);
  showForm = signal(false);
  publishing = signal(false);
  /** Étape de confirmation avant un envoi qu'on ne peut pas reprendre. */
  confirming = signal(false);
  exporting = signal<string | null>(null);
  /** Annonce dont la suppression attend confirmation. */
  deleting = signal<number | null>(null);

  readonly types = TYPES;
  readonly cibles = CIBLES;
  readonly maxTitre = MAX_TITRE;
  readonly maxMessage = MAX_MESSAGE;

  form: AnnonceForm = FORM_VIDE();

  /**
   * Effectifs par rôle, pour que « notifier » annonce combien de personnes
   * il touche. Une facette de la liste des utilisateurs suffit : on ne
   * demande qu'une ligne, seuls les compteurs comptent.
   */
  private effectifs = signal<{ total: number; candidates: number; recruiters: number } | null>(null);

  destinataires = computed(() => {
    const e = this.effectifs();
    if (!e) return null;
    return this.form.targetRole === 'Candidate' ? e.candidates
      : this.form.targetRole === 'Recruiter' ? e.recruiters
      : e.total;
  });

  ngOnInit() {
    this.load();
    this.admin.listUsers({ page: '1', pageSize: '1' }).subscribe({
      next: (r: any) =>
        this.effectifs.set({
          total: r.facets?.total ?? 0,
          candidates: r.facets?.candidates ?? 0,
          recruiters: r.facets?.recruiters ?? 0,
        }),
      error: () => {},
    });
  }

  load() {
    this.loading.set(true);
    this.admin.getAnnouncements().subscribe({
      next: (a) => {
        this.announcements.set(a);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toastr.error('Les annonces n’ont pas pu être chargées.');
      },
    });
  }

  toggleForm() {
    this.showForm.update((v) => !v);
    this.confirming.set(false);
    if (!this.showForm()) this.form = FORM_VIDE();
  }

  // ── Rédaction ──

  get valide(): boolean {
    return (
      this.form.title.trim().length > 0 &&
      this.form.message.trim().length > 0 &&
      this.form.title.length <= MAX_TITRE &&
      this.form.message.length <= MAX_MESSAGE &&
      !this.periodeIncoherente
    );
  }

  /** Une fin avant le début ne programme rien : la bannière ne paraîtrait jamais. */
  get periodeIncoherente(): boolean {
    const { startsAt, endsAt } = this.form;
    return !!startsAt && !!endsAt && new Date(endsAt) <= new Date(startsAt);
  }

  typeCourant = () => TYPES.find((t) => t.cle === this.form.type) ?? TYPES[0];
  cibleLabel = (cle: string) => CIBLES.find((c) => c.cle === cle)?.label ?? 'Tous les utilisateurs';

  /**
   * Le bouton dit ce qu'il fait. « Publier l'annonce » ne distinguait pas
   * un affichage réversible d'un envoi définitif à toute la plateforme.
   */
  get libelleAction(): string {
    if (this.form.diffusion === 'banniere') return 'Afficher la bannière';
    const n = this.destinataires();
    return n === null ? 'Envoyer la notification' : `Notifier ${n.toLocaleString('fr-FR')} utilisateur${n > 1 ? 's' : ''}`;
  }

  demander() {
    if (!this.valide) return;
    // Une bannière se retire d'un clic : elle n'a rien à faire confirmer.
    if (this.form.diffusion === 'banniere') this.publier();
    else this.confirming.set(true);
  }

  publier() {
    if (!this.valide) return;
    this.publishing.set(true);
    const banniere = this.form.diffusion === 'banniere';
    this.admin
      .createAnnouncement({
        title: this.form.title.trim(),
        message: this.form.message.trim(),
        type: this.form.type,
        targetRole: this.form.targetRole || null,
        isBanner: banniere,
        startsAt: banniere ? this.form.startsAt || null : null,
        endsAt: banniere ? this.form.endsAt || null : null,
      })
      .subscribe({
        next: () => {
          this.toastr.success(banniere ? 'Bannière affichée' : 'Notification envoyée');
          this.publishing.set(false);
          this.confirming.set(false);
          this.showForm.set(false);
          this.form = FORM_VIDE();
          this.load();
        },
        error: () => {
          this.publishing.set(false);
          this.confirming.set(false);
          this.toastr.error("L'annonce n'a pas pu être publiée.");
        },
      });
  }

  // ── Cycle de vie d'une annonce publiée ──

  /**
   * État réel d'une annonce, par opposition à son seul drapeau `isActive`.
   *
   * La liste affichait « Active » sur une bannière programmée pour la
   * semaine suivante et sur une bannière dont la fin était passée : deux
   * cas où rien n'est visible sur le site. Les dates font partie de
   * l'état, elles doivent le dire.
   */
  etat(a: any): { cle: string; label: string; couleur: string } {
    if (!a.isActive) return { cle: 'off', label: 'Désactivée', couleur: STATUS.neutral };
    const now = Date.now();
    if (a.startsAt && new Date(a.startsAt).getTime() > now)
      return { cle: 'planned', label: 'Programmée', couleur: STATUS.info };
    if (a.endsAt && new Date(a.endsAt).getTime() < now)
      return { cle: 'expired', label: 'Expirée', couleur: STATUS.neutral };
    return { cle: 'live', label: a.isBanner ? 'Affichée' : 'Envoyée', couleur: STATUS.good };
  }

  toggle(a: any) {
    this.admin.toggleAnnouncement(a.id).subscribe({
      next: () => {
        this.toastr.success(a.isActive ? 'Annonce désactivée' : 'Annonce réactivée');
        this.load();
      },
      error: () => this.toastr.error('Le statut n’a pas pu être modifié.'),
    });
  }

  /** La suppression demande confirmation sur la ligne même, sans boîte de dialogue. */
  remove(id: number) {
    if (this.deleting() !== id) {
      this.deleting.set(id);
      return;
    }
    this.admin.deleteAnnouncement(id).subscribe({
      next: () => {
        this.toastr.success('Annonce supprimée');
        this.deleting.set(null);
        this.load();
      },
      error: () => {
        this.deleting.set(null);
        this.toastr.error('L’annonce n’a pas pu être supprimée.');
      },
    });
  }

  typeIcon = (type: string) => TYPES.find((t) => t.cle === type)?.icon ?? TYPES[0].icon;
  typeColor = (type: string) => TYPES.find((t) => t.cle === type)?.color ?? TYPES[0].color;
  typeLabel = (type: string) => TYPES.find((t) => t.cle === type)?.label ?? type;

  // ── Exports ──

  exportUsers() { this.download(this.admin.exportUsers(), 'utilisateurs'); }
  exportOffers() { this.download(this.admin.exportOffers(), 'offres'); }
  exportApps() { this.download(this.admin.exportApplications(), 'candidatures'); }

  private download(obs: any, name: string) {
    this.exporting.set(name);
    obs.subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${name}_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.exporting.set(null);
        this.toastr.success(`Export ${name} téléchargé`);
      },
      // Un export qui échoue en silence laisse croire au téléchargement.
      error: () => {
        this.exporting.set(null);
        this.toastr.error(`L'export ${name} a échoué.`);
      },
    });
  }
}
