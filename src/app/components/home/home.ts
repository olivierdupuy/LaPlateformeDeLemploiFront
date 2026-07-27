import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { JobOfferService } from '../../services/job-offer';
import { PlatformService } from '../../services/platform.service';
import { JobOffer, JobStats } from '../../models/job-offer.model';

@Component({
  selector: 'app-home',
  imports: [RouterLink, FormsModule, DecimalPipe],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {
  private jobService = inject(JobOfferService);
  private router = inject(Router);
  platform = inject(PlatformService);

  stats = signal<JobStats>({ totalOffers: 0, totalApplications: 0, totalCompanies: 0, remoteOffers: 0 });
  latestJobs = signal<JobOffer[]>([]);
  categories = signal<string[]>([]);

  searchQuery = '';
  searchLocation = '';

  ngOnInit() {
    this.jobService.getStats().subscribe((s) => this.stats.set(s));
    this.jobService.getAll().subscribe((jobs) => this.latestJobs.set(jobs.slice(0, 6)));
    this.jobService.getCategories().subscribe((c) => this.categories.set(c));
  }

  search() {
    const params: Record<string, string> = {};
    if (this.searchQuery.trim()) params['search'] = this.searchQuery.trim();
    if (this.searchLocation.trim()) params['location'] = this.searchLocation.trim();
    this.router.navigate(['/offres'], { queryParams: params });
  }

  getContractBadgeClass(type: string): string {
    const map: Record<string, string> = {
      CDI: 'badge-purple',
      CDD: 'badge-yellow',
      Stage: 'badge-blue',
      Alternance: 'badge-green',
      Freelance: 'badge-red',
    };
    return map[type] || 'badge-blue';
  }

  stripeFor(type: string): string {
    const map: Record<string, string> = {
      CDI: 'var(--stripe-cdi)',
      CDD: 'var(--stripe-cdd)',
      Stage: 'var(--stripe-stage)',
      Freelance: 'var(--stripe-freelance)',
      Alternance: 'var(--stripe-alternance)',
    };
    return map[type] || 'var(--stripe-cdi)';
  }

  /** Pastille d'entreprise : teinte dérivée du nom, pour distinguer les cartes d'un coup d'œil. */
  avatarBg(company: string): string {
    return `hsl(${this.hue(company)}, 42%, 94%)`;
  }
  avatarFg(company: string): string {
    return `hsl(${this.hue(company)}, 48%, 34%)`;
  }
  private hue(company: string): number {
    return ((company?.charCodeAt(0) ?? 65) * 7) % 360;
  }

  getTimeAgo(date: string): string {
    const diff = Date.now() - new Date(date).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days <= 0) return "Aujourd'hui";
    if (days === 1) return 'Hier';
    if (days < 7) return `Il y a ${days} jours`;
    if (days < 30) return `Il y a ${Math.floor(days / 7)} sem.`;
    if (days < 365) return `Il y a ${Math.floor(days / 30)} mois`;
    return `Il y a plus d'un an`;
  }

  getTags(tags?: string): string[] {
    return tags ? tags.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 3) : [];
  }
}
