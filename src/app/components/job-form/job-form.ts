import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { JobOfferService } from '../../services/job-offer';
import { AuthService } from '../../services/auth.service';
import { PlatformService } from '../../services/platform.service';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-job-form',
  imports: [FormsModule, RouterLink],
  templateUrl: './job-form.html',
  styleUrl: './job-form.scss',
})
export class JobForm implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private jobService = inject(JobOfferService);
  private toastr = inject(ToastrService);
  auth = inject(AuthService);
  private platform = inject(PlatformService);

  isEdit = signal(false);
  jobId = 0;
  submitting = false;
  currentStep = signal(1);

  form: any = {
    title: '', company: '', location: '', description: '',
    contractType: 'CDI', salary: '', category: 'Tech',
    isRemote: false, tags: '', isActive: true,
    minSalary: null, maxSalary: null,
    experienceRequired: '', educationLevel: '',
    benefits: '', companyDescription: '', isUrgent: false,
  };

  contractTypes = ['CDI', 'CDD', 'Stage', 'Alternance', 'Freelance'];
  categories = ['Tech', 'Design', 'Marketing', 'Finance', 'Data', 'RH'];
  experienceLevels = ['Junior', 'Intermediaire', 'Senior', 'Expert'];
  educationLevels = ['Bac', 'Bac+2', 'Bac+3', 'Bac+5', 'Doctorat'];

  ngOnInit() {
    const u = this.auth.currentUser();
    if (u?.company) this.form.company = u.company;

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit.set(true);
      this.jobId = Number(id);
      this.jobService.getById(this.jobId).subscribe({
        next: (job) => {
          this.form = {
            title: job.title, company: job.company, location: job.location,
            description: job.description, contractType: job.contractType,
            salary: job.salary || '', category: job.category,
            isRemote: job.isRemote, tags: job.tags || '', isActive: job.isActive,
            minSalary: job.minSalary || null, maxSalary: job.maxSalary || null,
            experienceRequired: job.experienceRequired || '',
            educationLevel: job.educationLevel || '',
            benefits: job.benefits || '', companyDescription: job.companyDescription || '',
            isUrgent: job.isUrgent || false,
          };
        },
        error: () => { this.toastr.error('Offre introuvable'); this.router.navigate(['/offres']); },
      });
    }
  }

  nextStep() { if (this.currentStep() < 3) this.currentStep.update(s => s + 1); }
  prevStep() { if (this.currentStep() > 1) this.currentStep.update(s => s - 1); }
  goStep(n: number) { this.currentStep.set(n); }

  get isAdmin(): boolean { return this.auth.isAdmin(); }
  get showModerationNotice(): boolean { return this.platform.requireModeration && !this.isAdmin; }

  submit() {
    if (!this.form.title || !this.form.company || !this.form.location || !this.form.description) {
      this.toastr.warning('Veuillez remplir les champs obligatoires (etape 1)');
      this.currentStep.set(1);
      return;
    }

    this.submitting = true;

    if (this.isEdit()) {
      this.jobService.update(this.jobId, this.form).subscribe({
        next: () => {
          this.submitting = false;
          if (this.showModerationNotice) {
            Swal.fire({
              icon: 'info',
              title: 'Modifications enregistrees',
              text: 'Votre offre a ete renvoyee en moderation. Elle sera visible apres validation par un administrateur.',
              confirmButtonColor: '#0d9488',
            }).then(() => this.router.navigate(['/admin/mes-offres']));
          } else {
            this.toastr.success('Offre mise a jour');
            this.router.navigate(['/offres', this.jobId]);
          }
        },
        error: () => { this.submitting = false; this.toastr.error('Erreur'); },
      });
    } else {
      this.jobService.create(this.form).subscribe({
        next: (job) => {
          this.submitting = false;
          if (this.showModerationNotice) {
            Swal.fire({
              icon: 'info',
              title: 'Offre soumise a moderation',
              html: '<p>Votre offre a bien ete envoyee.</p><p>Elle sera <strong>visible par les candidats</strong> une fois validee par un administrateur.</p><p style="margin-top:8px;font-size:13px;color:#94a3b8">Vous serez notifie lorsque votre offre sera approuvee.</p>',
              confirmButtonColor: '#0d9488',
              confirmButtonText: 'Compris',
            }).then(() => this.router.navigate(['/admin/mes-offres']));
          } else {
            Swal.fire({
              icon: 'success',
              title: 'Offre publiee !',
              text: 'Votre offre est maintenant visible par les candidats.',
              confirmButtonColor: '#0d9488',
            }).then(() => this.router.navigate(['/offres', job.id]));
          }
        },
        error: () => { this.submitting = false; this.toastr.error('Erreur lors de la creation'); },
      });
    }
  }
}
