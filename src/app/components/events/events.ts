import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { EventService, JobEvent } from '../../services/event.service';
import { FtEvents } from '../ft-events/ft-events';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-events',
  imports: [FormsModule, DatePipe, RouterLink, FtEvents],
  templateUrl: './events.html',
  styleUrl: './events.scss',
})
export class Events implements OnInit {
  private eventSvc = inject(EventService);
  private toastr = inject(ToastrService);
  auth = inject(AuthService);

  events = signal<JobEvent[]>([]);
  loading = signal(true);
  past = signal(false);

  /**
   * Deux sources cohabitent : nos evenements et ceux de France Travail.
   * Les melanger serait trompeur — on ne modere pas les seconds — donc
   * un onglet les separe.
   */
  source = signal<'nous' | 'francetravail'>('nous');

  modalOpen = signal(false);
  submitting = signal(false);
  form: any = { title: '', description: '', type: 'Salon', startsAt: '', endsAt: '', isOnline: false, location: '', url: '', organizer: '' };
  types = ['Salon', 'Webinaire', 'Job dating', 'Conférence'];

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.eventSvc.getAll(this.past()).subscribe({
      next: (e) => { this.events.set(e); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
  setPast(v: boolean) { this.past.set(v); this.load(); }

  get canManage(): boolean {
    const r = this.auth.currentUser()?.role;
    return r === 'Recruiter' || r === 'Admin';
  }
  canDelete(e: JobEvent): boolean {
    const u = this.auth.currentUser();
    return u?.role === 'Admin' || e.createdByUserId === u?.id;
  }

  typeIcon(t: string): string {
    return { Salon: 'bi-buildings', Webinaire: 'bi-camera-video', 'Job dating': 'bi-people', 'Conférence': 'bi-mic' }[t] || 'bi-calendar-event';
  }

  openCreate() {
    this.form = { title: '', description: '', type: 'Salon', startsAt: '', endsAt: '', isOnline: false, location: '', url: '', organizer: '' };
    this.modalOpen.set(true);
  }
  closeCreate() { this.modalOpen.set(false); }
  submitCreate() {
    if (!this.form.title.trim() || !this.form.startsAt) { this.toastr.warning('Titre et date de début requis'); return; }
    this.submitting.set(true);
    this.eventSvc.create({ ...this.form, endsAt: this.form.endsAt || undefined }).subscribe({
      next: () => { this.submitting.set(false); this.modalOpen.set(false); this.toastr.success('Événement publié'); this.load(); },
      error: () => { this.submitting.set(false); this.toastr.error('Erreur'); },
    });
  }
  deleteEvent(e: JobEvent) {
    this.eventSvc.delete(e.id).subscribe({
      next: () => { this.toastr.success('Événement supprimé'); this.load(); },
      error: () => this.toastr.error('Erreur'),
    });
  }
}
