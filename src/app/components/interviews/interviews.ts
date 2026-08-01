import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { InterviewService } from '../../services/interview.service';
import { CandidateFeaturesService } from '../../services/candidate-features.service';
import { AuthService } from '../../services/auth.service';
import { InterviewItem } from '../../models/job-offer.model';
import { ConsoleShell } from '../console-shell/console-shell';

@Component({
  selector: 'app-interviews',
  imports: [DatePipe, RouterLink, FormsModule, ConsoleShell],
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
    return { Proposed: 'Proposé', Accepted: 'Confirmé', Declined: 'Décliné', Cancelled: 'Annulé', Completed: 'Terminé', Negotiating: 'En négociation' }[s] || s;
  }

  /**
   * Jours restants avant le rendez-vous.
   *
   * Compare des dates de calendrier, pas des instants : un entretien
   * demain matin est « demain », meme s'il est dans dix-huit heures.
   */
  daysUntil(date: string): number {
    const a = new Date(date); a.setHours(0, 0, 0, 0);
    const b = new Date(); b.setHours(0, 0, 0, 0);
    return Math.round((a.getTime() - b.getTime()) / 86_400_000);
  }

  /**
   * Le decompte, en toutes lettres.
   *
   * La carte donnait la date et l'heure sans jamais dire ce qui arrive en
   * premier : un agenda sert a savoir ce qui vient, pas seulement ce qui
   * est note.
   */
  countdown(date: string): string {
    const d = this.daysUntil(date);
    if (d < 0) return `il y a ${Math.abs(d)} jour${Math.abs(d) > 1 ? 's' : ''}`;
    if (d === 0) return "aujourd'hui";
    if (d === 1) return 'demain';
    if (d < 7) return `dans ${d} jours`;
    if (d < 31) return `dans ${Math.floor(d / 7)} semaine${Math.floor(d / 7) > 1 ? 's' : ''}`;
    return `dans ${Math.floor(d / 30)} mois`;
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
  isRecruiter(): boolean { return this.auth.currentUser()?.role === 'Recruiter'; }

  startPropose(id: number) { this.proposingId.set(id); this.proposedSlots = ['', '', '']; this.proposeMessage = ''; }
  cancelPropose() { this.proposingId.set(null); }

  submitSlots(id: number) {
    const slots = this.proposedSlots.filter(s => s);
    if (slots.length === 0) { this.toastr.warning('Proposez au moins un créneau'); return; }
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
