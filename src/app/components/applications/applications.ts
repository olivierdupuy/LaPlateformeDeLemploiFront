import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ApplicationService } from '../../services/application';
import { InterviewService } from '../../services/interview.service';
import { RecruiterFeaturesService } from '../../services/recruiter-features.service';
import { Application } from '../../models/job-offer.model';
import { companyColor } from '../../utils/job.utils';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-applications',
  imports: [RouterLink, DatePipe, FormsModule],
  templateUrl: './applications.html',
  styleUrl: './applications.scss',
})
export class Applications implements OnInit {
  private appService = inject(ApplicationService);
  private interviewService = inject(InterviewService);
  private recruiterService = inject(RecruiterFeaturesService);
  private toastr = inject(ToastrService);
  companyColor = companyColor;

  applications = signal<Application[]>([]);
  loading = signal(true);
  editingNotesId = signal<number | null>(null);
  schedulingId = signal<number | null>(null);
  notesText = '';
  filterStatus = '';
  viewMode = signal<'list' | 'kanban'>('list');
  selectedIds = signal<Set<number>>(new Set());

  interviewForm = { proposedAt: '', location: '', notes: '', duration: 60, type: 'Visio', interviewerName: '' };

  filtered = computed(() => {
    const f = this.filterStatus;
    return f ? this.applications().filter(a => a.status === f) : this.applications();
  });

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

  kanbanPending = computed(() => this.applications().filter(a => a.status === 'Pending'));
  kanbanReviewed = computed(() => this.applications().filter(a => a.status === 'Reviewed'));
  kanbanAccepted = computed(() => this.applications().filter(a => a.status === 'Accepted'));
  kanbanRejected = computed(() => this.applications().filter(a => a.status === 'Rejected'));

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.appService.getAll().subscribe((apps) => { this.applications.set(apps); this.loading.set(false); });
  }

  getStatusBadgeClass(s: string): string { return { Pending: 'st-amber', Reviewed: 'st-blue', Accepted: 'st-green', Rejected: 'st-red' }[s] || ''; }
  getStatusLabel(s: string): string { return { Pending: 'En attente', Reviewed: 'Examinee', Accepted: 'Acceptee', Rejected: 'Refusee' }[s] || s; }
  getStatusIcon(s: string): string { return { Pending: 'bi-clock', Reviewed: 'bi-eye-fill', Accepted: 'bi-check-circle-fill', Rejected: 'bi-x-circle-fill' }[s] || 'bi-circle'; }

  updateStatus(app: Application, status: string) {
    this.appService.updateStatus(app.id, status).subscribe({
      next: () => { app.status = status; this.applications.update(a => [...a]); this.toastr.success(`Statut : ${this.getStatusLabel(status)}`); },
      error: () => this.toastr.error('Erreur'),
    });
  }

  openNotes(app: Application) { this.editingNotesId.set(app.id); this.notesText = app.recruiterNotes || ''; }
  saveNotes(app: Application) {
    this.appService.updateNotes(app.id, this.notesText).subscribe({
      next: () => { app.recruiterNotes = this.notesText; this.editingNotesId.set(null); this.toastr.success('Notes sauvegardees'); },
      error: () => this.toastr.error('Erreur'),
    });
  }
  cancelNotes() { this.editingNotesId.set(null); }

  async deleteApplication(app: Application) {
    const res = await Swal.fire({ title: 'Supprimer cette candidature ?', text: `Candidature de ${app.fullName}`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#dc2626', confirmButtonText: 'Supprimer', cancelButtonText: 'Annuler' });
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
    if (!this.interviewForm.proposedAt) { this.toastr.warning('Selectionnez une date'); return; }
    this.interviewService.create({
      applicationId: appId, proposedAt: this.interviewForm.proposedAt,
      location: this.interviewForm.location || undefined, notes: this.interviewForm.notes || undefined,
      duration: this.interviewForm.duration || undefined, type: this.interviewForm.type || undefined,
      interviewerName: this.interviewForm.interviewerName || undefined,
    }).subscribe({
      next: () => { this.schedulingId.set(null); this.toastr.success('Entretien planifie — candidat notifie'); },
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
