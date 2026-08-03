import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApplicationService } from '../../services/application';
import { CandidateFeaturesService, InvitationRecue } from '../../services/candidate-features.service';
import { AuthService } from '../../services/auth.service';
import { BookmarkService } from '../../services/bookmark.service';
import { JobOfferService } from '../../services/job-offer';
import { InterviewService } from '../../services/interview.service';
import { ToastrService } from 'ngx-toastr';
import { Application, JobOffer, InterviewItem } from '../../models/job-offer.model';
import { companyColor } from '../../utils/job.utils';
import { ConsoleShell } from '../console-shell/console-shell';
import { pastilleStatut, libelleStatut, iconeStatut } from '../../utils/statut-candidature';

type Tab = 'saved' | 'sent' | 'interviews' | 'invitations' | 'archived';

/**
 * « Mes candidatures » — le point unique de l'espace candidat.
 *
 * Les offres mises de côté, les candidatures envoyées, celles arrivées en
 * entretien et celles rangées vivaient sur trois pages sans lien entre elles.
 * Elles sont ici quatre onglets comptés d'une même page : l'état de la
 * recherche se lit d'un coup d'œil.
 *
 * L'onglet actif vit dans `?onglet=`, pour qu'un lien soit partageable et que
 * le retour arrière fonctionne. L'ancienne adresse `/favoris` ouvre
 * directement le bon onglet via `data.tab`.
 */
