import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { SeoService } from '../../services/seo.service';
import { JobOffer } from '../../models/job-offer.model';
import { Explication } from '../explication/explication';

interface PageAtterrissage {
  metier: string;
  ville: string | null;
  libelleMetier: string;
  libelleVille: string | null;
  total: number;
  salaireMedian: number | null;
  partTeletravail: number;
  contrats: { contrat: string; nombre: number }[];
  offres: JobOffer[];
  autresVilles: { ville: string; libelle: string; nombre: number }[];
  autresMetiers: { metier: string; libelle: string; nombre: number }[];
}

/**
 * « Emploi développeur web à Paris ».
 *
 * C'est la requête que les gens tapent, et c'est la page qui manquait.
 * Le catalogue était consultable par filtres, mais derrière des
 * paramètres de requête que le `robots.txt` exclut lui-même de
 * l'exploration — à juste titre, les combinaisons se comptant par
 * milliers. Aucune de ces vues n'avait donc d'adresse propre, ni de
 * titre propre, ni la moindre chance d'apparaître dans un résultat de
 * recherche.
 *
 * Deux niveaux : le métier seul (`/emploi/developpeur-web`) et le
 * métier dans une ville (`/emploi/developpeur-web/paris`). Le second
 * est le plus recherché, le premier agrège et sert de pivot.
 *
 * Une combinaison sous le seuil rend 404 — et c'est délibéré : mieux
 * vaut une adresse qui n'existe pas qu'une page vide indexée. Cent
 * mille pages sans contenu abîment le jugement porté sur tout le
 * domaine.
 */
@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink, Explication],
  templateUrl: './landing.html',
  styleUrl: './landing.scss',
})
export class Landing implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);
  private seo = inject(SeoService);

  readonly page = signal<PageAtterrissage | null>(null);
  readonly chargement = signal(true);

  ngOnInit(): void {
    this.route.paramMap.subscribe((p) => {
      const metier = p.get('metier') ?? '';
      const ville = p.get('ville');
      this.charger(metier, ville);
    });
  }

  private charger(metier: string, ville: string | null): void {
    this.chargement.set(true);

    const url = ville
      ? `${environment.apiUrl}/emploi/${metier}/${ville}`
      : `${environment.apiUrl}/emploi/${metier}`;

    this.http.get<PageAtterrissage>(url).subscribe({
      next: (p) => {
        this.page.set(p);
        this.chargement.set(false);
        this.declarer(p);
      },
      error: () => {
        this.chargement.set(false);
        // Pas assez d'offres pour cette combinaison : la page 404
        // affiche l'adresse demandée et propose des offres récentes,
        // ce qui vaut mieux qu'une liste vide sous un titre prometteur.
        this.router.navigate(['/introuvable'], { skipLocationChange: true });
      },
    });
  }

  /**
   * Ce que la page annonce d'elle-même.
   *
   * Les chiffres viennent de la réponse, jamais d'une estimation : une
   * description qui promet « 240 offres » là où il y en a trois est un
   * clic gagné et une visite perdue, ce que les moteurs mesurent.
   */
  private declarer(p: PageAtterrissage): void {
    const ou = p.libelleVille ? ` à ${p.libelleVille}` : ' en France';
    const chemin = p.ville ? `/emploi/${p.metier}/${p.ville}` : `/emploi/${p.metier}`;

    const morceaux = [`${p.total} offre${p.total > 1 ? 's' : ''} d'emploi ${p.libelleMetier}${ou}.`];
    if (p.salaireMedian) morceaux.push(`Salaire médian ${p.salaireMedian.toLocaleString('fr-FR')} €.`);
    if (p.partTeletravail >= 15) morceaux.push(`${p.partTeletravail} % en télétravail.`);
    morceaux.push('Postulez et suivez chaque candidature jusqu’à la réponse.');

    this.seo.set({
      title: `Emploi ${p.libelleMetier}${ou} — ${p.total} offre${p.total > 1 ? 's' : ''}`,
      description: morceaux.join(' '),
      canonicalPath: chemin,
    });

    const fil = [
      { nom: 'Offres', chemin: '/offres' },
      { nom: p.libelleMetier, chemin: `/emploi/${p.metier}` },
    ];
    if (p.ville && p.libelleVille) fil.push({ nom: p.libelleVille, chemin });
    this.seo.breadcrumb(fil);
  }

  /**
   * Où mène « affiner la recherche ». Le chemin ne dépend pas de la
   * page — ce sont les paramètres qui portent les filtres, juste en
   * dessous. C'était une méthode prenant la page en argument sans
   * jamais s'en servir, donc rappelée à chaque détection de
   * changement pour reconstruire le même tableau.
   */
  readonly cheminRecherche = ['/offres'];

  parametresRecherche(p: PageAtterrissage): Record<string, string> {
    const q: Record<string, string> = { category: p.libelleMetier };
    if (p.libelleVille) q['location'] = p.libelleVille;
    return q;
  }
}
