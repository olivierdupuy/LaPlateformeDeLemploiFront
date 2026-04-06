import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { SeoService } from '../../services/seo.service';

@Component({
  selector: 'app-contact',
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="container-main py-4">
      <nav aria-label="breadcrumb" class="mb-4 fade-up">
        <ol class="breadcrumb" style="font-size:.88rem;">
          <li class="breadcrumb-item"><a routerLink="/" style="color:var(--forest-600);">Accueil</a></li>
          <li class="breadcrumb-item active" aria-current="page">Contact</li>
        </ol>
      </nav>

      <div class="fade-up stagger-1" style="max-width:820px;">
        <h1 style="font-size:1.8rem;font-weight:800;color:var(--forest-800);letter-spacing:-.03em;margin-bottom:1.5rem;">
          <i class="bi bi-envelope-paper me-2" style="color:var(--forest-500);"></i>Nous contacter
        </h1>

        <div class="row g-4">
          <!-- Contact info -->
          <div class="col-md-5">
            <div class="card-static p-4" style="border-radius:var(--r-xl);height:100%;">
              <h2 style="font-size:1.1rem;font-weight:700;color:var(--forest-700);margin-bottom:1rem;">Nos coordonnees</h2>

              <div class="d-flex align-items-start gap-3 mb-3">
                <span class="contact-icon"><i class="bi bi-geo-alt-fill"></i></span>
                <div>
                  <div style="font-weight:600;font-size:.9rem;color:var(--sand-600);">Adresse</div>
                  <div style="font-size:.88rem;color:var(--sand-400);">42 rue de l'Innovation<br>75001 Paris, France</div>
                </div>
              </div>

              <div class="d-flex align-items-start gap-3 mb-3">
                <span class="contact-icon"><i class="bi bi-envelope-fill"></i></span>
                <div>
                  <div style="font-weight:600;font-size:.9rem;color:var(--sand-600);">Email</div>
                  <div style="font-size:.88rem;color:var(--sand-400);">contact&#64;plateforme-emploi.fr</div>
                </div>
              </div>

              <div class="d-flex align-items-start gap-3 mb-3">
                <span class="contact-icon"><i class="bi bi-telephone-fill"></i></span>
                <div>
                  <div style="font-weight:600;font-size:.9rem;color:var(--sand-600);">Telephone</div>
                  <div style="font-size:.88rem;color:var(--sand-400);">01 23 45 67 89</div>
                </div>
              </div>

              <div class="d-flex align-items-start gap-3">
                <span class="contact-icon"><i class="bi bi-clock-fill"></i></span>
                <div>
                  <div style="font-weight:600;font-size:.9rem;color:var(--sand-600);">Horaires</div>
                  <div style="font-size:.88rem;color:var(--sand-400);">Lundi - Vendredi : 9h00 - 18h00</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Contact form -->
          <div class="col-md-7">
            <div class="card-static p-4" style="border-radius:var(--r-xl);">
              <h2 style="font-size:1.1rem;font-weight:700;color:var(--forest-700);margin-bottom:1rem;">Envoyez-nous un message</h2>

              <form (ngSubmit)="onSubmit()" #contactForm="ngForm">
                <div class="mb-3">
                  <label for="nom" class="form-label" style="font-size:.88rem;font-weight:600;color:var(--sand-500);">Nom complet *</label>
                  <input
                    type="text"
                    class="form-control"
                    id="nom"
                    name="nom"
                    [(ngModel)]="form.nom"
                    required
                    placeholder="Votre nom"
                    style="border-radius:var(--r-md);font-size:.9rem;"
                  >
                </div>

                <div class="mb-3">
                  <label for="email" class="form-label" style="font-size:.88rem;font-weight:600;color:var(--sand-500);">Email *</label>
                  <input
                    type="email"
                    class="form-control"
                    id="email"
                    name="email"
                    [(ngModel)]="form.email"
                    required
                    placeholder="votre@email.fr"
                    style="border-radius:var(--r-md);font-size:.9rem;"
                  >
                </div>

                <div class="mb-3">
                  <label for="sujet" class="form-label" style="font-size:.88rem;font-weight:600;color:var(--sand-500);">Sujet *</label>
                  <select
                    class="form-select"
                    id="sujet"
                    name="sujet"
                    [(ngModel)]="form.sujet"
                    required
                    style="border-radius:var(--r-md);font-size:.9rem;"
                  >
                    <option value="" disabled>Selectionnez un sujet</option>
                    <option value="question">Question generale</option>
                    <option value="technique">Probleme technique</option>
                    <option value="candidat">Question candidat</option>
                    <option value="entreprise">Question entreprise / recruteur</option>
                    <option value="partenariat">Partenariat</option>
                    <option value="rgpd">Exercice de droits RGPD</option>
                    <option value="autre">Autre</option>
                  </select>
                </div>

                <div class="mb-3">
                  <label for="message" class="form-label" style="font-size:.88rem;font-weight:600;color:var(--sand-500);">Message *</label>
                  <textarea
                    class="form-control"
                    id="message"
                    name="message"
                    [(ngModel)]="form.message"
                    required
                    rows="5"
                    placeholder="Decrivez votre demande..."
                    style="border-radius:var(--r-md);font-size:.9rem;resize:vertical;"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  class="btn btn-primary w-100 py-2"
                  [disabled]="!contactForm.valid || sending"
                  style="font-weight:700;border-radius:var(--r-md);"
                >
                  <i class="bi bi-send me-2"></i>
                  {{ sending ? 'Envoi en cours...' : 'Envoyer le message' }}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .contact-icon {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: var(--forest-50);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: var(--forest-600);
      font-size: .85rem;
      flex-shrink: 0;
    }
  `]
})
export class Contact implements OnInit {
  form = {
    nom: '',
    email: '',
    sujet: '',
    message: ''
  };

  sending = false;

  constructor(private toastr: ToastrService, private seo: SeoService) {}

  ngOnInit() {
    this.seo.setPage('Contact', 'Contactez l\'equipe de La Plateforme de l\'Emploi. Formulaire de contact, adresse et coordonnees.');
  }

  onSubmit() {
    this.sending = true;
    // Simulate sending (no backend call)
    setTimeout(() => {
      this.toastr.success('Votre message a bien ete envoye. Nous vous repondrons dans les plus brefs delais.', 'Message envoye');
      this.form = { nom: '', email: '', sujet: '', message: '' };
      this.sending = false;
    }, 800);
  }
}