@Component({
  selector: 'app-track-applications',
  imports: [RouterLink, DatePipe, FormsModule, ConsoleShell],
  templateUrl: './track-applications.html',
  styleUrl: './track-applications.scss',
})
export class TrackApplications implements OnInit {
  private appService = inject(ApplicationService);
  private candidateService = inject(CandidateFeaturesService);
  private jobService = inject(JobOfferService);
  private interviewService = inject(InterviewService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toastr = inject(ToastrService);
  auth = inject(AuthService);
  bookmarkService = inject(BookmarkService);
  companyColor = companyColor;

  applications = signal<Application[]>([]);
  savedJobs = signal<JobOffer[]>([]);
  interviews = signal<InterviewItem[]>([]);

  /* ── Invitations reçues ──
     Un recruteur peut proposer une offre à un profil du vivier. Sans cet
     onglet, la proposition n'arrivait que par une notification, qui se
     perd dans la liste des autres. */
  invitations = signal<InvitationRecue[]>([]);

  loading = signal(true);
  loadingSaved = signal(true);
  remindingId = signal<number | null>(null);
  remindedIds = signal<Set<number>>(new Set());
  archivingId = signal<number | null>(null);

  tab = signal<Tab>('sent');

  // ── Répartition par onglet ──
  active = computed(() => this.applications().filter((a) => !a.isArchived));
  archived = computed(() => this.applications().filter((a) => a.isArchived));

  /** Celles qui attendent encore une décision : le compteur n'appelle
      pas à agir sur ce qui est déjà soldé. */
  invitationsOuvertes = computed(() => this.invitations().filter((i) => !i.reponse));

  tabCounts = computed(() => ({
    saved: this.savedJobs().length,
    sent: this.active().length,
    interviews: this.interviews().length,
    invitations: this.invitationsOuvertes().length,
    archived: this.archived().length,
  }));

  /** Compteurs de statut, sur les seules candidatures actives. */
  counts = computed(() => {
    const apps = this.active();
    return {
      total: apps.length,
      pending: apps.filter((a) => a.status === 'Pending').length,
      reviewed: apps.filter((a) => a.status === 'Reviewed').length,
      accepted: apps.filter((a) => a.status === 'Accepted').length,
      rejected: apps.filter((a) => a.status === 'Rejected').length,
    };
  });

  /* ── Filtre et recherche ──
     Les compteurs de statut etaient du texte inerte : « 2 en attente »
     indiquait un chiffre sans donner le moyen de voir lesquelles. Ils
     deviennent des filtres, et un champ permet de retrouver une
     candidature par le poste ou l'employeur — passe vingt candidatures,
     parcourir la liste ne marche plus. */
  statusFilter = signal<'' | 'Pending' | 'Reviewed' | 'Accepted' | 'Rejected'>('');
  query = signal('');

  filtered = computed(() => {
    const f = this.statusFilter();
    const q = this.query().trim().toLowerCase();
    return this.active().filter((a) => {
      if (f && a.status !== f) return false;
      if (!q) return true;
      const hay = `${a.jobOffer?.title ?? ''} ${a.jobOffer?.company ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  });

  toggleStatus(s: '' | 'Pending' | 'Reviewed' | 'Accepted' | 'Rejected') {
    this.statusFilter.update((cur) => (cur === s ? '' : s));
  }

  /**
   * Ou en est une candidature, sur les quatre etapes du parcours.
   *
   * La ligne n'affichait qu'une pastille de statut : « En attente »
   * pendant trois semaines ne dit pas si le recruteur a seulement ouvert
   * le dossier. Le chemin, lui, montre ce qui a ete franchi et ce qui
   * reste — et `reviewedAt`, que l'API renvoyait deja, servait a peine.
   */
  stages(app: Application): { label: string; done: boolean; current: boolean }[] {
    const seen = !!app.reviewedAt || app.status !== 'Pending';
    const answered = app.status === 'Accepted' || app.status === 'Rejected';
    const itw = app.status === 'Accepted';
    const steps = [
      { label: 'Envoyée', done: true },
      { label: 'Consultée', done: seen },
      { label: 'Entretien', done: itw },
      { label: 'Réponse', done: answered },
    ];
    // L'etape courante est la premiere non franchie : c'est la seule que
    // le candidat attend.
    const idx = steps.findIndex((s) => !s.done);
    return steps.map((s, i) => ({ ...s, current: i === idx }));
  }

  /** « il y a 5 jours » — le temps ecoule est l'information qu'on cherche. */
  sinceLabel(date: string): string {
    const d = this.daysSince(date);
    if (d <= 0) return "aujourd'hui";
    if (d === 1) return 'hier';
    if (d < 7) return `il y a ${d} jours`;
    if (d < 31) return `il y a ${Math.floor(d / 7)} sem.`;
    return `il y a ${Math.floor(d / 30)} mois`;
  }

  /** Une candidature qui dort depuis plus de deux semaines se signale. */
  isStale(app: Application): boolean {
    return app.status === 'Pending' && this.daysSince(app.appliedAt) >= 15;
  }

  ngOnInit() {
    const forced = this.route.snapshot.data['tab'] as Tab | undefined;
    const fromUrl = this.route.snapshot.queryParamMap.get('onglet') as Tab | null;
    this.tab.set(forced ?? fromUrl ?? 'sent');

    this.appService.trackMy().subscribe({
      next: (apps) => { this.applications.set(apps); this.loading.set(false); },
      error: () => this.loading.set(false),
    });

    const ids = this.bookmarkService.getAll();
    if (ids.length) {
      this.jobService.getAll().subscribe({
        next: (all) => { this.savedJobs.set(all.filter((j) => ids.includes(j.id))); this.loadingSaved.set(false); },
        error: () => this.loadingSaved.set(false),
      });
    } else {
      this.loadingSaved.set(false);
    }

    this.interviewService.getAll().subscribe({
      next: (list) => this.interviews.set(list),
      error: () => {},
    });

    this.candidateService.invitations().subscribe({
      next: (list) => this.invitations.set(list),
      error: () => {},
    });
  }

  setTab(tab: Tab) {
    this.tab.set(tab);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { onglet: tab },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  // ── Archivage ──
  setArchived(app: Application, isArchived: boolean, event?: Event) {
    event?.stopPropagation();
    this.archivingId.set(app.id);
    this.appService.setArchived(app.id, isArchived).subscribe({
      next: () => {
        this.applications.update((list) =>
          list.map((a) => (a.id === app.id ? { ...a, isArchived } : a)),
        );
        this.archivingId.set(null);
        this.toastr.success(isArchived ? 'Candidature rangée' : 'Candidature remise dans la liste');
      },
      error: () => {
        this.archivingId.set(null);
        this.toastr.error("L'archivage n'a pas pu être enregistré");
      },
    });
  }

  declinerInvitation(i: InvitationRecue) {
    this.candidateService.declinerInvitation(i.id).subscribe({
      next: () => {
        this.invitations.update((l) =>
          l.map((x) => (x.id === i.id ? { ...x, reponse: 'declinee' } : x)),
        );
        this.toastr.success('Invitation déclinée');
      },
      error: () => this.toastr.error("L'invitation n'a pas pu être déclinée"),
    });
  }

  removeSaved(jobId: number, event?: Event) {
    event?.stopPropagation();
    this.bookmarkService.toggle(jobId).subscribe();
    this.savedJobs.update((list) => list.filter((j) => j.id !== jobId));
  }

  // ── Libellés ──
  getStatusClass(status: string): string {
    return pastilleStatut(status);
  }

  getStatusLabel(status: string): string {
    return libelleStatut(status);
  }

  getStatusIcon(status: string): string {
    return iconeStatut(status);
  }

  interviewStatusLabel(status: string): string {
    return { Proposed: 'Proposé', Accepted: 'Confirmé', Declined: 'Décliné', Completed: 'Terminé', Cancelled: 'Annulé' }[status] || status;
  }

  interviewStatusClass(status: string): string {
    return { Proposed: 'st-pending', Accepted: 'st-accepted', Declined: 'st-rejected', Completed: 'st-reviewed', Cancelled: 'st-rejected' }[status] || '';
  }

  daysSince(date: string): number {
    return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
  }

  canRemind(app: Application): boolean {
    return app.status === 'Pending' && this.daysSince(app.appliedAt) >= 3 && !this.remindedIds().has(app.id);
  }

  remind(app: Application, event?: Event) {
    event?.stopPropagation();
    this.remindingId.set(app.id);
    this.appService.remind(app.id).subscribe({
      next: (r) => {
        this.remindingId.set(null);
        this.remindedIds.update((s) => new Set(s).add(app.id));
        this.toastr.success(r.message, 'Relance');
      },
      error: (err) => {
        this.remindingId.set(null);
        this.toastr.error(err.error?.message || 'Erreur');
      },
    });
  }

  withdraw(app: Application, event?: Event) {
    event?.stopPropagation();
    if (!confirm(`Retirer votre candidature pour « ${app.jobOffer?.title} » ? Cette action est irréversible.`)) return;
    this.candidateService.withdrawApplication(app.id).subscribe({
      next: () => {
        this.toastr.success('Candidature retirée');
        this.applications.update((list) => list.filter((a) => a.id !== app.id));
      },
      error: (err) => this.toastr.error(err.error?.message || err.error || 'Erreur'),
    });
  }
}
