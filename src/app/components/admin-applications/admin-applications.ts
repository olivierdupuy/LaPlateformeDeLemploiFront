import { Component, inject, computed } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminService } from '../../services/admin.service';
import { Pager } from '../pager/pager';
import { companyColor } from '../../utils/job.utils';
import { FichiersService } from '../../utils/fichiers';
import { pagedQuery } from '../../utils/paged-query';
import { dayLabel } from '../../utils/day-filter';
import { APPLICATION_STATUS, STATUS } from '../../viz/palette';
import { estEnCours } from '../../utils/statut-candidature';

/**
 * Explorateur de candidatures : le pendant de l'explorateur d'offres.
 *
 * Les deux pages partagent le même contrat d'URL — un critère par
 * paramètre — pour qu'un graphique puisse viser l'une ou l'autre sans que
 * son code change de forme.
 *
 * La lecture est ici volontairement seule : l'administration surveille le
 * flux, elle ne se substitue pas au recruteur pour trier ses candidats.
 */

const FILTER_LABELS: Record<string, string> = {
  statut: 'Statut',
  entreprise: 'Entreprise',
  offre: 'Offre',
  source: 'Source',
  q: 'Recherche',
  jour: 'Déposée le',
  retard: 'Sans réponse',
};

/**
 * Les quatre etats, dans l'ordre du parcours.
 *
 * Libelles, icones et couleurs viennent de la palette : le meme vert doit
 * dire « acceptee » ici, sur le tableau de bord et dans les statistiques.
 * Le pluriel est propre aux tuiles de filtre, qui comptent des dossiers.
 */
const ETATS = [
  { cle: 'Pending', pluriel: 'En attente', facette: 'pending' },
  { cle: 'Reviewed', pluriel: 'Examinées', facette: 'reviewed' },
  { cle: 'Accepted', pluriel: 'Acceptées', facette: 'accepted' },
  { cle: 'Rejected', pluriel: 'Refusées', facette: 'rejected' },
].map((e) => ({ ...e, color: APPLICATION_STATUS[e.cle].color }));

interface ApplicationRow {
  id: number;
  jobOfferId: number;
  fullName: string;
  email: string;
  status: string;
  appliedAt: string;
  isArchived?: boolean;
  reviewedAt?: string;
  resumeUrl?: string;
  jobTitle?: string;
  company?: string;
}

interface ApplicationFacets {
  total: number;
  pending: number;
  reviewed: number;
  accepted: number;
  rejected: number;
  stale: number;
  avgResponseDays: number | null;
}

/** Les facettes qui comptent des dossiers, par opposition aux mesures. */
type FacetteEtat = 'pending' | 'reviewed' | 'accepted' | 'rejected';

/** Doit rester aligné sur `StaleAfterDays` côté API. */
const JOURS_AVANT_RELANCE = 30;

@Component({
  selector: 'app-admin-applications',
  imports: [DecimalPipe, RouterLink, FormsModule, DatePipe, Pager],
  templateUrl: './admin-applications.html',
  styleUrl: './admin-applications.scss',
})
export class AdminApplications {
  private admin = inject(AdminService);

  companyColor = companyColor;
  /** Le CV est servi par l'API, pas par le site. */
  /** Les CV passent par une route authentifiee : plus de lien nu. */
  fichiers = inject(FichiersService);
  statusLabel = (s: string) => APPLICATION_STATUS[s]?.label ?? s;

  protected readonly etats = ETATS;
  /** Les teintes d'état, pour que la pastille dise la gravité. */
  protected readonly ETAT = STATUS;

  /** Icone, libelle et couleur d'un statut de candidature. */
  etat(statut: string) {
    return APPLICATION_STATUS[statut] ?? null;
  }

  /**
   * Le compte d'une facette, adresse par le nom de son etat.
   *
   * Le type se restreint aux quatre facettes d'etat : toutes les cles de
   * `ApplicationFacets` ne comptent pas des dossiers — le delai moyen est
   * une duree, et peut etre inconnu.
   */
  facette(cle: string): number {
    const nom = ETATS.find((e) => e.cle === cle)?.facette as FacetteEtat | undefined;
    return nom ? this.q.facets()[nom] : 0;
  }

