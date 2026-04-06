import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { JobOfferService } from '../../services/job-offer.service';
import { CompanyService } from '../../services/company.service';
import { CategoryService } from '../../services/category.service';
import { AIService } from '../../services/ai.service';
import { AuthService } from '../../services/auth.service';
import { SeoService } from '../../services/seo.service';
import { JobOfferCreate } from '../../models/job-offer.model';
import { Company } from '../../models/company.model';
import { Category } from '../../models/category.model';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-job-form',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './job-form.html',
  styleUrl: './job-form.css'
})
export class JobForm implements OnInit {
  isEdit = false;
  jobId: number | null = null;
  companies: Company[] = [];
  categories: Category[] = [];
  contractTypes = ['CDI', 'CDD', 'Stage', 'Alternance', 'Freelance'];
  generating = false;
  templates: any[] = [];
  templateName = '';
  savingTemplate = false;

  form: JobOfferCreate = {
    title: '', description: '', location: '', contractType: 'CDI',
    salaryMin: null, salaryMax: null, isRemote: false,
    expiresAt: null, companyId: 0, categoryId: 0
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private jobService: JobOfferService,
    private companyService: CompanyService,
    private categoryService: CategoryService,
    private aiService: AIService,
    public auth: AuthService,
    private http: HttpClient,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
    private seo: SeoService
  ) {}

  ngOnInit(): void {
    this.seo.setNoIndex('Publier une offre', 'Creez ou modifiez une offre d\'emploi sur La Plateforme de l\'Emploi.');
    this.companyService.getAll().subscribe(c => { this.companies = c; this.cdr.detectChanges(); });
    this.categoryService.getAll().subscribe(c => { this.categories = c; this.cdr.detectChanges(); });

    this.route.params.subscribe(params => {
      if (params['id']) {
        this.isEdit = true;
        this.jobId = +params['id'];
        this.jobService.getById(this.jobId).subscribe({
          next: job => {
            this.form = {
              title: job.title, description: job.description, location: job.location,
              contractType: job.contractType, salaryMin: job.salaryMin, salaryMax: job.salaryMax,
              isRemote: job.isRemote, expiresAt: job.expiresAt,
              companyId: job.companyId, categoryId: job.categoryId
            };
            this.cdr.detectChanges();
          },
          error: () => { this.toastr.error('Offre introuvable'); this.router.navigate(['/offres']); }
        });
      }
    });

    // Load templates
    this.http.get<any[]>('/api/job-templates').subscribe(t => { this.templates = t; this.cdr.detectChanges(); });

    // Pre-fill from duplicate query params
    const qp = this.route.snapshot.queryParams;
    if (qp['duplicate']) {
      this.form.title = qp['title'] || '';
      this.form.description = qp['description'] || '';
      this.form.location = qp['location'] || '';
      this.form.contractType = qp['contractType'] || 'CDI';
      this.form.salaryMin = qp['salaryMin'] ? +qp['salaryMin'] : null;
      this.form.salaryMax = qp['salaryMax'] ? +qp['salaryMax'] : null;
      this.form.isRemote = qp['isRemote'] === 'true';
      this.form.categoryId = qp['categoryId'] ? +qp['categoryId'] : 0;
      this.form.companyId = qp['companyId'] ? +qp['companyId'] : 0;
    }
  }

  loadTemplate(t: any): void {
    this.form.title = t.title;
    this.form.description = t.description;
    this.form.location = t.location;
    this.form.contractType = t.contractType;
    this.form.salaryMin = t.salaryMin;
    this.form.salaryMax = t.salaryMax;
    this.form.isRemote = t.isRemote;
    this.form.categoryId = t.categoryId;
    this.toastr.success(`Modele "${t.name}" charge`);
    this.cdr.detectChanges();
  }

  saveAsTemplate(): void {
    if (!this.templateName.trim() || !this.form.title) {
      this.toastr.warning('Remplissez au moins le titre et donnez un nom au modele');
      return;
    }
    this.savingTemplate = true;
    this.http.post<any>('/api/job-templates', {
      name: this.templateName,
      title: this.form.title, description: this.form.description,
      location: this.form.location, contractType: this.form.contractType,
      salaryMin: this.form.salaryMin, salaryMax: this.form.salaryMax,
      isRemote: this.form.isRemote, categoryId: this.form.categoryId
    }).subscribe({
      next: t => {
        this.templates.unshift(t);
        this.toastr.success('Modele sauvegarde');
        this.templateName = '';
        this.savingTemplate = false;
        this.cdr.detectChanges();
      },
      error: () => { this.toastr.error('Erreur'); this.savingTemplate = false; }
    });
  }

  deleteTemplate(t: any): void {
    this.http.delete(`/api/job-templates/${t.id}`).subscribe({
      next: () => { this.templates = this.templates.filter(x => x.id !== t.id); this.toastr.success('Modele supprime'); this.cdr.detectChanges(); }
    });
  }

  generateWithAI(): void {
    if (!this.form.title) {
      this.toastr.warning('Entrez au moins un titre de poste');
      return;
    }

    Swal.fire({
      title: '<i class="bi bi-magic me-2"></i> Generer avec l\'IA',
      html: `
        <p style="font-size:.9rem;color:var(--sand-500);margin-bottom:1rem;">L'IA va generer une description professionnelle pour <strong>"${this.form.title}"</strong></p>
        <input id="swal-keywords" class="swal2-input" placeholder="Mots-cles / technologies (optionnel)" style="font-size:.9rem;">
      `,
      showCancelButton: true,
      confirmButtonText: '<i class="bi bi-stars me-1"></i> Generer',
      cancelButtonText: 'Annuler',
      preConfirm: () => (document.getElementById('swal-keywords') as HTMLInputElement)?.value
    }).then(result => {
      if (result.isConfirmed) {
        this.generating = true;
        this.cdr.detectChanges();

        this.aiService.generateJob(this.form.title, result.value, this.form.contractType).subscribe({
          next: gen => {
            this.form.title = gen.title;
            this.form.description = gen.description;
            if (gen.salaryMin) this.form.salaryMin = gen.salaryMin;
            if (gen.salaryMax) this.form.salaryMax = gen.salaryMax;
            this.generating = false;
            this.toastr.success('Description generee ! Verifiez et ajustez si besoin.');
            this.cdr.detectChanges();
          },
          error: (err) => {
            this.generating = false;
            this.toastr.error(err.error?.message || 'Erreur de generation');
            this.cdr.detectChanges();
          }
        });
      }
    });
  }

  onSubmit(): void {
    if (!this.form.title || !this.form.description || !this.form.companyId || !this.form.categoryId) {
      this.toastr.warning('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (this.isEdit && this.jobId) {
      this.jobService.update(this.jobId, this.form).subscribe({
        next: job => { this.toastr.success('Offre modifiee'); this.router.navigate(['/offres', job.id]); },
        error: () => this.toastr.error('Erreur lors de la modification')
      });
    } else {
      this.jobService.create(this.form).subscribe({
        next: job => { this.toastr.success('Offre creee'); this.router.navigate(['/offres', job.id]); },
        error: () => this.toastr.error('Erreur lors de la creation')
      });
    }
  }
}
