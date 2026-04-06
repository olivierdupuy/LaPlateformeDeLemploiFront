import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { JobOfferService } from '../../services/job-offer.service';
import { CategoryService } from '../../services/category.service';
import { ApplicationService } from '../../services/application.service';
import { AuthService } from '../../services/auth.service';
import { JobOffer } from '../../models/job-offer.model';
import { Category } from '../../models/category.model';
import { SeoService } from '../../services/seo.service';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-job-list',
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './job-list.html',
  styleUrl: './job-list.css'
})
export class JobList implements OnInit {
  jobs: JobOffer[] = [];
  categories: Category[] = [];
  favoriteIds: Set<number> = new Set();
  loading = true;

  currentPage = 1;
  pageSize = 12;
  totalCount = 0;
  totalPages = 0;

  searchQuery = '';
  selectedCategory = 0;
  selectedContract = '';
  selectedLocation = '';
  remoteOnly = false;

  contractTypes = ['CDI', 'CDD', 'Stage', 'Alternance', 'Freelance'];

  constructor(
    private jobService: JobOfferService,
    private categoryService: CategoryService,
    private appService: ApplicationService,
    private route: ActivatedRoute,
    private router: Router,
    private toastr: ToastrService,
    private seo: SeoService,
    public authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.seo.setPage('Offres d\'emploi', 'Parcourez toutes les offres d\'emploi : CDI, CDD, stage, alternance, freelance. Filtrez par categorie, lieu et type de contrat.');
    this.categoryService.getAll().subscribe(cats => { this.categories = cats; this.cdr.detectChanges(); });

    // Charger les favoris
    if (this.authService.isLoggedIn) {
      this.appService.getFavoriteIds().subscribe(ids => { this.favoriteIds = new Set(ids); this.cdr.detectChanges(); });
    }

    this.route.queryParams.subscribe(params => {
      if (params['search']) this.searchQuery = params['search'];
      if (params['categoryId']) this.selectedCategory = +params['categoryId'];
      if (params['contractType']) this.selectedContract = params['contractType'];
      if (params['location']) this.selectedLocation = params['location'];
      if (params['remote'] === 'true') this.remoteOnly = true;
      if (params['page']) this.currentPage = +params['page'];
      this.loadJobs();
    });
  }

  loadJobs(): void {
    this.loading = true;
    this.jobService.getAll({
      search: this.searchQuery || undefined,
      categoryId: this.selectedCategory || undefined,
      contractType: this.selectedContract || undefined,
      location: this.selectedLocation || undefined,
      isRemote: this.remoteOnly ? true : undefined,
      page: this.currentPage,
      pageSize: this.pageSize
    }).subscribe({
      next: result => {
        this.jobs = result.items;
        this.totalCount = result.totalCount;
        this.totalPages = result.totalPages;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.toastr.error('Erreur lors du chargement'); this.loading = false; this.cdr.detectChanges(); }
    });
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.updateUrl();
    this.loadJobs();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.updateUrl();
    this.loadJobs();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private updateUrl(): void {
    const params: any = {};
    if (this.searchQuery) params.search = this.searchQuery;
    if (this.selectedCategory) params.categoryId = this.selectedCategory;
    if (this.selectedContract) params.contractType = this.selectedContract;
    if (this.selectedLocation) params.location = this.selectedLocation;
    if (this.remoteOnly) params.remote = 'true';
    if (this.currentPage > 1) params.page = this.currentPage;
    this.router.navigate([], { queryParams: params, replaceUrl: true });
  }

  get pages(): number[] {
    const r: number[] = [];
    const s = Math.max(1, this.currentPage - 2);
    const e = Math.min(this.totalPages, this.currentPage + 2);
    for (let i = s; i <= e; i++) r.push(i);
    return r;
  }

  resetFilters(): void {
    this.searchQuery = ''; this.selectedCategory = 0; this.selectedContract = '';
    this.selectedLocation = ''; this.remoteOnly = false; this.currentPage = 1;
    this.router.navigate([], { queryParams: {}, replaceUrl: true });
    this.loadJobs();
  }

  toggleFavorite(job: JobOffer, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.authService.isLoggedIn) {
      this.toastr.warning('Connectez-vous pour sauvegarder');
      this.router.navigate(['/connexion']);
      return;
    }
    this.appService.toggleFavorite(job.id).subscribe(r => {
      if (r.favorited) { this.favoriteIds.add(job.id); this.toastr.success('Ajoute aux favoris'); }
      else { this.favoriteIds.delete(job.id); this.toastr.success('Retire des favoris'); }
      this.cdr.detectChanges();
    });
  }

  isFavorited(jobId: number): boolean {
    return this.favoriteIds.has(jobId);
  }

  deleteJob(job: JobOffer, event: Event): void {
    event.preventDefault(); event.stopPropagation();
    Swal.fire({
      title: 'Supprimer cette offre ?', text: `"${job.title}" sera supprimee.`,
      icon: 'warning', showCancelButton: true, confirmButtonColor: '#e11d48',
      confirmButtonText: '<i class="bi bi-trash me-1"></i> Supprimer', cancelButtonText: 'Annuler'
    }).then(result => {
      if (result.isConfirmed) {
        this.jobService.delete(job.id).subscribe({
          next: () => { this.toastr.success('Offre supprimee'); this.loadJobs(); },
          error: () => this.toastr.error('Erreur')
        });
      }
    });
  }

  getContractBadgeClass(t: string): string {
    return { 'CDI': 'badge-cdi', 'CDD': 'badge-cdd', 'Stage': 'badge-stage', 'Alternance': 'badge-alternance', 'Freelance': 'badge-freelance' }[t] || 'bg-secondary';
  }

  formatSalary(min: number | null, max: number | null): string {
    if (!min && !max) return '';
    if (min && max) return `${(min / 1000).toFixed(0)}k - ${(max / 1000).toFixed(0)}k`;
    if (min) return `${(min / 1000).toFixed(0)}k+`;
    return `Jusqu'a ${(max! / 1000).toFixed(0)}k`;
  }

  timeAgo(date: string): string {
    const diff = Date.now() - new Date(date).getTime();
    const d = Math.floor(diff / 86400000);
    if (d === 0) return "Aujourd'hui"; if (d === 1) return 'Hier';
    if (d < 7) return `Il y a ${d}j`; if (d < 30) return `Il y a ${Math.floor(d / 7)} sem.`;
    return `Il y a ${Math.floor(d / 30)} mois`;
  }
}
