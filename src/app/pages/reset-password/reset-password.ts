import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { SeoService } from '../../services/seo.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-reset-password',
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="container-main py-4">
      <div class="row justify-content-center">
        <div class="col-lg-5 fade-up">
          <div class="card-static p-4" style="border-radius:var(--r-xl);margin-top:3rem;">
            <div class="text-center mb-4">
              <div style="width:64px;height:64px;border-radius:50%;background:var(--forest-50);display:inline-flex;align-items:center;justify-content:center;font-size:1.5rem;color:var(--forest-600);">
                <i class="bi bi-shield-lock"></i>
              </div>
              <h2 style="font-size:1.2rem;font-weight:800;margin-top:.75rem;">Nouveau mot de passe</h2>
              <p style="color:var(--sand-400);font-size:.88rem;">Choisissez un nouveau mot de passe securise.</p>
            </div>

            @if (!done) {
              <form (ngSubmit)="submit()" class="form-custom">
                <div class="mb-3">
                  <label class="form-label">Nouveau mot de passe</label>
                  <input type="password" class="form-control" placeholder="Au moins 6 caracteres"
                         [(ngModel)]="password" name="password" required minlength="6">
                </div>
                <div class="mb-4">
                  <label class="form-label">Confirmer</label>
                  <input type="password" class="form-control" placeholder="Retapez le mot de passe"
                         [(ngModel)]="confirm" name="confirm" required>
                  @if (confirm && password !== confirm) {
                    <div style="font-size:.8rem;color:var(--rose-500);margin-top:.3rem;">
                      <i class="bi bi-x-circle me-1"></i>Les mots de passe ne correspondent pas
                    </div>
                  }
                </div>
                <button type="submit" class="btn btn-primary w-100 py-2"
                        [disabled]="loading || password.length < 6 || password !== confirm"
                        style="font-weight:700;">
                  @if (loading) { <span class="spinner-border spinner-border-sm me-2"></span>Reinitialisation... }
                  @else { <i class="bi bi-check-lg me-2"></i>Reinitialiser le mot de passe }
                </button>
              </form>
            } @else {
              <div class="text-center">
                <div style="background:var(--forest-50);border-radius:var(--r-md);padding:1.25rem;margin-bottom:1rem;">
                  <i class="bi bi-check-circle-fill text-success" style="font-size:2rem;"></i>
                  <p style="font-size:.9rem;margin:.75rem 0 0;color:var(--sand-600);">
                    Mot de passe reinitialise avec succes !
                  </p>
                </div>
                <a routerLink="/connexion" class="btn btn-primary w-100 py-2" style="font-weight:700;">
                  <i class="bi bi-box-arrow-in-right me-2"></i>Se connecter
                </a>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `
})
export class ResetPassword implements OnInit {
  token = '';
  password = '';
  confirm = '';
  loading = false;
  done = false;

  constructor(private route: ActivatedRoute, private router: Router, private http: HttpClient, private toastr: ToastrService, private seo: SeoService) {}

  ngOnInit(): void {
    this.seo.setNoIndex('Reinitialiser le mot de passe', 'Definissez un nouveau mot de passe pour votre compte.');
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    if (!this.token) this.router.navigate(['/connexion']);
  }

  submit(): void {
    this.loading = true;
    this.http.post<any>('/api/auth/reset-password', { token: this.token, newPassword: this.password }).subscribe({
      next: () => { this.done = true; this.loading = false; },
      error: (err) => {
        this.toastr.error(err.error?.message || 'Lien invalide ou expire');
        this.loading = false;
      }
    });
  }
}
