import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ConsoleShell } from '../console-shell/console-shell';
import {
  FranceTravailService,
  FicheMetier,
  MarcheDuTravail,
  MetierPredit,
} from '../../services/france-travail.service';

/**
 * Mon métier — fiche ROME 4.0 et marché du travail (France Travail).
 *
 * Deux questions qu'un candidat se pose et auxquelles une liste d'offres
 * ne répond pas : « qu'attend-on vraiment de ce métier ? » et « y a-t-il
 * du travail près de chez moi ? ».
 *
 * Le métier est devine depuis le profil par ROMEO, puis corrigeable : une
 * interprétation automatique qu'on ne peut pas contredire est une boîte
 * noire.
 */
@Component({
  selector: 'app-job-market',
  imports: [ConsoleShell, FormsModule, RouterLink],
  templateUrl: './job-market.html',
  styleUrl: './job-market.scss',
})
export class JobMarket implements OnInit {
  private ft = inject(FranceTravailService);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  metier = '';
  departement = '';

  loading = signal(false);
  demarrage = signal(true);
  erreur = signal<string | null>(null);

  suggestions = signal<MetierPredit[]>([]);
  romeChoisi = signal<MetierPredit | null>(null);

  fiche = signal<FicheMetier | null>(null);
  marche = signal<MarcheDuTravail | null>(null);
  marcheIndisponible = signal(false);

  ngOnInit() {
    const u = this.auth.currentUser();
    const q = this.route.snapshot.queryParamMap;

    this.metier = q.get('metier') ?? u?.title?.trim() ?? '';
    this.departement = q.get('dept') ?? '';

    if (this.metier) this.rechercher();
    else this.demarrage.set(false);
  }

  /** Les quatre lignes de l'indicateur, remises dans un ordre lisible. */
  chiffres = computed(() => {
    const valeurs = this.marche()?.listeValeursParPeriode ?? [];
    const prendre = (code: string) =>
      valeurs.find((v) => v.codeNomenclature === code)?.valeurPrincipaleNombre ?? null;

    return {
      periode: valeurs[0]?.libPeriode ?? '',
      territoire: valeurs[0]?.libTerritoire ?? '',
      toutesTrimestre: prendre('TOFF'),
      toutesAn: prendre('TOFF-CUMUL12MOIS'),
      ftTrimestre: prendre('PE'),
      ftAn: prendre('TOFF-CUMUL12MOIS') === null ? null : prendre('PE-CUMUL12MOIS'),
    };
  });

  /**
   * Part du marché passant par France Travail. Un metier dont peu
   * d'offres y transitent se cherche ailleurs — c'est une indication de
   * methode, pas seulement un chiffre.
   */
  partFranceTravail = computed(() => {
    const c = this.chiffres();
    if (!c.toutesAn || !c.ftAn) return null;
    return Math.round((c.ftAn / c.toutesAn) * 100);
  });

  rechercher() {
    const intitule = this.metier.trim();
    if (!intitule) {
      this.erreur.set('Indiquez un métier.');
      return;
    }

    this.loading.set(true);
    this.erreur.set(null);
    this.demarrage.set(false);
    this.ecrireUrl();

    this.ft.devinerMetier(intitule).subscribe({
      next: (predictions) => {
        const metiers = this.dedupliquer(predictions?.[0]?.metiersRome ?? []);
        this.suggestions.set(metiers);
        const meilleur = metiers[0] ?? null;
        this.romeChoisi.set(meilleur);

        if (meilleur) this.charger(meilleur.codeRome);
        else {
          this.erreur.set("Aucun métier ROME ne correspond à cet intitulé.");
          this.loading.set(false);
        }
      },
      error: () => {
        this.erreur.set("Le métier n'a pas pu être identifié.");
        this.loading.set(false);
      },
    });
  }

  choisirMetier(m: MetierPredit) {
    this.romeChoisi.set(m);
    this.charger(m.codeRome);
  }

  changerDepartement() {
    const rome = this.romeChoisi()?.codeRome;
    this.ecrireUrl();
    if (rome) this.charger(rome);
  }

  private charger(rome: string) {
    this.loading.set(true);
    this.marcheIndisponible.set(false);

    this.ft.ficheMetier(rome).subscribe({
      next: (f) => {
        this.fiche.set(f);
        this.loading.set(false);
      },
      error: () => {
        this.fiche.set(null);
        this.loading.set(false);
      },
    });

    // Le marche se charge en parallele : il n'est pas indispensable a la
    // fiche, et son absence ne doit pas retarder l'affichage.
    this.ft.marcheDuTravail(rome, this.departement.trim() || undefined).subscribe({
      next: (m) => {
        this.marche.set(m);
        this.marcheIndisponible.set(!(m?.listeValeursParPeriode?.length));
      },
      error: () => {
        this.marche.set(null);
        this.marcheIndisponible.set(true);
      },
    });
  }

  private dedupliquer(metiers: MetierPredit[]): MetierPredit[] {
    const vus = new Set<string>();
    return metiers.filter((m) => (vus.has(m.codeRome) ? false : (vus.add(m.codeRome), true)));
  }

  private ecrireUrl() {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        metier: this.metier.trim() || null,
        dept: this.departement.trim() || null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
