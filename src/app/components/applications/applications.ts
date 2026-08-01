import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ApplicationService } from '../../services/application';
import { InterviewService } from '../../services/interview.service';
import { RecruiterFeaturesService } from '../../services/recruiter-features.service';
import { Application } from '../../models/job-offer.model';
import { companyColor } from '../../utils/job.utils';
import { fichierUrl } from '../../utils/fichiers';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';
import { ConsoleShell } from '../console-shell/console-shell';

@Component({
  selector: 'app-applications',
  imports: [RouterLink, DatePipe, FormsModule, ConsoleShell],
  templateUrl: './applications.html',
  styleUrl: './applications.scss',
})
export class Applications implements OnInit {
  private appService = inject(ApplicationService);
  private interviewService = inject(InterviewService);
  private recruiterService = inject(RecruiterFeaturesService);
  private toastr = inject(ToastrService);
  companyColor = companyColor;
  fichierUrl = fichierUrl;

  applications = signal<Application[]>([]);
  loading = signal(true);
  editingNotesId = signal<number | null>(null);
  schedulingId = signal<number | null>(null);
  notesText = '';
  filterStatus = '';
  viewMode = signal<'list' | 'kanban'>('list');
  selectedIds = signal<Set<number>>(new Set());

  interviewForm = { proposedAt: '', location: '', notes: '', duration: 60, type: 'Visio', interviewerName: '' };

  /* ═══ Tri et filtres ═══
     La page ne savait filtrer que par statut. Passe la dizaine de
     candidatures — et surtout des que plusieurs offres sont en ligne —
     un recruteur ne trie pas « toutes les candidatures en attente », il
     trie « les candidatures en attente pour ce poste ». */
  query = signal('');
  offerFilter = signal<number | ''>('');
  sort = signal<'recent' | 'old' | 'name' | 'status'>('recent');

  /** Les offres reellement representees dans les candidatures recues. */
  offers = computed(() => {
    const seen = new Map<number, string>();
    for (const a of this.applications()) {
      if (a.jobOfferId && !seen.has(a.jobOfferId)) {
        seen.set(a.jobOfferId, a.jobOffer?.title || `Offre ${a.jobOfferId}`);
      }
    }
    return [...seen].map(([id, title]) => ({ id, title }));
  });

  /** Ordre des statuts dans le parcours, pour le tri « par avancement ». */
  private readonly ORDRE: Record<string, number> = { Pending: 0, Reviewed: 1, Accepted: 2, Rejected: 3 };

  filtered = computed(() => {
    const f = this.filterStatus;
    const off = this.offerFilter();
    const q = this.query().trim().toLowerCase();
    const s = this.sort();

    const out = this.applications().filter((a) => {
      if (f && a.status !== f) return false;
      if (off !== '' && a.jobOfferId !== off) return false;
      if (!q) return true;
      const hay = `${a.fullName ?? ''} ${a.email ?? ''} ${a.jobOffer?.title ?? ''}`.toLowerCase();
      return hay.includes(q);
    });

    // Copie avant tri : `filter` en rend une neuve, mais mieux vaut que
    // ce soit explicite — trier en place le tableau du signal le
    // muterait sous les autres calculs.
    return [...out].sort((a, b) => {
      switch (s) {
        case 'old': return +new Date(a.appliedAt) - +new Date(b.appliedAt);
        case 'name': return (a.fullName ?? '').localeCompare(b.fullName ?? '', 'fr');
        case 'status': return (this.ORDRE[a.status] ?? 9) - (this.ORDRE[b.status] ?? 9);
        default: return +new Date(b.appliedAt) - +new Date(a.appliedAt);
      }
    });
  });

  /** Vrai des qu'un critere restreint la liste — pour proposer de l'effacer. */
  hasFilters = computed(() => !!this.filterStatus || this.offerFilter() !== '' || !!this.query().trim());

  clearFilters() {
    this.filterStatus = '';
    this.offerFilter.set('');
    this.query.set('');
  }

  counts = computed(() => {
    const apps = this.applications();
    return {
      total: apps.length,
      pending: apps.filter(a => a.status === 'Pending').length,
      reviewed: apps.filter(a => a.status === 'Reviewed').length,
      accepted: apps.filter(a => a.status === 'Accepted').length,
      rejected: apps.filter(a => a.status === 'Rejected').length,
    };
  });

  /* Les colonnes lisent la liste filtree, pas la liste brute.
     La recherche et le filtre par offre n'avaient aucun effet en vue
     kanban : on cherchait un candidat, la liste se reduisait a une carte,
     et le kanban continuait d'en afficher quarante. Le filtre par statut
     est en revanche ignore ici — c'est le kanban lui-meme qui range par
     statut, l'appliquer deux fois viderait trois colonnes sur quatre. */
  private forBoard = computed(() => {
    const off = this.offerFilter();
    const q = this.query().trim().toLowerCase();
    return this.applications().filter((a) => {
      if (off !== '' && a.jobOfferId !== off) return false;
      if (!q) return true;
      return `${a.fullName ?? ''} ${a.email ?? ''} ${a.jobOffer?.title ?? ''}`.toLowerCase().includes(q);
    });
  });

  kanbanPending = computed(() => this.forBoard().filter(a => a.status === 'Pending'));
  kanbanReviewed = computed(() => this.forBoard().filter(a => a.status === 'Reviewed'));
  kanbanAccepted = computed(() => this.forBoard().filter(a => a.status === 'Accepted'));
  kanbanRejected = computed(() => this.forBoard().filter(a => a.status === 'Rejected'));

