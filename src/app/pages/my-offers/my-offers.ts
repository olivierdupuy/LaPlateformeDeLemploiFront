import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { SeoService } from '../../services/seo.service';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-my-offers',
  imports: [CommonModule, RouterLink],
  templateUrl: './my-offers.html',
  styleUrl: './my-offers.css'
})
export class MyOffers implements OnInit {
  offers: any[] = [];
  loading = true;

  constructor(private http: HttpClient, private toastr: ToastrService, private cdr: ChangeDetectorRef, private router: Router, private seo: SeoService) {}

  ngOnInit(): void {
    this.seo.setNoIndex('Mes offres', 'Gerez vos offres d\'emploi publiees sur la plateforme.');
    this.loadOffers();
  }

  loadOffers(): void {
    this.http.get<any[]>('/api/joboffers/mine').subscribe({
      next: o => { this.offers = o; this.loading = false; this.cdr.detectChanges(); },
      error: () => { this.loading = false; this.cdr.detectChanges(); }
    });
  }

  toggleActive(offer: any): void {
    this.http.put<any>(`/api/joboffers/${offer.job.id}/toggle-active`, {}).subscribe({
      next: r => {
        offer.job.isActive = r.isActive;
        this.toastr.success(r.isActive ? 'Offre activee' : 'Offre desactivee');
        this.cdr.detectChanges();
      }
    });
  }

  deleteOffer(offer: any): void {
    Swal.fire({
      title: 'Supprimer cette offre ?',
      text: `"${offer.job.title}" et toutes ses candidatures seront supprimees.`,
      icon: 'warning', showCancelButton: true, confirmButtonColor: '#e11d48',
      confirmButtonText: '<i class="bi bi-trash me-1"></i> Supprimer', cancelButtonText: 'Annuler'
    }).then(r => {
      if (r.isConfirmed) {
        this.http.delete(`/api/joboffers/${offer.job.id}`).subscribe({
          next: () => { this.offers = this.offers.filter(o => o.job.id !== offer.job.id); this.toastr.success('Offre supprimee'); this.cdr.detectChanges(); }
        });
      }
    });
  }

  duplicateOffer(o: any): void {
    // Navigate to create form with query params to pre-fill
    this.router.navigate(['/offres/nouvelle/creer'], {
      queryParams: {
        duplicate: o.job.id,
        title: o.job.title + ' (copie)',
        description: o.job.description,
        location: o.job.location,
        contractType: o.job.contractType,
        salaryMin: o.job.salaryMin || '',
        salaryMax: o.job.salaryMax || '',
        isRemote: o.job.isRemote,
        categoryId: o.job.categoryId,
        companyId: o.job.companyId
      }
    });
  }

  getContractBadgeClass(t: string): string {
    return { 'CDI': 'badge-cdi', 'CDD': 'badge-cdd', 'Stage': 'badge-stage', 'Alternance': 'badge-alternance', 'Freelance': 'badge-freelance' }[t] || 'bg-secondary';
  }
}
