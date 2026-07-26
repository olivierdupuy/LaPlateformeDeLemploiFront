import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { JobOfferService } from '../../services/job-offer';
import { BookmarkService } from '../../services/bookmark.service';
import { SearchHistoryService } from '../../services/search-history.service';
import { ApplicationService } from '../../services/application';
import { AuthService } from '../../services/auth.service';
import { SavedSearchService } from '../../services/saved-search.service';
import { JobOffer } from '../../models/job-offer.model';
import { getTimeAgo, getTags, getContractBadgeClass, companyColor } from '../../utils/job.utils';

@Component({
  selector: 'app-job-list',
  imports: [RouterLink, FormsModule],
  templateUrl: './job-list.html',
  styleUrl: './job-list.scss',
})
export class JobList implements OnInit {
  private jobService = inject(JobOfferService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toastr = inject(ToastrService);
  bookmarkService = inject(BookmarkService);
  searchHistory = inject(SearchHistoryService);
  private appService = inject(ApplicationService);
  private savedSearchSvc = inject(SavedSearchService);
  auth = inject(AuthService);
  alertSaving = signal(false);
  alertSaved = signal(false);

  jobs = signal<JobOffer[]>([]);
  appliedIds = signal<Set<number>>(new Set());
  applying = signal<number | null>(null);
  relatedSearches = signal<string[]>([]);
  relevanceFeedback = signal<number | null>(null);
  categories = signal<string[]>([]);
  loading = signal(true);

  // Vue split : offre selectionnee dans le volet de droite
  selected = signal<JobOffer | null>(null);

  // Champs de recherche
  search = '';
  location = '';

  // Filtres
  category = '';
  contractType = '';
  isRemote: boolean | undefined;
  salaryMin: number | undefined;
  salaryMax: number | undefined;
  experience = '';
  education = '';
  workSchedule = '';
  language = '';
  datePosted: number | undefined;
  radius: number | undefined;
  sort = '';
  showAdvanced = false;

  radiusOptions = [
    { label: 'Distance exacte', value: undefined },
    { label: '10 km', value: 10 },
    { label: '25 km', value: 25 },
    { label: '50 km', value: 50 },
    { label: '100 km', value: 100 },
  ];

  contractTypes = ['CDI', 'CDD', 'Stage', 'Alternance', 'Freelance'];
  // Valeurs par défaut, remplacées par les valeurs réellement présentes en base
  // (endpoint /filters) pour n'afficher aucune option qui renverrait 0 résultat.
  experienceLevels = signal<string[]>(['Junior', 'Intermediaire', 'Senior', 'Expert']);
  educationLevels = signal<string[]>(['Bac', 'Bac+2', 'Bac+3', 'Bac+5', 'Doctorat']);
  workSchedules = signal<string[]>(['Temps plein', 'Temps partiel', 'Journee', 'Nuit', 'Week-end']);
  languagesList = signal<string[]>(['Francais', 'Anglais', 'Allemand', 'Espagnol', 'Italien']);
  datePostedOptions = [
    { label: 'À tout moment', value: undefined },
    { label: 'Dernières 24 h', value: 1 },
    { label: '3 derniers jours', value: 3 },
    { label: '7 derniers jours', value: 7 },
    { label: '14 derniers jours', value: 14 },
  ];
  sortOptions = [
    { label: 'Pertinence', value: '' },
    { label: 'Plus récentes', value: 'date' },
    { label: 'Salaire décroissant', value: 'salary_desc' },
    { label: 'Salaire croissant', value: 'salary_asc' },
    { label: 'Plus consultées', value: 'views' },
  ];

  // Autocompletion
  kwSuggestions = signal<string[]>([]);
  locSuggestions = signal<string[]>([]);
  private kwInput$ = new Subject<string>();
  private locInput$ = new Subject<string>();

  // Signalement
  reportOpen = signal(false);
  reportJob: JobOffer | null = null;
  reportReason = '';
  reportDetails = '';
  reportEmail = '';
  reportSubmitting = signal(false);
  reportReasons = ['Offre frauduleuse', 'Contenu discriminatoire', 'Offre expirée / pourvue', 'Doublon', 'Autre'];

  getTimeAgo = getTimeAgo;
  getTags = getTags;
  getContractBadgeClass = getContractBadgeClass;
  companyColor = companyColor;

  ngOnInit() {
    this.jobService.getCategories().subscribe((c) => this.categories.set(c));
    this.jobService.getFilterOptions().subscribe((o) => {
      if (o.experiences?.length) this.experienceLevels.set(o.experiences);
      if (o.educations?.length) this.educationLevels.set(o.educations);
      if (o.workSchedules?.length) this.workSchedules.set(o.workSchedules);
      if (o.languages?.length) this.languagesList.set(o.languages);
    });

    // Autocompletion mots-cles
    this.kwInput$
      .pipe(debounceTime(200), distinctUntilChanged(), switchMap((q) => this.jobService.suggest(q, 'keyword')))
      .subscribe((s) => this.kwSuggestions.set(s));
    // Autocompletion lieu
    this.locInput$
      .pipe(debounceTime(200), distinctUntilChanged(), switchMap((q) => this.jobService.suggest(q, 'location')))
      .subscribe((s) => this.locSuggestions.set(s));

    this.route.queryParams.subscribe((params) => {
      this.search = params['search'] || '';
      this.location = params['location'] || '';
      this.category = params['category'] || '';
      this.contractType = params['contractType'] || '';
      if (params['isRemote'] === 'true') this.isRemote = true;
      this.loadJobs();
    });
  }

  private readonly pageSize = 24;
  page = 1;
  hasMore = signal(false);
  loadingMore = signal(false);

  private buildFilters(): any {
    const filters: any = {};
    if (this.search) filters.search = this.search;
    if (this.location) filters.location = this.location;
    if (this.category) filters.category = this.category;
    if (this.contractType) filters.contractType = this.contractType;
    if (this.isRemote !== undefined) filters.isRemote = this.isRemote;
    if (this.salaryMin) filters.salaryMin = this.salaryMin;
    if (this.salaryMax) filters.salaryMax = this.salaryMax;
    if (this.experience) filters.experience = this.experience;
    if (this.education) filters.education = this.education;
    if (this.workSchedule) filters.workSchedule = this.workSchedule;
    if (this.language) filters.languages = this.language;
    if (this.datePosted) filters.datePosted = this.datePosted;
    if (this.radius && this.location) filters.radius = this.radius;
    if (this.sort) filters.sort = this.sort;
    filters.pageSize = this.pageSize;
    return filters;
  }

  loadJobs() {
    this.loading.set(true);
    this.page = 1;
    if (this.search) this.searchHistory.add(this.search);
    const filters = this.buildFilters();
    filters.page = 1;

    this.relevanceFeedback.set(null);
    this.alertSaved.set(false);
    this.jobService.getAll(filters).subscribe((jobs) => {
      this.jobs.set(jobs);
      this.hasMore.set(jobs.length === this.pageSize);
      this.computeRelated(jobs);
      this.loading.set(false);
      // Auto-selection de la 1re offre en vue split (desktop)
      const current = this.selected();
      if (!current || !jobs.some((j) => j.id === current.id)) {
        this.selected.set(jobs.length ? jobs[0] : null);
      }
    });
  }

  loadMore() {
    if (this.loadingMore()) return;
    this.loadingMore.set(true);
    this.page += 1;
    const filters = this.buildFilters();
    filters.page = this.page;
    this.jobService.getAll(filters).subscribe({
      next: (jobs) => {
        this.jobs.update((cur) => [...cur, ...jobs]);
        this.hasMore.set(jobs.length === this.pageSize);
        this.loadingMore.set(false);
      },
      error: () => this.loadingMore.set(false),
    });
  }

  // ── Vue split ──
  selectJob(job: JobOffer, event?: Event) {
    // Sur mobile, on navigue vers la fiche complete
    if (window.innerWidth < 1024) {
      this.router.navigate(['/offres', job.id]);
      return;
    }
    event?.preventDefault();
    this.selected.set(job);
    // Rafraichit le detail (incremente les vues, applications a jour)
    this.jobService.getById(job.id).subscribe((full) => {
      if (this.selected()?.id === full.id) this.selected.set(full);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── Autocompletion ──
  onSearchInput() {
    if (this.search.length >= 2) this.kwInput$.next(this.search);
    else this.kwSuggestions.set([]);
  }
  onLocationInput() {
    if (this.location.length >= 2) this.locInput$.next(this.location);
    else this.locSuggestions.set([]);
  }
  pickKeyword(s: string) {
    this.search = s;
    this.kwSuggestions.set([]);
    this.loadJobs();
  }
  pickLocation(s: string) {
    this.location = s;
    this.locSuggestions.set([]);
    this.loadJobs();
  }
  clearSuggestions() {
    // leger delai pour laisser le clic sur une suggestion s'executer
    setTimeout(() => { this.kwSuggestions.set([]); this.locSuggestions.set([]); }, 150);
  }

  // ── Filtres ──
  clearFilters() {
    this.category = '';
    this.contractType = '';
    this.isRemote = undefined;
    this.salaryMin = undefined;
    this.salaryMax = undefined;
    this.experience = '';
    this.education = '';
    this.workSchedule = '';
    this.language = '';
    this.datePosted = undefined;
    this.radius = undefined;
    this.sort = '';
    this.loadJobs();
  }

  // ── Candidature simplifiée (1 clic) ──
  isCandidate(): boolean {
    return this.auth.isLoggedIn() && this.auth.currentUser()?.role === 'Candidate';
  }
  canEasyApply(job: JobOffer): boolean {
    const hasScreening = !!job.screeningQuestions && job.screeningQuestions !== '[]';
    return !!job.easyApply && !hasScreening && !job.externalUrl && this.isCandidate() && !this.appliedIds().has(job.id);
  }
  easyApply(job: JobOffer, event?: Event) {
    event?.preventDefault();
    event?.stopPropagation();
    this.applying.set(job.id);
    this.appService.create({ jobOfferId: job.id, source: 'Candidature simplifiée' }).subscribe({
      next: () => {
        this.applying.set(null);
        this.appliedIds.update((s) => new Set(s).add(job.id));
        this.toastr.success('Candidature envoyée en 1 clic !', 'Candidature simplifiée');
      },
      error: (err) => {
        this.applying.set(null);
        this.toastr.error(err.error?.message || err.error || "Échec de la candidature");
      },
    });
  }

  get activeFilterCount(): number {
    return [
      this.category, this.contractType, this.experience, this.education,
      this.workSchedule, this.language, this.sort,
    ].filter(Boolean).length
      + (this.isRemote !== undefined ? 1 : 0)
      + (this.salaryMin ? 1 : 0) + (this.salaryMax ? 1 : 0)
      + (this.datePosted ? 1 : 0);
  }

  get hasAdvancedFilters(): boolean {
    return !!(this.salaryMin || this.salaryMax || this.experience || this.education
      || this.workSchedule || this.language || this.datePosted || this.sort);
  }

  useRecentSearch(q: string) {
    this.search = q;
    this.loadJobs();
  }

  // ── Recherches associées ──
  private computeRelated(jobs: JobOffer[]) {
    const stop = new Set(['pour', 'avec', 'dans', 'chez', 'senior', 'junior', 'confirme', 'confirmé', 'h/f', 'f/h', '(h/f)', 'stage', 'cdi', 'cdd']);
    const freq = new Map<string, number>();
    const cur = this.search.toLowerCase().trim();
    for (const j of jobs) {
      for (const w of j.title.toLowerCase().split(/[\s/()\-,]+/)) {
        const word = w.trim();
        if (word.length < 4 || stop.has(word) || cur.includes(word)) continue;
        freq.set(word, (freq.get(word) || 0) + 1);
      }
    }
    const words = [...freq.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).map(([w]) => w).slice(0, 6);
    const cats = [...new Set(jobs.map((j) => j.category).filter(Boolean))].slice(0, 4);
    this.relatedSearches.set([...new Set([...words, ...cats.map((c) => c.toLowerCase())])].slice(0, 8));
  }
  applyRelated(term: string) { this.search = term; this.loadJobs(); window.scrollTo({ top: 0, behavior: 'smooth' }); }

  rateRelevance(n: number) {
    this.relevanceFeedback.set(n);
    this.toastr.success('Merci, votre retour affine nos recommandations.', 'Pertinence');
  }

  // ── Alerte email pour cette recherche ──
  createAlert() {
    if (!this.auth.isLoggedIn()) { this.toastr.info('Connectez-vous pour créer une alerte emploi'); return; }
    this.alertSaving.set(true);
    const label = [this.search, this.location].filter(Boolean).join(' · ') || 'Toutes les offres';
    this.savedSearchSvc.create({
      label,
      query: this.search || undefined,
      location: this.location || undefined,
      category: this.category || undefined,
      contractType: this.contractType || undefined,
      isRemote: this.isRemote,
      alertEnabled: true,
    }).subscribe({
      next: () => { this.alertSaving.set(false); this.alertSaved.set(true); this.toastr.success('Alerte créée — vous recevrez les nouvelles offres par email.', 'Alerte emploi'); },
      error: () => { this.alertSaving.set(false); this.toastr.error('Erreur lors de la création de l\'alerte'); },
    });
  }

  getBenefits(job: JobOffer): string[] {
    return job.benefits ? job.benefits.split(',').map((b) => b.trim()).filter(Boolean) : [];
  }

  getLanguages(job: JobOffer): string[] {
    return job.languages ? job.languages.split(',').map((l) => l.trim()).filter(Boolean) : [];
  }

  salaryLabel(job: JobOffer): string | null {
    if (job.minSalary && job.maxSalary) return `${(job.minSalary / 1000)}k – ${(job.maxSalary / 1000)}k € / an`;
    if (job.salary) return job.salary;
    return null;
  }

  // ── Partage ──
  shareJob(job: JobOffer, event?: Event) {
    event?.preventDefault();
    event?.stopPropagation();
    const url = `${window.location.origin}/offres/${job.id}`;
    if (navigator.share) {
      navigator.share({ title: job.title, text: `${job.title} chez ${job.company}`, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => this.toastr.success('Lien copié dans le presse-papiers', 'Partager'));
    }
  }

  // ── Signalement ──
  openReport(job: JobOffer, event?: Event) {
    event?.preventDefault();
    event?.stopPropagation();
    this.reportJob = job;
    this.reportReason = '';
    this.reportDetails = '';
    this.reportEmail = '';
    this.reportOpen.set(true);
  }
  closeReport() { this.reportOpen.set(false); this.reportJob = null; }
  submitReport() {
    if (!this.reportJob || !this.reportReason) return;
    this.reportSubmitting.set(true);
    this.jobService.report(this.reportJob.id, {
      reason: this.reportReason,
      details: this.reportDetails || undefined,
      reporterEmail: this.reportEmail || undefined,
    }).subscribe({
      next: (r) => { this.toastr.success(r.message, 'Signalement'); this.reportSubmitting.set(false); this.closeReport(); },
      error: () => { this.toastr.error('Échec du signalement. Réessayez.'); this.reportSubmitting.set(false); },
    });
  }
}
