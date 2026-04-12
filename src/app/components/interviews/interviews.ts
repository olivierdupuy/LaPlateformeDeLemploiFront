import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { InterviewService } from '../../services/interview.service';
import { CandidateFeaturesService } from '../../services/candidate-features.service';
import { AuthService } from '../../services/auth.service';
import { InterviewItem } from '../../models/job-offer.model';

@Component({
  selector: 'app-interviews',
  imports: [DatePipe, RouterLink, FormsModule],
  templateUrl: './interviews.html',
  styleUrl: './interviews.scss',
})
export class Interviews implements OnInit {
  private interviewService = inject(InterviewService);
  auth = inject(AuthService);
  private toastr = inject(ToastrService);

  interviews = signal<InterviewItem[]>([]);
  loading = signal(true);

  private candidateService = inject(CandidateFeaturesService);
  proposingId = signal<number | null>(null);
  proposedSlots: string[] = ['', '', ''];
  proposeMessage = '';

  upcoming = computed(() => this.interviews().filter(i => ['Proposed', 'Accepted', 'Negotiating'].includes(i.status)));
  past = computed(() => this.interviews().filter(i => ['Completed', 'Declined', 'Cancelled'].includes(i.status)));

  counts = computed(() => ({
    total: this.interviews().length,
    proposed: this.interviews().filter(i => i.status === 'Proposed').length,
    accepted: this.interviews().filter(i => i.status === 'Accepted').length,
    completed: this.interviews().filter(i => i.status === 'Completed').length,
  }));

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.interviewService.getAll().subscribe({
      next: (d) => { this.interviews.set(d); this.loading.set(false); },
      error: () => { this.loading.set(false); },
    });
  }

  updateStatus(id: number, status: string) {
    this.interviewService.updateStatus(id, status).subscribe({
      next: () => {
        this.interviews.update((list) => list.map((i) => i.id === id ? { ...i, status } : i));
        this.toastr.success(`Entretien ${this.getStatusLabel(status).toLowerCase()}`);
      },
      error: () => this.toastr.error('Erreur'),
    });
  }

  getStatusLabel(s: string): string {
    return { Proposed: 'Propose', Accepted: 'Confirme', Declined: 'Decline', Cancelled: 'Annule', Completed: 'Termine', Negotiating: 'En negociation' }[s] || s;
  }

  getStatusClass(s: string): string {
    return { Proposed: 'st-proposed', Accepted: 'st-accepted', Declined: 'st-declined', Cancelled: 'st-cancelled', Completed: 'st-completed', Negotiating: 'st-proposed' }[s] || '';
  }

  getStatusIcon(s: string): string {
    return { Proposed: 'bi-clock', Accepted: 'bi-check-circle-fill', Declined: 'bi-x-circle-fill', Cancelled: 'bi-slash-circle', Completed: 'bi-trophy-fill' }[s] || 'bi-circle';
  }

  getTypeIcon(t?: string): string {
    return { Telephonique: 'bi-telephone-fill', Visio: 'bi-camera-video-fill', Presentiel: 'bi-building' }[t || ''] || 'bi-calendar-event';
  }

  isCandidate(): boolean { return this.auth.currentUser()?.role === 'Candidate'; }
  isRecruiter(): boolean { return this.auth.currentUser()?.role === 'Recruiter' || this.auth.currentUser()?.role === 'Admin'; }

  startPropose(id: number) { this.proposingId.set(id); this.proposedSlots = ['', '', '']; this.proposeMessage = ''; }
  cancelPropose() { this.proposingId.set(null); }

  submitSlots(id: number) {
    const slots = this.proposedSlots.filter(s => s);
    if (slots.length === 0) { this.toastr.warning('Proposez au moins un creneau'); return; }
    this.candidateService.proposeSlots(id, slots, this.proposeMessage || undefined).subscribe({
      next: () => {
        this.toastr.success('Creneaux proposes au recruteur');
        this.proposingId.set(null);
        this.load();
      },
      error: (err) => this.toastr.error(err.error?.message || err.error || 'Erreur'),
    });
  }
}
