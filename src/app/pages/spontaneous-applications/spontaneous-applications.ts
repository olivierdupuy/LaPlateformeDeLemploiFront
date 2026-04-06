import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { SeoService } from '../../services/seo.service';
import { ToastrService } from 'ngx-toastr';

interface SpontaneousApp {
  id: number;
  coverLetter: string | null;
  status: string;
  appliedAt: string;
  userId: number;
  userFullName: string;
  userEmail: string;
  userPhone: string | null;
  userSkills: string | null;
  userBio: string | null;
  companyId: number;
  companyName: string;
}

@Component({
  selector: 'app-spontaneous-applications',
  imports: [CommonModule, RouterLink],
  template: `
    <div class="container-main py-4">
      <div class="d-flex justify-content-between align-items-center mb-4 fade-up">
        <div>
          <h1 class="fw-bold mb-0" style="font-size:1.5rem;letter-spacing:-.02em;">
            <i class="bi bi-lightning me-2" style="color:var(--copper-500);"></i>
            {{ auth.isCompany ? 'Candidatures spontanees recues' : 'Mes candidatures spontanees' }}
          </h1>
          <p style="color:var(--sand-400);font-size:.88rem;margin-bottom:0;">{{ apps.length }} candidature{{ apps.length > 1 ? 's' : '' }}</p>
        </div>
        <a routerLink="/tableau-de-bord" class="btn-ghost"><i class="bi bi-arrow-left me-1"></i>Dashboard</a>
      </div>

      @if (loading) {
        <div class="text-center py-5"><span class="spinner-border text-success"></span></div>
      } @else if (apps.length === 0) {
        <div class="card-static p-5 text-center" style="border-radius:var(--r-xl);">
          <i class="bi bi-lightning" style="font-size:2.5rem;color:var(--sand-300);"></i>
          <p style="color:var(--sand-400);margin-top:1rem;">Aucune candidature spontanee</p>
        </div>
      } @else {
        <div class="d-flex flex-column gap-3">
          @for (app of apps; track app.id; let i = $index) {
            <div class="card-static p-3 fade-up" [ngClass]="'stagger-' + ((i % 8) + 1)" style="border-radius:var(--r-lg);">
              <div class="d-flex justify-content-between align-items-start">
                <div>
                  <div class="fw-bold" style="font-size:.95rem;">
                    {{ auth.isCompany ? app.userFullName : app.companyName }}
                  </div>
                  @if (auth.isCompany && app.userEmail) {
                    <div style="font-size:.82rem;color:var(--sand-400);">{{ app.userEmail }}</div>
                  }
                  @if (auth.isCompany && app.userSkills) {
                    <div style="font-size:.82rem;color:var(--forest-600);margin-top:.25rem;">{{ app.userSkills }}</div>
                  }
                  @if (app.coverLetter) {
                    <p style="font-size:.88rem;color:var(--sand-600);margin:.5rem 0 0;line-height:1.6;">{{ app.coverLetter }}</p>
                  }
                </div>
                <div class="text-end">
                  <span class="badge" [ngClass]="{'badge-pending': app.status==='Pending', 'badge-reviewed': app.status==='Reviewed', 'badge-accepted': app.status==='Accepted', 'badge-rejected': app.status==='Rejected'}">
                    {{ app.status === 'Pending' ? 'En attente' : app.status === 'Reviewed' ? 'Consultee' : app.status === 'Accepted' ? 'Acceptee' : 'Refusee' }}
                  </span>
                  <div style="font-size:.75rem;color:var(--sand-400);margin-top:.3rem;">{{ app.appliedAt | date:'dd/MM/yyyy' }}</div>
                  @if (auth.isCompany && app.status === 'Pending') {
                    <div class="d-flex gap-1 mt-2 justify-content-end">
                      <button class="btn-ghost" style="padding:.2rem .5rem;font-size:.75rem;" (click)="updateStatus(app, 'Reviewed')">Consulter</button>
                      <button class="btn btn-primary" style="padding:.2rem .5rem;font-size:.75rem;" (click)="updateStatus(app, 'Accepted')">Accepter</button>
                    </div>
                  }
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `
})
export class SpontaneousApplications implements OnInit {
  apps: SpontaneousApp[] = [];
  loading = true;

  constructor(public auth: AuthService, private http: HttpClient, private toastr: ToastrService, private cdr: ChangeDetectorRef, private seo: SeoService) {}

  ngOnInit(): void {
    this.seo.setNoIndex('Candidatures spontanees', 'Gerez vos candidatures spontanees envoyees aux entreprises.');
    const url = this.auth.isCompany ? '/api/spontaneous/received' : '/api/spontaneous/mine';
    this.http.get<SpontaneousApp[]>(url).subscribe({
      next: apps => { this.apps = apps; this.loading = false; this.cdr.detectChanges(); },
      error: () => { this.loading = false; this.cdr.detectChanges(); }
    });
  }

  updateStatus(app: SpontaneousApp, status: string): void {
    this.http.put(`/api/spontaneous/${app.id}/status`, { status }).subscribe({
      next: () => { app.status = status; this.toastr.success('Statut mis a jour'); },
      error: () => this.toastr.error('Erreur')
    });
  }
}