  /** Nombre de candidatures visibles sur le tableau, filtres compris. */
  boardCount = computed(() => this.forBoard().length);

  /** Depuis combien de temps la candidature attend. */
  daysSince(date: string): number {
    return Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000);
  }

  sinceLabel(date: string): string {
    const d = this.daysSince(date);
    if (d <= 0) return "aujourd'hui";
    if (d === 1) return 'hier';
    if (d < 7) return `il y a ${d} j`;
    if (d < 31) return `il y a ${Math.floor(d / 7)} sem.`;
    return `il y a ${Math.floor(d / 30)} mois`;
  }

  /** Une candidature en attente depuis plus d'une semaine se signale. */
  isStale(app: Application): boolean {
    return app.status === 'Pending' && this.daysSince(app.appliedAt) >= 7;
  }

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.appService.getAll().subscribe((apps) => { this.applications.set(apps); this.loading.set(false); });
  }

  getStatusBadgeClass(s: string): string { return { Pending: 'st-amber', Reviewed: 'st-blue', Accepted: 'st-green', Rejected: 'st-red' }[s] || ''; }
  getStatusLabel(s: string): string { return { Pending: 'En attente', Reviewed: 'Examinée', Accepted: 'Acceptée', Rejected: 'Refusée' }[s] || s; }
  getStatusIcon(s: string): string { return { Pending: 'bi-clock', Reviewed: 'bi-eye-fill', Accepted: 'bi-check-circle-fill', Rejected: 'bi-x-circle-fill' }[s] || 'bi-circle'; }

  updateStatus(app: Application, status: string) {
    this.appService.updateStatus(app.id, status).subscribe({
      next: () => { app.status = status; this.applications.update(a => [...a]); this.toastr.success(`Statut : ${this.getStatusLabel(status)}`); },
      error: () => this.toastr.error('Erreur'),
    });
  }

  getScreeningAnswers(app: Application): { question: string; answer: string }[] {
    if (!app.screeningAnswers) return [];
    try { return JSON.parse(app.screeningAnswers) || []; } catch { return []; }
  }

  openNotes(app: Application) { this.editingNotesId.set(app.id); this.notesText = app.recruiterNotes || ''; }
  saveNotes(app: Application) {
    this.appService.updateNotes(app.id, this.notesText).subscribe({
      next: () => { app.recruiterNotes = this.notesText; this.editingNotesId.set(null); this.toastr.success('Notes enregistrées'); },
      error: () => this.toastr.error('Erreur'),
    });
  }
  cancelNotes() { this.editingNotesId.set(null); }

  async deleteApplication(app: Application) {
    const res = await Swal.fire({ title: 'Supprimer cette candidature ?', text: `Candidature de ${app.fullName}`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#c6364b', confirmButtonText: 'Supprimer', cancelButtonText: 'Annuler' });
    if (res.isConfirmed) {
      this.appService.delete(app.id).subscribe({
        next: () => { this.applications.update((a) => a.filter((x) => x.id !== app.id)); this.toastr.success('Supprimee'); },
        error: () => this.toastr.error('Erreur'),
      });
    }
  }

  // ── Interview scheduling ──
  openSchedule(appId: number) {
    this.schedulingId.set(appId);
    this.interviewForm = { proposedAt: '', location: '', notes: '', duration: 60, type: 'Visio', interviewerName: '' };
  }
  cancelSchedule() { this.schedulingId.set(null); }
  submitInterview(appId: number) {
    if (!this.interviewForm.proposedAt) { this.toastr.warning('Sélectionnez une date'); return; }
    this.interviewService.create({
      applicationId: appId, proposedAt: this.interviewForm.proposedAt,
      location: this.interviewForm.location || undefined, notes: this.interviewForm.notes || undefined,
      duration: this.interviewForm.duration || undefined, type: this.interviewForm.type || undefined,
      interviewerName: this.interviewForm.interviewerName || undefined,
    }).subscribe({
      next: () => { this.schedulingId.set(null); this.toastr.success('Entretien planifié — candidat notifié'); },
      error: () => this.toastr.error('Erreur'),
    });
  }

  // ── Kanban ──
  draggedApp: Application | null = null;
  onDragStart(app: Application) { this.draggedApp = app; }
  onDragOver(event: DragEvent) { event.preventDefault(); }
  onDrop(event: DragEvent, status: string) {
    event.preventDefault();
    if (this.draggedApp && this.draggedApp.status !== status) this.updateStatus(this.draggedApp, status);
    this.draggedApp = null;
  }

  // ── Bulk ──
  toggleSelect(id: number) { this.selectedIds.update(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; }); }
  isSelected(id: number): boolean { return this.selectedIds().has(id); }
  selectAll() { this.selectedIds.set(new Set(this.filtered().map(a => a.id))); }
  deselectAll() { this.selectedIds.set(new Set()); }
  bulkAction(status: string) {
    const ids = Array.from(this.selectedIds());
    if (!ids.length) return;
    this.recruiterService.bulkUpdateStatus(ids, status).subscribe({
      next: (res) => { this.toastr.success(`${res.updated} candidature(s) mises a jour`); this.selectedIds.set(new Set()); this.load(); },
      error: () => this.toastr.error('Erreur'),
    });
  }
}
