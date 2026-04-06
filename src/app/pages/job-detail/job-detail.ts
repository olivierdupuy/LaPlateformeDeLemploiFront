import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { JobOfferService } from '../../services/job-offer.service';
import { ApplicationService } from '../../services/application.service';
import { AuthService } from '../../services/auth.service';
import { JobOffer } from '../../models/job-offer.model';
import { SeoService } from '../../services/seo.service';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-job-detail',
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './job-detail.html',
  styleUrl: './job-detail.css'
})
export class JobDetail implements OnInit {
  job: JobOffer | null = null;
  loading = true;
  relatedJobs: JobOffer[] = [];
  hasApplied = false;
  isFavorited = false;
  coverLetter = '';
  applying = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private jobService: JobOfferService,
    private appService: ApplicationService,
    public auth: AuthService,
    private seo: SeoService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const id = +params['id'];
      this.loadJob(id);
    });
  }

  loadJob(id: number): void {
    this.loading = true;
    this.jobService.getById(id).subscribe({
      next: job => {
        this.job = job;
        this.loading = false;
        this.seo.setJobOffer(job.title, job.companyName, job.location, job.contractType, job.description, job.salaryMin, job.salaryMax, job.publishedAt, job.isRemote);
        this.cdr.detectChanges();
        this.loadRelatedJobs(job.categoryId, job.id);
        if (this.auth.isLoggedIn) {
          this.appService.hasApplied(id).subscribe(r => { this.hasApplied = r.applied; this.cdr.detectChanges(); });
          this.appService.toggleFavorite; // just load state
          this.loadFavState(id);
        }
      },
      error: () => { this.toastr.error('Offre introuvable'); this.router.navigate(['/offres']); }
    });
  }

  loadFavState(id: number): void {
    this.appService.getFavoriteIds().subscribe(ids => { this.isFavorited = ids.includes(id); this.cdr.detectChanges(); });
  }

  loadRelatedJobs(categoryId: number, currentId: number): void {
    this.jobService.getAll({ categoryId, pageSize: 4 }).subscribe(result => {
      this.relatedJobs = result.items.filter(j => j.id !== currentId).slice(0, 3);
      this.cdr.detectChanges();
    });
  }

  apply(): void {
    if (!this.auth.isLoggedIn) {
      this.toastr.warning('Connectez-vous pour postuler');
      this.router.navigate(['/connexion']);
      return;
    }
    if (!this.auth.isJobSeeker) {
      this.toastr.info('Seuls les chercheurs d\'emploi peuvent postuler');
      return;
    }

    Swal.fire({
      title: 'Postuler a cette offre',
      html: `<textarea id="swal-cover" class="swal2-textarea" placeholder="Lettre de motivation (optionnel)..." style="font-size:.9rem;"></textarea>`,
      showCancelButton: true,
      confirmButtonText: '<i class="bi bi-send me-1"></i> Envoyer ma candidature',
      cancelButtonText: 'Annuler',
      preConfirm: () => (document.getElementById('swal-cover') as HTMLTextAreaElement)?.value
    }).then(result => {
      if (result.isConfirmed && this.job) {
        this.applying = true;
        this.appService.apply(this.job.id, result.value || undefined).subscribe({
          next: () => {
            this.hasApplied = true;
            this.applying = false;
            this.toastr.success('Candidature envoyee !');
            this.cdr.detectChanges();
          },
          error: (err) => {
            this.toastr.error(err.error?.message || 'Erreur');
            this.applying = false;
            this.cdr.detectChanges();
          }
        });
      }
    });
  }

  toggleFavorite(): void {
    if (!this.auth.isLoggedIn) {
      this.toastr.warning('Connectez-vous pour sauvegarder');
      this.router.navigate(['/connexion']);
      return;
    }
    if (!this.job) return;
    this.appService.toggleFavorite(this.job.id).subscribe(r => {
      this.isFavorited = r.favorited;
      this.toastr.success(r.favorited ? 'Ajoute aux favoris' : 'Retire des favoris');
      this.cdr.detectChanges();
    });
  }

  shareJob(): void {
    if (!this.job) return;
    this.showShareMenu = !this.showShareMenu;
  }

  showShareMenu = false;

  shareOn(platform: string): void {
    if (!this.job) return;
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`${this.job.title} chez ${this.job.companyName} — ${this.job.location}`);
    let shareUrl = '';

    switch (platform) {
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
        break;
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
        break;
      case 'email':
        shareUrl = `mailto:?subject=${text}&body=Decouvrez cette offre : ${url}`;
        break;
      case 'copy':
        navigator.clipboard.writeText(window.location.href).then(() => {
          this.toastr.success('Lien copie dans le presse-papier !');
        });
        this.showShareMenu = false;
        return;
    }
    if (shareUrl) window.open(shareUrl, '_blank', 'width=600,height=400');
    this.showShareMenu = false;
  }

  deleteJob(): void {
    if (!this.job) return;
    Swal.fire({
      title: 'Supprimer cette offre ?', text: `"${this.job.title}" sera supprimee.`,
      icon: 'warning', showCancelButton: true, confirmButtonColor: '#e11d48',
      confirmButtonText: '<i class="bi bi-trash me-1"></i> Supprimer', cancelButtonText: 'Annuler'
    }).then(r => {
      if (r.isConfirmed && this.job) {
        this.jobService.delete(this.job.id).subscribe({
          next: () => { this.toastr.success('Offre supprimee'); this.router.navigate(['/offres']); },
          error: () => this.toastr.error('Erreur')
        });
      }
    });
  }

  getContractBadgeClass(t: string): string {
    return { 'CDI': 'badge-cdi', 'CDD': 'badge-cdd', 'Stage': 'badge-stage', 'Alternance': 'badge-alternance', 'Freelance': 'badge-freelance' }[t] || 'bg-secondary';
  }

  formatSalary(min: number | null, max: number | null): string {
    if (!min && !max) return 'Non communique';
    if (min && max) return `${min.toLocaleString('fr-FR')} - ${max.toLocaleString('fr-FR')} EUR/an`;
    if (min) return `A partir de ${min.toLocaleString('fr-FR')} EUR/an`;
    return `Jusqu'a ${max!.toLocaleString('fr-FR')} EUR/an`;
  }

  formatDate(d: string): string {
    return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }
}
