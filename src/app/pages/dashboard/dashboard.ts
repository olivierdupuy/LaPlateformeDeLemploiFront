import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { ApplicationService } from '../../services/application.service';
import { NotificationService, AppNotification } from '../../services/notification.service';
import { JobOfferService } from '../../services/job-offer.service';
import { ApplicationDto, DashboardStats, FavoriteDto } from '../../models/application.model';
import { JobOffer } from '../../models/job-offer.model';
import { AIService, CandidateScore } from '../../services/ai.service';
import { RecommendationService } from '../../services/recommendation.service';
import { RecommendedJob } from '../../models/preferences.model';
import { SeoService } from '../../services/seo.service';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit {
  stats: DashboardStats | null = null;
  notifications: AppNotification[] = [];
  profileCompletion = 0;

  // === JobSeeker ===
  allApplications: ApplicationDto[] = [];
  recentApplications: ApplicationDto[] = [];
  favorites: FavoriteDto[] = [];
  suggestedJobs: JobOffer[] = [];
  recommendedJobs: RecommendedJob[] = [];
  hasPrefs = false;
  appFilter: 'all' | 'Pending' | 'Reviewed' | 'Accepted' | 'Rejected' = 'all';

  // === Company ===
  companyOffers: any[] = [];
  companyApplications: ApplicationDto[] = [];
  companyAppFilter: 'all' | 'Pending' | 'Reviewed' | 'Accepted' | 'Rejected' = 'all';
  selectedOfferId: number = 0; // 0 = toutes les offres

  // Animated counters
  animatedStats: DashboardStats = {
    totalApplications: 0, pendingApplications: 0, acceptedApplications: 0,
    rejectedApplications: 0, totalFavorites: 0, totalJobOffers: 0,
    activeJobOffers: 0, totalReceivedApplications: 0, pendingReceivedApplications: 0
  };

  constructor(
    public auth: AuthService,
    private appService: ApplicationService,
    private notifService: NotificationService,
    private jobService: JobOfferService,
    private http: HttpClient,
    private aiService: AIService,
    private recService: RecommendationService,
    private seo: SeoService,
    private toastr: ToastrService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.seo.setPage('Tableau de bord', 'Gerez vos candidatures, offres et notifications depuis votre espace personnel.');
    this.appService.getDashboardStats().subscribe(s => { this.stats = s; this.animateCounters(s); this.cdr.detectChanges(); });
    this.notifService.getAll().subscribe(n => { this.notifications = n.slice(0, 5); this.cdr.detectChanges(); });
    this.calculateProfileCompletion();

    if (this.auth.isJobSeeker) {
      this.loadJobSeekerData();
    } else if (this.auth.isCompany) {
      this.loadCompanyData();
    }
  }

  // ===================== JOBSEEKER =====================
  loadJobSeekerData(): void {
    this.appService.getMyApplications().subscribe(a => {
      this.allApplications = a;
      this.recentApplications = a.slice(0, 5);
      this.cdr.detectChanges();
    });
    this.appService.getMyFavorites().subscribe(f => { this.favorites = f.slice(0, 4); this.cdr.detectChanges(); });
    this.recService.getRecommendedJobs(6).subscribe(j => { this.recommendedJobs = j; this.cdr.detectChanges(); });
    this.recService.hasPreferences().subscribe(r => { this.hasPrefs = r.hasPreferences; this.cdr.detectChanges(); });
  }

  private animateCounters(target: DashboardStats): void {
    const duration = 800;
    const start = Date.now();
    const keys = Object.keys(target) as (keyof DashboardStats)[];
    const animate = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      keys.forEach(key => {
        (this.animatedStats as any)[key] = Math.round((target[key] as number) * ease);
      });
      this.cdr.detectChanges();
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }

  calculateProfileCompletion(): void {
    const u = this.auth.currentUser;
    if (!u) return;
    let s = 0;
    if (u.firstName) s += 20; if (u.lastName) s += 20; if (u.email) s += 20;
    if (u.phone) s += 15; if (u.bio) s += 15; if (u.skills) s += 10;
    this.profileCompletion = s;
  }

  get filteredApplications(): ApplicationDto[] {
    if (this.appFilter === 'all') return this.allApplications;
    return this.allApplications.filter(a => a.status === this.appFilter);
  }

  withdrawApplication(app: ApplicationDto): void {
    Swal.fire({
      title: 'Retirer cette candidature ?', text: `Votre candidature pour "${app.jobOfferTitle}" sera retiree.`,
      icon: 'warning', showCancelButton: true, confirmButtonColor: '#e11d48',
      confirmButtonText: '<i class="bi bi-x-circle me-1"></i> Retirer', cancelButtonText: 'Annuler'
    }).then(r => {
      if (r.isConfirmed) {
        this.appService.deleteApplication(app.id).subscribe({
          next: () => {
            this.allApplications = this.allApplications.filter(a => a.id !== app.id);
            this.recentApplications = this.allApplications.slice(0, 5);
            if (this.stats) this.stats.totalApplications--;
            this.toastr.success('Candidature retiree'); this.cdr.detectChanges();
          }
        });
      }
    });
  }

  removeFavorite(fav: FavoriteDto): void {
    this.appService.toggleFavorite(fav.jobOffer.id).subscribe(() => {
      this.favorites = this.favorites.filter(f => f.id !== fav.id);
      if (this.stats) this.stats.totalFavorites--;
      this.toastr.success('Retire des favoris'); this.cdr.detectChanges();
    });
  }

  // ===================== COMPANY =====================
  loadCompanyData(): void {
    this.http.get<any[]>('/api/joboffers/mine').subscribe(o => {
      this.companyOffers = o;
      this.cdr.detectChanges();
    });
    this.appService.getReceivedApplications().subscribe(a => {
      this.companyApplications = a;
      this.cdr.detectChanges();
    });
  }

  get filteredCompanyApps(): ApplicationDto[] {
    let apps = this.companyApplications;
    if (this.selectedOfferId > 0) apps = apps.filter(a => a.jobOfferId === this.selectedOfferId);
    if (this.companyAppFilter !== 'all') apps = apps.filter(a => a.status === this.companyAppFilter);
    return apps;
  }

  get companyPipelineCounts() {
    const apps = this.selectedOfferId > 0
      ? this.companyApplications.filter(a => a.jobOfferId === this.selectedOfferId)
      : this.companyApplications;
    return {
      total: apps.length,
      pending: apps.filter(a => a.status === 'Pending').length,
      reviewed: apps.filter(a => a.status === 'Reviewed').length,
      accepted: apps.filter(a => a.status === 'Accepted').length,
      rejected: apps.filter(a => a.status === 'Rejected').length
    };
  }

  get topOffers(): any[] {
    return [...this.companyOffers].sort((a, b) => b.applicationsCount - a.applicationsCount).slice(0, 5);
  }

  updateAppStatus(app: ApplicationDto, status: string): void {
    this.appService.updateStatus(app.id, status).subscribe({
      next: updated => {
        app.status = updated.status;
        if (this.stats && status === 'Accepted') this.stats.pendingReceivedApplications--;
        this.toastr.success(`Candidature ${status === 'Accepted' ? 'acceptee' : status === 'Rejected' ? 'refusee' : 'consultee'}`);
        this.cdr.detectChanges();
      }
    });
  }

  toggleOfferActive(offer: any): void {
    this.http.put<any>(`/api/joboffers/${offer.job.id}/toggle-active`, {}).subscribe({
      next: r => {
        offer.job.isActive = r.isActive;
        this.toastr.success(r.isActive ? 'Offre activee' : 'Offre desactivee');
        this.cdr.detectChanges();
      }
    });
  }

  viewCandidate(app: ApplicationDto): void {
    Swal.fire({
      title: app.userFullName,
      html: `
        <div style="text-align:left;font-size:.9rem;">
          <p><i class="bi bi-envelope me-2" style="color:var(--forest-500);"></i>${app.userEmail}</p>
          ${app.userPhone ? `<p><i class="bi bi-telephone me-2" style="color:var(--forest-500);"></i>${app.userPhone}</p>` : ''}
          ${app.userSkills ? `<p><strong>Competences :</strong><br>${app.userSkills}</p>` : ''}
          ${app.userBio ? `<p><strong>Bio :</strong><br>${app.userBio}</p>` : ''}
          ${app.coverLetter ? `<hr><p><strong>Lettre de motivation :</strong><br><em>${app.coverLetter}</em></p>` : ''}
        </div>
      `,
      confirmButtonText: 'Fermer',
      width: 500
    });
  }

  // ===================== IA COMPANY =====================
  scoreCandidate(app: ApplicationDto): void {
    Swal.fire({ title: 'Analyse IA en cours...', text: 'Evaluation de la compatibilite...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    this.aiService.scoreCandidate(app.id).subscribe({
      next: (score) => {
        const color = score.score >= 75 ? 'var(--forest-500)' : score.score >= 50 ? 'var(--copper-500)' : 'var(--rose-500)';
        const recColor = { 'STRONG_YES': '#059669', 'YES': '#065f46', 'MAYBE': '#ea580c', 'NO': '#e11d48' }[score.recommendation] || '#78716c';

        Swal.fire({
          title: `<div style="display:flex;align-items:center;justify-content:center;gap:.8rem;">
            <div style="width:64px;height:64px;border-radius:50%;border:4px solid ${color};display:flex;align-items:center;justify-content:center;font-size:1.5rem;font-weight:800;color:${color};">${score.score}</div>
            <div style="text-align:left;"><div style="font-size:1rem;">${app.userFullName}</div><div style="font-size:.8rem;color:var(--sand-400);">${app.jobOfferTitle}</div></div>
          </div>`,
          html: `
            <div style="text-align:left;font-size:.88rem;">
              <div style="margin-bottom:.8rem;padding:.6rem;border-radius:8px;background:${recColor}15;border:1px solid ${recColor}30;color:${recColor};font-weight:700;text-align:center;">${score.recommendationLabel}</div>
              <p style="color:var(--sand-600);">${score.summary}</p>
              ${score.strengths.length ? `<p style="margin-bottom:.3rem;"><strong style="color:var(--forest-600);"><i class="bi bi-check-circle me-1"></i>Points forts :</strong></p><ul style="color:var(--sand-600);margin-bottom:.8rem;">${score.strengths.map(s => `<li>${s}</li>`).join('')}</ul>` : ''}
              ${score.weaknesses.length ? `<p style="margin-bottom:.3rem;"><strong style="color:var(--copper-500);"><i class="bi bi-exclamation-circle me-1"></i>Points d'attention :</strong></p><ul style="color:var(--sand-600);">${score.weaknesses.map(s => `<li>${s}</li>`).join('')}</ul>` : ''}
            </div>
          `,
          width: 520,
          confirmButtonText: 'Fermer'
        });
      },
      error: (err) => Swal.fire('Erreur', err.error?.message || 'Impossible d\'analyser', 'error')
    });
  }

  generateEmail(app: ApplicationDto, type: string): void {
    Swal.fire({ title: 'Generation de l\'email...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    this.aiService.generateEmail(app.id, type).subscribe({
      next: (email) => {
        Swal.fire({
          title: `<i class="bi bi-envelope me-2" style="color:var(--forest-500);"></i>Email genere`,
          html: `
            <div style="text-align:left;font-size:.88rem;">
              <div style="margin-bottom:.5rem;"><strong>Objet :</strong> ${email.subject}</div>
              <div style="padding:1rem;background:var(--sand-50);border-radius:10px;border:1px solid var(--sand-200);white-space:pre-line;line-height:1.6;max-height:300px;overflow-y:auto;font-size:.85rem;color:var(--sand-600);">${email.body}</div>
            </div>
          `,
          width: 560,
          showCancelButton: true,
          confirmButtonText: '<i class="bi bi-clipboard me-1"></i> Copier',
          cancelButtonText: 'Fermer'
        }).then(r => {
          if (r.isConfirmed) {
            navigator.clipboard.writeText(`Objet : ${email.subject}\n\n${email.body}`);
            this.toastr.success('Email copie dans le presse-papier !');
          }
        });
      },
      error: (err) => Swal.fire('Erreur', err.error?.message || 'Impossible de generer', 'error')
    });
  }

  // ===================== SHARED =====================
  markNotifRead(n: AppNotification): void {
    if (!n.isRead) { this.notifService.markAsRead(n.id).subscribe(); n.isRead = true; }
    if (n.link) this.router.navigate([n.link]);
  }

  statusClass(s: string): string { return { 'Pending': 'badge-pending', 'Reviewed': 'badge-reviewed', 'Accepted': 'badge-accepted', 'Rejected': 'badge-rejected' }[s] || ''; }
  statusLabel(s: string): string { return { 'Pending': 'En attente', 'Reviewed': 'Consultee', 'Accepted': 'Acceptee', 'Rejected': 'Refusee' }[s] || s; }
  statusIcon(s: string): string { return { 'Pending': 'bi-clock', 'Reviewed': 'bi-eye', 'Accepted': 'bi-check-circle', 'Rejected': 'bi-x-circle' }[s] || 'bi-circle'; }
  getContractBadgeClass(t: string): string { return { 'CDI': 'badge-cdi', 'CDD': 'badge-cdd', 'Stage': 'badge-stage', 'Alternance': 'badge-alternance', 'Freelance': 'badge-freelance' }[t] || 'bg-secondary'; }

  timeAgo(date: string): string {
    const diff = Date.now() - new Date(date).getTime();
    const d = Math.floor(diff / 86400000);
    if (d === 0) return "Aujourd'hui"; if (d === 1) return 'Hier';
    if (d < 7) return `Il y a ${d}j`; return `Il y a ${Math.floor(d / 7)} sem.`;
  }
}
