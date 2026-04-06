import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { SeoService } from '../../services/seo.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login implements OnInit {
  email = '';
  password = '';
  loading = false;
  showPassword = false;
  private returnUrl = '/tableau-de-bord';

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
    private seo: SeoService
  ) {
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/tableau-de-bord';
  }

  ngOnInit(): void {
    this.seo.setNoIndex('Connexion', 'Connectez-vous a votre espace personnel sur La Plateforme de l\'Emploi.');
  }

  onSubmit(): void {
    if (!this.email || !this.password) {
      this.toastr.warning('Veuillez remplir tous les champs');
      return;
    }

    this.loading = true;
    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: () => {
        this.toastr.success('Connexion reussie !');
        this.router.navigateByUrl(this.returnUrl);
      },
      error: (err) => {
        this.toastr.error(err.error?.message || 'Email ou mot de passe incorrect');
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }
}
