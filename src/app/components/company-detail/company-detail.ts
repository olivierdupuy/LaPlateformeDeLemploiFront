import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ToastrService } from 'ngx-toastr';
import { JobOfferService } from '../../services/job-offer';
import { BookmarkService } from '../../services/bookmark.service';
import { AuthService } from '../../services/auth.service';
import { SeoService } from '../../services/seo.service';
import { CompanyReviewService, CompanyReviewSummary, CompanyQuestion, CompanyProfile } from '../../services/company-review.service';
import { JobOffer } from '../../models/job-offer.model';
import { getTimeAgo, getTags, getContractBadgeClass, companyColor } from '../../utils/job.utils';
import Chart from 'chart.js/auto';
import { Modale } from '../../utils/modale.directive';

@Component({
  selector: 'app-company-detail',
  imports: [RouterLink, FormsModule, DatePipe, Modale],
  templateUrl: './company-detail.html',
  styleUrl: './company-detail.scss',
})
export class CompanyDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private jobService = inject(JobOfferService);
  private reviewSvc = inject(CompanyReviewService);
  private toastr = inject(ToastrService);
  bookmarkService = inject(BookmarkService);
  auth = inject(AuthService);
  private seo = inject(SeoService);

  companyName = '';
  jobs = signal<JobOffer[]>([]);
  loading = signal(true);

  tab = signal<'about' | 'jobs' | 'reviews' | 'questions'>('jobs');
  summary = signal<CompanyReviewSummary | null>(null);

  // À propos
  profile = signal<CompanyProfile | null>(null);
  editingProfile = signal(false);
  savingProfile = signal(false);
  profileForm: any = { foundedYear: null, size: '', industry: '', headquarters: '', website: '', about: '' };
  companySizes = ['1 à 10', '11 à 50', '51 à 200', '201 à 500', '501 à 1000', '1000+'];

  // Suivre
  following = signal(false);
  followCount = signal(0);

  // Lieux / salaires / similaires
  locations = signal<{ location: string; count: number }[]>([]);
  companySalaries = signal<{ title: string; avgAnnual: number; count: number }[]>([]);
  similar = signal<{ company: string; jobCount: number; location?: string }[]>([]);

  // Q&A
  questions = signal<CompanyQuestion[]>([]);
  newQuestion = '';
  asking = signal(false);
  answeringId = signal<number | null>(null);
  answerText = '';

  // Formulaire d'avis
  reviewOpen = signal(false);
  submitting = signal(false);
  reviewForm: any = { overallRating: 0, workLifeBalance: 0, payBenefits: 0, jobSecurity: 0, management: 0, culture: 0, title: '', body: '', jobTitle: '', location: '' };

  stars = [1, 2, 3, 4, 5];
  criteriaList = [
    { key: 'workLifeBalance', label: 'Équilibre vie privée / pro' },
    { key: 'payBenefits', label: 'Salaire & avantages' },
    { key: 'jobSecurity', label: 'Sécurité & évolution' },
    { key: 'management', label: 'Direction' },
    { key: 'culture', label: 'Culture d\'entreprise' },
  ];

  getTimeAgo = getTimeAgo;
  getTags = getTags;
  getContractBadgeClass = getContractBadgeClass;
  companyColor = companyColor;

  ngOnInit() {
    this.companyName = decodeURIComponent(this.route.snapshot.paramMap.get('name') || '');

    // ── Ce que la page déclare d'elle-même ──
    //
    // La coquille posait un titre de section identique pour toutes les
    // entreprises. Des milliers de fiches au même titre et à la même
    // description sont, pour un moteur, des milliers de doublons — et
    // ce sont précisément les pages qu'on cherche quand on tape le nom
    // d'un employeur.
    //
    // Posé avant les appels : si l'API tarde ou échoue, la page garde
    // un titre juste au lieu de celui de la page précédente. Il sera
    // précisé plus bas dès que le nombre d'offres sera connu.
    this.seo.set({
      title: `${this.companyName} — offres d'emploi et avis`,
      description: `Les offres d'emploi de ${this.companyName}, les avis de ses salariés, ses salaires par poste et sa présentation.`,
      canonicalPath: `/entreprises/${encodeURIComponent(this.companyName)}`,
    });

    this.seo.breadcrumb([
      { nom: 'Entreprises', chemin: '/entreprises' },
      { nom: this.companyName, chemin: `/entreprises/${encodeURIComponent(this.companyName)}` },
    ]);

    this.jobService.getByCompany(this.companyName).subscribe((jobs) => {
      this.jobs.set(jobs);
      this.loading.set(false);

      // Le nombre d'offres est ce qui distingue cette fiche des autres
      // dans un résultat de recherche, et ce qui décide du clic.
      if (jobs.length) {
        this.seo.set({
          title: `${this.companyName} — ${jobs.length} offre${jobs.length > 1 ? 's' : ''} d'emploi`,
          description:
            `${jobs.length} offre${jobs.length > 1 ? 's' : ''} d'emploi chez ${this.companyName}. ` +
            `Avis de salariés, salaires par poste, lieux et présentation de l'entreprise.`,
          canonicalPath: `/entreprises/${encodeURIComponent(this.companyName)}`,
        });
      }
    });
    this.loadReviews();
    this.reviewSvc.getFollow(this.companyName).subscribe((f) => { this.following.set(f.following); this.followCount.set(f.count); });
    this.reviewSvc.getQuestions(this.companyName).subscribe((q) => this.questions.set(q));
    this.reviewSvc.getProfile(this.companyName).subscribe((p) => this.profile.set(p));
    this.reviewSvc.getLocations(this.companyName).subscribe((l) => this.locations.set(l));
    this.reviewSvc.getCompanySalaries(this.companyName).subscribe((s) => this.companySalaries.set(s));
    this.reviewSvc.getSimilar(this.companyName).subscribe((s) => this.similar.set(s));
  }

  euros(n: number): string { return n ? n.toLocaleString('fr-FR') + ' €' : '—'; }

  loadReviews() {
    this.reviewSvc.getReviews(this.companyName).subscribe((s) => this.summary.set(s));
  }

  private yearChart?: Chart;
  setTab(t: 'about' | 'jobs' | 'reviews' | 'questions') {
    this.tab.set(t);
    if (t === 'reviews') setTimeout(() => this.renderYearChart(), 120);
  }

  private renderYearChart() {
    const s = this.summary();
    const el = document.getElementById('rating-year-chart') as HTMLCanvasElement | null;
    if (!el || !s || s.reviews.length === 0) return;

    const byYear = new Map<number, number[]>();
    for (const r of s.reviews) {
      const y = new Date(r.createdAt).getFullYear();
      (byYear.get(y) ?? byYear.set(y, []).get(y)!).push(r.overallRating);
    }
    const years = [...byYear.keys()].sort((a, b) => a - b);
    const avgs = years.map((y) => {
      const arr = byYear.get(y)!;
      return Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10;
    });

    this.yearChart?.destroy();
    this.yearChart = new Chart(el, {
      type: 'bar',
      data: {
        labels: years.map(String),
        datasets: [{ data: avgs, backgroundColor: '#15616d', borderRadius: 6, maxBarThickness: 46 }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `${c.parsed.y} / 5` } } },
        scales: { y: { beginAtZero: true, max: 5, ticks: { stepSize: 1 } }, x: { grid: { display: false } } },
      },
    });
  }

  /**
   * Qui peut modifier cette fiche.
   *
   * Le rôle ne suffit pas : « Recruiter » ouvrait la fiche de n'importe
   * quelle société, y compris celle d'un concurrent. Le serveur le
   * refuse désormais ; l'afficher ici quand même donnerait un bouton
   * qui n'aboutit qu'à un refus.
   *
   * Plusieurs recruteurs d'une même entreprise la modifient bien tous :
   * c'est le nom déclaré au compte qui décide, pas le compte lui-même.
   */
  get canEditProfile(): boolean {
    const u = this.auth.currentUser();
    if (u?.role === 'Admin') return true;
    if (u?.role !== 'Recruiter') return false;
    const sienne = (u.company ?? '').trim().toLowerCase();
    return !!sienne && sienne === (this.companyName ?? '').trim().toLowerCase();
  }
  get hasProfileInfo(): boolean {
    const p = this.profile();
    return !!(p && (p.foundedYear || p.size || p.industry || p.headquarters || p.website || p.about));
  }
  startEditProfile() {
    const p = this.profile();
    this.profileForm = {
      foundedYear: p?.foundedYear ?? null, size: p?.size || '', industry: p?.industry || '',
      headquarters: p?.headquarters || '', website: p?.website || '', about: p?.about || '',
    };
    this.editingProfile.set(true);
  }
  cancelEditProfile() { this.editingProfile.set(false); }
  saveProfile() {
    this.savingProfile.set(true);
    this.reviewSvc.saveProfile(this.companyName, this.profileForm).subscribe({
      next: () => {
        this.savingProfile.set(false);
        this.editingProfile.set(false);
        this.reviewSvc.getProfile(this.companyName).subscribe((p) => this.profile.set(p));
        this.toastr.success('Fiche entreprise enregistrée');
      },
      error: () => { this.savingProfile.set(false); this.toastr.error('Erreur'); },
    });
  }

  // ── Suivre ──
  toggleFollow() {
    if (!this.auth.isLoggedIn()) { this.toastr.info('Connectez-vous pour suivre une entreprise'); return; }
    this.reviewSvc.toggleFollow(this.companyName).subscribe((f) => {
      this.following.set(f.following);
      this.followCount.set(f.count);
      this.toastr.success(f.following ? 'Entreprise suivie' : 'Vous ne suivez plus cette entreprise');
    });
  }

  // ── Q&A ──
  submitQuestion() {
    if (!this.auth.isLoggedIn()) { this.toastr.info('Connectez-vous pour poser une question'); return; }
    if (!this.newQuestion.trim()) return;
    this.asking.set(true);
    this.reviewSvc.askQuestion(this.companyName, this.newQuestion.trim()).subscribe({
      next: () => { this.asking.set(false); this.newQuestion = ''; this.toastr.success('Question publiée'); this.reviewSvc.getQuestions(this.companyName).subscribe((q) => this.questions.set(q)); },
      error: () => { this.asking.set(false); this.toastr.error('Erreur'); },
    });
  }
  openAnswer(qid: number) { this.answeringId.set(this.answeringId() === qid ? null : qid); this.answerText = ''; }
  submitAnswer(qid: number) {
    if (!this.auth.isLoggedIn()) { this.toastr.info('Connectez-vous pour répondre'); return; }
    if (!this.answerText.trim()) return;
    this.reviewSvc.answerQuestion(qid, this.answerText.trim()).subscribe({
      next: () => { this.answeringId.set(null); this.answerText = ''; this.toastr.success('Réponse publiée'); this.reviewSvc.getQuestions(this.companyName).subscribe((q) => this.questions.set(q)); },
      error: () => this.toastr.error('Erreur'),
    });
  }

  criteriaValue(key: string): number {
    const c = this.summary()?.criteria as any;
    return c ? c[key] || 0 : 0;
  }

  /** Type d'étoile à l'index i (1..5) pour une note donnée : plein / demi / vide. */
  starType(value: number, i: number): 'full' | 'half' | 'empty' {
    if (value >= i) return 'full';
    if (value >= i - 0.5) return 'half';
    return 'empty';
  }
  distributionPct(star: number): number {
    const s = this.summary();
    if (!s || !s.count) return 0;
    return Math.round(((s.distribution?.[star] || 0) / s.count) * 100);
  }

  // ── Formulaire ──
  openReview() {
    if (!this.auth.isLoggedIn()) { this.toastr.info('Connectez-vous pour laisser un avis'); return; }
    this.reviewForm = { overallRating: 0, workLifeBalance: 0, payBenefits: 0, jobSecurity: 0, management: 0, culture: 0, title: '', body: '', jobTitle: '', location: '' };
    this.reviewOpen.set(true);
  }
  closeReview() { this.reviewOpen.set(false); }
  setStar(field: string, value: number) { this.reviewForm[field] = value; }

  submitReview() {
    if (!this.reviewForm.overallRating || !this.reviewForm.title.trim()) {
      this.toastr.warning('Une note globale et un titre sont requis');
      return;
    }
    this.submitting.set(true);
    this.reviewSvc.createReview(this.companyName, this.reviewForm).subscribe({
      next: (r) => {
        this.submitting.set(false);
        this.reviewOpen.set(false);
        this.toastr.success(r.message, 'Avis publié');
        this.loadReviews();
        this.tab.set('reviews');
      },
      error: (err) => { this.submitting.set(false); this.toastr.error(err.error?.message || 'Erreur'); },
    });
  }
}
