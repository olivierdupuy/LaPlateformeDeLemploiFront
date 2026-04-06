import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../services/seo.service';

@Component({
  selector: 'app-cgu',
  imports: [CommonModule, RouterLink],
  template: `
    <div class="container-main py-4">
      <nav aria-label="breadcrumb" class="mb-4 fade-up">
        <ol class="breadcrumb" style="font-size:.88rem;">
          <li class="breadcrumb-item"><a routerLink="/" style="color:var(--forest-600);">Accueil</a></li>
          <li class="breadcrumb-item active" aria-current="page">Conditions generales d'utilisation</li>
        </ol>
      </nav>

      <div class="fade-up stagger-1" style="max-width:820px;">
        <h1 style="font-size:1.8rem;font-weight:800;color:var(--forest-800);letter-spacing:-.03em;margin-bottom:1.5rem;">
          <i class="bi bi-journal-check me-2" style="color:var(--forest-500);"></i>Conditions generales d'utilisation
        </h1>

        <div class="card-static p-4 mb-4" style="border-radius:var(--r-xl);">
          <h2 class="legal-heading">1. Objet</h2>
          <p>
            Les presentes Conditions Generales d'Utilisation (ci-apres "CGU") ont pour objet de definir les modalites
            et conditions dans lesquelles les utilisateurs (ci-apres "Utilisateurs") peuvent acceder et utiliser les
            services proposes par La Plateforme de l'Emploi SAS (ci-apres "la Plateforme"), accessible a l'adresse
            www.plateforme-emploi.fr.
          </p>
          <p>
            L'inscription et l'utilisation de la Plateforme impliquent l'acceptation pleine et entiere des presentes CGU.
          </p>
        </div>

        <div class="card-static p-4 mb-4" style="border-radius:var(--r-xl);">
          <h2 class="legal-heading">2. Description des services</h2>
          <p>La Plateforme de l'Emploi propose les services suivants :</p>
          <ul class="legal-list">
            <li>Publication et consultation d'offres d'emploi</li>
            <li>Creation et gestion de profils candidats et entreprises</li>
            <li>Depot et suivi de candidatures en ligne</li>
            <li>Messagerie interne entre candidats et recruteurs</li>
            <li>Recommandations personnalisees d'offres d'emploi</li>
            <li>Outils de creation de CV en ligne</li>
            <li>Gestion d'entretiens et planification</li>
          </ul>
        </div>

        <div class="card-static p-4 mb-4" style="border-radius:var(--r-xl);">
          <h2 class="legal-heading">3. Inscription et compte utilisateur</h2>
          <p>
            L'acces a certains services necessite la creation d'un compte utilisateur. L'Utilisateur s'engage a fournir
            des informations exactes, completes et a jour lors de son inscription. Il est responsable de la confidentialite
            de ses identifiants de connexion et de toute activite effectuee depuis son compte.
          </p>
          <p>
            La Plateforme se reserve le droit de suspendre ou de supprimer tout compte en cas de non-respect des presentes CGU,
            d'informations frauduleuses ou de comportement inapproprie.
          </p>
        </div>

        <div class="card-static p-4 mb-4" style="border-radius:var(--r-xl);">
          <h2 class="legal-heading">4. Obligations des utilisateurs</h2>
          <p>L'Utilisateur s'engage a :</p>
          <ul class="legal-list">
            <li>Utiliser la Plateforme conformement a sa destination et aux presentes CGU</li>
            <li>Ne pas publier de contenu illicite, diffamatoire, discriminatoire ou portant atteinte aux droits de tiers</li>
            <li>Ne pas tenter d'acceder de maniere non autorisee aux systemes informatiques de la Plateforme</li>
            <li>Ne pas utiliser la Plateforme a des fins de sollicitation commerciale non autorisee</li>
            <li>Respecter la legislation en vigueur, notamment en matiere de droit du travail et de non-discrimination</li>
          </ul>
        </div>

        <div class="card-static p-4 mb-4" style="border-radius:var(--r-xl);">
          <h2 class="legal-heading">5. Obligations des entreprises</h2>
          <p>
            Les entreprises utilisatrices s'engagent a publier des offres d'emploi reelles, licites et conformes a la
            legislation francaise en vigueur, notamment au Code du travail. Les offres ne doivent contenir aucun critere
            discriminatoire (age, sexe, origine, handicap, etc.) conformement aux articles L.1132-1 et suivants du Code du travail.
          </p>
          <p>
            La Plateforme se reserve le droit de retirer toute offre non conforme sans preavis.
          </p>
        </div>

        <div class="card-static p-4 mb-4" style="border-radius:var(--r-xl);">
          <h2 class="legal-heading">6. Responsabilite</h2>
          <p>
            La Plateforme de l'Emploi SAS agit en qualite d'intermediaire technique. Elle ne saurait etre tenue responsable
            du contenu des offres d'emploi publiees par les entreprises, ni des informations communiquees par les candidats
            dans leurs profils ou candidatures.
          </p>
          <p>
            La Plateforme ne garantit pas l'obtention d'un emploi ou le recrutement d'un candidat.
          </p>
        </div>

        <div class="card-static p-4 mb-4" style="border-radius:var(--r-xl);">
          <h2 class="legal-heading">7. Propriete intellectuelle</h2>
          <p>
            L'ensemble des elements composant la Plateforme (textes, graphismes, logiciels, base de donnees, etc.)
            sont proteges par les lois relatives a la propriete intellectuelle. Les Utilisateurs conservent la propriete
            de leurs contenus publies mais concedent a la Plateforme une licence d'utilisation non exclusive pour les besoins du service.
          </p>
        </div>

        <div class="card-static p-4 mb-4" style="border-radius:var(--r-xl);">
          <h2 class="legal-heading">8. Modification des CGU</h2>
          <p>
            La Plateforme de l'Emploi SAS se reserve le droit de modifier les presentes CGU a tout moment.
            Les Utilisateurs seront informes des modifications par notification sur la Plateforme. La poursuite de
            l'utilisation des services apres modification vaut acceptation des nouvelles conditions.
          </p>
        </div>

        <div class="card-static p-4 mb-4" style="border-radius:var(--r-xl);">
          <h2 class="legal-heading">9. Droit applicable et juridiction competente</h2>
          <p>
            Les presentes CGU sont regies par le droit francais. Tout litige relatif a l'interpretation ou a l'execution
            des presentes sera soumis aux tribunaux competents de Paris, apres tentative de resolution amiable.
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
export class Cgu implements OnInit {
  constructor(private seo: SeoService) {}

  ngOnInit() {
    this.seo.setPage('Conditions generales d\'utilisation', 'Conditions generales d\'utilisation de La Plateforme de l\'Emploi. Regles d\'inscription, obligations des utilisateurs et des entreprises.');
  }
}
