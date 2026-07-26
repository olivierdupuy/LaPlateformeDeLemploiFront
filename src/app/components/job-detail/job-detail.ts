import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { JobOfferService } from '../../services/job-offer';
import { ApplicationService } from '../../services/application';
import { CompanyReviewService } from '../../services/company-review.service';
import { SalaryService } from '../../services/salary.service';
import * as L from 'leaflet';
import { BookmarkService } from '../../services/bookmark.service';
import { CandidateFeaturesService } from '../../services/candidate-features.service';
import { AuthService } from '../../services/auth.service';
import { JobOffer } from '../../models/job-offer.model';
import { ApplyModal } from '../apply-modal/apply-modal';
import { MarkdownPipe } from '../../utils/markdown.pipe';
import { getTimeAgo, getTags, getContractBadgeClass, companyColor } from '../../utils/job.utils';
import Swal from 'sweetalert2';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-job-detail',
  imports: [RouterLink, FormsModule, ApplyModal, MarkdownPipe, DatePipe],
  templateUrl: './job-detail.html',
  styleUrl: './job-detail.scss',
})
export class JobDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private jobService = inject(JobOfferService);
  private appService = inject(ApplicationService);
  private reviewSvc = inject(CompanyReviewService);
  private salarySvc = inject(SalaryService);
  private toastr = inject(ToastrService);
  bookmarkService = inject(BookmarkService);
  private candidateService = inject(CandidateFeaturesService);
  auth = inject(AuthService);

  job = signal<JobOffer | null>(null);
  similarJobs = signal<JobOffer[]>([]);
  employerJobs = signal<JobOffer[]>([]);
  companyRating = signal<{ average: number; count: number } | null>(null);
  activity = signal<{ hires30d: number; responsive: boolean } | null>(null);
  market = signal<{ avg: number; verdict: 'above' | 'in' | 'below' } | null>(null);
  stars5 = [1, 2, 3, 4, 5];
  showApplyModal = signal(false);
  loading = signal(true);
  noteContent = '';
  noteSaving = false;
  showNote = signal(false);

  // Signalement
  reportOpen = signal(false);
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
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.jobService.getById(id).subscribe({
      next: (job) => {
        this.job.set(job);
        this.loading.set(false);
        this.loadSimilarJobs(job);
        this.reviewSvc.getRating(job.company).subscribe((r) => { if (r.count > 0) this.companyRating.set(r); });
        this.jobService.getByCompany(job.company).subscribe((jobs) => {
          this.employerJobs.set(jobs.filter((j) => j.id !== job.id).slice(0, 4));
        });
        this.reviewSvc.getActivity(job.company).subscribe((a) => this.activity.set(a));
        this.computeMarket(job);
        if (job.latitude && job.longitude) {
          setTimeout(() => this.initMap(job.latitude!, job.longitude!), 120);
        }
        if (this.auth.isLoggedIn() && this.auth.currentUser()?.role === 'Candidate') {
          this.candidateService.getNote(job.id).subscribe(n => { if (n.content) { this.noteContent = n.content; this.showNote.set(true); } });
        }
      },
      error: () => {
        this.toastr.error("Offre introuvable");
        this.router.navigate(['/offres']);
      },
    });
  }

  private loadSimilarJobs(job: JobOffer) {
    this.jobService.getAll({ category: job.category }).subscribe((jobs) => {
      this.similarJobs.set(jobs.filter((j) => j.id !== job.id).slice(0, 3));
    });
  }

  canManage(): boolean {
    const user = this.auth.currentUser();
    const j = this.job();
    if (!user || !j) return false;
    if (user.role === 'Admin') return true;
    return j.createdByUserId === user.id;
  }

  applied = signal(false);
  applying = signal(false);

  hasScreening(j: JobOffer): boolean { return !!j.screeningQuestions && j.screeningQuestions !== '[]'; }

  sourceLabel(s?: string): string {
    return { francetravail: 'France Travail', arbeitnow: 'Arbeitnow', remotive: 'Remotive' }[s || ''] || 'un site partenaire';
  }

  ratingStar(value: number, i: number): 'full' | 'half' | 'empty' {
    if (value >= i) return 'full';
    if (value >= i - 0.5) return 'half';
    return 'empty';
  }

  private computeMarket(job: JobOffer) {
    const offerMid = job.minSalary && job.maxSalary ? (job.minSalary + job.maxSalary) / 2 : (job.minSalary || job.maxSalary || 0);
    if (!offerMid) return;
    this.salarySvc.getEstimate(job.title).subscribe((e) => {
      if (!e || !e.avgAnnual) return;
      const ratio = offerMid / e.avgAnnual;
      const verdict = ratio >= 1.08 ? 'above' : ratio <= 0.92 ? 'below' : 'in';
      this.market.set({ avg: e.avgAnnual, verdict });
    });
  }

  private initMap(lat: number, lng: number) {
    const el = document.getElementById('jd-map');
    if (!el || (el as any)._leaflet_id) return;
    const map = L.map(el, { scrollWheelZoom: false, attributionControl: true }).setView([lat, lng], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18, attribution: '&copy; OpenStreetMap',
    }).addTo(map);
    L.circleMarker([lat, lng], { radius: 11, color: '#0e5c43', weight: 3, fillColor: '#16c47f', fillOpacity: 0.5 }).addTo(map);
    setTimeout(() => map.invalidateSize(), 200);
  }

  marketLabel(v: string): string {
    return { above: 'au-dessus du marché', in: 'dans la fourchette du marché', below: 'en dessous du marché' }[v] || '';
  }

  openApply() { this.showApplyModal.set(true); }
  closeApply() { this.showApplyModal.set(false); }

  easyApplyNow() {
    const j = this.job();
    if (!j) return;
    this.applying.set(true);
    this.appService.create({ jobOfferId: j.id, source: 'Candidature simplifiée' }).subscribe({
      next: () => {
        this.applying.set(false);
        this.applied.set(true);
        this.toastr.success('Candidature envoyée en 1 clic !', 'Candidature simplifiée');
      },
      error: (err) => {
        this.applying.set(false);
        this.toastr.error(err.error?.message || err.error || "Échec de la candidature");
      },
    });
  }

  onApplicationSent() {
    this.showApplyModal.set(false);
    this.applied.set(true);
    Swal.fire({
      icon: 'success',
      title: 'Candidature envoyee !',
      text: 'Votre candidature a ete transmise avec succes.',
      confirmButtonColor: '#0e5c43',
      confirmButtonText: 'Parfait',
    });
  }

  toggleNote() { this.showNote.update(v => !v); }

  saveNote() {
    const j = this.job();
    if (!j) return;
    this.noteSaving = true;
    this.candidateService.saveNote(j.id, this.noteContent).subscribe({
      next: () => { this.noteSaving = false; this.toastr.success('Note sauvegardee'); },
      error: () => { this.noteSaving = false; this.toastr.error('Erreur'); },
    });
  }

  async shareJob() {
    const j = this.job();
    if (!j) return;
    const url = window.location.href;
    const text = `${j.title} chez ${j.company}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: text, url });
      } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      this.toastr.success('Lien copie dans le presse-papiers');
    }
  }

  openReport() { this.reportReason = ''; this.reportDetails = ''; this.reportEmail = ''; this.reportOpen.set(true); }
  closeReport() { this.reportOpen.set(false); }
  submitReport() {
    const j = this.job();
    if (!j || !this.reportReason) return;
    this.reportSubmitting.set(true);
    this.jobService.report(j.id, {
      reason: this.reportReason,
      details: this.reportDetails || undefined,
      reporterEmail: this.reportEmail || undefined,
    }).subscribe({
      next: (r) => { this.toastr.success(r.message, 'Signalement'); this.reportSubmitting.set(false); this.closeReport(); },
      error: () => { this.toastr.error('Échec du signalement. Réessayez.'); this.reportSubmitting.set(false); },
    });
  }

  async deleteJob() {
    const result = await Swal.fire({
      title: 'Supprimer cette offre ?',
      text: 'Cette action est irreversible.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#c6362f',
      cancelButtonColor: '#6c6e63',
      confirmButtonText: 'Oui, supprimer',
      cancelButtonText: 'Annuler',
    });

    if (result.isConfirmed) {
      this.jobService.delete(this.job()!.id).subscribe({
        next: () => {
          this.toastr.success('Offre supprimee');
          this.router.navigate(['/offres']);
        },
        error: () => this.toastr.error('Erreur lors de la suppression'),
      });
    }
  }
}
