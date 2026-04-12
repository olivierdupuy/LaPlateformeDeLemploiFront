import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ApplicationService } from '../../services/application';
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
  private toastr = inject(ToastrService);
  companyColor = companyColor;

  applications = signal<Application[]>([]);
  loading = signal(true);
  editingNotesId = signal<number | null>(null);
  notesText = '';
  filterStatus = '';

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

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.appService.getAll().subscribe((apps) => { this.applications.set(apps); this.loading.set(false); });
  }

  getStatusBadgeClass(s: string): string {
    return { Pending: 'st-amber', Reviewed: 'st-blue', Accepted: 'st-green', Rejected: 'st-red' }[s] || '';
  }

  getStatusLabel(s: string): string {
    return { Pending: 'En attente', Reviewed: 'Examinee', Accepted: 'Acceptee', Rejected: 'Refusee' }[s] || s;
  }

  getStatusIcon(s: string): string {
    return { Pending: 'bi-clock', Reviewed: 'bi-eye-fill', Accepted: 'bi-check-circle-fill', Rejected: 'bi-x-circle-fill' }[s] || 'bi-circle';
  }

  updateStatus(app: Application, status: string) {
    this.appService.updateStatus(app.id, status).subscribe({
      next: () => { app.status = status; this.toastr.success(`Statut : ${this.getStatusLabel(status)}`); },
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
}
