import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { JobOfferService } from '../../services/job-offer.service';
import { CategoryService } from '../../services/category.service';
import { SeoService } from '../../services/seo.service';
import { JobOffer } from '../../models/job-offer.model';
import { Category } from '../../models/category.model';
import { Stats } from '../../models/stats.model';

@Component({
  selector: 'app-home',
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home implements OnInit {
  latestJobs: JobOffer[] = [];
  categories: Category[] = [];
  stats: Stats = { totalJobs: 0, totalCompanies: 0, totalCategories: 0, remoteJobs: 0 };
  searchQuery = '';

  constructor(
    private jobService: JobOfferService,
    private categoryService: CategoryService,
    private seo: SeoService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}


  ngOnInit(): void {
    this.seo.setPage('Accueil', 'Trouvez votre prochain emploi parmi des milliers d\'offres. La Plateforme de l\'Emploi connecte talents et entreprises en France.');
    this.jobService.getStats().subscribe({
      next: stats => {
        this.stats = stats;
        this.cdr.detectChanges();
      }
    });

    this.jobService.getAll({ page: 1, pageSize: 6 }).subscribe({
      next: result => {
        this.latestJobs = result.items;
        this.cdr.detectChanges();
      }
    });

    this.categoryService.getAll().subscribe({
      next: cats => {
        this.categories = cats;
        this.cdr.detectChanges();
      }
    });
  }

  navigateSearch(): void {
    this.router.navigate(['/offres'], { queryParams: { search: this.searchQuery } });
  }

  getContractBadgeClass(type: string): string {
    const map: Record<string, string> = {
      'CDI': 'badge-cdi',
      'CDD': 'badge-cdd',
      'Stage': 'badge-stage',
      'Alternance': 'badge-alternance',
      'Freelance': 'badge-freelance'
    };
    return map[type] || 'bg-secondary';
  }

  formatSalary(min: number | null, max: number | null): string {
    if (!min && !max) return '';
    if (min && max) return `${(min / 1000).toFixed(0)}k - ${(max / 1000).toFixed(0)}k`;
    if (min) return `${(min / 1000).toFixed(0)}k+`;
    return `Jusqu'a ${(max! / 1000).toFixed(0)}k`;
  }
}
