import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { SeoService } from '../../services/seo.service';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';

interface InterviewDto {
  id: number;
  scheduledAt: string;
  durationMinutes: number;
  type: string;
  location: string | null;
  notes: string | null;
  status: string;
  applicationId: number;
  jobOfferTitle: string;
  candidateName: string;
  candidateEmail: string;
  companyUserName: string;
  createdAt: string;
}

@Component({
  selector: 'app-interviews',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './interviews.html',
  styleUrl: './interviews.css'
})
export class Interviews implements OnInit {
  interviews: InterviewDto[] = [];
  loading = true;

  // Form pour planifier
  showForm = false;
  formApplicationId = 0;
  formDate = '';
  formTime = '';
  formDuration = 30;
  formType = 'Visio';
  formLocation = '';
  formNotes = '';
  saving = false;

  constructor(public auth: AuthService, private http: HttpClient, private toastr: ToastrService, private cdr: ChangeDetectorRef, private seo: SeoService) {}

  ngOnInit(): void {
    this.seo.setNoIndex('Entretiens', 'Planifiez et suivez vos entretiens d\'embauche.');
    this.load();
  }

  load(): void {
    this.http.get<InterviewDto[]>('/api/interviews').subscribe({
      next: interviews => { this.interviews = interviews; this.loading = false; this.cdr.detectChanges(); },
      error: () => { this.loading = false; this.cdr.detectChanges(); }
    });
  }

  get upcomingInterviews(): InterviewDto[] {
    return this.interviews.filter(i => i.status === 'Planned' || i.status === 'Confirmed');
  }

  get pastInterviews(): InterviewDto[] {
    return this.interviews.filter(i => i.status === 'Completed' || i.status === 'Cancelled');
  }

  scheduleInterview(): void {
    if (!this.formDate || !this.formTime) return;
    this.saving = true;
    const scheduledAt = new Date(`${this.formDate}T${this.formTime}`).toISOString();
    this.http.post<InterviewDto>('/api/interviews', {
      applicationId: this.formApplicationId,
      scheduledAt,
      durationMinutes: this.formDuration,
      type: this.formType,
      location: this.formLocation || null,
      notes: this.formNotes || null
    }).subscribe({
      next: interview => {
        this.interviews.unshift(interview);
        this.toastr.success('Entretien planifie');
        this.showForm = false;
        this.saving = false;
        this.resetForm();
      },
      error: (err) => {
        this.toastr.error(err.error?.message || 'Erreur');
        this.saving = false;
      }
    });
  }

  async cancelInterview(interview: InterviewDto): Promise<void> {
    const result = await Swal.fire({
      title: 'Annuler cet entretien ?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      confirmButtonText: 'Oui, annuler',
      cancelButtonText: 'Non'
    });
    if (!result.isConfirmed) return;

    this.http.delete(`/api/interviews/${interview.id}`).subscribe({
      next: () => {
        this.interviews = this.interviews.filter(i => i.id !== interview.id);
        this.toastr.success('Entretien annule');
      },
      error: () => this.toastr.error('Erreur')
    });
  }

  markCompleted(interview: InterviewDto): void {
    this.http.put(`/api/interviews/${interview.id}`, { status: 'Completed' }).subscribe({
      next: () => { interview.status = 'Completed'; this.toastr.success('Marque comme termine'); },
      error: () => this.toastr.error('Erreur')
    });
  }

  confirmInterview(interview: InterviewDto): void {
    this.http.put(`/api/interviews/${interview.id}`, { status: 'Confirmed' }).subscribe({
      next: () => { interview.status = 'Confirmed'; this.toastr.success('Entretien confirme'); },
      error: () => this.toastr.error('Erreur')
    });
  }

  resetForm(): void {
    this.formApplicationId = 0;
    this.formDate = '';
    this.formTime = '';
    this.formDuration = 30;
    this.formType = 'Visio';
    this.formLocation = '';
    this.formNotes = '';
  }

  formatDate(d: string): string {
    return new Date(d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  formatTime(d: string): string {
    return new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  getTypeIcon(type: string): string {
    return type === 'Visio' ? 'bi-camera-video' : type === 'Telephone' ? 'bi-telephone' : 'bi-building';
  }

  getStatusColor(status: string): string {
    return status === 'Planned' ? 'var(--copper-500)' : status === 'Confirmed' ? 'var(--forest-500)' : status === 'Completed' ? 'var(--sand-400)' : 'var(--rose-500)';
  }

  getStatusLabel(status: string): string {
    return status === 'Planned' ? 'Planifie' : status === 'Confirmed' ? 'Confirme' : status === 'Completed' ? 'Termine' : 'Annule';
  }
}
