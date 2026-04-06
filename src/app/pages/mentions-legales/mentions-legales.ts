import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../services/seo.service';

@Component({
  selector: 'app-mentions-legales',
  imports: [CommonModule, RouterLink],
  template: `
    <div class="container-main py-4">
      <nav aria-label="breadcrumb" class="mb-4 fade-up">
        <ol class="breadcrumb" style="font-size:.88rem;">
          <li class="breadcrumb-item"><a routerLink="/" style="color:var(--forest-600);">Accueil</a></li>
          <li class="breadcrumb-item active" aria-current="page">Mentions legales</li>
        </ol>
      </nav>

      <div class="fade-up stagger-1" style="max-width:820px;">
        <h1 style="font-size:1.8rem;font-weight:800;color:var(--forest-800);letter-spacing:-.03em;margin-bottom:1.5rem;">
          <i class="bi bi-file-earmark-text me-2" style="color:var(--forest-500);"></i>Mentions legales
        </h1>

        <div class="card-static p-4 mb-4" style="border-radius:var(--r-xl);">
          <h2 class="legal-heading">1. Editeur du site</h2>
          <p>Le site <strong>La Plateforme de l'Emploi</strong> est edite par :</p>
          <ul class="legal-list">
            <li><strong>Raison sociale :</strong> La Plateforme de l'Emploi SAS</li>
            <li><strong>Forme juridique :</strong> Societe par Actions Simplifiee (SAS)</li>
            <li><strong>Capital social :</strong> 50 000 euros</li>
            <li><strong>Siege social :</strong> 42 rue de l'Innovation, 75001 Paris, France</li>
            <li><strong>SIRET :</strong> 123 456 789 00001</li>
            <li><strong>RCS :</strong> Paris B 123 456 789</li>
            <li><strong>Numero de TVA intracommunautaire :</strong> FR 12 123456789</li>
            <li><strong>Directeur de la publication :</strong> Le President de La Plateforme de l'Emploi SAS</li>
            <li><strong>Email :</strong> contact&#64;plateforme-emploi.fr</li>
            <li><strong>Telephone :</strong> 01 23 45 67 89</li>
          </ul>
        </div>

        <div class="card-static p-4 mb-4" style="border-radius:var(--r-xl);">
          <h2 class="legal-heading">2. Hebergement</h2>
          <p>Le site est heberge par :</p>
          <ul class="legal-list">
            <li><strong>OVH SAS</strong></li>
            <li>2 rue Kellermann, 59100 Roubaix, France</li>
            <li>Telephone : 1007</li>
            <li>Site web : <a href="https://www.ovhcloud.com" target="_blank" rel="noopener" style="color:var(--forest-600);">www.ovhcloud.com</a></li>
          </ul>
        </div>

        <div class="card-static p-4 mb-4" style="border-radius:var(--r-xl);">
          <h2 class="legal-heading">3. Propriete intellectuelle</h2>
          <p>
            L'ensemble du contenu du site La Plateforme de l'Emploi (textes, images, logos, icones, logiciels, base de donnees)
            est protege par le droit de la propriete intellectuelle et reste la propriete exclusive de La Plateforme de l'Emploi SAS,
            sauf mention contraire.
          </p>
          <p>
            Toute reproduction, representation, modification, publication ou adaptation de tout ou partie des elements du site,
            quel que soit le moyen ou le procede utilise, est interdite sans l'autorisation ecrite prealable de La Plateforme de l'Emploi SAS.
          </p>
        </div>

        <div class="card-static p-4 mb-4" style="border-radius:var(--r-xl);">
          <h2 class="legal-heading">4. Limitation de responsabilite</h2>
          <p>
            La Plateforme de l'Emploi SAS s'efforce de fournir des informations aussi precises que possible.
            Toutefois, elle ne pourra etre tenue responsable des omissions, des inexactitudes et des carences
            dans la mise a jour, qu'elles soient de son fait ou du fait des tiers partenaires qui lui fournissent ces informations.
          </p>
          <p>
            Les offres d'emploi publiees sur le site sont sous la responsabilite des entreprises qui les deposent.
            La Plateforme de l'Emploi SAS ne garantit pas l'exactitude, l'exhaustivite ou la pertinence de ces offres.
          </p>
        </div>

        <div class="card-static p-4 mb-4" style="border-radius:var(--r-xl);">
          <h2 class="legal-heading">5. Cookies</h2>
          <p>
            Le site La Plateforme de l'Emploi utilise des cookies afin d'ameliorer l'experience utilisateur,
            de mesurer l'audience du site et de proposer des fonctionnalites liees aux reseaux sociaux.
            En continuant a naviguer sur ce site, vous acceptez l'utilisation de cookies conformement a notre
            <a routerLink="/confidentialite" style="color:var(--forest-600);font-weight:600;">Politique de confidentialite</a>.
          </p>
        </div>

        <div class="card-static p-4 mb-4" style="border-radius:var(--r-xl);">
          <h2 class="legal-heading">6. Droit applicable</h2>
          <p>
            Les presentes mentions legales sont regies par le droit francais. En cas de litige, et apres tentative de
            recherche d'une solution amiable, competence est attribuee aux tribunaux competents de Paris.
          </p>
          <p style="color:var(--sand-400);font-size:.85rem;margin-top:1.5rem;">
            Derniere mise a jour : 1er janvier 2026
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .legal-heading {
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--forest-700);
      margin-bottom: .75rem;
    }
    .legal-list {
      padding-left: 1.2rem;
      font-size: .92rem;
      line-height: 1.8;
    }
    .legal-list li {
      margin-bottom: .25rem;
    }
    p {
      font-size: .92rem;
      line-height: 1.75;
      color: var(--sand-500);
    }
  `]
})
export class MentionsLegales implements OnInit {
  constructor(private seo: SeoService) {}

  ngOnInit() {
    this.seo.setPage('Mentions legales', 'Mentions legales de La Plateforme de l\'Emploi : editeur, hebergement, propriete intellectuelle et droit applicable.');
  }
}
