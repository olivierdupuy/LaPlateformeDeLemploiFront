import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { JobOfferService } from '../../services/job-offer';
import { AuthService } from '../../services/auth.service';
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

  submit() {
    if (!this.form.title || !this.form.company || !this.form.location || !this.form.description) {
      this.toastr.warning('Veuillez remplir les champs obligatoires (etape 1)');
      this.currentStep.set(1);
      return;
    }

    this.submitting = true;

    if (this.isEdit()) {
      this.jobService.update(this.jobId, this.form).subscribe({
        next: () => { this.submitting = false; this.toastr.success('Offre mise a jour'); this.router.navigate(['/offres', this.jobId]); },
        error: () => { this.submitting = false; this.toastr.error('Erreur'); },
      });
    } else {
      this.jobService.create(this.form).subscribe({
        next: (job) => {
          this.submitting = false;
          Swal.fire({ icon: 'success', title: 'Offre publiee !', text: 'Votre offre est maintenant visible par les candidats.', confirmButtonColor: '#0d9488' })
            .then(() => this.router.navigate(['/offres', job.id]));
        },
        error: () => { this.submitting = false; this.toastr.error('Erreur lors de la creation'); },
      });
    }
  }
}