  q = pagedQuery<ApplicationRow, ApplicationFacets>({
    fetch: (p) => this.admin.listApplications(p),
    emptyFacets: { total: 0, pending: 0, reviewed: 0, accepted: 0, rejected: 0, stale: 0, avgResponseDays: null },
    toApi: (u) => ({
      q: u['q'] ?? '',
      status: u['statut'] ?? '',
      offerId: u['offre'] ?? '',
      company: u['entreprise'] ?? '',
      source: u['source'] ?? '',
      stale: u['retard'] === '1' ? 'true' : '',
      day: u['jour'] ?? '',
      sort: u['tri'] ?? '',
      page: u['page'] ?? '',
      pageSize: u['taille'] ?? '',
    }),
  });

  /**
   * Part des dossiers réellement traités : la mesure qui dit si les
   * recruteurs suivent le flux ou le laissent s'accumuler.
   */
  handled = computed(() => {
    const f = this.q.facets();
    return f.total ? Math.round(((f.accepted + f.rejected) / f.total) * 100) : 0;
  });

  /** Délai moyen de première lecture, arrondi au jour. */
  delaiMoyen = computed(() => {
    const d = this.q.facets().avgResponseDays;
    return d == null ? null : Math.round(d);
  });

  readonly seuilRelance = JOURS_AVANT_RELANCE;

  /**
   * Ancienneté d'un dossier.
   *
   * La page affichait la date de dépôt, qui oblige à faire la soustraction
   * de tête pour chacune des lignes. Ce qui se décide ici n'est pas
   * « quand » mais « depuis combien de temps » : un dossier ouvert depuis
   * quatre mois est un candidat qui n'aura pas de réponse.
   */
  attente(a: ApplicationRow): { jours: number; ouvert: boolean; enRetard: boolean } {
    const jours = Math.max(0, Math.floor((Date.now() - new Date(a.appliedAt).getTime()) / 86_400_000));
    const ouvert = estEnCours(a.status);
    return { jours, ouvert, enRetard: ouvert && jours > JOURS_AVANT_RELANCE };
  }

  /** « 3 j », « 5 sem. », « 4 mois » — la durée se lit sans conversion. */
  dureeCourte(jours: number): string {
    if (jours === 0) return "aujourd'hui";
    if (jours < 7) return `${jours} j`;
    if (jours < 60) return `${Math.round(jours / 7)} sem.`;
    return `${Math.round(jours / 30)} mois`;
  }

  get retard(): boolean {
    return this.q.params()['retard'] === '1';
  }
  set retard(value: boolean) {
    this.q.setParam('retard', value ? '1' : null);
  }

  activeFilters = computed(() =>
    Object.entries(this.q.params())
      .filter(([k, v]) => FILTER_LABELS[k] && v)
      .map(([key, value]) => {
        const raw = String(value);
        // Un identifiant d'offre ne dit rien a l'oeil : on affiche le titre
        // s'il figure dans la page servie.
        const display =
          key === 'offre'
            ? (this.q.items().find((a) => a.jobOfferId === Number(raw))?.jobTitle ?? `Offre #${raw}`)
            : key === 'statut' ? this.statusLabel(raw)
            : key === 'jour' ? dayLabel(raw)
            : key === 'retard' ? `plus de ${JOURS_AVANT_RELANCE} jours`
            : raw;
        return { key, label: FILTER_LABELS[key], value: display };
      }),
  );

  get search(): string {
    return this.q.params()['q'] ?? '';
  }
  set search(value: string) {
    this.q.onSearch(value);
  }

  get sort(): string {
    return this.q.params()['tri'] ?? 'recent';
  }
  set sort(value: string) {
    this.q.setParam('tri', value === 'recent' ? null : value);
  }
}
