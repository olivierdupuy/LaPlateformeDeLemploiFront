import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { JobOfferService } from '../../services/job-offer';
import { JobOffer } from '../../models/job-offer.model';
import { companyColor, getContractBadgeClass } from '../../utils/job.utils';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-my-offers',
  imports: [RouterLink, DatePipe],
  templateUrl: './my-offers.html',
  styleUrl: './my-offers.scss',
})
export class MyOffers implements OnInit {
  private jobService = inject(JobOfferService);
  private toastr = inject(ToastrService);
  companyColor = companyColor;
  getContractBadgeClass = getContractBadgeClass;

  offers = signal<JobOffer[]>([]);
  loading = signal(true);
  filter = signal<'all' | 'active' | 'expired' | 'pending' | 'rejected'>('all');

  filtered = computed(() => {
    const f = this.filter();
    if (f === 'active') return this.offers().filter(o => o.isActive && o.moderationStatus === 'Approved');
    if (f === 'expired') return this.offers().filter(o => !o.isActive && o.moderationStatus !== 'Pending' && o.moderationStatus !== 'Rejected');
    if (f === 'pending') return this.offers().filter(o => o.moderationStatus === 'Pending');
    if (f === 'rejected') return this.offers().filter(o => o.moderationStatus === 'Rejected');
    return this.offers();
  });

  counts = computed(() => ({
    total: this.offers().length,
    active: this.offers().filter(o => o.isActive && o.moderationStatus === 'Approved').length,
    expired: this.offers().filter(o => !o.isActive && o.moderationStatus !== 'Pending' && o.moderationStatus !== 'Rejected').length,
    pending: this.offers().filter(o => o.moderationStatus === 'Pending').length,
    rejected: this.offers().filter(o => o.moderationStatus === 'Rejected').length,
    totalApps: this.offers().reduce((s, o) => s + (o.applications?.length || 0), 0),
  }));

  ngOnInit() {
    this.jobService.getMyOffers().subscribe((o) => { this.offers.set(o); this.loading.set(false); });
  }

  getDaysLeft(expiresAt?: string): number | null {
    if (!expiresAt) return null;
    return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  }

  renew(offer: JobOffer, event: Event) {
    event.stopPropagation();
    event.preventDefault();
    this.jobService.renewOffer(offer.id).subscribe({
      next: () => { this.toastr.success('Offre renouvelee pour 30 jours'); this.ngOnInit(); },
      error: () => this.toastr.error('Erreur'),
    });
  }

  stripeColor(type: string): string {
    return { CDI: 'var(--teal)', CDD: 'var(--amber)', Stage: 'var(--blue)', Freelance: 'var(--red)', Alternance: 'var(--green)' }[type] || 'var(--teal)';
  }

  moderationLabel(status?: string): string {
    return { Pending: 'En attente de validation', Approved: 'Approuvee', Rejected: 'Rejetee' }[status || ''] || '';
  }
}
