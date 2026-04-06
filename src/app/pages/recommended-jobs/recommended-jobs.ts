import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { RecommendationService } from '../../services/recommendation.service';
import { ApplicationService } from '../../services/application.service';
import { AuthService } from '../../services/auth.service';
import { RecommendedJob } from '../../models/preferences.model';
import { SeoService } from '../../services/seo.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-recommended-jobs',
  imports: [CommonModule, RouterLink],
  templateUrl: './recommended-jobs.html',
  styleUrl: './recommended-jobs.css'
})
export class RecommendedJobs implements OnInit {
  jobs: RecommendedJob[] = [];
  loading = true;
  hasPrefs = false;
  favoriteIds: Set<number> = new Set();

  constructor(
    public auth: AuthService,
    private recService: RecommendationService,
    private appService: ApplicationService,
    private router: Router,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
    private seo: SeoService
  ) {}

  ngOnInit(): void {
    this.seo.setNoIndex('Recommandations', 'Offres d\'emploi recommandees selon vos preferences et votre profil.');
    this.recService.hasPreferences().subscribe(r => {
      this.hasPrefs = r.hasPreferences;
      this.cdr.detectChanges();
    });

    this.recService.getRecommendedJobs(20).subscribe({
      next: j => { this.jobs = j; this.loading = false; this.cdr.detectChanges(); },
      error: () => { this.loading = false; this.cdr.detectChanges(); }
    });

    if (this.auth.isLoggedIn) {
      this.appService.getFavoriteIds().subscribe(ids => { this.favoriteIds = new Set(ids); this.cdr.detectChanges(); });
    }
  }

  toggleFavorite(job: RecommendedJob, e: Event): void {
    e.preventDefault(); e.stopPropagation();
    this.appService.toggleFavorite(job.job.id).subscribe(r => {
      r.favorited ? this.favoriteIds.add(job.job.id) : this.favoriteIds.delete(job.job.id);
      this.toastr.success(r.favorited ? 'Ajoute aux favoris' : 'Retire des favoris');
      this.cdr.detectChanges();
    });
  }

  scoreColor(score: number): string {
    if (score >= 70) return 'var(--forest-500)';
    if (score >= 40) return 'var(--copper-500)';
    if (score > 0) return 'var(--night-500)';
    return 'var(--sand-400)';
  }

  getContractBadgeClass(t: string): string {
    return { 'CDI': 'badge-cdi', 'CDD': 'badge-cdd', 'Stage': 'badge-stage', 'Alternance': 'badge-alternance', 'Freelance': 'badge-freelance' }[t] || 'bg-secondary';
  }
}
