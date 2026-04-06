import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { SeoService } from '../../services/seo.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-register',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register implements OnInit {
  activeTab: 'jobseeker' | 'company' = 'jobseeker';
  loading = false;
  showPassword = false;

  // Champs communs
  email = '';
  password = '';
  firstName = '';
  lastName = '';
  phone = '';

  // JobSeeker
  bio = '';
  skills = '';

  // Company
  companyName = '';
  companyDescription = '';
  companyWebsite = '';
  companyLocation = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
    private seo: SeoService
  ) {}

  ngOnInit(): void {
    this.seo.setNoIndex('Inscription', 'Creez votre compte sur La Plateforme de l\'Emploi et trouvez votre prochain emploi.');
  }

  onSubmit(): void {
    if (!this.email || !this.password || !this.firstName || !this.lastName) {
      this.toastr.warning('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (this.password.length < 6) {
      this.toastr.warning('Le mot de passe doit contenir au moins 6 caracteres');
      return;
    }

    this.loading = true;

    if (this.activeTab === 'jobseeker') {
      this.authService.registerJobSeeker({
        email: this.email,
        password: this.password,
        firstName: this.firstName,
        lastName: this.lastName,
        phone: this.phone || undefined,
        bio: this.bio || undefined,
        skills: this.skills || undefined
      }).subscribe({
        next: () => {
          this.toastr.success('Compte cree avec succes !');
          this.router.navigate(['/']);
        },
        error: (err) => {
          this.toastr.error(err.error?.message || 'Erreur lors de l\'inscription');
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
    } else {
      if (!this.companyName) {
        this.toastr.warning('Veuillez saisir le nom de l\'entreprise');
        this.loading = false;
        return;
      }

      this.authService.registerCompany({
        email: this.email,
        password: this.password,
        firstName: this.firstName,
        lastName: this.lastName,
        phone: this.phone || undefined,
        companyName: this.companyName,
        companyDescription: this.companyDescription || undefined,
        companyWebsite: this.companyWebsite || undefined,
        companyLocation: this.companyLocation || undefined
      }).subscribe({
        next: () => {
          this.toastr.success('Compte entreprise cree avec succes !');
          this.router.navigate(['/']);
        },
        error: (err) => {
          this.toastr.error(err.error?.message || 'Erreur lors de l\'inscription');
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
    }
  }
}
