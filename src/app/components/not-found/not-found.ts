import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { JobOfferService } from '../../services/job-offer';
import { SeoService } from '../../services/seo.service';
import { JobOffer } from '../../models/job-offer.model';

/**
 * Adresse inconnue.
 *
 * La route universelle renvoyait vers l'accueil. Deux conséquences, l'une
 * pour la personne et l'autre pour les moteurs :
 *
 *   Le visiteur qui suivait un lien périmé — une offre pourvue, une
 *   adresse mal recopiée — se retrouvait sur la page d'accueil sans
 *   qu'aucun mot ne lui dise ce qui venait de se passer. Il croyait
 *   avoir cliqué de travers.
 *
 *   Le moteur, lui, recevait un code 200 : « cette page existe, la
 *   voici ». Il indexait donc l'accueil sous autant d'adresses qu'il
 *   avait essayé, et chacune était un doublon de plus.
 *
 * Une application monopage ne peut pas rendre un vrai code 404 depuis le
 * navigateur — le serveur a déjà répondu 200 en servant `index.html`.
 * On fait donc les deux choses qui restent possibles : le dire au
 * visiteur, et poser `noindex` pour que le moteur n'en garde rien.
 *
 * Et puisqu'il est là, on lui propose des offres récentes plutôt qu'un
 * cul-de-sac : une page d'erreur qui ne mène nulle part est une visite
 * perdue.
 */
@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './not-found.html',
  styleUrl: './not-found.scss',
})
export class NotFound implements OnInit {
  private offres = inject(JobOfferService);
  private seo = inject(SeoService);
  private router = inject(Router);

  /** L'adresse demandée, redite au visiteur : elle contient souvent la faute. */
  readonly adresse = signal('');
  readonly recentes = signal<JobOffer[]>([]);
  readonly chargement = signal(true);

  ngOnInit(): void {
    this.adresse.set(this.router.url);

    this.seo.set({
      title: 'Page introuvable',
      description: "Cette adresse ne correspond à aucune page. Retrouvez les offres d'emploi.",
      noindex: true,
    });

    // Un échec ici ne doit surtout pas produire une seconde erreur : on
    // est déjà sur la page qui sert à en parler.
    this.offres.getAllPaged({ page: 1, pageSize: 4, sort: 'date' }).subscribe({
      next: (r) => {
        this.recentes.set(r.items ?? []);
        this.chargement.set(false);
      },
      error: () => this.chargement.set(false),
    });
  }
}
