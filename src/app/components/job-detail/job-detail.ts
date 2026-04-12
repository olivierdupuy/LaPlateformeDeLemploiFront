import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { JobOfferService } from '../../services/job-offer';
import { BookmarkService } from '../../services/bookmark.service';
import { CandidateFeaturesService } from '../../services/candidate-features.service';
import { AuthService } from '../../services/auth.service';
import { JobOffer } from '../../models/job-offer.model';
import { ApplyModal } from '../apply-modal/apply-modal';
import { getTimeAgo, getTags, getContractBadgeClass, companyColor } from '../../utils/job.utils';
import Swal from 'sweetalert2';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-job-detail',
  imports: [RouterLink, FormsModule, ApplyModal],
  templateUrl: './job-detail.html',
  styleUrl: './job-detail.scss',
})
export class JobDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private jobService = inject(JobOfferService);
  private toastr = inject(ToastrService);
  bookmarkService = inject(BookmarkService);
  private candidateService = inject(CandidateFeaturesService);
  auth = inject(AuthService);

  job = signal<JobOffer | null>(null);
  similarJobs = signal<JobOffer[]>([]);
  showApplyModal = signal(false);
  loading = signal(true);
  noteContent = '';
  noteSaving = false;
  showNote = signal(false);

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

  openApply() { this.showApplyModal.set(true); }
  closeApply() { this.showApplyModal.set(false); }

  onApplicationSent() {
    this.showApplyModal.set(false);
    Swal.fire({
      icon: 'success',
      title: 'Candidature envoyee !',
      text: 'Votre candidature a ete transmise avec succes.',
      confirmButtonColor: '#0d9488',
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

  async deleteJob() {
    const result = await Swal.fire({
      title: 'Supprimer cette offre ?',
      text: 'Cette action est irreversible.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
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
