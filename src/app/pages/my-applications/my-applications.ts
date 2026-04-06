import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ApplicationService } from '../../services/application.service';
import { AuthService } from '../../services/auth.service';
import { SeoService } from '../../services/seo.service';
import { ApplicationDto } from '../../models/application.model';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-my-applications',
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './my-applications.html',
  styleUrl: './my-applications.css'
})
export class MyApplications implements OnInit {
  allApplications: ApplicationDto[] = [];
  applications: ApplicationDto[] = [];
  loading = true;
  searchQuery = '';
  filterStatus = '';
  filterOffer = '';
  offerNames: string[] = [];
  selectedIds = new Set<number>();
  bulkProcessing = false;

  constructor(
    private appService: ApplicationService,
    public auth: AuthService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
    private http: HttpClient,
    private seo: SeoService
  ) {}

  ngOnInit(): void {
    this.seo.setNoIndex('Candidatures', 'Suivez l\'avancement de toutes vos candidatures.');
    const obs = this.auth.isCompany ? this.appService.getReceivedApplications() : this.appService.getMyApplications();
    obs.subscribe({ next: a => {
      this.allApplications = a;
      this.applications = a;
      this.offerNames = [...new Set(a.map(x => x.jobOfferTitle))];
      this.loading = false;
      this.cdr.detectChanges();
    }});
  }

  applyFilters(): void {
    let filtered = this.allApplications;
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      filtered = filtered.filter(a =>
        a.userFullName.toLowerCase().includes(q) ||
        a.userEmail.toLowerCase().includes(q) ||
        (a.userSkills || '').toLowerCase().includes(q) ||
        a.jobOfferTitle.toLowerCase().includes(q)
      );
    }
    if (this.filterStatus) filtered = filtered.filter(a => a.status === this.filterStatus);
    if (this.filterOffer) filtered = filtered.filter(a => a.jobOfferTitle === this.filterOffer);
    this.applications = filtered;
    this.cdr.detectChanges();
  }

  updateStatus(app: ApplicationDto, status: string): void {
    this.appService.updateStatus(app.id, status).subscribe({
      next: updated => {
        app.status = updated.status;
        this.toastr.success(`Candidature ${status === 'Accepted' ? 'acceptee' : status === 'Rejected' ? 'refusee' : 'mise a jour'}`);
        this.cdr.detectChanges();
      },
      error: () => this.toastr.error('Erreur')
    });
  }

  withdraw(app: ApplicationDto): void {
    Swal.fire({
      title: 'Retirer cette candidature ?', icon: 'warning',
      showCancelButton: true, confirmButtonColor: '#e11d48',
      confirmButtonText: '<i class="bi bi-x-circle me-1"></i> Retirer', cancelButtonText: 'Annuler'
    }).then(r => {
      if (r.isConfirmed) {
        this.appService.deleteApplication(app.id).subscribe({
          next: () => { this.applications = this.applications.filter(a => a.id !== app.id); this.toastr.success('Candidature retiree'); this.cdr.detectChanges(); }
        });
      }
    });
  }

  toggleSelection(id: number): void {
    this.selectedIds.has(id) ? this.selectedIds.delete(id) : this.selectedIds.add(id);
  }

  toggleAll(): void {
    if (this.selectedIds.size === this.applications.length) {
      this.selectedIds.clear();
    } else {
      this.applications.forEach(a => this.selectedIds.add(a.id));
    }
  }

  bulkAction(status: string): void {
    if (this.selectedIds.size === 0) return;
    this.bulkProcessing = true;
    this.http.put<any>('/api/applications/bulk-status', { ids: [...this.selectedIds], status }).subscribe({
      next: res => {
        this.applications.forEach(a => { if (this.selectedIds.has(a.id)) a.status = status; });
        this.allApplications.forEach(a => { if (this.selectedIds.has(a.id)) a.status = status; });
        this.toastr.success(`${res.count} candidature(s) mise(s) a jour`);
        this.selectedIds.clear();
        this.bulkProcessing = false;
        this.cdr.detectChanges();
      },
      error: () => { this.toastr.error('Erreur'); this.bulkProcessing = false; }
    });
  }

  saveNotes(app: ApplicationDto, event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    if (value === (app.internalNotes || '')) return;
    app.internalNotes = value || null;
    this.appService.updateNotes(app.id, app.internalNotes).subscribe({
      next: () => this.toastr.success('Note enregistree'),
      error: () => this.toastr.error('Erreur')
    });
  }

  statusClass(s: string): string { return { 'Pending': 'badge-pending', 'Reviewed': 'badge-reviewed', 'Accepted': 'badge-accepted', 'Rejected': 'badge-rejected' }[s] || ''; }
  statusLabel(s: string): string { return { 'Pending': 'En attente', 'Reviewed': 'Consultee', 'Accepted': 'Acceptee', 'Rejected': 'Refusee' }[s] || s; }
}
