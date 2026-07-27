import { Component, inject, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminService } from '../../services/admin.service';
import { ConsoleShell } from '../console-shell/console-shell';
import { Pager } from '../pager/pager';
import { companyColor } from '../../utils/job.utils';
import { pagedQuery } from '../../utils/paged-query';

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
};

const STATUS_LABELS: Record<string, string> = {
  Proposed: 'Proposé',
  Accepted: 'Accepté',
  Completed: 'Terminé',
  Cancelled: 'Annulé',
};

const STATUS_BADGE: Record<string, string> = {
  Proposed: 'badge-yellow',
  Accepted: 'badge-green',
  Completed: 'badge-blue',
  Cancelled: 'badge-red',
};

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
}

@Component({
  selector: 'app-admin-interviews',
  imports: [ConsoleShell, RouterLink, FormsModule, DatePipe, Pager],
  templateUrl: './admin-interviews.html',
  styleUrl: './admin-interviews.scss',
})
export class AdminInterviews {
  private admin = inject(AdminService);

  companyColor = companyColor;
  statusLabel = (s: string) => STATUS_LABELS[s] ?? s;
  statusBadge = (s: string) => STATUS_BADGE[s] ?? '';
  isPast = (iso: string) => new Date(iso).getTime() < Date.now();

  q = pagedQuery<InterviewRow, InterviewFacets>({
    fetch: (p) => this.admin.listInterviews(p),
    emptyFacets: { total: 0, proposed: 0, accepted: 0, completed: 0, cancelled: 0, upcoming: 0 },
    toApi: (u) => ({
      q: u['q'] ?? '',
      status: u['statut'] ?? '',
      type: u['type'] ?? '',
      company: u['entreprise'] ?? '',
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
        value: key === 'statut' ? this.statusLabel(String(value)) : String(value),
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
}
