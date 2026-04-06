import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../services/seo.service';

@Component({
  selector: 'app-confidentialite',
  imports: [CommonModule, RouterLink],
  template: `
    <div class="container-main py-4">
      <nav aria-label="breadcrumb" class="mb-4 fade-up">
        <ol class="breadcrumb" style="font-size:.88rem;">
          <li class="breadcrumb-item"><a routerLink="/" style="color:var(--forest-600);">Accueil</a></li>
          <li class="breadcrumb-item active" aria-current="page">Politique de confidentialite</li>
        </ol>
      </nav>

      <div class="fade-up stagger-1" style="max-width:820px;">
        <h1 style="font-size:1.8rem;font-weight:800;color:var(--forest-800);letter-spacing:-.03em;margin-bottom:1.5rem;">
          <i class="bi bi-shield-check me-2" style="color:var(--forest-500);"></i>Politique de confidentialite
        </h1>

        <div class="card-static p-4 mb-4" style="border-radius:var(--r-xl);">
          <h2 class="legal-heading">1. Responsable du traitement</h2>
          <p>Le responsable du traitement des donnees personnelles est :</p>
          <ul class="legal-list">
            <li><strong>La Plateforme de l'Emploi SAS</strong></li>
            <li>42 rue de l'Innovation, 75001 Paris, France</li>
            <li>SIRET : 123 456 789 00001</li>
            <li>Email du DPO : <a href="mailto:dpo@plateforme-emploi.fr" style="color:var(--forest-600);font-weight:600;">dpo&#64;plateforme-emploi.fr</a></li>
          </ul>
        </div>

        <div class="card-static p-4 mb-4" style="border-radius:var(--r-xl);">
          <h2 class="legal-heading">2. Donnees collectees</h2>
          <p>Dans le cadre de l'utilisation de nos services, nous collectons les donnees suivantes :</p>
          <ul class="legal-list">
            <li><strong>Donnees d'identification :</strong> nom, prenom, adresse email, numero de telephone</li>
            <li><strong>Donnees professionnelles :</strong> CV, lettre de motivation, experiences, competences, formation</li>
            <li><strong>Donnees de connexion :</strong> adresse IP, logs de connexion, type de navigateur</li>
            <li><strong>Donnees de navigation :</strong> pages visitees, duree de consultation, actions realisees</li>
            <li><strong>Donnees relatives aux entreprises :</strong> raison sociale, SIRET, secteur d'activite, coordonnees</li>
          </ul>
        </div>

        <div class="card-static p-4 mb-4" style="border-radius:var(--r-xl);">
          <h2 class="legal-heading">3. Finalites du traitement</h2>
          <p>Vos donnees personnelles sont traitees pour les finalites suivantes :</p>
          <ul class="legal-list">
            <li>Gestion de votre compte et authentification</li>
            <li>Mise en relation entre candidats et entreprises</li>
            <li>Personnalisation des recommandations d'offres d'emploi</li>
            <li>Communication relative a votre utilisation de la Plateforme (notifications, alertes)</li>
            <li>Amelioration de nos services et statistiques d'utilisation</li>
            <li>Respect de nos obligations legales et reglementaires</li>
          </ul>
        </div>

        <div class="card-static p-4 mb-4" style="border-radius:var(--r-xl);">
          <h2 class="legal-heading">4. Base legale du traitement</h2>
          <p>Conformement au Reglement General sur la Protection des Donnees (RGPD), le traitement de vos donnees repose sur :</p>
          <ul class="legal-list">
            <li><strong>L'execution du contrat :</strong> traitement necessaire a la fourniture de nos services (article 6.1.b du RGPD)</li>
            <li><strong>Le consentement :</strong> pour l'envoi de communications commerciales et l'utilisation de cookies non essentiels (article 6.1.a)</li>
            <li><strong>L'interet legitime :</strong> pour l'amelioration de nos services et la securite de la Plateforme (article 6.1.f)</li>
            <li><strong>L'obligation legale :</strong> pour le respect de nos obligations fiscales et reglementaires (article 6.1.c)</li>
          </ul>
        </div>

        <div class="card-static p-4 mb-4" style="border-radius:var(--r-xl);">
          <h2 class="legal-heading">5. Duree de conservation</h2>
          <p>Vos donnees personnelles sont conservees pendant les durees suivantes :</p>
          <ul class="legal-list">
            <li><strong>Donnees de compte :</strong> pendant toute la duree de votre inscription, puis 3 ans apres la derniere activite</li>
            <li><strong>Donnees de candidature :</strong> 24 mois apres le dernier contact avec le recruteur</li>
            <li><strong>Donnees de connexion :</strong> 12 mois conformement a la legislation en vigueur</li>
            <li><strong>Cookies :</strong> 13 mois maximum conformement aux recommandations de la CNIL</li>
          </ul>
        </div>

        <div class="card-static p-4 mb-4" style="border-radius:var(--r-xl);">
          <h2 class="legal-heading">6. Destinataires des donnees</h2>
          <p>Vos donnees peuvent etre transmises aux destinataires suivants :</p>
          <ul class="legal-list">
            <li>Les entreprises aupres desquelles vous postulez (dans le cadre de vos candidatures)</li>
            <li>Nos sous-traitants techniques (hebergement, maintenance, analyse statistique)</li>
            <li>Les autorites competentes en cas d'obligation legale</li>
          </ul>
          <p>
            Aucun transfert de donnees hors de l'Union Europeenne n'est effectue sans garanties adequates
            conformement aux articles 44 et suivants du RGPD.
          </p>
        </div>

        <div class="card-static p-4 mb-4" style="border-radius:var(--r-xl);">
          <h2 class="legal-heading">7. Vos droits</h2>
          <p>Conformement au RGPD et a la loi Informatique et Libertes, vous disposez des droits suivants :</p>
          <ul class="legal-list">
            <li><strong>Droit d'acces :</strong> obtenir la confirmation que vos donnees sont traitees et en obtenir une copie</li>
            <li><strong>Droit de rectification :</strong> faire corriger vos donnees inexactes ou incompletes</li>
            <li><strong>Droit a l'effacement :</strong> demander la suppression de vos donnees dans les conditions prevues par la loi</li>
            <li><strong>Droit a la limitation :</strong> demander la limitation du traitement de vos donnees</li>
            <li><strong>Droit a la portabilite :</strong> recevoir vos donnees dans un format structure et couramment utilise</li>
            <li><strong>Droit d'opposition :</strong> vous opposer au traitement de vos donnees pour des motifs legitimes</li>
          </ul>
          <p>
            Pour exercer vos droits, contactez notre Delegue a la Protection des Donnees a l'adresse :
            <a href="mailto:dpo@plateforme-emploi.fr" style="color:var(--forest-600);font-weight:600;">dpo&#64;plateforme-emploi.fr</a>
          </p>
          <p>
            En cas de difficulte, vous pouvez egalement introduire une reclamation aupres de la Commission Nationale
            de l'Informatique et des Libertes (CNIL) : <a href="https://www.cnil.fr" target="_blank" rel="noopener" style="color:var(--forest-600);">www.cnil.fr</a>
          </p>
        </div>

        <div class="card-static p-4 mb-4" style="border-radius:var(--r-xl);">
          <h2 class="legal-heading">8. Securite des donnees</h2>
          <p>
            La Plateforme de l'Emploi SAS met en oeuvre les mesures techniques et organisationnelles appropriees
            pour garantir la securite et la confidentialite de vos donnees personnelles, notamment : chiffrement
            des communications (HTTPS/TLS), stockage securise des mots de passe (hashage), controle des acces,
            sauvegardes regulieres et audits de securite.
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
export class Confidentialite implements OnInit {
  constructor(private seo: SeoService) {}

  ngOnInit() {
    this.seo.setPage('Politique de confidentialite', 'Politique de confidentialite et protection des donnees personnelles (RGPD) de La Plateforme de l\'Emploi.');
  }
}
