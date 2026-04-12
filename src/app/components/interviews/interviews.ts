import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { InterviewService } from '../../services/interview.service';
import { AuthService } from '../../services/auth.service';
import { InterviewItem } from '../../models/job-offer.model';

@Component({
  selector: 'app-interviews',
  imports: [DatePipe, RouterLink],
  templateUrl: './interviews.html',
  styleUrl: './interviews.scss',
})
export class Interviews implements OnInit {
  private interviewService = inject(InterviewService);
  auth = inject(AuthService);
  private toastr = inject(ToastrService);

  interviews = signal<InterviewItem[]>([]);
  loading = signal(true);

  upcoming = computed(() => this.interviews().filter(i => ['Proposed', 'Accepted'].includes(i.status)));
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
    return { Proposed: 'Propose', Accepted: 'Confirme', Declined: 'Decline', Cancelled: 'Annule', Completed: 'Termine' }[s] || s;
  }

  getStatusClass(s: string): string {
    return { Proposed: 'st-proposed', Accepted: 'st-accepted', Declined: 'st-declined', Cancelled: 'st-cancelled', Completed: 'st-completed' }[s] || '';
  }

  getStatusIcon(s: string): string {
    return { Proposed: 'bi-clock', Accepted: 'bi-check-circle-fill', Declined: 'bi-x-circle-fill', Cancelled: 'bi-slash-circle', Completed: 'bi-trophy-fill' }[s] || 'bi-circle';
  }

  getTypeIcon(t?: string): string {
    return { Telephonique: 'bi-telephone-fill', Visio: 'bi-camera-video-fill', Presentiel: 'bi-building' }[t || ''] || 'bi-calendar-event';
  }

  isCandidate(): boolean { return this.auth.currentUser()?.role === 'Candidate'; }
  isRecruiter(): boolean { return this.auth.currentUser()?.role === 'Recruiter' || this.auth.currentUser()?.role === 'Admin'; }
}
