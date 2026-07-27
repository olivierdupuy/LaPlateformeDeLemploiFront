import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ConsoleShell } from '../console-shell/console-shell';
import {
  FranceTravailService,
  EntrepriseQuiRecrute,
  MetierPredit,
} from '../../services/france-travail.service';

/**
 * Entreprises qui recrutent — données La Bonne Boite (France Travail).
 *
 * Ces entreprises n'ont pas publié d'offre : elles sont classées sur leur
 * historique d'embauche. C'est le marché caché, celui qu'aucun agrégateur
 * d'annonces ne montre — et donc la vraie raison d'aller chercher chez
 * France Travail plutôt que d'imiter Indeed une fois de plus.
 *
 * Le métier et la ville sont pré-remplis depuis le profil : un candidat
 * n'a pas à ressaisir ce qu'il a déjà renseigné. ROMEO traduit son
 * intitulé libre en code ROME, seule clé que comprend La Bonne Boite.
 */
@Component({
  selector: 'app-hiring-companies',
  imports: [ConsoleShell, FormsModule, RouterLink],
  templateUrl: './hiring-companies.html',
  styleUrl: './hiring-companies.scss',
})
export class HiringCompanies implements OnInit {
  private ft = inject(FranceTravailService);
  private auth = inject(AuthService);

  metier = '';
  ville = '';
  departement = '';
  distance = 30;

  /**
   * La commune saisie n'a pas été reconnue par France Travail. Sans ce
   * signal, la page annoncerait « aucune entreprise » alors que la
   * recherche n'a simplement pas eu lieu — le pire des messages, puisqu'il
   * décourage sans rien expliquer.
   */
  villeNonReconnue = signal(false);

  loading = signal(false);
  /** Vrai tant que le profil n'a pas encore servi de point de départ. */
  demarrage = signal(true);
  erreur = signal<string | null>(null);

  entreprises = signal<EntrepriseQuiRecrute[]>([]);
  total = signal(0);

  /** Métiers proposés par ROMEO à partir de l'intitulé saisi. */
  suggestions = signal<MetierPredit[]>([]);
  romeChoisi = signal<MetierPredit | null>(null);

  ngOnInit() {
    const u = this.auth.currentUser();
    this.metier = u?.title?.trim() || '';
    this.ville = u?.city?.trim() || '';

    // Un espace candidat qui s'ouvre vide oblige à saisir avant de voir :
    // si le profil suffit à lancer la recherche, on la lance.
    if (this.metier && this.ville) this.rechercher();
    else this.demarrage.set(false);
  }

  /** Fourchette d'effectif, quand l'API la publie. */
  effectif(e: EntrepriseQuiRecrute): string | null {
    const min = e.headcount_min ?? 0;
    const max = e.headcount_max ?? 0;
    if (!min && !max) return null;
    if (min && max && min !== max) return `${min} à ${max} salariés`;
    return `${max || min} salariés`;
  }

  contactable = (e: EntrepriseQuiRecrute) => (e.email ?? '').toLowerCase() === 'yes';

  /** La fiche publique France Travail, seul canal de contact proposé. */
  ficheUrl = (e: EntrepriseQuiRecrute) =>
    `https://candidat.francetravail.fr/entreprises/detail/${e.siret}`;

  metierRetenu = computed(() => this.romeChoisi()?.libelleRome ?? null);

  rechercher() {
    const intitule = this.metier.trim();
    if (!intitule) {
      this.erreur.set('Indiquez le métier recherché.');
      return;
    }

    this.loading.set(true);
    this.erreur.set(null);
    this.villeNonReconnue.set(false);
    this.demarrage.set(false);

    // On traduit d'abord l'intitulé en code ROME : la recherche par
    // libellé libre existe, mais elle est bien moins précise.
    this.ft.devinerMetier(intitule).subscribe({
      next: (predictions) => {
        const metiers = predictions?.[0]?.metiersRome ?? [];
        this.suggestions.set(this.dedupliquer(metiers));
        const meilleur = this.suggestions()[0] ?? null;
        this.romeChoisi.set(meilleur);
        this.lancerRecherche(meilleur?.codeRome, intitule);
      },
      error: () => {
        // ROMEO indisponible : on retombe sur la recherche par libellé.
        this.suggestions.set([]);
        this.romeChoisi.set(null);
        this.lancerRecherche(undefined, intitule);
      },
    });
  }

  /** ROMEO renvoie plusieurs appellations d'un même métier : on n'en garde qu'une. */
  private dedupliquer(metiers: MetierPredit[]): MetierPredit[] {
    const vus = new Set<string>();
    return metiers.filter((m) => {
      if (vus.has(m.codeRome)) return false;
      vus.add(m.codeRome);
      return true;
    });
  }

  choisirMetier(m: MetierPredit) {
    this.romeChoisi.set(m);
    // Choix explicite : on ne se rabat pas sur un autre metier dans le dos
    // de quelqu'un qui vient d'en designer un.
    this.lancerRecherche(m.codeRome, this.metier.trim(), false);
  }

  /**
   * @param essayerSuivants La Bonne Boite ne couvre pas tous les métiers
   *   partout : « Ingénieur d'étude informatique » ne renvoie rien à Lille
   *   là où « Développeur informatique » renvoie vingt-trois entreprises.
   *   Le meilleur pari de ROMEO peut donc aboutir à une page vide alors
   *   que le suivant est fructueux — on descend la liste plutôt que de
   *   laisser croire qu'il n'y a personne.
   */
  private lancerRecherche(rome: string | undefined, intitule: string, essayerSuivants = true) {
    this.loading.set(true);
    const ville = this.ville.trim();
    const dept = this.departement.trim();

    this.ft
      .entreprisesQuiRecrutent({
        rome,
        metier: rome ? undefined : intitule,
        // La recherche par commune est nettement plus restrictive que par
        // departement : on privilegie le departement quand il est fourni.
        ville: dept ? undefined : ville || undefined,
        departement: dept || undefined,
        distance: this.distance,
        taille: 30,
      })
      .subscribe({
        next: (r) => {
          const items = r.items ?? [];
          const lieuResolu = (r.resolved_params?.locations ?? []).length > 0;

          // Commune non reconnue : reessayer d'autres metiers ne servirait
          // a rien, c'est la geographie qui a echoue.
          if (!items.length && ville && !dept && !lieuResolu) {
            this.villeNonReconnue.set(true);
            this.entreprises.set([]);
            this.total.set(0);
            this.loading.set(false);
            return;
          }

          if (!items.length && essayerSuivants) {
            const suivant = this.metierSuivant(rome);
            if (suivant) {
              this.romeChoisi.set(suivant);
              this.lancerRecherche(suivant.codeRome, intitule, true);
              return;
            }
          }

          this.villeNonReconnue.set(false);
          this.entreprises.set(items);
          this.total.set(r.hits ?? 0);
          this.loading.set(false);
        },
        error: (e) => {
          this.erreur.set(
            e?.error?.message ?? "Les entreprises n'ont pas pu être récupérées.",
          );
          this.entreprises.set([]);
          this.total.set(0);
          this.loading.set(false);
        },
      });
  }

  private metierSuivant(romeActuel: string | undefined): MetierPredit | null {
    const liste = this.suggestions();
    const i = liste.findIndex((m) => m.codeRome === romeActuel);
    return i >= 0 && i + 1 < liste.length ? liste[i + 1] : null;
  }
}
