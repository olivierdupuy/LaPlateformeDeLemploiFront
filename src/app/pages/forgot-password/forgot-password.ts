import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { SeoService } from '../../services/seo.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-forgot-password',
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="container-main py-4">
      <div class="row justify-content-center">
        <div class="col-lg-5 fade-up">
          <div class="card-static p-4" style="border-radius:var(--r-xl);margin-top:3rem;">
            <div class="text-center mb-4">
              <div style="width:64px;height:64px;border-radius:50%;background:var(--forest-50);display:inline-flex;align-items:center;justify-content:center;font-size:1.5rem;color:var(--forest-600);">
                <i class="bi bi-key"></i>
              </div>
              <h2 style="font-size:1.2rem;font-weight:800;margin-top:.75rem;">Mot de passe oublie ?</h2>
              <p style="color:var(--sand-400);font-size:.88rem;">Entrez votre email, nous vous enverrons un lien de reinitialisation.</p>
            </div>

            @if (!sent) {
              <form (ngSubmit)="submit()" class="form-custom">
                <div class="mb-4">
                  <label class="form-label">Adresse email</label>
                  <div class="input-icon-wrapper">
                    <i class="bi bi-envelope input-icon"></i>
                    <input type="email" class="form-control input-with-icon" placeholder="nom@exemple.com"
                           [(ngModel)]="email" name="email" required>
                  </div>
                </div>
                <button type="submit" class="btn btn-primary w-100 py-2" [disabled]="loading || !email" style="font-weight:700;">
                  @if (loading) { <span class="spinner-border spinner-border-sm me-2"></span>Envoi... }
                  @else { <i class="bi bi-send me-2"></i>Envoyer le lien }
                </button>
              </form>
            } @else {
              <div class="text-center">
                <div style="background:var(--forest-50);border-radius:var(--r-md);padding:1.25rem;margin-bottom:1rem;">
                  <i class="bi bi-check-circle-fill text-success" style="font-size:2rem;"></i>
                  <p style="font-size:.9rem;margin:.75rem 0 0;color:var(--sand-600);">
                    Si un compte est associe a <strong>{{ email }}</strong>, un lien de reinitialisation a ete envoye.
                  </p>
                </div>
                @if (resetToken) {
                  <div style="background:var(--copper-50);border-radius:var(--r-md);padding:1rem;margin-bottom:1rem;font-size:.82rem;color:var(--copper-600);">
                    <i class="bi bi-exclamation-triangle me-1"></i><strong>Mode dev :</strong>
                    <a [routerLink]="['/reinitialiser-mot-de-passe']" [queryParams]="{token: resetToken}" style="color:var(--copper-600);text-decoration:underline;">
                      Cliquer ici pour reinitialiser
                    </a>
                  </div>
                }
                <button class="btn-ghost w-100 justify-content-center" (click)="sent = false; email = ''">
                  <i class="bi bi-arrow-left me-2"></i>Renvoyer un email
                </button>
              </div>
            }

            <div class="text-center mt-3">
              <a routerLink="/connexion" style="font-size:.88rem;color:var(--sand-400);">
                <i class="bi bi-arrow-left me-1"></i>Retour a la connexion
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ForgotPassword implements OnInit {
  email = '';
  loading = false;
  sent = false;
  resetToken = '';

  constructor(private http: HttpClient, private toastr: ToastrService, private seo: SeoService) {}

  ngOnInit(): void {
    this.seo.setNoIndex('Mot de passe oublie', 'Reintialisez votre mot de passe La Plateforme de l\'Emploi.');
  }

  submit(): void {
    this.loading = true;
    this.http.post<any>('/api/auth/forgot-password', { email: this.email }).subscribe({
      next: res => {
        this.sent = true;
        this.resetToken = res.token || '';
        this.loading = false;
      },
      error: () => {
        this.toastr.error('Erreur lors de l\'envoi');
        this.loading = false;
      }
    });
  }
}
