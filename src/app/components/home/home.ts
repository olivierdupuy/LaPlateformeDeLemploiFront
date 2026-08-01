import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { JobOfferService, BrowseFacet } from '../../services/job-offer';
import { PlatformService } from '../../services/platform.service';
import { JobOffer, JobStats, CompanyInfo } from '../../models/job-offer.model';
import { companyColor } from '../../utils/job.utils';
import { EmployerNamePipe } from '../../pipes/employer-name.pipe';
import { AuthModalService } from '../../services/auth-modal.service';

@Component({
  selector: 'app-home',
  imports: [RouterLink, FormsModule, DecimalPipe, EmployerNamePipe],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {
  authModale = inject(AuthModalService);
  private jobService = inject(JobOfferService);
  private router = inject(Router);
  platform = inject(PlatformService);

  stats = signal<JobStats>({ totalOffers: 0, totalApplications: 0, totalCompanies: 0, remoteOffers: 0 });
  latestJobs = signal<JobOffer[]>([]);
  categories = signal<string[]>([]);

  /* ── Points d'entree de l'accueil ──
     Un moteur de recherche ne sert qu'a qui sait deja quoi taper. Les
     trois listes ci-dessous ouvrent la meme base par un autre bout :
     le metier, la ville, le contrat — et le nombre d'offres a la clef dit
     tout de suite si la piste vaut le detour. */
  topCategories = signal<BrowseFacet[]>([]);
  topLocations = signal<BrowseFacet[]>([]);
  topContracts = signal<BrowseFacet[]>([]);
  topCompanies = signal<CompanyInfo[]>([]);

  searchQuery = '';
  searchLocation = '';

  ngOnInit() {
    this.jobService.getStats().subscribe((s) => this.stats.set(s));
    // Huit plutot que six : la grille en compte quatre par rangee, et six
    // laissait deux orphelines a cote d'un demi-vide.
    this.jobService.getAll().subscribe((jobs) => this.latestJobs.set(jobs.slice(0, 8)));
    this.jobService.getCategories().subscribe((c) => this.categories.set(c));

    this.jobService.getBrowseSection('categories', { pageSize: 10 })
      .subscribe((p) => this.topCategories.set(p.items));
    this.jobService.getBrowseSection('locations', { pageSize: 10 })
      .subscribe((p) => this.topLocations.set(p.items));
    this.jobService.getBrowseSection('contractTypes', { pageSize: 6 })
      .subscribe((p) => this.topContracts.set(p.items));
    this.jobService.getCompanies({ pageSize: 8 })
      .subscribe((r) => this.topCompanies.set(r.items));
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

  /** Pastille d'entreprise : palette fermee, sept degres du bleu de marque. */
  avatarBg(company: string): string {
    return companyColor(company).bg;
  }
  avatarFg(company: string): string {
    return companyColor(company).fg;
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
