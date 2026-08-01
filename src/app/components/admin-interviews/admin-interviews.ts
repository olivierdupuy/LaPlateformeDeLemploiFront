import { Component, inject, computed } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminService } from '../../services/admin.service';
import { Pager } from '../pager/pager';
import { companyColor } from '../../utils/job.utils';
import { pagedQuery } from '../../utils/paged-query';
import { STATUS } from '../../viz/palette';

/**
 * Explorateur d'entretiens : troisième destination de forage, pour les
 * graphiques que les offres et les candidatures ne savent pas expliquer.
 *
 * Même contrat d'URL que les deux autres explorateurs — un critère par
 * paramètre — pour qu'un graphique vise n'importe lequel des trois sans
 * que son code change de forme.
 */

const FILTER_LABELS: Record<string, string> = {
  statut: 'Statut',
  type: 'Type',
  entreprise: 'Entreprise',
  q: 'Recherche',
  avenir: 'Période',
  cloture: 'Clôture',
};

/**
 * Les quatre etats d'un entretien.
 *
 * Les couleurs viennent de l'echelle d'etat de la palette, pas des
 * teintes de series : « annule » doit porter le meme rouge qu'un refus
 * partout ailleurs dans le panneau. Chacun s'affiche avec son icone —
 * la couleur seule ne dit rien a qui ne la distingue pas.
 */
const ETATS = [
  { cle: 'Proposed', label: 'Proposé', pluriel: 'Proposés', facette: 'proposed', color: STATUS.warning, icon: 'bi-hourglass-split' },
  { cle: 'Accepted', label: 'Accepté', pluriel: 'Acceptés', facette: 'accepted', color: STATUS.good, icon: 'bi-check-circle' },
  { cle: 'Completed', label: 'Terminé', pluriel: 'Terminés', facette: 'completed', color: STATUS.info, icon: 'bi-flag' },
  { cle: 'Cancelled', label: 'Annulé', pluriel: 'Annulés', facette: 'cancelled', color: STATUS.critical, icon: 'bi-x-circle' },
];

interface InterviewRow {
  id: number;
  applicationId: number;
  proposedAt: string;
  status: string;
  type?: string;
  duration?: number;
  interviewerName?: string;
  candidateName: string;
  jobTitle: string;
  company: string;
}

interface InterviewFacets {
  total: number;
  proposed: number;
  accepted: number;
  completed: number;
  cancelled: number;
  upcoming: number;
  overdue: number;
}

/** Les facettes qui comptent par etat, par opposition aux positions dans le temps. */
type FacetteEtat = 'proposed' | 'accepted' | 'completed' | 'cancelled';

@Component({
  selector: 'app-admin-interviews',
  imports: [DecimalPipe, RouterLink, FormsModule, DatePipe, Pager],
  templateUrl: './admin-interviews.html',
  styleUrl: './admin-interviews.scss',
})
export class AdminInterviews {
  private admin = inject(AdminService);

  companyColor = companyColor;
  statusLabel = (s: string) => ETATS.find((e) => e.cle === s)?.label ?? s;
  isPast = (iso: string) => new Date(iso).getTime() < Date.now();

  protected readonly etats = ETATS;
  /** Les teintes d'état, pour que la pastille dise la gravité. */
  protected readonly ETAT = STATUS;

  /** Icone, libelle et couleur d'un statut d'entretien. */
  etat(statut: string) {
    return ETATS.find((e) => e.cle === statut) ?? null;
  }

  /** Le compte d'une facette, adresse par le nom de son etat. */
  facette(cle: string): number {
    const nom = ETATS.find((e) => e.cle === cle)?.facette as FacetteEtat | undefined;
    return nom ? this.q.facets()[nom] : 0;
  }

  q = pagedQuery<InterviewRow, InterviewFacets>({
    fetch: (p) => this.admin.listInterviews(p),
    emptyFacets: { total: 0, proposed: 0, accepted: 0, completed: 0, cancelled: 0, upcoming: 0, overdue: 0 },
    toApi: (u) => ({
      q: u['q'] ?? '',
      status: u['statut'] ?? '',
      type: u['type'] ?? '',
      company: u['entreprise'] ?? '',
      upcoming: u['avenir'] === '1' ? 'true' : '',
      overdue: u['cloture'] === 'manquante' ? 'true' : '',
      sort: u['tri'] ?? '',
      page: u['page'] ?? '',
      pageSize: u['taille'] ?? '',
    }),
  });

  activeFilters = computed(() =>
    Object.entries(this.q.params())
      .filter(([k, v]) => FILTER_LABELS[k] && v)
      .map(([key, value]) => ({
        key,
        label: FILTER_LABELS[key],
        value:
          key === 'statut' ? this.statusLabel(String(value))
          : key === 'avenir' ? 'À venir'
          : key === 'cloture' ? 'Issue non enregistrée'
          : String(value),
      })),
  );

  get search(): string {
    return this.q.params()['q'] ?? '';
  }
  set search(value: string) {
    this.q.onSearch(value);
  }

  get sort(): string {
    return this.q.params()['tri'] ?? 'soon';
  }
  set sort(value: string) {
    this.q.setParam('tri', value === 'soon' ? null : value);
  }

  get aVenir(): boolean {
    return this.q.params()['avenir'] === '1';
  }
  set aVenir(value: boolean) {
    this.q.setParam('avenir', value ? '1' : null);
  }

  get sansCloture(): boolean {
    return this.q.params()['cloture'] === 'manquante';
  }
  set sansCloture(value: boolean) {
    this.q.setParam('cloture', value ? 'manquante' : null);
  }

  /**
   * Un entretien dont l'heure est passée alors que personne n'a dit s'il a
   * eu lieu. La liste les affichait comme les autres, en gris : rien ne
   * distinguait un rendez-vous à venir d'un rendez-vous oublié.
   */
  sansIssue(i: InterviewRow): boolean {
    return this.isPast(i.proposedAt) && (i.status === 'Proposed' || i.status === 'Accepted');
  }

  /**
   * « dans 13 j », « il y a 3 sem. ».
   *
   * Une date seule oblige à faire la soustraction de tête pour chaque
   * ligne. Ce qui se lit sur cette page est une distance au présent, pas
   * un horodatage — celui-ci reste affiché à côté pour qui doit l'écrire.
   */
  quand(iso: string): { texte: string; futur: boolean } {
    const ecart = new Date(iso).getTime() - Date.now();
    const futur = ecart >= 0;
    const heures = Math.abs(ecart) / 3_600_000;

    let texte: string;
    if (heures < 1) texte = "moins d'une heure";
    else if (heures < 24) texte = `${Math.round(heures)} h`;
    else {
      const jours = Math.round(heures / 24);
      texte = jours < 14 ? `${jours} j` : jours < 60 ? `${Math.round(jours / 7)} sem.` : `${Math.round(jours / 30)} mois`;
    }
    return { texte: futur ? `dans ${texte}` : `il y a ${texte}`, futur };
  }
}
