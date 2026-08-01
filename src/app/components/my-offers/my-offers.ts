import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { JobOfferService } from '../../services/job-offer';
import { RecruiterFeaturesService } from '../../services/recruiter-features.service';
import { JobOffer } from '../../models/job-offer.model';
import { companyColor, getContractBadgeClass } from '../../utils/job.utils';
import { ToastrService } from 'ngx-toastr';
import { ConsoleShell } from '../console-shell/console-shell';

@Component({
  selector: 'app-my-offers',
  imports: [RouterLink, DatePipe, FormsModule, ConsoleShell],
  templateUrl: './my-offers.html',
  styleUrl: './my-offers.scss',
})
export class MyOffers implements OnInit {
  private jobService = inject(JobOfferService);
  private recruiterService = inject(RecruiterFeaturesService);
  private router = inject(Router);
  private toastr = inject(ToastrService);
  companyColor = companyColor;
  getContractBadgeClass = getContractBadgeClass;

  offers = signal<JobOffer[]>([]);
  loading = signal(true);
  filter = signal<'all' | 'active' | 'expired' | 'pending' | 'rejected' | 'draft'>('all');
  scope = signal<'mine' | 'team'>('mine');
  team = signal<{ company: string | null; members: { name: string; role: string; isMe: boolean; offerCount: number }[] }>({ company: null, members: [] });

  // Sponsorisation + stats
  statsOpenId = signal<number | null>(null);
  statsData = signal<any>(null);
  statsLoading = signal(false);

  // Un brouillon est inactif par construction : sans cette exclusion, il serait
  // compte parmi les offres expirees.
  private isExpired = (o: JobOffer) =>
    !o.isDraft && !o.isActive && o.moderationStatus !== 'Pending' && o.moderationStatus !== 'Rejected';

  /* ── Recherche et tri ──
     Le filtre par statut suffit tant qu'on a trois offres. Un recruteur
     qui en a quarante cherche « le poste de comptable » ou veut voir
     lesquelles ne recoivent rien : ni l'un ni l'autre n'etait possible. */
  query = signal('');
  sort = signal<'recent' | 'apps' | 'views' | 'title'>('recent');

  private byStatus(f: string): JobOffer[] {
    if (f === 'active') return this.offers().filter(o => o.isActive && o.moderationStatus === 'Approved');
    if (f === 'expired') return this.offers().filter(this.isExpired);
    if (f === 'pending') return this.offers().filter(o => !o.isDraft && o.moderationStatus === 'Pending');
    if (f === 'rejected') return this.offers().filter(o => o.moderationStatus === 'Rejected');
    if (f === 'draft') return this.offers().filter(o => o.isDraft);
    return this.offers();
  }

  filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const s = this.sort();

    const list = this.byStatus(this.filter()).filter((o) => {
      if (!q) return true;
      return `${o.title} ${o.location ?? ''} ${o.contractType ?? ''}`.toLowerCase().includes(q);
    });

    return [...list].sort((a, b) => {
      switch (s) {
        case 'apps': return (b.applications?.length || 0) - (a.applications?.length || 0);
        case 'views': return (b.viewCount || 0) - (a.viewCount || 0);
        case 'title': return a.title.localeCompare(b.title, 'fr');
        default: return +new Date(b.createdAt) - +new Date(a.createdAt);
      }
    });
  });

  /**
   * Part des visiteurs qui postulent, offre par offre.
   *
   * La carte affichait « 3 vues » et « 1 candidature » cote a cote sans
   * jamais les rapporter l'une a l'autre. C'est pourtant le seul chiffre
   * qui distingue une offre qu'on ne voit pas d'une offre qu'on voit et
   * qui ne donne pas envie — et les deux se corrigent differemment.
   */
  conversion(o: JobOffer): number | null {
    const vues = o.viewCount || 0;
    if (vues < 5) return null; // sous cinq vues, un taux n'a pas de sens
    return Math.round(((o.applications?.length || 0) / vues) * 100);
  }

  counts = computed(() => ({
    total: this.offers().length,
    active: this.offers().filter(o => o.isActive && o.moderationStatus === 'Approved').length,
    expired: this.offers().filter(this.isExpired).length,
    pending: this.offers().filter(o => !o.isDraft && o.moderationStatus === 'Pending').length,
    rejected: this.offers().filter(o => o.moderationStatus === 'Rejected').length,
    drafts: this.offers().filter(o => o.isDraft).length,
    totalApps: this.offers().reduce((s, o) => s + (o.applications?.length || 0), 0),
  }));

  /** Ou mene la carte : un brouillon n'a pas de page publique, il se reprend. */
  cardLink(o: JobOffer): (string | number)[] | null {
    if (o.isDraft) return ['/recruteur/offres', o.id, 'modifier'];
    return o.moderationStatus === 'Approved' ? ['/offres', o.id] : null;
  }

  ngOnInit() {
    this.loadOffers();
    this.jobService.getTeamMembers().subscribe((t) => this.team.set(t));
  }

  loadOffers() {
    this.loading.set(true);
    this.jobService.getMyOffers(this.scope() === 'team' ? 'team' : undefined)
      .subscribe((o) => { this.offers.set(o); this.loading.set(false); });
  }
  setScope(s: 'mine' | 'team') { this.scope.set(s); this.loadOffers(); }

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
    return { CDI: 'var(--brand)', CDD: 'var(--amber)', Stage: 'var(--blue)', Freelance: 'var(--red)', Alternance: 'var(--purple)' }[type] || 'var(--brand)';
  }

  moderationLabel(status?: string): string {
    return { Pending: 'En attente de validation', Approved: 'Approuvee', Rejected: 'Rejetee' }[status || ''] || '';
  }

  sponsor(offer: JobOffer, event: Event) {
    event.stopPropagation();
    event.preventDefault();
    this.jobService.toggleFeature(offer.id).subscribe({
      next: (r) => {
        offer.isFeatured = r.isFeatured;
        this.toastr.success(r.isFeatured ? 'Offre sponsorisée — mise en avant' : 'Sponsorisation retirée');
      },
      error: () => this.toastr.error('Erreur'),
    });
  }

  toggleStats(offer: JobOffer, event: Event) {
    event.stopPropagation();
    event.preventDefault();
    if (this.statsOpenId() === offer.id) { this.statsOpenId.set(null); return; }
    this.statsOpenId.set(offer.id);
    this.statsData.set(null);
    this.statsLoading.set(true);
    this.jobService.getOfferStats(offer.id).subscribe({
      next: (s) => { this.statsData.set(s); this.statsLoading.set(false); },
      error: () => { this.statsLoading.set(false); this.toastr.error('Erreur stats'); },
    });
  }

  statusLabel(status: string): string {
    return { Pending: 'En attente', Reviewed: 'Examinée', Accepted: 'Acceptée', Rejected: 'Refusée' }[status] || status;
  }

  duplicate(offer: JobOffer, event: Event) {
    event.stopPropagation();
    event.preventDefault();
    this.recruiterService.duplicateOffer(offer.id).subscribe({
      next: (dup) => {
        this.toastr.success('Offre dupliquée');
        this.router.navigate(['/recruteur/offres', dup.id, 'modifier']);
      },
      error: () => this.toastr.error('Erreur'),
    });
  }
}
