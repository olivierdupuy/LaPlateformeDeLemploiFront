import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { JobOfferService } from '../../services/job-offer';
import { PlatformService } from '../../services/platform.service';
import { JobOffer, JobStats } from '../../models/job-offer.model';

@Component({
  selector: 'app-home',
  imports: [RouterLink, FormsModule],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit, OnDestroy {
  private jobService = inject(JobOfferService);
  private router = inject(Router);
  platform = inject(PlatformService);

  stats = signal<JobStats>({ totalOffers: 0, totalApplications: 0, totalCompanies: 0, remoteOffers: 0 });
  latestJobs = signal<JobOffer[]>([]);
  categories = signal<string[]>([]);
  searchQuery = '';

  // Carousel
  currentSlide = signal(0);
  private carouselInterval: any;

  slides = [
    { img: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&h=700&fit=crop&q=80', title: 'Collaborez avec les meilleures equipes', sub: 'Des entreprises innovantes vous attendent' },
    { img: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=1200&h=700&fit=crop&q=80', title: 'Developpez votre carriere', sub: 'Des opportunites a la hauteur de vos ambitions' },
    { img: 'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=1200&h=700&fit=crop&q=80', title: 'Decrochez l\'entretien decisif', sub: 'Postulez directement aupres des recruteurs' },
    { img: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=1200&h=700&fit=crop&q=80', title: 'Travaillez ou vous voulez', sub: 'Des postes en teletravail partout en France' },
    { img: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1200&h=700&fit=crop&q=80', title: 'Rejoignez des equipes passionnees', sub: 'Startups, grands groupes, PME... a vous de choisir' },
  ];

  ngOnInit() {
    this.jobService.getStats().subscribe((s) => this.stats.set(s));
    this.jobService.getAll().subscribe((jobs) => this.latestJobs.set(jobs.slice(0, 6)));
    this.jobService.getCategories().subscribe((c) => this.categories.set(c));
    this.startCarousel();
  }

  ngOnDestroy() {
    this.stopCarousel();
  }

  startCarousel() {
    this.carouselInterval = setInterval(() => {
      this.currentSlide.update(i => (i + 1) % this.slides.length);
    }, 5000);
  }

  stopCarousel() {
    if (this.carouselInterval) clearInterval(this.carouselInterval);
  }

  goToSlide(index: number) {
    this.currentSlide.set(index);
    this.stopCarousel();
    this.startCarousel();
  }

  nextSlide() {
    this.currentSlide.update(i => (i + 1) % this.slides.length);
    this.stopCarousel();
    this.startCarousel();
  }

  prevSlide() {
    this.currentSlide.update(i => (i - 1 + this.slides.length) % this.slides.length);
    this.stopCarousel();
    this.startCarousel();
  }

  search() {
    if (this.searchQuery.trim()) {
      this.router.navigate(['/offres'], { queryParams: { search: this.searchQuery } });
    }
  }

  getContractBadgeClass(type: string): string {
    const map: Record<string, string> = { CDI: 'badge-green', CDD: 'badge-yellow', Stage: 'badge-indigo', Alternance: 'badge-coral', Freelance: 'badge-red' };
    return map[type] || 'badge-indigo';
  }

  getTimeAgo(date: string): string {
    const diff = Date.now() - new Date(date).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "Aujourd'hui";
    if (days === 1) return 'Hier';
    if (days < 7) return `Il y a ${days} jours`;
    if (days < 30) return `Il y a ${Math.floor(days / 7)} sem.`;
    return `Il y a ${Math.floor(days / 30)} mois`;
  }

  getTags(tags?: string): string[] {
    return tags ? tags.split(',').map((t) => t.trim()).slice(0, 3) : [];
  }
}
