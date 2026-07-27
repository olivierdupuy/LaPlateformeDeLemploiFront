import { Component, inject, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminService } from '../../services/admin.service';
import { ConsoleShell } from '../console-shell/console-shell';
import { Pager } from '../pager/pager';
import { companyColor } from '../../utils/job.utils';
import { fichierUrl } from '../../utils/fichiers';
import { pagedQuery } from '../../utils/paged-query';
import { dayLabel } from '../../utils/day-filter';

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
};

const STATUS_LABELS: Record<string, string> = {
  Pending: 'En attente',
  Reviewed: 'Examinée',
  Accepted: 'Acceptée',
  Rejected: 'Refusée',
};

const STATUS_BADGE: Record<string, string> = {
  Pending: 'badge-yellow',
  Reviewed: 'badge-blue',
  Accepted: 'badge-green',
  Rejected: 'badge-red',
};

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
}

@Component({
  selector: 'app-admin-applications',
  imports: [ConsoleShell, RouterLink, FormsModule, DatePipe, Pager],
  templateUrl: './admin-applications.html',
  styleUrl: './admin-applications.scss',
})
export class AdminApplications {
  private admin = inject(AdminService);

  companyColor = companyColor;
  /** Le CV est servi par l'API, pas par le site. */
  fichierUrl = fichierUrl;
  statusLabel = (s: string) => STATUS_LABELS[s] ?? s;
  statusBadge = (s: string) => STATUS_BADGE[s] ?? '';

  q = pagedQuery<ApplicationRow, ApplicationFacets>({
    fetch: (p) => this.admin.listApplications(p),
    emptyFacets: { total: 0, pending: 0, reviewed: 0, accepted: 0, rejected: 0 },
    toApi: (u) => ({
      q: u['q'] ?? '',
      status: u['statut'] ?? '',
      offerId: u['offre'] ?? '',
      company: u['entreprise'] ?? '',
      source: u['source'] ?? '',
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
