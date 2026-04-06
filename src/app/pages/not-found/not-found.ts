import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../services/seo.service';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  template: `
    <div class="container-main py-5">
      <div class="text-center fade-up" style="max-width:500px;margin:4rem auto;">
        <div class="nf-icon">
          <i class="bi bi-signpost-split"></i>
        </div>
        <h1 style="font-size:4rem;font-weight:900;color:var(--forest-700);letter-spacing:-.04em;margin:.5rem 0 0;">404</h1>
        <h2 style="font-size:1.2rem;font-weight:700;margin:.5rem 0;">Page introuvable</h2>
        <p style="color:var(--sand-400);font-size:.92rem;margin-bottom:2rem;">
          La page que vous cherchez n'existe pas ou a ete deplacee.
        </p>
        <div class="d-flex gap-3 justify-content-center flex-wrap">
          <a routerLink="/" class="btn btn-primary px-4 py-2" style="font-weight:700;">
            <i class="bi bi-house me-2"></i>Accueil
          </a>
          <a routerLink="/offres" class="btn-ghost px-4 py-2">
            <i class="bi bi-search me-2"></i>Voir les offres
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .nf-icon { width:80px;height:80px;border-radius:50%;background:var(--forest-50);display:inline-flex;align-items:center;justify-content:center;font-size:2rem;color:var(--forest-600);margin-bottom:.5rem; }
  `]
})
export class NotFound implements OnInit {
  constructor(private seo: SeoService) {}

  ngOnInit() {
    this.seo.setNoIndex('Page introuvable', 'La page demandee n\'existe pas sur La Plateforme de l\'Emploi.');
  }
}
